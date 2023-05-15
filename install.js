$(document).ready(function () {

    const closeButton = document.getElementById("close");
    closeButton.addEventListener("click", function() {
        window.electronAPI.barButtonPressed(3); // 1-app quit, 2-settings quit, 3-install quit, 0-minimize
    })
    
    const inputField = document.getElementById("loc");
    window.electronAPI.getInstallLocation((event, location) => {
        inputField.value = location;
    })

    const folderButton = document.getElementById("folder");
    folderButton.addEventListener("click", function() {
        window.electronAPI.folderButtonPressed(1); 
    })

    const installButton = document.getElementById("install");
    installButton.addEventListener("click", function() {
        window.electronAPI.installButtonPressed(3);
    })
})