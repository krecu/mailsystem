"use strict";
/* global module: false, console: false, __dirname: false */

var express = require('express');
var upload = require('jquery-file-upload-middleware');
var bodyParser = require('body-parser');
var fs = require('fs');
var _ = require('lodash');
var app = express();
var gm = require('gm').subClass({imageMagick: true});
var config = require('../server-config.js');
var extend = require('util')._extend;

var io = require("./socket").io;
var Q = require("q");
var P = require('bluebird');
var mongodb = require('mongodb');
var MQueue = require('./queue').queue;

app.use(require('connect-livereload')({ignore: [/^\/dl/]}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var listFiles = function (options, callback) {

    var files = [];
    var counter = 1;
    var finish = function () {
        if (!--counter)
            callback(files);
    };

    fs.readdir(options.uploadDir, _.bind(function (err, list) {
        _.each(list, function (name) {
            var stats = fs.statSync(options.uploadDir + '/' + name);
            if (stats.isFile()) {
                var file = {
                    name: name,
                    url: options.uploadDir + '/' + name,
                    size: stats.size
                };
                _.each(options.imageVersions, function (value, version) {
                    counter++;
                    fs.exists(options.uploadDir + '/' + version + '/' + name, function (exists) {
                        if (exists)
                            file.thumbnailUrl = options.uploadDir + '/' + version + '/' + name;
                        finish();
                    });
                });
                files.push(file);
            }
        }, this);
        finish();
    }, this));
};

var uploadOptions = {
    tmpDir: '.tmp',
    uploadDir: './uploads',
    uploadUrl: '/uploads',
    imageVersions: {thumbnail: {width: 90, height: 90}}
};

app.get('/upload', function (req, res) {
    listFiles(uploadOptions, function (files) {
        res.json({files: files});
    });
});

app.use('/upload', upload.fileHandler(uploadOptions));

// imgProcessorBackend + "?src=" + encodeURIComponent(src) + "&method=" + encodeURIComponent(method) + "&params=" + encodeURIComponent(width + "," + height);
app.get('/img', function (req, res) {

    var params = req.query.params.split(',');

    if (req.query.method == 'placeholder') {
        var out = gm(params[0], params[1], '#707070');
        res.set('Content-Type', 'image/png');
        var x = 0, y = 0;
        var size = 40;
        // stripes
        while (y < params[1]) {
            out = out
                .fill('#808080')
                .drawPolygon([x, y], [x + size, y], [x + size * 2, y + size], [x + size * 2, y + size * 2])
                .drawPolygon([x, y + size], [x + size, y + size * 2], [x, y + size * 2]);
            x = x + size * 2;
            if (x > params[0]) {
                x = 0;
                y = y + size * 2;
            }
        }
        // text
        out = out.fill('#B0B0B0').fontSize(20).drawText(0, 0, params[0] + ' x ' + params[1], 'center');
        out.stream('png').pipe(res);

    } else if (req.query.method == 'resize') {
        var ir = gm(req.query.src);
        ir.format(function (err, format) {
            if (!err) res.set('Content-Type', 'image/' + format.toLowerCase());
            ir.autoOrient().resize(params[0] == 'null' ? null : params[0], params[1] == 'null' ? null : params[1]).stream().pipe(res);
        });

    } else if (req.query.method == 'cover') {
        var ic = gm(req.query.src);
        ic.format(function (err, format) {
            if (!err) res.set('Content-Type', 'image/' + format.toLowerCase());
            ic.autoOrient().resize(params[0], params[1] + '^').gravity('Center').extent(params[0], params[1] + '>').stream().pipe(res);
        });

    }

});

app.post('/dl', function (req, res) {
    var Styliner = require('styliner');
    var styliner = new Styliner(__dirname, {keepinvalid: true});

    styliner.processHTML(req.body.html).then(function (source) {

        if (req.body.action == 'download') {
            res.setHeader('Content-disposition', 'attachment; filename=' + req.body.filename);
            res.setHeader('Content-type', 'text/html');
            res.write(source);
            res.end();
        } else if (req.body.action == 'email') {
            var sender = require('../sender');
            var users = [
                {name: 'eugen', mail: 'site.include@gmail.com'},
            ];
            var options = {
                from: "local@local.ru",
                to: null, // user mail
                subject: "test",
                html: source
            };
            sender.task(users, options);
            console.log('Messages sent complete');
        }

    });
});


var DeliveryModel = require('./models/delivery').DeliveryModel;
var ThemeModel = require('./models/theme').ThemeModel;

app.get('/api/deliveries', function (req, res) {

    return DeliveryModel.find(function (err, deliveries) {
        if (!err) {
            return res.send(deliveries);
        } else {
            res.statusCode = 500;
            return res.send({error: 'Server error'});
        }
    }).sort({'modified': -1});
});

app.post('/api/deliveries', function (req, res) {
    var delivery = new DeliveryModel({
        title: req.body.title,
        name: req.body.name,
        from: req.body.from,
        type: req.body.type,
        email: req.body.email,
        status: req.body.status,
        theme: req.body.theme
    });

    delivery.save(function (err) {
        if (!err) {
            return res.send({status: 'OK', delivery: delivery});
        } else {
            console.log(err);
            if (err.name == 'ValidationError') {
                res.statusCode = 400;
                res.send({error: 'Validation error'});
            } else {
                res.statusCode = 500;
                res.send({error: 'Server error'});
            }
        }
    });
});

app.get('/api/deliveries/:id', function (req, res) {
    res.send('This is not implemented now');
});

app.put('/api/deliveries/:id', function (req, res) {


    var deliveryId = req.params.id;
    var deliveryStatus = req.body.status;
    if (deliveryStatus == null || deliveryStatus == "") {
        return res.send("Status is required value");
    }


    var promiseUpdate = DeliveryModel.update({_id: deliveryId}, {
        $set: {"status": deliveryStatus, "sended": 0},
        $currentDate: {"modified": true}
    }).exec();

    promiseUpdate.then(function() {

        return DeliveryModel.findOne({_id: new mongodb.ObjectID(deliveryId)}).exec();

    }).then(function(delivery){

        if (delivery.theme == null) {
            return res.send("Theme not set this delivery broken");
        }

        var promise = ThemeModel.findOne({_id: new mongodb.ObjectID(delivery.theme)}).exec();

        return Q.spread([delivery, promise], function(delivery, theme){

            var mQ = new MQueue('exchangeMail' + delivery._id, 'queueMail_' + delivery._id + theme._id, 'routingMail_' + delivery._id + theme._id, delivery._id, theme._id);

            switch (deliveryStatus) {
                case "active" :
                    mQ.create().then(function(){
                        var mailList = JSON.parse(delivery.email);
                        var tasks = [];
                        mailList.forEach(function(item) {
                            var mail = {};
                            mail.from = delivery.from;
                            mail.to = item.email;
                            mail.subject = delivery.title;
                            mail.html = theme.html;
                            tasks.push(mail);
                        });
                        mQ.apply(tasks).then(function(){
                            console.log("All task is created");
                        });
                    }).catch(function(error){
                        console.log(error);
                    });
                    return res.send(delivery);
                    break;
                case "stop" :
                    mQ.stop();
                    return res.send(delivery);
                    break;
                case "retry" :
                    mQ.stop();
                    var emails = JSON.parse(delivery.email);
                    for (var i in emails) {
                        emails[i].status = null;
                    }
                    DeliveryModel.update({_id: deliveryId}, {
                        $set: {"email": JSON.stringify(emails)},
                        $currentDate: {"modified": true}
                    }, function(){
                        return res.send(delivery);
                    });

                    break;
                default :
                    return res.send("Method not defined");
            }
        });

    });
});

app.delete('/api/deliveries/:id', function (req, res) {
    return DeliveryModel.remove({_id: new mongodb.ObjectID(req.params.id)}, function (err, deliveries) {
        if (!err) {
            return res.send(deliveries);
        } else {
            res.statusCode = 500;
            return res.send({error: 'Server error'});
        }
    });
});


app.get('/api/themes', function (req, res) {
    return ThemeModel.find(function (err, themes) {
        if (!err) {
            return res.send(themes);
        } else {
            res.statusCode = 500;
            return res.send({error: 'Server error'});
        }
    });
});


//
app.post('/api/themes', function (req, res) {
    var theme = new ThemeModel({
        title: req.body.title,
        html: req.body.html
    });

    theme.save(function (err) {
        if (!err) {
            return res.send({status: 'OK', theme: theme});
        } else {
            console.log(err);
            if (err.name == 'ValidationError') {
                res.statusCode = 400;
                res.send({error: 'Validation error'});
            } else {
                res.statusCode = 500;
                res.send({error: 'Server error'});
            }
        }
    });
});
//
//app.get('/api/themes/:id', function(req, res) {
//	res.send('This is not implemented now');
//});
//
//app.put('/api/themes/:id', function (req, res){
//	res.send('This is not implemented now');
//});
//
//app.delete('/api/themes/:id', function (req, res){
//	res.send('This is not implemented now');
//});

module.exports = app;