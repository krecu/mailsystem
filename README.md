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
    "host": "",
    "secure": "",
    "ignoreTLS": "",
    "port": "",
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
    "connectionTimeout": "",
    "ssl": {
        "enabled": ""
    }
},
mongoConn : {
    "uri": "",
    "options": {},
}
```

run AMQ consumer
```
  node consumer.js
```

run APP and go http://localhost:9000
```
  grunt
```
