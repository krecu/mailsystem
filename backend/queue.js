var async = require('async');
var mongoose = require('mongoose');
var mongodb = require('mongodb');
var rabbitmq = require('./rabbitmq');
var Q = require('q');
var P = require('bluebird');
var transporter = require('./transporter').transporter;
var DeliveryModel = require('./models/delivery').DeliveryModel;
var io = require("./socket").io;

var MQueue = function (exchangeName, qName, routingKey, deliveryId, themeId) {
    this.exchangeName = exchangeName;
    this.qName = qName;
    this.routingKey = routingKey;
    this.globalExchange = "forbes";
    this.deliveryId = deliveryId;
    this.themeId = themeId;
}

/**
 * Остановка и удаление очереди и exchange
 */
MQueue.prototype.stop = function () {
    var
        exchangeName = this.exchangeName,
        qName = this.qName;

    rabbitmq.exchange(exchangeName, {
        "type": "topic",
        "durable": true,
        "noDeclare": false,
        "autoDelete": false
    }, function (exchange) {
        exchange.destroy();
    });

    rabbitmq.queue(qName, {durable: true, autoDelete: false}, function (queue) {
        queue.destroy();
    });
}

/**
 * Отправить все задачи в очередь
 * @param tasks
 */
MQueue.prototype.apply = function (tasks) {

    var
        routingKey = this.routingKey,
        globalExchange = this.globalExchange,
        deferred = P.pending();
    /** создаем или конектимся к глобальному exchang */
    rabbitmq.exchange(globalExchange, {
        "type": "fanout",
        "durable": true,
        "noDeclare": false,
        "autoDelete": false
    }, function (exchange) {

        /** отправляем задачи в очередь по заданному роуту */
        tasks.forEach(function (value) {
            exchange.publish(routingKey, JSON.stringify(value), {ack: true}, function () {
                console.log("Send new message with routing ", routingKey);
            });
        });

        deferred.resolve();
    });

    return deferred.promise;
}

/**
 * Выполнить отправку почты
 * @param mail
 */
MQueue.prototype.send = function (mail, self) {
    var
        qName = self.qName,
        exchangeName = self.exchangeName,
        routingKey = self.routingKey,
        globalExchange = self.globalExchange,
        deliveryId = self.deliveryId,
        themeId = self.themeId,
        sended = 0;

    transporter.sendMailAsync(mail)
        .then(function () {
            console.log("Send complete to email ", "Mail: " + mail.to, "By delivery: " + deliveryId);
            return DeliveryModel.findOne({_id: deliveryId}).exec();
        }).then(function(delivery){
            if (delivery.sended != undefined || delivery.sended != null) {
                sended = delivery.sended;
                sended += 1;
            } else {
                sended = 1;
            }

            var realSended = sended;
            var emails = JSON.parse(delivery.email);
            for (var i in emails) {
                if (emails[i].email == mail.to) {
                    emails[i].status = "complete";
                }
            }

            var promise = DeliveryModel.update({_id: deliveryId}, {
                $set: {"sended": sended, "email": JSON.stringify(emails)},
                $currentDate: {"modified": true}
            }).exec();

            return Q.spread([realSended, emails, promise], function(realSended, emails, promise) {
                var globalSend = 0;
                for (var i in emails) {
                    if (emails[i].status != undefined || emails[i].status != null) {
                        globalSend++;
                    }
                }
                if (emails.length <= globalSend) {
                    console.log("Delivery sended complete");
                    DeliveryModel.update({_id: deliveryId}, {
                        $set: {"status": "end"},
                        $currentDate: {"modified": true}
                    }, function(){
                        io.emit('result:execute:q:complete', {"count": sended, "id": deliveryId});
                    });
                } else {
                    setTimeout(function(){
                        io.emit('result:execute:q', {"count": sended, "id": deliveryId});
                    }, 100);
                }
            });
        }).catch(function(error) {
            DeliveryModel.findOne({_id: deliveryId}, function(delivery){
                console.log("Send error to email ", "Mail: " + mail.to, "By delivery: " + deliveryId, "Error:", error);
                if (delivery == null) return;
                var emails = JSON.parse(delivery.email);
                for (var i in emails) {
                    if (emails[i].email == mail.to) {
                        emails[i].status = "error";
                        emails[i].error = error;
                    }
                }

                var globalSend = 0;
                for (var i in emails) {
                    if (emails[i].status != undefined || emails[i].status != null) {
                        globalSend++;
                    }
                }

                DeliveryModel.update({_id: deliveryId}, {
                    $set: {"sended": sended, "email": JSON.stringify(emails)},
                    $currentDate: {"modified": true}
                }, function(){
                    if (emails.length <= globalSend) {
                        console.log("Delivery sended complete");
                        io.emit('result:execute:q:complete', {"count": sended, "id": deliveryId});
                        DeliveryModel.update({_id: deliveryId}, {
                            $set: {"status": "end"},
                            $currentDate: {"modified": true}
                        });
                    } else {
                        setTimeout(function(){
                            io.emit('result:execute:q', {"count": sended, "id": deliveryId});
                        }, 100);
                    }
                });

            })
        });
}

/**
 * Создать виртуальную очередь и exchange к ней
 */
MQueue.prototype.create = function () {

    var
        qName = this.qName,
        exchangeName = this.exchangeName,
        routingKey = this.routingKey,
        globalExchange = this.globalExchange,
        self = this,
        deferred = P.pending();

    /** создаем новый exchange */
    rabbitmq.exchange(exchangeName, {
        "type": "topic",
        "durable": true,
        "noDeclare": false,
        "autoDelete": false
    }, function (exchange) {
        /** добавляем созданный exchange в список прослушивающих глобальный */
        exchange.bind(globalExchange, routingKey);

        /** Создаем динамическую очередь */
        rabbitmq.queue(qName, {durable: true, autoDelete: false}, function (queue) {
            /** подписываем созданную очередь на прием сообщений только по заданному ключу */
            queue.bind(exchangeName, routingKey);

            /** инициализхируем консюмер на прослушивание очереди */
            queue.subscribe(function (message, headers, deliveryInfo, messageObject) {
                var data = JSON.parse(message.data.toString());
                console.log("Get new message to ", data.to);
                MQueue.prototype.send(data, self);
            });

            deferred.resolve();
        });
    });
    return deferred.promise;
};

module.exports.queue = MQueue;