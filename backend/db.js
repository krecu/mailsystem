var mongoose    = require('mongoose');
var config = require('../server-config.js');

mongoose.connect(config.mongoConn.uri, config.mongoConn.options);
var db = mongoose.connection;

db.on('error', function (err) {
    console.log('connection error:', err.message);
});
db.once('open', function callback () {
    console.log("Connected to DB!");
});

module.exports.db = db;