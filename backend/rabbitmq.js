var amq = require('amqp');
var config = require('../server-config.js');

// Creates connection to RabbitMQ
var connection = amq.createConnection(config.rabbitConn);

connection.on('ready', function () {
    console.log("Connected to Rabbit MQ complete");
});

connection.on('error', function(err) {
    console.trace();
    console.error(err);
});

connection.on('close', function(err) {
    console.log('RMQ closed');
});

module.exports = connection;