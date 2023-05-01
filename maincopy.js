const path = require("path");
const { app, dialog, BrowserWindow, ipcMain, ipcRenderer, shell } = require("electron");
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const { log } = require("console");
const Store = require("electron-store");
const http = require("http");
var DecompressZip = require("decompress-zip");
var exec = require("child_process").spawn;

let mw;
let sw;
let cw;
let installInProgress = false;
let versiontxt;
let versionType = "public";
const store = new Store();
let savePathCopy;
let fileExists = false;
let settingsOpened = false;

function CreateMainWindow() {
    const mainWindow = new BrowserWindow({
        title: 'Metafluence Launcher',
        width: 750,
        height: 550,
        frame: false,

        webPreferences: {
            preload: path.join(__dirname, '/preload.js')
        },
        resizable: false,
        maximizable: false
    });

    //remove toolbar from windows
    mainWindow.setMenuBarVisibility(false);

    // mainWindow.webContents.openDevTools();
    mainWindow.loadFile(path.join(__dirname, '/index.html'));

    //Opening links in OS default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    })

    mw = mainWindow;
}

function CreateSettingsWindow() {
    const sWindow = new BrowserWindow({
        width: 328,
        height: 246,
        frame: false,

        webPreferences: {
            preload: path.join(__dirname, '/preload.js')
        },
        resizable: false,
        maximizable: false
    });

    sWindow.setMenuBarVisibility(false);

    //sWindow.webContents.openDevTools();
    sWindow.loadFile(path.join(__dirname, '/settings.html'));

    sw = sWindow;

}

function CreateConnectionWindow() {
    const cWindow = new BrowserWindow({
        width: 328,
        height: 210,
        frame: false,
        alwaysOnTop: true,

        webPreferences: {
            preload: path.join(__dirname, '/preload.js')
        },
        resizable: false,
        maximizable: false
    });

    cWindow.setMenuBarVisibility(false);

    //cWindow.webContents.openDevTools();
    cWindow.loadFile(path.join(__dirname, '/connection.html'));

    cw = cWindow;
}

function downloadFile(webFile, filePath, savePath, stat, version) {
    //webfile - downloaded file
    //filePath - version.txt file path
    //savePath - download location
    //stat - stat = 0 (download), stat = 1 (update)

    // Save variable to know progress
    var received_bytes = 0;
    var total_bytes = 0;

    const startTime = Date.now();

    try {
        var req = http.get(webFile, function (response) {
            var file = fs.createWriteStream(savePath);
            response.pipe(file);
            savePathCopy = savePath;
    
            response.on('data', chunk => {
                const elapsedTime = Date.now() - startTime;
                received_bytes += chunk.length;
                var downloadSpeed = (received_bytes / (1024 * elapsedTime / 1000)).toFixed(2);
                var dataRate = "kBps";
                if (downloadSpeed >= 100) {
                    downloadSpeed = (downloadSpeed / 1024).toFixed(2);
                    dataRate = "MBps"
                }
                if (!mw.isDestroyed()) {
                    mw.webContents.send('send-progress', showProgress(received_bytes, total_bytes));
                    mw.webContents.send('send-phase', "Downloading... " + (received_bytes / 1e9).toFixed(2) + "/" + (total_bytes / 1e9).toFixed(2) + " GB  (" + downloadSpeed + " " + dataRate + ")");
                }
            })
    
            response.on('end', () => {
                console.log("File succesfully downloaded");
    
                extractFiles(filePath, savePath, stat, version);
                mw.webContents.send('send-phase', "Extracting files...");
    
            });
    
            response.on('error', () => {
                //response error
                file.close();
                if (fs.existsSync(savePath)) {
                    fs.rmdirSync(path.join(savePath, ".."), {recursive: true},(err) => {
                        if (err) {
                            console.log(err);
                        }
                    })
                }
            })
        });
    } catch (error) {
        console.log(error);
    }

    // Change the total bytes value to get progress later.
    try {
        req.on('response', data => {
            total_bytes = parseInt(data.headers['content-length']);
            mw.webContents.send('update-status', 4);
        });
    } catch (error) {
        console.log(error);
    }

    req.on('error', () => {
        if (fs.existsSync(savePath)) {
            fs.rmdirSync(path.join(savePath, ".."), {recursive: true},(err) => {
                if (err) {
                    console.log(err);
                }
            })
        }
    })
}

