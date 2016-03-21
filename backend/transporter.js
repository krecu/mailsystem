var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var P = require('bluebird');
var config = require('../server-config.js');

//
//var tr = P.promisifyAll(nodemailer.createTransport(smtpTransport({
//    host: '185.117.153.215',
//    secure: false, // defines if the connection should use SSL (if true) or not (if false)
//    ignoreTLS: true, // turns off STARTTLS support if true
//    port: 25, // port for secure SMTP
//    auth: {
//        user: "krecu",
//        pass: "b60046247b"
//    },
//    //tls: {
//    //    ciphers:'SSLv3'
//    //}
//
//})));
//
//var mail = {};
//mail.from = "no-reply@forbes.ru";
//mail.to = "evgeniy.kretsu@acmedia.info";
//mail.subject = "test";
//mail.html = "OK";
//
//tr.sendMailAsync(mail)
//    .then(function (s) {
//        console.log(1111);
//        console.log(s);
//    }).catch(function (e) {
//        console.log(e);
//    });


module.exports.transporter = P.promisifyAll(nodemailer.createTransport(smtpTransport(config.emailTransport)));

