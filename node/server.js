const ws = require("ws");

const wss = new ws.WebSocketServer({ port: 5051 });

wss.on("connection", function connection(socket) {
  socket.on("message", function incoming(message) {
    console.log("received: %s", message);
  });

  socket.send("something!");
});

console.log("Server started");
