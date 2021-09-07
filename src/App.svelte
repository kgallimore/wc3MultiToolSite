<script>
  export let name;
  let connected = "False";
  let message = "";
  let socket;
  let latestDownloadURL, latestVersion;

  function socketSetup() {
    socket = new WebSocket("ws://ws." + location.hostname);
    socket.addEventListener("open", function (event) {
      connected = "True";
      socket.send("Hello Server!");
    });

    // Listen for messages
    socket.addEventListener("message", function (event) {
      message = event.data;
      console.log("Message from server ", event.data);
    });
    socket.addEventListener("close", function (event) {
      connected = "False";
      message = "";
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
    Websockets Conected: {connected}
  </p>
  <p>
    Message: {message}
  </p>
</main>

<style>
</style>
