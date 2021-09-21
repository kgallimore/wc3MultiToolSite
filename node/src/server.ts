import * as ws from "ws";

const { nanoid } = require("nanoid");
const compareVersions = require("compare-versions");

const wss = new ws.WebSocketServer({ port: 5051 });

interface teamList {
  data: {
    [key: string]: {
      defaultOpenSlots: Array<number>;
      number: number;
      players: Array<string>;
      slots: Array<string>;
      totalSlots: number;
    };
  };
  lookup: {
    [key: number]: string;
  };
}

interface lobby {
  eloAvailable: boolean;
  isHost: boolean;
  lobbyName: string;
  lookupName: string;
  mapName: string;
  playerHost: string;
  region: "eu" | "us" | "kr";
  processed: {
    allLobby: Array<string>;
    allPlayers: Array<string>;
    chatMessages: Array<{ sender: string; content: string }>;
    eloList: { [key: string]: number };
    openPlayerSlots: number;
    teamList: {
      lookup: {
        [key: number]: {
          type: "playerTeams" | "otherTeams" | "specTeams";
          name: string;
        };
      };
      otherTeams: teamList;
      playerTeams: teamList;
      specTeams: teamList;
    };
    voteStartVotes: {};
  };
  teamData: {
    filledPlayableSlots: number;
    observerSlotsRemaining: number;
    playableSlots: number;
    teams: {
      [key: number]: {
        team: number;
        name: string;
        filledSlots: number;
        totalSlots: number;
      };
    };
  };
}

interface lobbyLookup {
  [key: string]: lobby;
}
let clientSockets = new Set();
let hubSockets = new Set();
let lobbyLookup = <lobbyLookup>{};
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
        } else {
          console.log("Client is out of date");
        }
      } catch (e) {
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
  } else {
    console.log(`New hub connected: ${socket.id}`);

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

function lobbyProcessedUpdate(socketID: string, messageData) {
  let key = messageData.key;
  let value = messageData.value;
  let teamName = messageData.teamName || "";
  console.log(`Updating lobby ${socketID} with ${key} ${value}`);
  if (lobbyLookup[socketID] && lobbyLookup[socketID].processed) {
    if (["otherTeams", "playerTeams", "specTeams"].includes(key)) {
      lobbyLookup[socketID].processed.teamList[key].data[teamName].slots = value.slots;
      lobbyLookup[socketID].processed.teamList[key].data[teamName].players =
        value.players;
      console.log(lobbyLookup[socketID].processed.teamList[key].data[teamName].players);
      console.log(lobbyLookup[socketID].processed.teamList[key].data[teamName].slots);

      sendToHub("lobbyUpdate", { socketID, key, value, teamName });
    } else if (key === "chatMessages") {
      lobbyLookup[socketID].processed.chatMessages.push(value);
      sendToHub("lobbyUpdate", { socketID, key, value });
    } else if (lobbyLookup[socketID].processed[key] !== value) {
      lobbyLookup[socketID].processed[key] = value;
      sendToHub("lobbyUpdate", { socketID, key, value });
    }
  }
}

function sendSocket(client, messageType, message) {
  client.send(JSON.stringify({ type: messageType, data: message }));
}

function sendToHub(messageType, message) {
  hubSockets.forEach(function each(client: ws.WebSocket) {
    if (client.readyState === ws.WebSocket.OPEN && !clientSockets.has(client)) {
      sendSocket(client, messageType, message);
    }
  });
}

function sendClients(messageType, message) {
  hubSockets.forEach(function each(client: ws.WebSocket) {
    if (client.readyState === ws.WebSocket.OPEN && !clientSockets.has(client)) {
      sendSocket(client, messageType, message);
    }
  });
}
console.log("Server started");
