"use strict";

const path = require("path");

module.exports = {
    retriveSchedule: "1 0 * * *",
    syncLastCommitSchedule: "*/5 * * * * *",
    storagePath: process.env["STORAGE_PATH"] || path.join(__dirname, "Storage"),
    server: {
        ip: process.env["SERVER_IP"] || "212.12.28.107",
        port : process.env["SERVER_PORT"] || 10001,
    },
};