# Mosaico - Responsive Email Template Editor

### Mosaico
[Mosaico Basics](https://github.com/voidlabs/mosaico/wiki)
[Developer Notes](https://github.com/voidlabs/mosaico/wiki/Developers)

### Build/Run

Build app 
```
  npm i && bower i
```

Configure app in ./server-config.js
```json
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
```

run AMQ consumer
```
  node consumer.js
```

run APP and go http://localhost:9000
```
  grunt
```
