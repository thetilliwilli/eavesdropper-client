"use strict";

const config = require("./config.js");

const Retriver = require("./Retriver/index.js");

const retriver = new Retriver(
    Object.assign({}, config, config.server)
);

Promise.resolve()
    .then(() => retriver.Initialize())
    .then(() => retriver.StartServer())
    .then(() => {
        console.log(`Инициализация всех сервисов прошла успешно`);// do what u want here
    })
    .catch(error => console.error(error));