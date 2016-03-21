// Put here your email sending configurations!
module.exports = {
	emailTransport: {
		host: '185.117.153.215',
		secure: false, // defines if the connection should use SSL (if true) or not (if false)
		ignoreTLS: true, // turns off STARTTLS support if true
		port: 25, // port for secure SMTP
		auth: {
			user: "krecu",
			pass: "b60046247b"
		},
		//tls: {
		//    ciphers:'SSLv3'
		//}
	},
	rabbitConn: {
		"host": "localhost",
		"port": "5672",
		"login": "root",
		"password": "b60046247b",
		"authMechanism": "AMQPLAIN",
		"vhost": "forbes",
		"noDelay": true,
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