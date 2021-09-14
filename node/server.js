const ws = require("ws");
const { nanoid } = require("nanoid");

const wss = new ws.WebSocketServer({ port: 5051 });
let clientSockets = new Set();
let hubSockets = new Set();
let lobbyLookup = {};
let compareVersions = require("compare-versions");
let latestVersion = "0.4.4";
wss.on("connection", function connection(socket, req) {
  socket.id = nanoid();
  if (req.url.match(/^\/[A-Za-z0-9_-]{21}$/)) {
    clientSockets.add(socket);
    sendHub("clientSizeChange", clientSockets.size);
  } else {
    hubSockets.add(socket);
    sendSocket(socket, "clientSizeChange", clientSockets.size);
    Object.entries(lobbyLookup).forEach(([key, value]) => {
      sendSocket(socket, "hostedLobby", { id: key, lobby: value });
    });
  }

  socket.on("message", function incoming(message) {
    try {
      message = JSON.parse(message);
      if (compareVersions(message.appVersion, latestVersion) > -1) {
        if (clientSockets.has(socket)) {
          switch (message.type) {
            case "hostedLobby":
              sendHub("hostedLobby", {
                id: socket.id,
                lobby: message.data,
              });
              lobbyLookup[socket.id] = message.data;
              break;
            case "hostedLobbyClosed":
              sendHub("hostedLobbyClosed", socket.id);
              delete lobbyLookup[socket.id];
              break;
          }
        } else {
          console.log("Is not a client");
        }
      } else {
        console.log("Client is out of date");
      }
    } catch (e) {
      console.error(e);
    }
  });

  socket.on("close", function () {
    if (req.url.match(/^\/[A-Za-z0-9_-]{21}$/)) {
      if (lobbyLookup[socket.id]) {
        sendHub("hostedLobbyClosed", socket.id);
        delete lobbyLookup[socket.id];
      }
      clientSockets.delete(socket);
      sendHub("clientSizeChange", clientSockets.size);
    } else {
      hubSockets.delete(socket);
    }
  });
});

function sendSocket(client, messageType, message) {
  client.send(JSON.stringify({ type: messageType, data: message }));
}

function sendHub(messageType, message) {
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
