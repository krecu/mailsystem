var mongoose    = require('mongoose');

var db = require('../db');

var Schema = mongoose.Schema;

var Theme = new Schema({
    title: { type: String, required: true },
    html: {type: String, required: true },
    modified: { type: Date, default: Date.now }
});

var ThemeModel = mongoose.model('Theme', Theme);

module.exports.ThemeModel = ThemeModel;