"use strict";

const path = require("path");

module.exports = {
    retriveSchedule: "59 1 * * *",//в час 59 ночи каждый день
    syncLastCommitSchedule: "0 */4 * * *",//каждые 4 часа
    storagePath: process.env["STORAGE_PATH"] || path.join(__dirname, "Storage"),
    rootCommit: "b9bba57d9c33a60bcfb3d5e8359007c1947a1600",
    server: {
        ip: process.env["SERVER_IP"] || "212.12.28.107",
        port : process.env["SERVER_PORT"] || 10001,
    },
};