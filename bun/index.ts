import type { ServerWebSocket } from "bun";
import {randomUUID} from 'crypto';
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

let hubSockets = new Set<
  ServerWebSocket<{
    id: string;
    authToken: string;
  }>
>();
let lobbyLookup = <lobbyLookup>{};

const server = Bun.serve<{ authToken: string; id: string }>({
  fetch(req, server) {
    const success = server.upgrade(req);
    if (success) {
      // Bun automatically returns a 101 Switching Protocols
      // if the upgrade succeeds
      return undefined;
    }
    const url = new URL(req.url);
    if(url.pathname === "/api/ip"){
        return Response.json({ip:server.requestIP(req)?.address});
    }
    return Response.redirect('https://war.trenchguns.com');
},
  websocket: {
    perMessageDeflate: true,
    // this is called when a message is received
    async message(ws, message) {
        // TODO: Add message handling
    },
    async close(ws) {
      hubSockets.delete(ws);
    },
    async open(ws) {
      ws.data.id = randomUUID();
      hubSockets.add(ws);
    },
  },
  port: 5051,
});

console.log(`Listening on ${server.hostname}:${server.port}`);

function sendToHub(messageType: string, message: string | number) {
  server.publish("hub", JSON.stringify({ type: messageType, data: message }));
}
