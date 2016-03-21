"use strict";
/* globals global:false */

var ko = require("knockout");
var console = require("console");
var kojqui = require("knockout-jqueryui");
var $ = require('jquery');

ko.bindingHandlers.select2 = {
    init: function(element, valueAccessor) {
        var options = ko.toJS(valueAccessor()) || {};
        $(element).select2(options);
    }
};
