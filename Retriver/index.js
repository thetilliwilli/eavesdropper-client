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
            .then(() => self._ActionInitLSCFile())
            .then(() => self._ActionCreateBundleDirectory())
            .then(() => self)
            ;
    }

    StartServer(){
        cron.schedule(this.config.syncLastCommitSchedule, this._SyncLastCommitJob);
        cron.schedule(this.config.retriveSchedule, this._RetriveJob);
        Promise.resolve()
            .then(this._SyncLastCommitJob())
            .then(this._RetriveJob())
            ;
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
        console.log(`[RetriveJob.Start]: ${util.Now()}`);
        return Promise.resolve()
            .then(() => self._IsRemoteHasNewCommits())
            .then(hasNews => {
                if(hasNews) return Promise.resolve()
                    .then(() => self._ActionDownloadBundle())
                    .then(() => console.log("[.DownloadBundle]: end"))
                    .then(() => self._ActionFetchBundle())
                    .then(() => self._ActionUpdateLSC())
                    .then(() => self._SyncLastCommitJob())
                    ;
                else return Promise.resolve();
            })
            .then(msg => console.log(`[RetriveJob.Done]: ${util.Now()}`))
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

    _IsRemoteHasNewCommits(){
        let self = this;

        function FetchRemoteInformation(RESOLVE, REJECT){
            const url = `http://${self.config.ip}:${self.config.port}/`;
            var req = http.get(url, res => {
                let data = "";
                res.on("error", error=>REJECT(error));
                res.on("end", ()=>RESOLVE(JSON.parse(data)))
                res.on("data", chunk=>data+=chunk);
            }).on("error", error => REJECT(error));
        };

        return Promise.resolve()
            .then(() => new Promise(FetchRemoteInformation))
            .then(info => info.lastSyncCommit !== info.lastestCommit)
            ;
    }

    _ActionDownloadBundle(){
        let self = this;
        return new Promise((RESOLVE, REJECT) => {
            const url = `http://${self.config.ip}:${self.config.port}/downloadBundle`;
            var req = http.get(url, res => {
                const absFilePath = path.join(self.config.storagePath, "Bundle", "repo.bundle");
                var fileStream = fs.createWriteStream(absFilePath);
                res.pipe(fileStream);
                res.on("error", error => REJECT(error));
                fileStream.on("error", error => REJECT(error));
                res.on("end", () => RESOLVE());
            }).on("error", error => REJECT(error));
        });
    }

    _ActionFetchBundle(){
        let self = this;
        return new Promise((RESOLVE, REJECT) => {
            const bundleFile = path.join(self.config.storagePath, "Bundle", "repo.bundle");
            const cmd = `git --git-dir="${self.config.storagePath}/Git" fetch "${bundleFile}" master:master`;
            console.log(cmd);
            cp.exec(cmd, (error, stdout, stderr) => {
                if(error) return REJECT(error);
                else return RESOLVE();
            });
        });
    }

    _ActionUpdateLSC(){
        let self = this;
        
        function GetLastCommitResolver(RESOLVE, REJECT){
            const cmd = `git --git-dir="${self.config.storagePath}/Git" log --pretty=format:%H`;
            cp.exec(cmd, (error, stdout)=>{
                if(error) return REJECT(error);
                else return RESOLVE(stdout.slice(0, stdout.indexOf("\n")).trim());
            });
        };

        function SaveCommitHashToFile(hash){
            return new Promise((RESOLVE, REJECT)=>{
                fs.writeFile(`${self.config.storagePath}/lastSyncCommit.txt`, hash,error=>error?REJECT(error):RESOLVE(hash));
            });
        }

        return Promise.resolve()
            .then(() => new Promise(GetLastCommitResolver))
            .then(hash => SaveCommitHashToFile(hash))
            ;
    }

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

    _ActionCreateBundleDirectory(){
        let self = this;
        return new Promise((RESOLVE, REJECT) => {
            const bundlePath = `${self.config.storagePath}/Bundle`;
            fs.exists(bundlePath, exists => {
                if(exists) return RESOLVE();
                else return fs.mkdir(bundlePath, error => error?REJECT(error):RESOLVE());
            });
        });
    }
}