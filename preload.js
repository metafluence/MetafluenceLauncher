const { contextBridge, ipcRenderer } = require('electron')

//from main process to other part - use on
//from other parts to main process - use send

contextBridge.exposeInMainWorld('electronAPI', {
    readVersion: (version) => ipcRenderer.send('read-version', version),
    updatePanelStatus: (status) => ipcRenderer.on('update-status', status),
    enterButtonPressed: (pressed) => ipcRenderer.send('button-press', pressed),
    updateButtonPressed: (pressed) => ipcRenderer.send('button-press', pressed),
    installButtonPressed: (pressed) => ipcRenderer.send('button-press', pressed),
    showProgress: (percentage) => ipcRenderer.on('send-progress', percentage),
    changePhase: (phase) => ipcRenderer.on('send-phase', phase),
    barButtonPressed: (button) => ipcRenderer.send('close-pressed', button),
    versionChange: (option) => ipcRenderer.send('version-selected', option),
    settingsButtonPressed: (pressed) =>ipcRenderer.send('s-button-press', pressed),
    changeVersionText: (vtxt, option) => ipcRenderer.on('version-text-changed', vtxt, option),
    uninstall: (request) => ipcRenderer.send('uninstall-request', request),
    checkUpdate: (request) => ipcRenderer.send('update-check-request', request),
    fetchVersion: (request, platform) => ipcRenderer.on('fetch-version', request, platform),
    sendVersionToSettings: (type, platform) => ipcRenderer.on('send-version', type, platform),
    connectionButtonPressed: (pressed) => ipcRenderer.send('connection', pressed),
    restartRequest: () => ipcRenderer.send('restart-app'),
    updatedLauncher: (update) => ipcRenderer.on('updated', update),
    getInstallLocation: (location) => ipcRenderer.on('location', location),
    folderButtonPressed: (pressed) => ipcRenderer.send('f-button-press', pressed),
    connectionLost: (status) => ipcRenderer.on('lost-connection', status),   // status - 0 (not lost), 1 (lost)
    chooseInstallLoc: (loc) => ipcRenderer.on('choose-location', loc),
    getAppVersion: (version) => ipcRenderer.on('get-app-version', version),
    clearCache: () => ipcRenderer.send('clear-cache')
})