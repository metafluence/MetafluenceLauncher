$(document).ready(function () {

    const reloadButton = document.getElementById("conn-reload");
    const cancelButton = document.getElementById("conn-cancel");

    reloadButton.addEventListener("click", function () {
        window.electronAPI.connectionButtonPressed(0); //(1-cancel, 0-reload) 
    });

    cancelButton.addEventListener("click", function () {
        window.electronAPI.connectionButtonPressed(1); //(1-cancel, 0-reload)
    });
});