"use strict";
/* global global: false */

var $ = require("jquery");
var ko = require("knockout");
var templateConverter = require("./converter/main.js");
var console = require("console");
var performanceAwareCaller = require('./timed-call.js').timedCall;
var initializeViewmodel = require("./viewmodel.js");
var templateSystem = require('./bindings/choose-template.js');

// call a given method on every plugin implementing it.
// supports a "reverse" parameter to call the methods from the last one to the first one.
var pluginsCall = function(plugins, methodName, args, reverse) {
  var start, end, diff;
  if (typeof reverse !== 'undefined' && reverse) {
    start = plugins.length - 1;
    end = 0;
    diff = -1;
  } else {
    start = 0;
    end = plugins.length - 1;
    diff = 1;
  }
  for (var i = start; i != end + diff; i += diff) {
    if (typeof plugins[i][methodName] !== 'undefined') {
      plugins[i][methodName].apply(plugins[i], args);
    }
  }
};

// workaround for knockout-jqueryui's buttonset/button disposal:
// https://github.com/gvas/knockout-jqueryui/issues/25
var origDisposeCallback = ko.utils.domNodeDisposal.addDisposeCallback;
ko.utils.domNodeDisposal.addDisposeCallback = function(node, callback) {
  var newCallback = function(node) {
    try {
      callback(node);
    } catch (e) {
      console.log("cought dispose callback exception", e);
    }
  };
  origDisposeCallback(node, newCallback);
};

var bindingPlugin = {
  viewModel: function(viewModel) {
    applyBindings(viewModel);
  },
  dispose: function() {
    unapplyBindings(global.document.body);
  }
};
var applyBindings = function(viewModel) {
  try {
    performanceAwareCaller('applyBindings', ko.applyBindings.bind(this, viewModel));
    return {
      dispose: function() {
        unapplyBindings(global.document.body);
      }
    };
  } catch (err) {
    console.log(err, err.stack);
    throw err;
  }
};

var unapplyBindings = function(element) {
  try {
    performanceAwareCaller('unapplyBindings', ko.cleanNode.bind(this, element));
  } catch (err) {
    console.log(err, err.stack);
    throw err;
  }
};

var templateCreator = function(templatePlugin, htmlOrElement, optionalName, templateMode) {
  var tmpName = optionalName;
  if (typeof optionalName != 'undefined' && typeof templateMode != 'undefined') {
    if (typeof htmlOrElement != 'object' || htmlOrElement.tagName.toLowerCase() != 'replacedhtml') tmpName += '-' + templateMode;
  }

  while (typeof tmpName == 'undefined' || tmpName === null || templatePlugin.exists(tmpName)) {
    tmpName = 'anonymous-' + Math.floor((Math.random() * 100000) + 1);
  }

  if (typeof htmlOrElement == 'object' && htmlOrElement.tagName.toLowerCase() == 'replacedhtml') {
    var $el = $(htmlOrElement);
    var $head = $('replacedhead', $el);
    var $body = $('replacedbody', $el);
    templatePlugin.adder(tmpName + '-head', $head.html() || '');
    templatePlugin.adder(tmpName + '-show', $body.html() || '');
    templatePlugin.adder(tmpName + '-preview', $el.html());
    templatePlugin.adder(tmpName + '-wysiwyg', $el.html());

    $head.attr('data-bind', 'block: content');
    $head.children().detach();
    $head.before('<!-- ko withProperties: { templateMode: \'head\' } -->');
    $head.after('<!-- /ko -->');
    $body.html("<!-- ko block: content --><!-- /ko -->");

    templatePlugin.adder(tmpName + '-iframe', $el[0].outerHTML);

  } else if (typeof htmlOrElement == 'object') {
    templatePlugin.adder(tmpName, htmlOrElement.outerHTML);
  } else {
    templatePlugin.adder(tmpName, htmlOrElement);
  }

  return tmpName;
};

// Adapter to transform "viewModel plugins" into more generic plugins.
function _viewModelPluginInstance(pluginFunction) {
  var instance;
  return {
    viewModel: function(viewModel) {
      instance = pluginFunction(viewModel);
    },
    init: function() {
      if (typeof instance !== 'undefined' && typeof instance.init !== 'undefined') instance.init();
    },
    dispose: function() {
      if (typeof instance !== 'undefined' && typeof instance.dispose !== 'undefined') instance.dispose();
    }
  };
}

function canonicalize(url) {
  var div = global.document.createElement('div');
  div.innerHTML = "<a></a>";
  div.firstChild.href = url; // Ensures that the href is properly escaped
  div.innerHTML = div.innerHTML; // Run the current innerHTML back through the parser
  return div.firstChild.href;
}

