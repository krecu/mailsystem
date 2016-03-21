var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var transporter = nodemailer.createTransport(smtpTransport({
    host: 'aspmx.l.google.com',
    port: 25,
    //auth: {
    //    user: 'username',
    //    pass: 'password'
    //}
}));

var amqp = require('amqp');

// Creates connection to RabbitMQ
var rmq = amqp.createConnection({
    "host": "localhost",
    "port": "56720",
    "login": "axel",
    "password": "IEJJe0yyfWUuytus",
    "authMechanism": "AMQPLAIN",
    "vhost": "forbes",
    "noDelay": true,
    "connectionTimeout": 1000,
    "ssl": {
        "enabled": false
    }
});

// RMQ definition
rmq.on('ready', function () {
    console.log('RMQ ready');
    // Integrator exchange definition
    rmq.exchange("forbes.mail",  {
        "type": "topic",
        "durable": true,
        "noDeclare": false,
        "autoDelete": false
    }, function(exchange) {
        exchange.bind("forbes", 'forbes.mail.#');
        rmq.queue('Mail', {durable: true, autoDelete: false}, function (q) {
            q.bind(exchange.name, '*.mail.send')
            q.subscribe(function (message, headers, deliveryInfo, messageObject) {

                console.log("Given task {send mail} with data");
                var data = JSON.parse(message.data.toString());
                var mail = {
                    from: data.options.from,
                    to: data.user.mail,
                    subject: data.options.subject,
                    html: data.options.html
                };

                transporter.sendMail(mail, function(error, info){
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Message sent: ' + info.response);
                    }
                });
                console.log("Send mail complete!!!")
            });
        });
    });
});


rmq.on('error', function(err) {
    console.trace();
    console.error(err);
});

rmq.on('connect', function(err) {
    console.log('RMQ connected');
});

rmq.on('close', function(err) {
    console.log('RMQ closed');
});

module.exports = rmq;