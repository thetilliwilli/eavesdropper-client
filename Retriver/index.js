"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

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

    Initialize(){
        let self = this;
        return super.Initialize()
            // .then(() => self._ActionInitGitRepo())
            .then(() => self._ActionInitLSCFile())
            .then(() => self)
            ;
    }

    StartServer(){
        cron.schedule(this.config.syncLastCommitSchedule, this._SyncLastCommitJob);
        cron.schedule(this.config.retriveSchedule, this._RetriveJob);
        this._SyncLastCommitJob();
        // this._RetriveJob();
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
                let rawData = "";
                res.on("end", () => JSON.parse(rawData)==="ok"?RESOLVE():REJECT(rawData));
                res.on("error", error => REJECT(error));
                res.on("data", chunk => rawData+=chunk);
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

    // _ActionInitGitRepo(){
    //     let self = this;
    //     return new Promise((RESOLVE, REJECT) => {
    //         const gitRepoPath = `${self.config.storagePath}/Git`;
    //         cp.exec(`cd ${gitRepoPath} && git init`, error => error?REJECT(error):RESOLVE());
    //     });
    // }
    
    _ActionInitLSCFile(){
        let self = this;
        return new Promise((RESOLVE, REJECT) => {
            const lscFile = `${self.config.storagePath}/lastSyncCommit.txt`;
            fs.exists(lscFile, exists => {
                if(exists) return RESOLVE();
                else return fs.writeFile(lscFile, self.config.rootCommit, error => error?REJECT(error):RESOLVE());
            });
        });
    }
}