<script>
  export let name;
  let latestDownloadURL, latestVersion;
  function getLatestDownload() {
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
  getLatestDownload();
</script>

<main>
  <h1>Hello {name}!</h1>
  <p>
    <a href="/publish/{latestDownloadURL}">Download {latestVersion}</a>
  </p>
</main>

<style>
</style>