function showProgress(received, total) {
    var percentage = (received * 100) / total;

    return percentage;
}

function extractFiles(filePath, savePath, stat, version) {
    var unzipper = new DecompressZip(savePath);

    unzipper.on('error', function (err) {
        console.log(err);
    });

    unzipper.on('extract', function (log) {
        console.log('Finished extracting');

        fs.writeFile(filePath, versiontxt, function (err) {
            if (err) throw err;
            console.log('Saved');
            mw.webContents.send('update-status', 0);
            installInProgress = false;
            savePathCopy = "";

            if (stat == 0) {
                if (version == "test") {
                    store.set('downloadfileTest', path.join(savePath, ".."));
                }
                else {
                    store.set('downloadfilePublic', path.join(savePath, ".."));
                }
            }
        })

        if (fs.existsSync(savePath)) {
            fs.unlink(savePath, (err) => {
                if (err) {
                    console.log("Error");
                }
            })
        }

    });

    unzipper.on('progress', function (fileIndex, fileCount) {
        mw.webContents.send('send-progress', showProgress(fileIndex, fileCount));
    });

    unzipper.extract({
        path: path.join(savePath, ".."),
        filter: function (file) {
            return file.type !== "SymbolicLink";
        }
    });
}

function checkInternetConnection() {
    http.get('http://www.google.com', (res) => {
      if (typeof cw !== "undefined" && !cw.isDestroyed()) {
        cw.close();
        let emptyWindow;
        cw = emptyWindow;
        if(store.has('lastSelectedVersion')) {
            mw.webContents.send('fetch-version', store.get('lastSelectedVersion'));
        }
        else{
            mw.webContents.send('fetch-version', "public");
        }
      }
      if (!mw.isDestroyed()) {
            mw.setIgnoreMouseEvents(false);
      }
    }).on('error', (err) => {
        if (typeof cw === "undefined") {
            if (!mw.isDestroyed() && !mw.isMinimized() && mw.isFocused()) {
                CreateConnectionWindow();
                mw.setIgnoreMouseEvents(true);
            }
        }

        if(installInProgress)
        {
            if (fs.existsSync(savePathCopy)) {
                fs.rmdirSync(path.join(savePathCopy, ".."), {recursive: true},(err) => {
                    if (err) {
                        console.log(err);
                    }
                })
            }
            installInProgress = false;
        }
    });
}

app.on('before-quit', () => {
    if (installInProgress) {
        if (fs.existsSync(savePathCopy)) {
            fs.rmdirSync(path.join(savePathCopy, ".."), {recursive: true},(err) => {
                if (err) {
                    console.log(err);
                }
            })
        }
    }
})

