var mongoose    = require('mongoose');

var db = require('../db');

var Schema = mongoose.Schema;

var Delivery = new Schema({
    title: { type: String, required: true },
    name: { type: String, required: true },
    from: { type: String, required: true },
    type: { type: String, required: true },
    email: { type: String, required: true },
    status: { type: String, required: true },
    theme: { type: String, required: true },
    sended: { type: Number, required: false},
    modified: { type: Date, default: Date.now }
});

var DeliveryModel = mongoose.model('Delivery', Delivery);

module.exports.DeliveryModel = DeliveryModel;