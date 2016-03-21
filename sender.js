module.exports = {
    task: function (options) {
        var amqp = require('amqp');

        // Creates connection to RabbitMQ
        var sender = amqp.createConnection({
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
        console.log(1);
        sender.on('ready', function () {
            console.log(2);
            sender.exchange('forbes', {passive: true}, function (exchange) {
                exchange.publish("forbes.mail.send", JSON.stringify(options), {ack: true});
                console.log(options);
            }).on('error', function (err) {
                console.error(err);
                process.exit(1)
            })
        });
    }
}