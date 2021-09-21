"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws = __importStar(require("ws"));
const { nanoid } = require("nanoid");
const compareVersions = require("compare-versions");
const wss = new ws.WebSocketServer({ port: 5051 });
let clientSockets = new Set();
let hubSockets = new Set();
let lobbyLookup = {};
let latestVersion = "0.4.5";
wss.on("connection", function connection(socket, req) {
    socket.id = nanoid();
    if (req.url.match(/^\/[A-Za-z0-9_-]{21}$/)) {
        clientSockets.add(socket);
        sendToHub("clientSizeChange", clientSockets.size);
        socket.on("message", function incoming(message) {
            try {
                message = JSON.parse(message);
                if (compareVersions(message.appVersion, latestVersion) > -1) {
                    switch (message.type) {
                        case "hostedLobby":
                            sendToHub("hostedLobby", {
                                id: socket.id,
                                lobby: message.data,
                            });
                            lobbyLookup[socket.id] = message.data;
                            break;
                        case "hostedLobbyClosed":
                            sendToHub("hostedLobbyClosed", socket.id);
                            if (lobbyLookup[socket.id]) {
                                delete lobbyLookup[socket.id];
                            }
                            break;
                        case "lobbyUpdate":
                            lobbyProcessedUpdate(socket.id, message.data);
                            break;
                    }
                }
                else {
                    console.log("Client is out of date");
                }
            }
            catch (e) {
                console.error(e);
            }
        });
        socket.on("close", function () {
            if (lobbyLookup[socket.id]) {
                sendToHub("hostedLobbyClosed", socket.id);
                delete lobbyLookup[socket.id];
            }
            clientSockets.delete(socket);
            sendToHub("clientSizeChange", clientSockets.size);
        });
    }
    else {
        hubSockets.add(socket);
        sendSocket(socket, "clientSizeChange", clientSockets.size);
        Object.entries(lobbyLookup).forEach(([key, value]) => {
            sendSocket(socket, "hostedLobby", { id: key, lobby: value });
        });
        socket.on("close", function () {
            hubSockets.delete(socket);
        });
    }
});
function lobbyProcessedUpdate(socketID, messageData) {
    let key = messageData.key;
    let value = messageData.value;
    let teamName = messageData.teamName || "";
    if (lobbyLookup[socketID] && lobbyLookup[socketID].processed) {
        if (["otherTeams", "playerTeams", "specTeams"].includes(key)) {
            lobbyLookup[socketID].processed.teamList[key].data[teamName].slots = value.slots;
            lobbyLookup[socketID].processed.teamList[key].data[teamName].players =
                value.players;
            sendToHub("lobbyUpdate", { socketID, key, value, teamName });
        }
        else if (key === "chatMessages") {
            lobbyLookup[socketID].processed.chatMessages.push(value);
            sendToHub("lobbyUpdate", { socketID, key, value });
        }
        else if (lobbyLookup[socketID].processed[key] !== value) {
            lobbyLookup[socketID].processed[key] = value;
            sendToHub("lobbyUpdate", { socketID, key, value });
        }
    }
}
function sendSocket(client, messageType, message) {
    client.send(JSON.stringify({ type: messageType, data: message }));
}
function sendToHub(messageType, message) {
    hubSockets.forEach(function each(client) {
        if (client.readyState === ws.WebSocket.OPEN && !clientSockets.has(client)) {
            sendSocket(client, messageType, message);
        }
    });
}
function sendClients(messageType, message) {
    hubSockets.forEach(function each(client) {
        if (client.readyState === ws.WebSocket.OPEN && !clientSockets.has(client)) {
            sendSocket(client, messageType, message);
        }
    });
}
console.log("Server started");
//# sourceMappingURL=server.js.map