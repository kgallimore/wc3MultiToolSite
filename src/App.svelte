<script>
  export let name;
  let connected = "False";
  let clientSize = 0;
  let lobbies = {};
  let socket;
  let latestDownloadURL, latestVersion;

  function socketSetup() {
    socket = new WebSocket("wss://ws.trenchguns.com");

    socket.addEventListener("open", function (event) {
      connected = "True";
    });

    // Listen for messages
    socket.addEventListener("message", function (event) {
      let message = JSON.parse(event.data);
      switch (message.type) {
        case "hostedLobby":
          console.log("hosted!");
          lobbies[message.data] = encodeURI(message.data);
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
  <h1>Hello {name}!</h1>

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
  <p>
    Current Lobbies:<br />
    {#each Object.entries(lobbies) as [lobbyName, lobbyURL]}
      <a href="wc3mt://join?lobbyName={lobbyURL}">{lobbyName}</a><br />
    {/each}
  </p>
</main>

<style>
</style>
