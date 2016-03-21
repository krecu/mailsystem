# MailSystem on mosaico ui

### About mosaico
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
		"host": '',
		"secure": false,
		"ignoreTLS": true,
		"port": 25,
		"auth": {
			"user": "",
			"pass": ""
		}
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
		"uri": "mongodb://localhost/mailsystem",
		"options": {},
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
