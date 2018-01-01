"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const cron = require("node-cron");

const Base = require("@tilliwilli/izida-common/base.js");
const util = require("@tilliwilli/izida-common/util.js");

module.exports = class Retriver extends Base
{
    constructor(config){
        super(config);

        this._SyncLastCommitJob = this._SyncLastCommitJob.bind(this);
        this._RetriveJob = this._RetriveJob.bind(this);
    }

    StartServer(){
        cron.schedule(this.config.syncLastCommitSchedule, this._SyncLastCommitJob);
        cron.schedule(this.config.retriveSchedule, this._RetriveJob);
    }

    //JOBS

    _SyncLastCommitJob(){
        let self = this;
        return Promise.resolve()
            .then(() => self._ActionReadLastSyncCommit())
            .then(commit => {
                if(commit === null)
                    return `Ничего не было отправлено - отсутствует файл lastSyncCommit.txt`;
                else
                    return self._ActionSendLastSyncCommit(commit)
                        .then(()=>`В качестве коммита синхронизации отправлен коммит: ${commit}`);
            })
            .then(msg => console.log(`LastSyncCommit: ${msg}`))
            .catch(util.LogAndRethrow)
            ;
    }

    _RetriveJob(){
        let self = this;
        return Promise.resolve()
            .then(() => self._ActionDownloadArchive())
            // .then(() => self._ActionDownloadBundle())
            .then(msg => console.log(`RetriveJob: done`))
            .catch(util.LogAndRethrow)
            ;
    }

    //ACTIONS

    _ActionReadLastSyncCommit(){
        let self = this;
        return new Promise((RESOLVE, REJECT) => {
            const absFilePath = path.join(self.config.storagePath, "lastSyncCommit.txt");
            fs.readFile(absFilePath, (error, data) => {
                if(error && error.code !== "ENOENT")
                    return REJECT(error);

                if(error && error.code === "ENOENT")
                    return RESOLVE(null)
                else
                    return RESOLVE(data.toString());
            });
        });
    }

    _ActionSendLastSyncCommit(message){
        let self = this;
        let postData = JSON.stringify(message);
        return new Promise((RESOLVE, REJECT) => {
            const options = {
                host: self.config.ip,
                port: self.config.port,
                method: "POST",
                path: "/setLastCommit",
                headers: {
                    "Content-Length": Buffer.byteLength(postData)//наличие этого хедера ОБЯЗАТЕЛЬНО
                }
            };
            var req = http.request(options, res => {
                res.on("end", () => RESOLVE());
                res.on("error", error => REJECT(error));
            });
            req.on("error", error => REJECT(error));
            req.write(postData);
            req.end();
        });
    }

    _ActionDownloadArchive(){
        let self = this;
        return new Promise((RESOLVE, REJECT) => {
            const url = `http://${self.config.ip}:${self.config.port}/downloadArchive`;
            var req = http.get(url, res => {
                const absFilePath = path.join(self.config.storagePath, "Bundle", "db.archive");
                var fileStream = fs.createWriteStream(absFilePath);
                res.pipe(fileStream);
                res.on("error", error => REJECT(error));
            }).on("error", error => REJECT(error));
        });
    }
}