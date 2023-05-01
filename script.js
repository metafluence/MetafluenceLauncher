$(document).ready(function () {
  function setVersionText(vtxt, option) {
    const versionSpans = document.getElementsByClassName("version_text");
    if (option == "public") {
      for (let index = 0; index < versionSpans.length; index++) {
        versionSpans[index].firstElementChild.textContent = "public " + vtxt;
      }
    } else {
      for (let index = 0; index < versionSpans.length; index++) {
        versionSpans[index].firstElementChild.textContent = "test " + vtxt;
      }
    }
  }

  function carouselHandler(clickedIndex) {
  const carousel = document.querySelectorAll("[data-carousel]");
  const activeSlide = carousel[0].querySelector("[data-active]");
  let newIndex = [...carousel[0].children].indexOf(activeSlide) + 1;
  if (newIndex >= carousel[0].children.length) newIndex = 0;

  if (clickedIndex != -1) {
    newIndex = clickedIndex;
  }

  carousel[0].children[newIndex].dataset.active = true;
  delete activeSlide.dataset.active;

  const selectionBoxes = document.querySelectorAll("[data-selection]");
  const activeBox = selectionBoxes[0].querySelector("[data-active]");
  selectionBoxes[0].children[newIndex].dataset.active = true;
  delete activeBox.dataset.active;

  const headers = [
    "Influencer-driven Metaverse",
    "Host Metaverse Events",
    "Showcase & Sell NFTs",
    "Take eCommerce to a whole new level",
  ];

  const infos = [
    "Become an Early Resident in Metafluence City by acquiring a Land Plot, " +
      "and monetize your virtual presence through hosting immersive events, showcasing digital art, social shopping, and many more!",
    "Host events, engage with your audience & build relationships in the hyper-realistic Metafluence City. Stand out with your virtual parties, meetings, and gatherings in the Event Room.",
    "Demonstrate your NFTs or put them up for sale in the NFT Room. Let your visitors wander around your personalized NFT Gallery.",
    "Establish a special marketplace for selling digital & physical products in the Shopping Room within a Metahut and collaborate with brands through sponsorships in Metafluence City.",
  ];

  document.getElementById("header").textContent = headers[newIndex];
  document.getElementById("info").textContent = infos[newIndex];
}
myFunc = setInterval(() => carouselHandler(-1), 30000);

let versionText;

// fetch("http://142.132.173.99/Version.txt", { cache: "no-cache" })
//   .then((response) => response.text())
//   .then((data) => (versionText = data))
//   .then(() => {
//     window.electronAPI.readVersion(versionText);
//     setVersionText(versionText, "public");
//     window.electronAPI.versionChange("public");
//   });


window.electronAPI.changeVersionText((event, vtxt, option) => {
  setVersionText(vtxt, option);
})

const updatePanels = document.getElementsByClassName("update_panel");

window.electronAPI.updatePanelStatus((event, status) => {
  for (let index = 0; index < updatePanels.length; index++) {
    if (updatePanels[index].hasAttribute("data-active")) {
      delete updatePanels[index].dataset.active;
    }
  }

  updatePanels[status].dataset.active = true;
});

window.electronAPI.fetchVersion((event, request) => {
  if (request == "public") {
    fetch("http://142.132.173.99/Version.txt", { cache: "no-cache" })
    .then((response) => response.text())
    .then((data) => (versionText = data))
    .then(() => {
      window.electronAPI.readVersion(versionText);
      window.electronAPI.versionChange("public");
    });
  }
  else{
    fetch("http://23.88.99.110/Version.txt", { cache: "no-cache" })
        .then((response) => response.text())
        .then((data) => (versionText = data))
        .then(() => {
          window.electronAPI.readVersion(versionText);
          window.electronAPI.versionChange("test");
        });
  }
});
  
const settingsButton = document.getElementById("settings");
settingsButton.addEventListener("click", function () {
  window.electronAPI.settingsButtonPressed(0);
})

const enterButton = document.getElementById("enter");
enterButton.addEventListener("click", function () {
  window.electronAPI.enterButtonPressed(0);
});

const updateButton = document.getElementById("update");
updateButton.addEventListener("click", function () {
  window.electronAPI.updateButtonPressed(1);
});

const installButton = document.getElementById("install");
installButton.addEventListener("click", function () {
  window.electronAPI.installButtonPressed(2);
});

const downloadBar = document.getElementById("download-bar");
window.electronAPI.showProgress((event, percentage) => {
  downloadBar.style.width = percentage.toString() + "%";
});

const phaseText = document.getElementById("phase");
window.electronAPI.changePhase((event, phase) => {
  phaseText.innerText = phase;
});

const sliderButtonFirst = document.getElementById("sld-first");
sliderButtonFirst.addEventListener("click", function () {
  carouselHandler(0);
});

const sliderButtonSecond = document.getElementById("sld-second");
sliderButtonSecond.addEventListener("click", function () {
  carouselHandler(1);
});

const sliderButtonThird = document.getElementById("sld-third");
sliderButtonThird.addEventListener("click", function () {
  carouselHandler(2);
});

const sliderButtonFourth = document.getElementById("sld-fourth");
sliderButtonFourth.addEventListener("click", function () {
  carouselHandler(3);
});

const closeButton = document.getElementById("close-button");
closeButton.addEventListener("click", function () {
  window.electronAPI.barButtonPressed(1); //(1-close, 0-minimize) (2-setting close)
});

const minimizeButton = document.getElementById("minimize-button");
minimizeButton.addEventListener("click", function () {
  window.electronAPI.barButtonPressed(0);
});

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
    if (option.dataset.value == "update") {
      //send update init
      window.electronAPI.checkUpdate(1);
    } else {
      //send uninstall request
      window.electronAPI.uninstall(1);
    }
  };
});
});