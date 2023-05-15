const { contextBridge, ipcRenderer } = require('electron')

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
    fetchVersion: (request) => ipcRenderer.on('fetch-version', request),
    sendVersionToSettings: (type) => ipcRenderer.on('send-version', type),
    connectionButtonPressed: (pressed) => ipcRenderer.send('connection', pressed),
    restartRequest: () => ipcRenderer.send('restart-app'),
    updatedLauncher: (update) => ipcRenderer.on('updated', update),
    getInstallLocation: (location) => ipcRenderer.on('location', location),
    folderButtonPressed: (pressed) => ipcRenderer.send('f-button-press', pressed)
})