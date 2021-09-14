<script>
  let connected = "False";
  let clientSize = 0;
  let lobbies = {};
  let socket;
  let latestDownloadURL, latestVersion;
  function generateTables(lobby) {
    try {
      document.getElementById("tablesDiv").innerHTML = "";
      let tbl;
      Object.keys(lobby.processed.teamList.playerTeams.data).forEach(
        (playerTeam) => {
          tbl = document.createElement("table");
          tbl.classList.add(
            "table",
            "table-hover",
            "table-striped",
            "table-sm"
          );
          let trow = tbl.createTHead().insertRow();
          [`${playerTeam} Players`, "ELO"].forEach((label) => {
            let th = document.createElement("th");
            th.appendChild(document.createTextNode(label));
            trow.appendChild(th);
          });
          let tBody = tbl.createTBody();
          lobby.processed.teamList.playerTeams.data[playerTeam].slots.forEach(
            (player) => {
              let row = tBody.insertRow();
              row.insertCell().appendChild(document.createTextNode(player));
              let cell = row.insertCell();
              let text = document.createTextNode(
                lobby.processed.eloList && lobby.processed.eloList[player]
                  ? lobby.processed.eloList[player]
                  : "N/A"
              );
              cell.appendChild(text);
            }
          );
          document.getElementById("tablesDiv").appendChild(tbl);
        }
      );
    } catch (e) {
      console.error(e.message, e.stack);
    }
  }

  function socketSetup() {
    socket = new WebSocket("wss://wsdev.trenchguns.com");

    socket.addEventListener("open", function (event) {
      connected = "True";
    });

    // Listen for messages
    socket.addEventListener("message", function (event) {
      let message = JSON.parse(event.data);
      switch (message.type) {
        case "hostedLobby":
          if (message.data.lobby.mapName.match(/(\|c[0-9abcdef]{8})/gi)) {
            message.data.lobby.mapNameClean =
              message.data.lobby.mapName.replace(
                /(\|c[0-9abcdef]{8})|(\|r)/gi,
                ""
              );
          }
          lobbies[message.data.id] = message.data.lobby;
          break;
        case "hostedLobbyClosed":
          if (lobbies[message.data]) {
            delete lobbies[message.data];
            lobbies = lobbies;
          }
          break;
        case "clientSizeChange":
          console.log(message.data);
          clientSize = message.data;
          break;
      }
    });

    socket.addEventListener("close", function (event) {
      connected = "False";
      lobbies = {};
      clientSize = 0;
      setTimeout(socketSetup, 1000);
    });
  }
  function getLatestDownloadURL() {
    // read text from URL location
    var request = new XMLHttpRequest();
    request.open("GET", "https://war.trenchguns.com/publish/latest.yml", true);
    request.send(null);
    request.onreadystatechange = function () {
      if (request.readyState === 4 && request.status === 200) {
        latestVersion = request.responseText
          .split("\n")[2]
          .split(": ")[1]
          .trim();
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
      Could not fetch latest version
    {/if}
  </p>

  <p>
    Websockets up: {connected}
  </p>
  <p>
    Current users: {clientSize}
  </p>
  <table>
    <caption>Current Lobbies</caption>
    <thead>
      <tr>
        <th>Lobby Name/Link</th>
        <th>Map Name</th>
        <th>Host</th>
        <th style="width:25%">Players</th>
        <th style="width:25%">Chat</th>
      </tr>
    </thead>
    <tbody>
      {#each Object.values(lobbies) as lobbyData}
        <tr>
          <td>
            <a href="wc3mt://join?lobbyName={encodeURI(lobbyData.lobbyName)}"
              >{lobbyData.lobbyName}</a
            >
          </td>
          <td>
            {#if lobbyData.mapNameClean}
              {lobbyData.mapNameClean}
            {:else}
              {lobbyData.mapName}
            {/if}
          </td>
          <td>{lobbyData.playerHost}</td>
          <td
            ><details>
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
                    {#each teamData.slots as slot}
                      <tr>
                        <td>{slot}</td>
                        <td>
                          {#if lobbyData.processed.eloList[slot]}
                            {lobbyData.processed.eloList[slot]}
                          {:else}
                            N/A
                          {/if}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              {/each}
            </details></td
          >
          <td>
            <details>
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
            </details></td
          >
        </tr>
      {/each}
    </tbody>
  </table>
</main>

<style>
</style>
