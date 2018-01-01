"use strict";

const path = require("path");

module.exports = {
    schedule: "1 0 * * *",
    server: {
        ip: process.env["SERVER_IP"] || "212.12.28.107",
        port : process.env["SERVER_PORT"] || 10001,
    },
};