var templateLoader = function(templateFileOrMetadata, jsorjson, extensions, galleryUrl) {
  var templateFile = typeof templateFileOrMetadata == 'string' ? templateFileOrMetadata : templateFileOrMetadata.template;
  var templatePath = "./";
  var p = templateFile.lastIndexOf('/');
  if (p != -1) {
    templatePath = templateFile.substr(0, p + 1);
  }
  templatePath = canonicalize(templatePath);

  var metadata;
  if (typeof templateFileOrMetadata == 'string') {
    metadata = {
      template: templateFileOrMetadata,
      // TODO l10n?
      name: 'No name',
      created: Date.now()
    };
  } else {
    metadata = templateFileOrMetadata;
  }

  $.get(templateFile, function(templatecode) {
    var res = templateCompiler(templatePath, "template", templatecode, jsorjson, metadata, extensions, galleryUrl);
    res.init();
  });
};

var templateCompiler = function(basePath, templateName, templatecode, jsorjson, metadata, extensions, galleryUrl) {
  // we strip content before <html> tag and after </html> because jquery doesn't parse it.
  // we'll keep it "raw" and use it in the preview/output methods.
  var res = templatecode.match(/^([\S\s]*)([<]html[^>]*>[\S\s]*<\/html>)([\S\s]*)$/i);
  if (res === null) throw "Unable to find <html> opening and closing tags in the template";
  var prefix = res[1];
  // we parse the html content after replacing the tag name for html/head/body so to avoid jquery issues in parsing.
  var html = res[2].replace(/(<\/?)(html|head|body)([^>]*>)/gi, function(match, p1, p2, p3) {
    return p1 + 'replaced' + p2 + p3;
  });
  var postfix = res[3];
  var blockDefs = [];
  var enableUndo = true;
  var enableRecorder = true;
  var baseThreshold = '+$root.contentListeners()';

  var createdTemplates = [];
  var templatesPlugin = {
    adder: function(id, html) {
      if (typeof html !== 'string') throw "Template system: cannot create new template " + id;
      var trash = html.match(/(data)?-ko-[^ =:]*/g);
      if (trash) {
        console.error("ERROR: found unexpected -ko- attribute in compiled template", id, ", you probably mispelled it:", trash);
      }
      templateSystem.addTemplate(id, html);
      createdTemplates.push(id);
    },
    exists: function(id) {
      var el = templateSystem.getTemplateContent(id);
      if (typeof el !== 'undefined') return true;
      else return false;
    },
    dispose: function() {
      for (var i = createdTemplates.length - 1; i >= 0; i--) {
        templateSystem.removeTemplate(createdTemplates[i]);
      }
    }
  };

  ko.bindingHandlers['block'].templateExists = templatesPlugin.exists;

  // templatecreator tracks created template (via templateAdder) so to be able to dispose them later
  var myTemplateCreator = templateCreator.bind(undefined, templatesPlugin);

  // first pass: we "compile" the template into a termplateDef object
  var templateDef = performanceAwareCaller('translateTemplate', templateConverter.translateTemplate.bind(undefined, templateName, html, basePath, myTemplateCreator));

  // second pass: given the templateDef we create a base content model object for this template.
  var content = performanceAwareCaller('generateModel', templateConverter.wrappedResultModel.bind(undefined, templateDef));

  // third pass: we create "style/content editors" for every block
  blockDefs.push.apply(blockDefs, performanceAwareCaller('generateEditors', templateConverter.generateEditors.bind(undefined, templateDef, basePath, myTemplateCreator, baseThreshold)));

  if (typeof jsorjson !== 'undefined' && jsorjson !== null) {
    var unwrapped;
    if (typeof jsorjson == 'string') {
      unwrapped = ko.utils.parseJson(jsorjson);
    } else {
      unwrapped = jsorjson;
    }

    // we run a basic compatibility check between the content-model we expect and the initialization model
    var checkModelRes = performanceAwareCaller('checkModel', templateConverter.checkModel.bind(undefined, content._unwrap(), blockDefs, unwrapped));
    // if checkModelRes is 1 then the model is not fully compatible but we fixed it
    if (checkModelRes == 2) {
      console.error("Trying to compile an incompatible template version!");
      $('#incompatible-template').dialog({
        modal: true,
        appendTo: '#mo-body',
        buttons: {
          Ok: function() {
            $(this).dialog("close");
          }
        }
      });
    }

    content._wrap(unwrapped);
  }

  // This build the template for the preview/output, but concatenating prefix, template and content and stripping the "replaced" prefix added to "problematic" tag (html/head/body)
  var iframeTpl = prefix + templateSystem.getTemplateContent(templateName + '-iframe').replace(/(<\/?)replaced(html|head|body)([^>]*>)/gi, function(match, p1, p2, p3) {
    return p1 + p2 + p3;
  }) + postfix;

  // store this so to restore it on disposale
  var origiFrameTpl = ko.bindingHandlers.bindIframe.tpl;
  ko.bindingHandlers.bindIframe.tpl = iframeTpl;
  var iFramePlugin = {
    dispose: function() {
      ko.bindingHandlers.bindIframe.tpl = origiFrameTpl;
    }
  };

  var plugins = [iFramePlugin, templatesPlugin];

  if (typeof extensions !== 'undefined') {
    for (var i = 0; i < extensions.length; i++) {
      if (typeof extensions[i] == 'function') {
        plugins.push(_viewModelPluginInstance(extensions[i]));
      } else {
        plugins.push(extensions[i]);
      }
    }
  }

  // initialize the viewModel object based on the content model.
  var viewModel = performanceAwareCaller('initializeViewmodel', initializeViewmodel.bind(this, content, blockDefs, basePath, galleryUrl));

  viewModel.metadata = metadata;
  // let's run some version check on template and editor used to build the model being loaded.
  var editver = '0.11.0';
  if (typeof viewModel.metadata.editorversion !== 'undefined' && viewModel.metadata.editorversion !== editver) {
    console.warn("The model being loaded has been created with an older editor version", viewModel.metadata.editorversion, "vs", editver);
  }
  viewModel.metadata.editorversion = editver;

  if (typeof templateDef.version !== 'undefined') {
    if (typeof viewModel.metadata.templateversion !== 'undefined' && viewModel.metadata.templateversion !== templateDef.version) {
      console.error("The model being loaded has been created with a different template version", templateDef.version, "vs", viewModel.metadata.templateversion);
    }
    viewModel.metadata.templateversion = templateDef.version;
  }

  templateSystem.init();



  // everything's ready, start knockout bindings.
  plugins.push(bindingPlugin);

  pluginsCall(plugins, 'viewModel', [viewModel]);

  // dispose function      
  var dispose = function() {
    pluginsCall(plugins, 'dispose', undefined, true);
  };

  return {
    model: viewModel,
    init: function() {
      pluginsCall(plugins, 'init', undefined, true);
    },
    dispose: dispose
  };

};


