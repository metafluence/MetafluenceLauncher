$(document).ready(function () {

    testLI = document.getElementById("test");
    publicLI = document.getElementById("public");
    vText = document.getElementById("enter");
    updateButton = document.getElementById("launcher-updater");

    window.electronAPI.sendVersionToSettings((event ,version) => {
      vText.innerText = version.toUpperCase();
    });


    fetch("http://142.132.173.99/Version.txt", { cache: "no-cache" })
            .then((response) => response.text())
            .then((data) => (versionText = data))
            .then(() => {
                publicLI.innerText = "public version (v" + versionText + ")";
            });

    fetch("http://23.88.99.110/Version.txt", { cache: "no-cache" })
            .then((response) => response.text())
            .then((data) => (versionText = data))
            .then(() => {
                testLI.innerText = "test version (v" + versionText + ")";
            });


    const closeButton = document.getElementById("close");
    closeButton.addEventListener("click", function() {
        window.electronAPI.barButtonPressed(2);
    })
    
    const selectElements = document.querySelectorAll(".version-selector");
  
    for (let selectElement of selectElements) {
      selectElement.onclick = function () {
        let dropdown = this.nextElementSibling;
        if (dropdown.style.display === "none" || dropdown.style.display === "") {
          dropdown.style.display = "block";
        } else {
          dropdown.style.display = "none";
        }
      };
    }

    const options = document.querySelectorAll(".list-item");
  
    options.forEach((option) => {
      option.onclick = function () {
        let dropdown = this.parentElement.parentElement;
        dropdown.style.display = "none";
        if (option.dataset.value == "public") {
          vText.innerText = "PUBLIC";
          fetch("http://142.132.173.99/Version.txt", { cache: "no-cache" })
            .then((response) => response.text())
            .then((data) => (versionText = data))
            .then(() => {
              window.electronAPI.readVersion(versionText);
              window.electronAPI.versionChange("public");
            });
        } else {
          vText.innerText = "TEST";
          fetch("http://23.88.99.110/Version.txt", { cache: "no-cache" })
            .then((response) => response.text())
            .then((data) => (versionText = data))
            .then(() => {
              window.electronAPI.readVersion(versionText);
              window.electronAPI.versionChange("test");
            });
        }
      };
    });

    window.electronAPI.updatedLauncher((event, update) => {
      if (update == "check") {
        updateButton.innerText = "Checking for updates...";
      }
      else if (update == "noupdate") {
        updateButton.innerText = "Version is up-to-date";
      }
      else if (update == "update") {
        updateButton.disabled = false;
        updateButton.innerText = "Click to Restart for new version";
      }
      else {
        updateButton.innerText = update;
      }
    });

    updateButton.addEventListener("click", function() {
      updateButton.disabled = true;
      window.electronAPI.restartRequest();
    })
})