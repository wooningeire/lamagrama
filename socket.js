const WebSocket = require("./../node_modules/nodejs-websocket");
const { log } = require("./util/util");

let connection;
let net = {
    // closure
    get connection() { return connection; },
};
log("WSK", "Be sure to open http://localhost/llamabot-doc/", "yellow");
const server = WebSocket.createServer(nect => {
    connection = nect;

    log("WSK", "WebSocket connection opened", "green");
    server.on("error", logError);
    connection.on("error", logError);
    connection.on("close", () => {
        log("WSK", "WebSocket connection closed", "red");
    });

    function logError(error) {
        log("WSK", `Error: ${error}`, "red");
    }
}).listen(8001);

module.exports = net;