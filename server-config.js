// Put here your email sending configurations!
module.exports = {
	emailTransport: {
		host: '',
		secure: false, // defines if the connection should use SSL (if true) or not (if false)
		ignoreTLS: true, // turns off STARTTLS support if true
		port: 25, // port for secure SMTP
		auth: {
			user: "",
			pass: ""
		},
		//tls: {
		//    ciphers:'SSLv3'
		//}
	},
	rabbitConn: {
		"host": "",
		"port": "",
		"login": "",
		"password": "",
		"authMechanism": "AMQPLAIN",
		"vhost": "",
		"noDelay": ,
		"connectionTimeout": 1000,
		"ssl": {
			"enabled": false
		}
	},
	mongoConn : {
		uri: "mongodb://localhost/mailsystem",
		options: {},
	},
	/** depricated */
	emailOptions: {
		from: '', // sender address
		// bcc: 'mosaico@mosaico.io',
	}
};