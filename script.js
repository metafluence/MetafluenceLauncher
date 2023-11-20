$(document).ready(function () {
  function setVersionText(vtxt, option) {
    const versionSpans = document.getElementsByClassName("version-current");
    if (option == "public") {
      for (let index = 0; index < versionSpans.length; index++) {
        versionSpans[index].textContent = "Current version: public (" + vtxt + ")";
      }
    } else {
      for (let index = 0; index < versionSpans.length; index++) {
        versionSpans[index].textContent = "Current version: test (" + vtxt + ")";
      }
    }
  }

  function FetchEventData(eventID) {
    var container = document.getElementsByClassName("event-modal_info");
    var url = "https://app.metafluence.com/api/v1/public/api/_web3/event/" + eventID;
    fetch(url)
      .then(response => response.json())
      .then(data => {
        let eventDetailsDiv = document.createElement('div');
        eventDetailsDiv.className = "event-modal_info";
        eventDetailsDiv.innerHTML = `
        <img src="${data.data.cover_image}" alt="" class="event-modal_cover">
                                <h3 class="event-modal_name">${data.data.name}</h3>
                                <div class="event-modal_actions">
                                    <span class="event-modal_author">by @${data.data.username}</span>
                                    <div class="line-y"></div>
                                    <span class="event-modal_status">${data.data.status}</span>
                                </div>
                                <p class="event-modal_text">
                                    ${data.data.description}
                                </p>
                                <div class="event-modal_price">
                                    <div class="event-modal_prize">
                                        <img src="./assets/img/gift.svg" alt="">
                                        <div class="event-modal_coin">
                                            <img src="./assets/img/soto.svg" alt="">
                                            <span>${data.data.reward_value}</span>
                                        </div>
                                    </div>
                                    <div class="line-y"></div>
                                    <div class="event-modal_ticket">
                                        <img src="./assets/img/ticket.svg" alt="">
                                        <div class="event-modal_coin">
                                            <img src="./assets/img/soto.svg" alt="">
                                            <span>${data.data.ticket_value}</span>
                                        </div>
                                    </div>
                                </div>`
        while (container[0].firstChild) {
          container[0].removeChild(container[0].firstChild);
        }
        container[0].appendChild(eventDetailsDiv);

        //update want to go button
        let goBtn = document.getElementById("goBtn");
        goBtn.addEventListener("click", function () {
          window.open('https://app.metafluence.com/event/' + eventID, '_blank');
          setTimeout(function () {
            for (let index = 0; index < modalContents.length; index++) {
              if (modalContents[index].hasAttribute("data-active")) {
                delete modalContents[index].dataset.active;
              }
            }
            modalContents[2].dataset.active = true;
          }, 600);
        }, {once: true});

        for (let index = 0; index < modalContents.length; index++) {
          if (modalContents[index].hasAttribute("data-active")) {
            delete modalContents[index].dataset.active;
          }
        }
        modalContents[4].dataset.active = true;

        settingsButton.click();
      })
  }

  //Get eventCard data
  let eventContainer = document.getElementsByClassName("event-slider");
  function CreateEventCard(eventTitle, imageUrl, status, eventID) {
    let eventCard = document.createElement('li');
    eventCard.innerHTML = `
      <div class="tns-box">
        <div class="event-status live"><span></span> ${status}</div>
        <img class="tns-lazy" src="${imageUrl}">
        <h3 class="event-name">${eventTitle}</h3>
      </div>
      `;
    eventCard.addEventListener("click", function () {
      FetchEventData(eventID);
    })
    eventContainer[0].appendChild(eventCard);
  }

  // Perform an HTTP request to get all events
  fetch('https://app.metafluence.com/api/v1/public/api/_web3/event/list')
    .then(response => response.json())
    .then(data => {
      // Assuming the data is an array of objects with success and data properties
      if (data.data.length == 0) {
        let eventsHeader = document.getElementsByClassName("events-header");
        Array.from(eventsHeader).forEach(div => {
          div.style.display = "none";
        });
      }
      data.data.forEach(event => {
        CreateEventCard(event.name, event.cover_image, event.status, event.id);
      });
      let slider = tns({
        mode: 'carousel', // or 'gallery'
        mouseDrag: true,
        navPosition: "bottom",
        gutter: 48,
        loop: true,
        // edgePadding: 50,
        // center: true,
        items: 1,
        fixedWidth: 285,
        nav: false,
        controlsContainer: "#custom_controlsContainer",
        prevButton: '#prev',
        nextButton: '#next', // String selector
        arrowKeys: true, // keyboard support
        lazyload: true,
        autoplay: true,
        speed: 900,
        autoplayButtonOutput: false,
        autoplayHoverPause: false,
        responsive: {
          "350": {
            "items": 1,
            "controls": true,
            "edgePadding": 30
          },
          "500": {
            "items": 2
          }
        },
        rewind: true,
      });
    })
    .catch(error => {
      console.error('Error fetching data:', error);

      let eventsHeader = document.getElementsByClassName("events-header");
      Array.from(eventsHeader).forEach(div => {
        div.style.display = "none";
      });
    });

  const appVersionTxt = document.getElementById("version-text");
  window.electronAPI.getAppVersion((event, version) => {
    appVersionTxt.textContent = "Launcher ver. " + version;
  });

  let versionText;

  let currentFunctionality = 0; //1-play, 2-update, 3-install

  window.electronAPI.changeVersionText((event, vtxt, option) => {
    setVersionText(vtxt, option);
  })

  let versionNote = document.getElementById("version-note");
  const updatePanels = document.getElementsByClassName("update_panel");
  const navbarDropdown = document.getElementById("navbarDropdown");
  const settingsButton = document.getElementById("btn-settings");
  const uninstallBtn = document.getElementById("uninstall-app");
  const checkUpdateSettingsBtn = document.getElementById("update-check");
  const eventCloseBtn = document.getElementById("event-close");

  eventCloseBtn.addEventListener("click", function () {
    setTimeout(function () {
      for (let index = 0; index < modalContents.length; index++) {
        if (modalContents[index].hasAttribute("data-active")) {
          delete modalContents[index].dataset.active;
        }
      }
      modalContents[2].dataset.active = true;
    }, 600);
  });

  window.electronAPI.updatePanelStatus((event, status) => {
    for (let index = 0; index < updatePanels.length; index++) {
      if (updatePanels[index].hasAttribute("data-active")) {
        delete updatePanels[index].dataset.active;
      }
    }

    updatePanels[status].dataset.active = true;
    switch (status) {
      case 0:
        versionNote.textContent = "Version is up to date. Enter the Metafluence now.";
        currentFunctionality = 1
        navbarDropdown.disabled = false;
        uninstallBtn.disabled = false;
        checkUpdateSettingsBtn.disabled = false;
        break;

      case 1:
        versionNote.textContent = "New version of the app is available.";
        currentFunctionality = 2;
        navbarDropdown.disabled = false;
        uninstallBtn.disabled = false;
        checkUpdateSettingsBtn.disabled = false;
        break;

      case 2:
        versionNote.textContent = "Install the app to enter the Metafluence.";
        currentFunctionality = 3;
        navbarDropdown.disabled = false;
        uninstallBtn.disabled = false;
        checkUpdateSettingsBtn.disabled = false;
        break;

      case 3:
        versionNote.textContent = "Downloading...";
        navbarDropdown.disabled = true;
        uninstallBtn.disabled = true;
        checkUpdateSettingsBtn.disabled = true;
        currentFunctionality = 0;
        break;

      default:
        break;
    }
  });

  window.electronAPI.fetchVersion((event, request, platform) => {
    if (request == "public") {
      if (platform === "win32") {
        fetch("http://128.140.45.21/Version.txt", { cache: "no-cache" })
          .then((response) => response.text())
          .then((data) => (versionText = data))
          .then(() => {
            window.electronAPI.readVersion(versionText);
            window.electronAPI.versionChange("public");
          });
      }
      if (platform === "darwin") {
        fetch("http://128.140.45.21/Mac/Version.txt", { cache: "no-cache" })
          .then((response) => response.text())
          .then((data) => (versionText = data))
          .then(() => {
            window.electronAPI.readVersion(versionText);
            window.electronAPI.versionChange("public");
          });
      }
    }
    else {
      if (platform === "win32") {
        fetch("http://94.130.76.49/Version.txt", { cache: "no-cache" })
          .then((response) => response.text())
          .then((data) => (versionText = data))
          .then(() => {
            window.electronAPI.readVersion(versionText);
            window.electronAPI.versionChange("test");
          });
      }
      if (platform === "darwin") {
        fetch("http://94.130.76.49/Mac/Version.txt", { cache: "no-cache" })
          .then((response) => response.text())
          .then((data) => (versionText = data))
          .then(() => {
            window.electronAPI.readVersion(versionText);
            window.electronAPI.versionChange("test");
          });
      }
    }
  });

  const installButton = document.getElementById("openUpdateModal");
  installButton.addEventListener("click", function () {
    switch (currentFunctionality) {
      case 1:
        window.electronAPI.enterButtonPressed(0);
        break;

      case 2:
        window.electronAPI.updateButtonPressed(1);
        break;

      case 3:
        window.electronAPI.installButtonPressed(2);
        break;

      default:
        break;
    }
  });

  const circularProgress = document.querySelectorAll(".circular-progress");
  let progressValue;
  let innerCircle;
  let startValue;
  let endValue;
  let progressColor;
  let pb;

  Array.from(circularProgress).forEach((progressBar) => {
    progressValue = progressBar.querySelector(".percentage");
    innerCircle = progressBar.querySelector(".inner-circle");
    startValue = 0;
    endValue = Number(progressBar.getAttribute("data-percentage"));
    progressColor = progressBar.getAttribute("data-progress-color");
    pb = progressBar;
  });

  window.electronAPI.showProgress((event, percentage) => {
    startValue = percentage;
    progressValue.textContent = `${startValue}`;
    progressValue.style.color = `${progressColor}`;

    innerCircle.style.backgroundColor = `${pb.getAttribute(
      "data-inner-circle-color"
    )}`;

    pb.style.background = `conic-gradient(${progressColor} ${startValue * 3.6
      }deg,${pb.getAttribute("data-bg-color")} 0deg)`;
    if (startValue === endValue) {
      progressValue.innerHTML = "<img src=\"assets/img/done.gif\" width=\"20px\" height=\"20px\">";
    }
  });

  window.electronAPI.changePhase((event, phase) => {
    versionNote.textContent = phase;
  });

  const closeButton = document.getElementById("close-button");
  closeButton.addEventListener("click", function () {
    window.electronAPI.barButtonPressed(1); //(1-close, 0-minimize) (2-setting close)
  });

  const minimizeButton = document.getElementById("minimize-button");
  minimizeButton.addEventListener("click", function () {
    window.electronAPI.barButtonPressed(0);
  });

  let testLI, publicLI, vText, platformCopy;

  window.electronAPI.sendVersionToSettings((event, version, platform) => {
    testLI = document.getElementById("test");
    publicLI = document.getElementById("public");
    vText = document.getElementsByClassName("dropdown-toggle");
    vText[0].innerText = version[0].toUpperCase() + version.slice(1) + " version";
    platformCopy = platform;
    if (platform === "win32") {
      fetch("http://128.140.45.21/Version.txt", { cache: "no-cache" })
        .then((response) => response.text())
        .then((data) => (versionText = data))
        .then(() => {
          publicLI.innerText = "public version (v" + versionText + ")";
        });

      fetch("http://94.130.76.49/Version.txt", { cache: "no-cache" })
        .then((response) => response.text())
        .then((data) => (versionText = data))
        .then(() => {
          testLI.innerText = "test version (v" + versionText + ")";
        });
    }
    if (platform === "darwin") {
      fetch("http://128.140.45.21/Mac/Version.txt", { cache: "no-cache" })
        .then((response) => response.text())
        .then((data) => (versionText = data))
        .then(() => {
          publicLI.innerText = "public version (v" + versionText + ")";
        });

      fetch("http://94.130.76.49/Mac/Version.txt", { cache: "no-cache" })
        .then((response) => response.text())
        .then((data) => (versionText = data))
        .then(() => {
          testLI.innerText = "test version (v" + versionText + ")";
        });
    }
  });

  const options = document.querySelectorAll(".dropdown-item");

  options.forEach((option) => {
    option.onclick = function () {
      if (option.dataset.value == "public") {
        vText[0].innerText = "Public version";
        if (platformCopy === "win32") {
          fetch("http://128.140.45.21/Version.txt", { cache: "no-cache" })
            .then((response) => response.text())
            .then((data) => (versionText = data))
            .then(() => {
              window.electronAPI.readVersion(versionText);
              window.electronAPI.versionChange("public");
            });
        }
        if (platformCopy === "darwin") {
          fetch("http://128.140.45.21/Mac/Version.txt", { cache: "no-cache" })
            .then((response) => response.text())
            .then((data) => (versionText = data))
            .then(() => {
              window.electronAPI.readVersion(versionText);
              window.electronAPI.versionChange("public");
            });
        }
      } else {
        vText[0].innerText = "Test version";
        if (platformCopy === "win32") {
          fetch("http://94.130.76.49/Version.txt", { cache: "no-cache" })
            .then((response) => response.text())
            .then((data) => (versionText = data))
            .then(() => {
              window.electronAPI.readVersion(versionText);
              window.electronAPI.versionChange("test");
            });
        }
        if (platformCopy === "darwin") {
          fetch("http://94.130.76.49/Mac/Version.txt", { cache: "no-cache" })
            .then((response) => response.text())
            .then((data) => (versionText = data))
            .then(() => {
              window.electronAPI.readVersion(versionText);
              window.electronAPI.versionChange("test");
            });
        }
      }
    };
  });

  const modalContents = document.getElementsByClassName("modal-content");
  const reloadButton = document.getElementById("reload");
  const connectionCloseBtn = document.getElementById("connection-close");

  window.electronAPI.connectionLost((event, status) => {
    if (status == 0) {
      for (let index = 0; index < modalContents.length; index++) {
        if (modalContents[index].hasAttribute("data-active")) {
          delete modalContents[index].dataset.active;
        }
      }
      modalContents[2].dataset.active = true;
    }
    else {
      for (let index = 0; index < modalContents.length; index++) {
        if (modalContents[index].hasAttribute("data-active")) {
          delete modalContents[index].dataset.active;
        }
      }
      modalContents[3].dataset.active = true;

      settingsButton.click();
    }
  })

  reloadButton.addEventListener("click", function () {
    window.electronAPI.connectionButtonPressed(0); //(1-cancel, 0-reload) 
  });

  connectionCloseBtn.addEventListener("click", function () {
    window.electronAPI.connectionButtonPressed(1); //(1-cancel, 0-reload)
  });


  //launcher Update mechanism
  const updateProgressBar = document.getElementById("progress");
  const progressArea = document.getElementById("prg-area");
  window.electronAPI.updatedLauncher((event, update) => {
    if (update == "update") {
      for (let index = 0; index < modalContents.length; index++) {
        if (modalContents[index].hasAttribute("data-active")) {
          delete modalContents[index].dataset.active;
        }
      }
      modalContents[0].dataset.active = true;

      settingsButton.click();
    }
    else {
      updateProgressBar.style.width = update + "%";
    }
  });

  const launcherUpdateBtn = document.getElementById("updateBtn");
  launcherUpdateBtn.addEventListener("click", function () {
    window.electronAPI.restartRequest();
    progressArea.style.transform = 'translateX(0)';
    uninstallBtn.disabled = true;
    checkUpdateSettingsBtn.disabled = true;
    installButton.disabled = true;
  });


  //intall loc choice 
  const inputField = document.getElementById("loc");
  window.electronAPI.getInstallLocation((event, location) => {
    inputField.value = location;
  });

  const folderButton = document.getElementById("folder");
  folderButton.addEventListener("click", function () {
    window.electronAPI.folderButtonPressed(1);
  });

  const confirmButton = document.getElementById("confirm");
  const installClose = document.getElementById("close-install");

  installClose.addEventListener("click", function () {
    for (let index = 0; index < modalContents.length; index++) {
      if (modalContents[index].hasAttribute("data-active")) {
        delete modalContents[index].dataset.active;
      }
    }
    modalContents[2].dataset.active = true;
  });

  confirmButton.addEventListener("click", function () {
    window.electronAPI.installButtonPressed(3);
    currentFunctionality = 0;
    for (let index = 0; index < modalContents.length; index++) {
      if (modalContents[index].hasAttribute("data-active")) {
        delete modalContents[index].dataset.active;
      }
    }
    modalContents[2].dataset.active = true;
    navbarDropdown.disabled = true;
    uninstallBtn.disabled = true;
    checkUpdateSettingsBtn.disabled = true;
    installClose.click();
  });

  window.electronAPI.chooseInstallLoc((event, loc) => {
    for (let index = 0; index < modalContents.length; index++) {
      if (modalContents[index].hasAttribute("data-active")) {
        delete modalContents[index].dataset.active;
      }
    }
    modalContents[1].dataset.active = true;

    settingsButton.click();
  });

  //uninstall - check update
  const settingsCloseBtn = document.getElementById("settings-close");

  uninstallBtn.addEventListener("click", function () {
    window.electronAPI.uninstall(1);
    settingsCloseBtn.click();
  })

  checkUpdateSettingsBtn.addEventListener("click", function () {
    window.electronAPI.checkUpdate(1);
    settingsCloseBtn.click();
  })

});