app.whenReady().then(() => {

    autoUpdater.checkForUpdatesAndNotify();

    //get default path for installation - currently user's program files
    defaultPath = path.join(process.env.USERPROFILE, 'Program Files');

    if (typeof mw === "undefined") {
        CreateMainWindow();
    }

    setInterval(checkInternetConnection, 2000);

    ipcMain.on('connection', (event, pressed) => {
        if (pressed == 0) {
            cw.close();
            let emptyWindow;
            cw = emptyWindow;
            //checkInternetConnection();
        }
        if (pressed == 1) {
            app.quit();
        }
    })

    ipcMain.on('close-pressed', (event, button) => {
        if (button == 1) {
            if (installInProgress) {
                dialog.showMessageBox({
                    type: 'warning',
                    buttons: ['Back', 'Yes'],
                    cancelId: 1,
                    defaultId: 0,
                    title: 'Warning',
                    detail: 'Installation is in progress. Are you sure?'
                }).then(({ response, checkboxChecked }) => {
                    console.log(`response: ${response}`)
                    if (response) {
                        app.quit()
                    }
                })
            }
            else {
                app.quit();
            }
        }
        if (button == 0) {
            mw.minimize();
        }
        if (button == 2) {
            sw.close();
            settingsOpened = false;
        }
    })

    // mw.on('close', e => {
    //     if (installInProgress) {
    //         e.preventDefault()
    //         dialog.showMessageBox({
    //             type: 'warning',
    //             buttons: ['Back', 'Yes'],
    //             cancelId: 1,
    //             defaultId: 0,
    //             title: 'Warning',
    //             detail: 'Installation is in progress. Are you sure?'
    //         }).then(({ response, checkboxChecked }) => {
    //             console.log(`response: ${response}`)
    //             if (response) {
    //                 mw.destroy()
    //                 app.quit()
    //             }
    //         })
    //     }
    //     else {
    //         mw.destroy();
    //         app.quit();
    //     }
    // })

    ipcMain.on('s-button-press', (event, pressed) => {
        if (pressed == 0 && !installInProgress) {
            if (!settingsOpened) {
                CreateSettingsWindow();
                settingsOpened = true;
                sw.webContents.on('did-finish-load', () => {
                    sw.webContents.send('send-version', versionType);
                })
            }
        }
        else {
            dialog.showMessageBox({
                type: 'warning',
                buttons: ['OKAY'],
                cancelId: 0,
                defaultId: 0,
                title: 'Warning',
                detail: 'Settings is not available during a download'
            }).then(({ response, checkboxChecked }) => {

            })
        }
    })

    mw.webContents.on('did-finish-load', () => {
        if(store.has('lastSelectedVersion')) {
            mw.webContents.send('fetch-version', store.get('lastSelectedVersion'));
        }
        else{
            mw.webContents.send('fetch-version', "public");
        }
    })

    ipcMain.on('read-version', (event, version) => {
        versiontxt = version;
        console.log(versiontxt);
    })

    let filePath;
    ipcMain.on('version-selected', (event, option) => {
        versionType = option;
        store.set('lastSelectedVersion', option);
        mw.webContents.send('version-text-changed', versiontxt, option);

        if (versionType == "public") {
            filePath = path.join(app.getPath("userData"), '/version.txt');
        }
        else {
            filePath = path.join(app.getPath("userData"), '/versionTest.txt');
        }

        if (fs.existsSync(filePath)) {
            fileExists = true;
        }
        else {
            fileExists = false;
        }

        if (fileExists) {
            fs.readFile(filePath, 'utf-8', (err, data) => {
                if (err) throw err;

                console.log("data", data);
                console.log("version", versiontxt);
                if (data != versiontxt) {
                    //switch to update window
                    mw.webContents.send('update-status', 1);
                }
                else {
                    //switch to launch window
                    mw.webContents.send('update-status', 0);
                }
            })
        }
        else {
            mw.webContents.send('update-status', 3);
        }
    })

    //listen for check for updates request
    ipcMain.on('update-check-request', (event, request) => {

        if (request == 1) {
            mw.webContents.send('fetch-version', versionType);
            console.log("checking for", versionType);
        }
    })

    //listen for uninstall request
    ipcMain.on('uninstall-request', (event, request) => {
        if (request == 1) {
            //create confirmation screen
            dialog.showMessageBox({
                type: 'warning',
                buttons: ['Back', 'Yes'],
                cancelId: 1,
                defaultId: 0,
                title: 'Warning',
                detail: 'Program is about to be uninstalled. Are you sure?'
            }).then(({ response, checkboxChecked }) => {
                console.log(`responsePublic: ${response}`)
                if (response) {
                    //delete corresponding files

                    //removing version saving loc
                    fs.unlink(filePath, (err) => {
                        if (err) {
                            console.log("Error");
                        }
                    })

                    if (versionType == "public") {

                        //removing app download folder for Public
                        if (process.platform === "darwin") {
                            fs.rmdir(store.get('downloadfilePublic'), {recursive: true},(err) => {
                                if (err) {
                                    console.log(err);
                                }
                            })
                        }

                        if (process.platform === "win32") {
                            fs.rmdir(store.get('downloadfilePublic'), {recursive: true},(err) => {
                                if (err) {
                                    console.log(err);
                                }
                            })
                        }
                    }
                    else{

                        //removing app download folder for Test
                        if (process.platform === "darwin") {
                            // fs.rmdir(path.join(store.get('downloadfileTest'), "/MetaF.app"), {recursive: true},(err) => {
                            //     if (err) {
                            //         console.log(err);
                            //     }
                            // })
                            fs.rmdir(store.get('downloadfileTest'), {recursive: true},(err) => {
                                if (err) {
                                    console.log(err);
                                }
                            })
                        }

                        if (process.platform === "win32") {
                            // fs.unlink(path.join(store.get('downloadfileTest'), "/MetaF.exe"), (err) => {
                            //     if (err) {
                            //         console.log(err);
                            //     }
                            // })
                            fs.rmdir(store.get('downloadfileTest'), {recursive: true},(err) => {
                                if (err) {
                                    console.log(err);
                                }
                            })
                        }
                    }

                    //change window to install window
                    mw.webContents.send('update-status', 3);
                }
            })

        }
    })

    ipcMain.on('button-press', (event, pressed) => {
        if (pressed == 1) //update pressed
        {
            //switch to install panel
            mw.webContents.send('update-status', 3);

            installInProgress = true;
            mw.webContents.send('send-phase', "Downloading...");
            if (versionType == "public") {
                downloadFile("http://142.132.173.99/Version.zip", filePath, path.join(store.get('downloadfilePublic'), "/Version.zip"), 1, "public");
            }
            else{
                downloadFile("http://23.88.99.110/Version.zip", filePath, path.join(store.get('downloadfileTest'), "/Version.zip"), 1, "test");
            }
        }

        if (pressed == 0) //enter pressed
        {
            console.log("Enter pressed");

           if (versionType == "public") 
           {
                //run exe file
                if (process.platform === "win32") {
                    exec(path.join(store.get('downloadfilePublic'), "/MetaF.exe"));
                }

                //run app file for mac

                if (process.platform === "darwin") {
                    exec(path.join(store.get('downloadfilePublic'), "/MetaF.app/Contents/MacOS/MetaF"));
                }
            }
            else{

                //run exe file
                if (process.platform === "win32") {
                    exec(path.join(store.get('downloadfileTest'), "/MetaF.exe"));
                }

                //run app file for mac

                if (process.platform === "darwin") {
                    exec(path.join(store.get('downloadfileTest'), "/MetaF.app/Contents/MacOS/MetaF"));
                }
            }

            mw.minimize();
        }

        if (pressed == 2) {
            dialog.showOpenDialog(mw, {
                defaultPath,
                properties: ['openDirectory', 'createDirectory']
            }).then(result => {
                if (!result.canceled) {
                    installInProgress = true;
                    const newPath = path.join(result.filePaths[0], "/Metafluence");
                    if(fs.existsSync(newPath))
                    {
                        fs.rmdirSync(newPath, {recursive: true},(err) => {
                            if (err) {
                                console.log(err);
                            }
                        })
                    }
                    fs.mkdir(newPath, (err) => {
                        if(err)
                        {
                            console.log("error at creating Metafluence folder");
                        }
                        else{
                            if (versionType == "public") {
                                downloadFile("http://142.132.173.99/Version.zip", filePath, path.join(newPath, "/Version.zip"), 0, "public");
                            }
                            else{
                                downloadFile("http://23.88.99.110/Version.zip", filePath, path.join(newPath, "/Version.zip"), 0, "test");
                            }
                        }
                    })
                }
            }).catch(err => {
                console.log(err);
            })
        }
    })

})

autoUpdater.on('update-downloaded', () => {
    mw.webContents.send('updated');
})

ipcMain.on('restart-app', ()=>{
    autoUpdater.quitAndInstall();
})