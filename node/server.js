const ws = require("ws");

const wss = new ws.WebSocketServer({ port: 5051 });
let clientSockets = new Set();
let hubSockets = new Set();
let hostedLobbies = new Set();
let lobbyLookup = {};
wss.on("connection", function connection(socket, req) {
  if (req.url.match(/^\/[A-Za-z0-9_-]{21}$/)) {
    clientSockets.add(socket);
    sendHub("clientSizeChange", clientSockets.size);
  } else {
    hubSockets.add(socket);
    sendSocket(socket, "clientSizeChange", clientSockets.size);
    hostedLobbies.forEach(function each(lobby) {
      sendSocket(socket, "hostedLobby", lobby);
    });
  }

  socket.on("message", function incoming(message) {
    message = JSON.parse(message);
    if (clientSockets.has(socket)) {
      switch (message.type) {
        case "hostedLobby":
          sendHub("hostedLobby", message.data);
          lobbyLookup[socket.id] = message.data;
          hostedLobbies.add(message.data);
          break;
        case "hostedLobbyClosed":
          sendHub("hostedLobbyClosed", message.data);
          hostedLobbies.delete(message.data);
          delete lobbyLookup[socket.id];
          break;
      }
    }
  });

  socket.on("close", function () {
    if (req.url.match(/^\/[A-Za-z0-9_-]{21}$/)) {
      if (lobbyLookup[socket.id]) {
        hostedLobbies.delete(lobbyLookup[socket.id]);
        sendHub("hostedLobbyClosed", lobbyLookup[socket.id]);
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