var checkFeature = function(feature, func) {
  if (!func()) {
    console.warn("Missing feature", feature);
    throw "Missing feature " + feature;
  }
};

var isCompatible = function() {
  try {
    // window.msMatchMedia would match also IE9
    // IE9 wouldn't be so hard to support, but it doesn't worth it. (preview iframe and automatic scroll are 2 things not working in IE9)
    checkFeature('matchMedia', function() {
      return typeof global.matchMedia != 'undefined';
    });
    checkFeature('XMLHttpRequest 2', function() {
      return 'XMLHttpRequest' in global && 'withCredentials' in new global.XMLHttpRequest();
    });
    checkFeature('ES5 strict', function() {
      return function() { /* "use strict";*/
        return typeof this == 'undefined';
      }();
    });
    checkFeature('CSS borderRadius', function() {
      return typeof global.document.body.style['borderRadius'] != 'undefined';
    });
    checkFeature('CSS boxShadow', function() {
      return typeof global.document.body.style['boxShadow'] != 'undefined';
    });
    checkFeature('CSS boxSizing', function() {
      return typeof global.document.body.style['boxSizing'] != 'undefined';
    });
    checkFeature('CSS backgroundSize', function() {
      return typeof global.document.body.style['backgroundSize'] != 'undefined';
    });
    checkFeature('CSS backgroundOrigin', function() {
      return typeof global.document.body.style['backgroundOrigin'] != 'undefined';
    });
    return true;
  } catch (exception) {
    return false;
  }
};


var fixPageEvents = function() {
  // This is global code to prevent dragging/dropping in the page where we don't deal with it.
  // IE8 doesn't have window.addEventListener, but doesn't support drag&drop too.
  if (global.addEventListener) {
    // prevent generic file droppping in the page
    global.addEventListener("drag", function(e) {
      // console.log("browser is using drag listener on window");
      e = e || global.event;
      e.preventDefault();
    }, false);
    global.addEventListener("dragstart", function(e) {
      // console.log("browser is using dragstart listener on window");
      e = e || global.event;
      e.preventDefault();
    }, false);
    global.addEventListener("dragover", function(e) {
      // this is called on mouse move on every supported browser.
      // console.log("browser is using dragover listener on window");
      e = e || global.event;
      e.preventDefault();
    }, false);
    global.addEventListener("drop", function(e) {
      // console.log("browser is using drop listener on window");
      e = e || global.event;
      e.preventDefault();
    }, false);
    global.document.body.addEventListener('drop', function(e) {
      // I browser supportati entrato tutti qui quando si droppa qualcosa sul body
      // console.log("browser is using drop listener on body tag");
      e.preventDefault();
    }, false);
  }
  if (global.document.ondragstart) {
    global.document.ondragstart = function() {
      // console.log("browser called ondragstart. return false!");
      return false;
    };
  }
};

module.exports = {
  compile: templateCompiler,
  load: templateLoader,
  isCompatible: isCompatible,
  fixPageEvents: fixPageEvents
};