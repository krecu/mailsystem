var initialEdits = [];
if (localStorage.getItem('edits')) {
    var editKeys = JSON.parse(localStorage.getItem('edits'));
    var md;
    for (var i = 0; i < editKeys.length; i++) {
        md = localStorage.getItem('metadata-' + editKeys[i]);
        if (typeof md == 'string') {
            initialEdits.push(JSON.parse(md));
        } else {
            console.log("Ignoring saved key", editKeys[i], "type", typeof md, md);
        }
    }

    initialEdits.sort(function (a, b) {
        var lastA = a.changed ? a.changed : a.created;
        var lastB = b.changed ? b.changed : b.created;
        if (lastA < lastB) return 1;
        if (lastA > lastB) return -1;
        return 0;
    });
}

var deliveries = [];
var themes = [];
var viewModel = {
    showSaved: ko.observable(false),
    edits: ko.observableArray(initialEdits),
    deliveries: ko.observableArray(deliveries),
    themes: ko.observableArray(themes),
    email: ko.observableArray([]),

    editDeliveryEmail: ko.observableArray([]),
    editDeliveryType: ko.observable(null),
    editDeliveryTitle: ko.observable(null),
    editDeliveryFrom: ko.observable(null),
    editDeliveryName: ko.observable(null),
    editDeliveryTheme: ko.observable(null),

    emailType: ko.observable(null),
    emailURI: ko.observable("http://10.32.101.90:9000/users.json"),
    templates: [{
        name: 'ForbesNews', desc: 'Forbes news'
    }]
};

viewModel.deliveries.get = function(){
    $.ajax({
        url: '/api/deliveries',
        type: "GET",
        dataType: 'json',
        success: function (data) {
            var observData = [];
            for (var i in data) {
                observData[i] = {};
                observData[i]._id = data[i]._id;
                observData[i].from = data[i].from; //"krecu.me@gmail.com"
                observData[i].modified = data[i].modified; //"2015-11-05T13:00:34.528Z"
                observData[i].name = data[i].name; //"Тестовая отправка"
                observData[i].status = data[i].status; //"active"
                observData[i].title = data[i].title; // "Тестовая отправка"
                observData[i].type = data[i].type; // "list"
                observData[i].email = JSON.parse(data[i].email) // "[{"email":"krecu.me@ya.ru"}]"
            }
            viewModel.deliveries(observData);
            $('#deliveryList').collapsible({accordion : false});
            $('#deliveryList li').first().find('.collapsible-header').trigger('click');
            updateTheme();
        }
    });
};

viewModel.deliveries.save = function(){

    var delivery = {};
    delivery.title = viewModel.editDeliveryTitle();
    delivery.name = viewModel.editDeliveryName();
    delivery.from = viewModel.editDeliveryFrom();
    delivery.type = viewModel.editDeliveryType();
    delivery.email = JSON.stringify(viewModel.editDeliveryEmail());
    delivery.theme = viewModel.editDeliveryTheme();
    delivery.status = 'new';

    for (var key in delivery) {
        if (delivery[key] == undefined || delivery[key] == null || delivery[key] == "") {
            alert("Все поля обязательны для заполнения");
            return false;
        }
    }

    $.ajax({
        url: '/api/deliveries',
        type: "POST",
        data: delivery,
        dataType: 'json',
        success: function () {
            $('#delivery-title', '#createDelivery').val("");
            $('#createDelivery').closeModal();
            $('.lean-overlay').remove();
            viewModel.deliveries.get();
        }
    });
}

viewModel.deliveries.create = function(){
    $('#createDelivery').openModal();
}


viewModel.deliveries.delete = function(elem){
    $.ajax({
        url: '/api/deliveries/' + elem._id,
        type: "DELETE",
        dataType: 'json',
        success: function () {
            viewModel.deliveries.get();
        }
    });
}

viewModel.deliveries.start = function(elem){
    $.ajax({
        url: '/api/deliveries/' + elem._id,
        type: "PUT",
        data: {status: 'active'},
        dataType: 'json',
        success: function () {
            viewModel.deliveries.get();
        }
    });
}

viewModel.deliveries.stop = function(elem){
    $.ajax({
        url: '/api/deliveries/' + elem._id,
        type: "PUT",
        data: {status: 'stop'},
        dataType: 'json',
        success: function () {
            viewModel.deliveries.get();
        }
    });
}

viewModel.deliveries.retry = function(elem){
    $.ajax({
        url: '/api/deliveries/' + elem._id,
        type: "PUT",
        data: {status: 'retry'},
        dataType: 'json',
        success: function () {
            viewModel.deliveries.get();
        }
    });
}

viewModel.themes.create = function(){
    $('#createTheme').openModal();
}


viewModel.themes.preview = function(e, value){
    var selected = value.target.selectedIndex;
    var items = viewModel.themes();
    var html = items[selected];
    $('#preview-frame').html(html.html);
}

