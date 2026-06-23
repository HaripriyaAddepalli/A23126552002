const fs = require("fs");

function writeLog(level, message) {
  const logMessage =
    `[${new Date().toISOString()}] [${level}] ${message}\n`;

  fs.appendFileSync("app.log", logMessage);
}

module.exports = {
  info: (msg) => writeLog("INFO", msg),
  error: (msg) => writeLog("ERROR", msg),
};