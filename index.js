"use strict";

const config = require("./config.js");

const WebServer = require("./WebServer/index.js");
const Backuper = require("./Backuper/index.js");

const webConfig = Object.assign({}, config.webServer, config.fsProxy);
const backupConfig = Object.assign({}, config.fsProxy, config.backuper);

const webServer = new WebServer(webConfig);
const backuper = new Backuper(backupConfig);

Promise.resolve()
    .then(() => webServer.Initialize())
    .then(() => backuper.Initialize())
    .then(() => backuper.StartServer())
    .then(() => webServer.StartServer())
    .then(() => {
        console.log(`Инициализация всех сервисов прошла успешно`);// do what u want here
    })
    .catch(error => console.error(error));