viewModel.themes.get = function(){
    $.ajax({
        url: '/api/themes',
        type: "GET",
        dataType: 'json',
        success: function (data) {
            viewModel.themes(data);
        }
    });
};

viewModel.email.showList = function(){
    viewModel.emailType('list');
    viewModel.editDeliveryType('list');
    $('#email-external-wrapp').hide();
    $('#email-inner-wrapp').show();
};

viewModel.email.showExternal = function(){
    viewModel.emailType('external');
    viewModel.editDeliveryType('external');
    $('#email-external-wrapp').show();
    $('#email-inner-wrapp').hide();
};

viewModel.email.apply = function(){

    if (viewModel.emailType() == "external") {

        $.ajax({
            url: viewModel.emailURI(),
            type: "GET",
            dataType: 'json',
            success: function (data) {
                viewModel.editDeliveryEmail(data);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                alert(textStatus + ": " + errorThrown);
            }
        });
    } else if (viewModel.emailType() == "list") {
        var lines = $('#email-inner-list').val().split(/\n/);
        var data = [];
        for (var i=0; i < lines.length; i++) {
            var o = {};
            o.email = $.trim(lines[i]);
            data.push(o);
        }
        viewModel.editDeliveryEmail(data);
    }
};























viewModel.edits.subscribe(function (newEdits) {
    var keys = [];
    for (var i = 0; i < newEdits.length; i++) {
        keys.push(newEdits[i].key);
        localStorage.setItem('metadata-' + newEdits[i].key, ko.toJSON(newEdits[i]));
    }
    localStorage.setItem('edits', ko.toJSON(keys));
});
viewModel.dateFormat = function (unixdate) {
    if (typeof unixdate == 'undefined') return 'DD-MM-YYYY';
    var d = new Date();
    d.setTime(ko.utils.unwrapObservable(unixdate));
    var m = "" + (d.getMonth() + 1);
    var h = "" + (d.getHours());
    var i = "" + (d.getMinutes());
    return d.getDate() + "/" + (m.length == 1 ? '0' : '') + m + "/" + d.getFullYear() + " " + (h.length == 1 ? '0' : '') + h + ":" + (i.length == 1 ? '0' : '') + i;
};
viewModel.newEdit = function (shorttmplname) {
    console.log("new", this, template);
    var d = new Date();
    var rnd = Math.random().toString(36).substr(2, 7);
    var template = 'templates/' + shorttmplname + '/template-' + shorttmplname + '.html';
    viewModel.edits.unshift({created: Date.now(), key: rnd, name: shorttmplname, template: template});
    document.location = 'editor.html#' + rnd;
};
viewModel.renameEdit = function (index) {
    var newName = window.prompt("Modifica nome", viewModel.edits()[index].name);
    if (newName) {
        var newItem = JSON.parse(ko.toJSON(viewModel.edits()[index]));
        newItem.name = newName;
        viewModel.edits.splice(index, 1, newItem);
    }
    return false;
};
viewModel.deleteEdit = function (index) {
    var confirm = window.confirm("Are you sure you want to delete this content?");
    if (confirm) {
        var res = viewModel.edits.splice(index, 1);
        console.log("removing template ", res);
        localStorage.removeItem('template-' + res[0].key);
    }
    return false;
};
viewModel.list = function (clean) {
    for (var i = localStorage.length - 1; i >= 0; i--) {
        var key = localStorage.key(i);
        if (clean) {
            console.log("removing ", key, localStorage.getItem(key));
            localStorage.removeItem(key);
        } else {
            console.log("ls ", key, localStorage.getItem(key));
        }
    }
};

viewModel.getStatus = function(item){
    var countOk = 0;
    var countError = 0;
    var countQ = 0;
    for (var i in item.email){
        if (item.email[i].status=='complete'){
            countOk++;
        } else if (item.email[i].status=='error') {
            countError++;
        } else {
            countQ++;
        }
    }
    return '<a title="Успешно отправленно" class="btn-floating green">' + countOk + '</a>' + '<a title="Ошибка при отправке" class="btn-floating red">' + countError + '</a>' + '<a title="В очереди на отправку" class="btn-floating blue">' + countQ + '</a>';
}

var updateTheme = function(){
    //$('.collapsible').collapsible({accordion : false});
    $('select').material_select();
    //$('.modal-trigger').leanModal();
    //$('ul.tabs').tabs();

    $('#createDelivery ul.tabs').tabs('select_tab', 'tab_id');
}

jQuery(document).ready(function($){
    viewModel.deliveries.get();
    viewModel.themes.get();
    ko.applyBindings(viewModel);
    updateTheme();


    (function ($) {
        var socket = io('http://krotix.com:3000', {path: '/socket.io'});
        socket.on('result:execute:q', function (data) {
            viewModel.deliveries.get();
            console.log("update");
        });
        socket.on('result:execute:q:complete', function (data) {
            viewModel.deliveries.get();
            console.log("complete");
        });
    })(jQuery);

});


