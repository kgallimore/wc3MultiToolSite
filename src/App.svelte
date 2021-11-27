<script>
  let connected = "False";
  let clientSize = 0;
  let lobbyLookup = {};
  let socket;
  let latestDownloadURL, latestVersion;

  function socketSetup() {
    if (window.location.hostname.substr(0, 3) == "dev") {
      socket = new WebSocket("wss://wsdev.trenchguns.com");
    } else {
      socket = new WebSocket("wss://ws.trenchguns.com");
    }

    socket.addEventListener("open", function (event) {
      connected = "True";
    });

    // Listen for messages
    socket.addEventListener("message", function (event) {
      let message = JSON.parse(event.data);
      switch (message.type) {
        case "hostedLobby":
          if (message.data.lobby.mapName.match(/(\|c[0-9abcdef]{8})/gi)) {
            message.data.lobby.mapNameClean = message.data.lobby.mapName.replace(
              /(\|c[0-9abcdef]{8})|(\|r)/gi,
              ""
            );
          } else {
            message.data.lobby.mapNameClean = message.data.lobby.mapName;
          }
          lobbyLookup[message.data.id] = message.data.lobby;
          break;
        case "hostedLobbyClosed":
          if (lobbyLookup[message.data]) {
            delete lobbyLookup[message.data];
            lobbyLookup = lobbyLookup;
          }
          break;
        case "lobbyUpdate":
          lobbyProcessedUpdate(message.data.socketID, message.data);
          break;
        case "clientSizeChange":
          clientSize = message.data;
          break;
      }
    });

    socket.addEventListener("close", function (event) {
      connected = "False";
      lobbyLookup = {};
      clientSize = 0;
      setTimeout(socketSetup, 1000);
    });
  }

  function lobbyProcessedUpdate(socketID, messageData) {
    let key = messageData.key;
    let value = messageData.value;
    let teamName = messageData.teamName || "";
    if (lobbyLookup[socketID] && lobbyLookup[socketID].processed) {
      if (["otherTeams", "playerTeams", "specTeams"].includes(key)) {
        lobbyLookup[socketID].processed.teamList[key].data[teamName].slots = value.slots;
        lobbyLookup[socketID].processed.teamList[key].data[teamName].players =
          value.players;
      } else if (key === "chatMessages") {
        lobbyLookup[socketID].processed.chatMessages = [
          ...lobbyLookup[socketID].processed.chatMessages,
          value,
        ];
      } else if (lobbyLookup[socketID].processed[key] !== value) {
        lobbyLookup[socketID].processed[key] = value;
      }
    }
  }
  function getLatestDownloadURL() {
    // read text from URL location
    var request = new XMLHttpRequest();
    request.open("GET", "https://war.trenchguns.com/publish/latest.yml", true);
    request.send(null);
    request.onreadystatechange = function () {
      if (request.readyState === 4 && request.status === 200) {
        latestVersion = request.responseText.split("\n")[2].split(": ")[1].trim();
        latestDownloadURL = latestVersion.replace(/\s/g, "%20");
      }
    };
  }
  getLatestDownloadURL();
  socketSetup();
</script>

<main>
  <p>
    {#if latestDownloadURL}
      <a href="/publish/{latestDownloadURL}">Download {latestVersion}</a>
    {:else}
      Could not fetch latest version download link
    {/if}
  </p>

  <p>
    {#if connected}Current users of Wc3 Multi-Tool: {clientSize}
    {:else}
      Websockets are down.
    {/if}
  </p>
  <table>
    <caption>Current Lobbies</caption>
    <thead>
      <tr>
        <th>Region</th>
        <th>Lobby Name/Link</th>
        <th>Map Name</th>
        <th>Host</th>
        <th style="width:25%">Players</th>
        <th style="width:25%">Chat</th>
      </tr>
    </thead>
    <tbody>
      {#each Object.values(lobbyLookup) as lobbyData}
        <tr>
          <td>{lobbyData.region}</td>
          <td>
            <a href="wc3mt://join?lobbyName={encodeURI(lobbyData.lobbyName)}"
              >{lobbyData.lobbyName}</a
            >
          </td>
          <td>
            {lobbyData.mapNameClean}
          </td>
          <td>{lobbyData.playerHost}</td>
          <td
            ><div style="display:flex; max-height: 50vh; overflow: auto;">
              <details style="width: 100%">
                <summary>
                  {#if lobbyData.teamData}
                    {lobbyData.teamData.filledPlayableSlots}/{lobbyData.teamData
                      .playableSlots}
                  {:else}
                    Waiting for data
                  {/if}</summary
                >
                {#each Object.entries(lobbyData.processed.teamList.playerTeams.data) as [teamName, teamData]}
                  <table>
                    <caption>{teamName}</caption>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>ELO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#if teamData.slots}
                        {#each teamData.slots as slot}
                          <tr>
                            <td>{slot}</td>
                            <td>
                              {#if lobbyData.processed.eloList && lobbyData.processed.eloList[slot]}
                                {lobbyData.processed.eloList[slot]}
                              {:else}
                                N/A
                              {/if}
                            </td>
                          </tr>
                        {/each}
                      {/if}
                    </tbody>
                  </table>
                {/each}
              </details>
            </div></td
          >
          <td>
            <div
              style="display:flex; max-height: 50vh; overflow: auto; flex-direction: column-reverse;"
            >
              <details style="width:100%">
                <summary> Expand Chat</summary>
                {#if lobbyData.processed.chatMessages && lobbyData.processed.chatMessages.length > 0}
                  {#each lobbyData.processed.chatMessages as message}
                    <p class="striped">
                      {message.sender}: {message.content}
                    </p>
                  {/each}
                {:else}
                  <p>No chat messages</p>
                {/if}
              </details>
            </div></td
          >
        </tr>
      {/each}
    </tbody>
  </table>
  <iframe
    title="wc3 Multi-Tol Discord"
    src="https://discord.com/widget?id=876867362593337365&theme=dark"
    width="350"
    height="350"
    allowtransparency="true"
    frameborder="0"
    sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
  />
</main>

<style>
</style>
