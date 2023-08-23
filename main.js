const path = require("path");
const {app, dialog, BrowserWindow, ipcMain, ipcRenderer, shell} = require ("electron");
const fs = require('fs');
const { log } = require("console");
const Store = require("electron-store");
var http = require("http");
var DecompressZip = require("decompress-zip");
var exec = require("child_process").execFile;

var mw;
var sw;
var installInProgress = false;
var versiontxt;
var versionType = "PUBLIC";
const store = new Store();
var savePathCopy;

function CreateMainWindow ()
{
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

    //mainWindow.webContents.openDevTools();
    mainWindow.loadFile(path.join(__dirname, '/index.html'));

    //Opening links in OS default browser
    mainWindow.webContents.setWindowOpenHandler(({url}) =>{
        shell.openExternal(url);
        return {action: 'deny'};
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

    sw=sWindow;

}

function downloadFile(webFile, filePath, savePath, stat, version){
    //webfile - downloaded file
    //filePath - version.txt file path
    //savePath - download location
    //stat - stat = 0 (download), stat = 1 (update)

    // Save variable to know progress
    var received_bytes = 0;
    var total_bytes = 0;

    const startTime = Date.now();

    var req = http.get(webFile, function(response) {
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
            mw.webContents.send('send-progress', showProgress(received_bytes, total_bytes));
            mw.webContents.send('send-phase', "Downloading... " + (received_bytes/1e9).toFixed(2) + "/" + (total_bytes/1e9).toFixed(2) + " GB  (" + downloadSpeed + " " + dataRate + ")");
        })

        response.on('end', () => {
            console.log("File succesfully downloaded");

            extractFiles(filePath, savePath, stat, version);
            mw.webContents.send('send-phase', "Extracting files...");

        });

        response.on('error', () => {
            //response error
            if(fs.existsSync(savePath))
            {
                fs.unlink(savePath, (err) => {
                    if(err){
                        console.log("Error");
                    }
                })
            }
        })
    });

    // Change the total bytes value to get progress later.
    req.on('response', data => {
        total_bytes = parseInt(data.headers['content-length' ]);
        mw.webContents.send('update-status', 4);
    });

    req.on('error', () => {
        if(fs.existsSync(savePath))
        {
            fs.unlink(savePath, (err) => {
                if(err){
                    console.log("Error");
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
        console.log('Caught an error');
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

            ipcMain.on('button-press', (event, pressed) => {
                if (pressed == 0) 
                {
                    console.log("Enter pressed");

                    //run exe file
                    if (process.platform === "win32") {
                        if (version == "test") {
                            exec(path.join(store.get('downloadfileTest'), "/MetaF.exe"), function(err, data) {
                                if (err) {
                                    throw err;
                                }
                            });
                        }
                        else {
                            exec(path.join(store.get('downloadfilePublic'), "/MetaF.exe"), function(err, data) {
                                if (err) {
                                    throw err;
                                }
                            });
                        }

                        mw.minimize();
                    }
                    //run app file for mac

                    if (process.platform === "darwin") {
                        if (version == "test") {
                            exec(path.join(store.get('downloadfileTest'), "/MetaF.app/Contents/MacOS/MetaF"), function(err, data) {
                                if (err) {
                                    throw err;
                                }
                            });
                        }
                        else {
                            exec(path.join(store.get('downloadfilePublic'), "/MetaF.app/Contents/MacOS/MetaF"), function(err, data) {
                                if (err) {
                                    throw err;
                                }
                            });
                        }
                    }
                }
            })
        })

        if(fs.existsSync(savePath))
        {
            fs.unlink(savePath, (err) => {
                if(err){
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

app.on('before-quit', () => {
    if(installInProgress)
    {
        if(fs.existsSync(savePathCopy))
        {
            fs.unlink(savePathCopy, (err) => {
                if(err){
                    console.log("Error");
                }
            })
        }
    }
})

app.whenReady().then(() => {

    CreateMainWindow();

    ipcMain.on('close-pressed', (event, button) => {
        if(button == 1)
        {
            app.quit();
        }
        if (button == 0) {
            mw.minimize();
        }
        if(button == 2)
        {
            sw.close();
        }
    })

    mw.on('close', e => {
        if (installInProgress) {
            e.preventDefault()
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
                    mw.destroy()
                    app.quit()
                }
            })
        }
        else {
            mw.destroy();
            app.quit();
        }
    })

    ipcMain.on('s-button-press', (event, pressed) => {
        if (pressed == 0 && !installInProgress) {
            CreateSettingsWindow();
            sw.webContents.on('did-finish-load', () => {
                sw.webContents.send('send-version', versionType);
            })
        }
        else{
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


    ipcMain.on('version-selected', (event, option) => {
        ipcMain.removeAllListeners('read-version');
        ipcMain.removeAllListeners('button-press');
        ipcMain.removeAllListeners('uninstall-request');

        ipcMain.on('read-version', (event, version) => {
            versiontxt = version;
            console.log(versiontxt);

            mw.webContents.send('version-text-changed', version, option);
        })

        if(option == "public") {
            //public is selected
            versionType = "PUBLIC"
            const filePath = path.join(app.getPath("userData"), '/version.txt');

            if(fs.existsSync(filePath)){
                console.log('File exists');

                //listen for checkUpdate request
                ipcMain.on('update-check-request', (event, request) => {
                    mw.webContents.send('fetch-version', "public");
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
                                    //delete corresponding files for public

                                    //removing version saving loc
                                    fs.unlink(filePath, (err) => {
                                        if(err){
                                            console.log("Error");
                                        }
                                    })
                                    
                                    //removing app download folder
                                    if (process.platform === "darwin") {
                                        fs.unlink(path.join(store.get('downloadfilePublic'), "/MetaF.app"), (err) => {
                                            if(err){
                                                console.log(err);
                                            }
                                        })   
                                    }

                                    if (process.platform === "win32") {
                                        fs.unlink(path.join(store.get('downloadfilePublic'), "/MetaF.exe"), (err) => {
                                            if(err){
                                                console.log(err);
                                            }
                                        })
                                    }

                                    //change window to install window
                                    mw.webContents.send('update-status', 3);

                                    // ipcMain.on('button-press', (event, pressed) => {
                                    //     if (pressed == 2) 
                                    //     {
                                    //         dialog.showOpenDialog(mw, {
                                    //             //defaultPath: "Desktop",
                                    //             properties: ['openDirectory']
                                    //         }).then(result => {
                                    //             if (!result.canceled) {
                                    //                 installInProgress = true;
                                    //                 downloadFile("http://142.132.173.99/Mac/Version.zip", filePath, path.join(result.filePaths[0], "/Version.zip"), 0, "public");
                                    //                 //console.log(result.filePaths[0]);
                                    //             }
                                    //         }).catch(err => {
                                    //             console.log(err);
                                    //         })
                                    //     }
                                    // })
                                }
                            })
                    }
                })

                //check if the version is new
                ipcMain.on('read-version', (event, version) => {
                    fs.readFile(filePath, 'utf-8', (err, data) => {
                        if (err) throw err;

                        if(data!=version)
                        {
                            mw.webContents.send('update-status', 1);

                            //update

                            ipcMain.once('button-press', (event, pressed) => {
                                if (pressed == 1) 
                                {
                                    //switch to install panel
                                    mw.webContents.send('update-status', 3);

                                    installInProgress = true;
                                    mw.webContents.send('send-phase', "Downloading...");
                                    downloadFile("http://142.132.173.99/Mac/Version.zip", filePath, path.join(store.get('downloadfilePublic'), "/Version.zip"), 1, "public");
                                } 
                            })
                        }
                        else
                        {
                            mw.webContents.send('update-status', 0);

                            ipcMain.on('button-press', (event, pressed) => {
                                if (pressed == 0) 
                                {
                                    console.log("Enter pressed");

                                    //run exe file
                                    if (process.platform === "win32") {
                                        exec(path.join(store.get('downloadfilePublic'), "/MetaF.exe"), function(err, data) {
                                            if (err) {
                                                throw err;
                                            }
                                        });

                                        mw.minimize();
                                    }

                                    //run app file for mac

                                    if (process.platform === "darwin") {
                                        exec(path.join(store.get('downloadfilePublic'), "/MetaF.app/Contents/MacOS/MetaF"), function(err, data) {
                                            if (err) {
                                                throw err;
                                            }
                                        });
                                    }
                                }
                            })
                        }
                    })

                })
            } else {
                ipcMain.on('read-version', (event, version) => {
                    //switch to install panel
                    mw.webContents.send('update-status', 3);

                    //download
                    ipcMain.on('button-press', (event, pressed) => {
                        if (pressed == 2) 
                        {
                            dialog.showOpenDialog(mw, {
                                //defaultPath: "Desktop",
                                properties: ['openDirectory', 'createDirectory']
                            }).then(result => {
                                if (!result.canceled) {
                                    installInProgress = true;
                                    downloadFile("http://142.132.173.99/Mac/Version.zip", filePath, path.join(result.filePaths[0], "/Version.zip"), 0, "public");
                                    //console.log(result.filePaths[0]);
                                }
                            }).catch(err => {
                                console.log(err);
                            })
                        }
                    })

                })
            }
        }
        else {
            //test is selected

            versionType = "TEST";
            const filePath = path.join(app.getPath("userData"), '/versionTest.txt');

            if(fs.existsSync(filePath)){
                console.log('File exists');

                //listen for checkUpdate request
                ipcMain.on('update-check-request', (event, request) => {
                    mw.webContents.send('fetch-version', "test");
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
                            console.log(`response: ${response}`)
                                if (response) {
                                    //delete corresponding files for public

                                    //removing version saving loc
                                    fs.unlink(filePath, (err) => {
                                        if(err){
                                            console.log("Error");
                                        }
                                    })
                                    
                                    //removing app download folder
                                    if (process.platform === "darwin") {
                                        fs.unlink(path.join(store.get('downloadfilePublic'), "/MetaF.app"), (err) => {
                                            if(err){
                                                console.log(err);
                                            }
                                        })   
                                    }

                                    if (process.platform === "win32") {
                                        fs.unlink(path.join(store.get('downloadfilePublic'), "/MetaF.exe"), (err) => {
                                            if(err){
                                                console.log(err);
                                            }
                                        })
                                    }

                                    //change window to install window
                                    mw.webContents.send('update-status', 3);

                                }
                            })
                    }
                })

                //check if the version is new
                ipcMain.on('read-version', (event, version) => {
                    fs.readFile(filePath, 'utf-8', (err, data) => {
                        if (err) throw err;

                        if(data!=version)
                        {
                            mw.webContents.send('update-status', 1);

                            //update

                            ipcMain.once('button-press', (event, pressed) => {
                                if (pressed == 1) 
                                {
                                    //switch to install panel
                                    mw.webContents.send('update-status', 3);

                                    installInProgress = true;
                                    mw.webContents.send('send-phase', "Downloading...");
                                    downloadFile("http://23.88.99.110/Mac/Version.zip", filePath, path.join(store.get('downloadfileTest'), "/Version.zip"), 1, "test");
                                } 
                            })
                        }
                        else
                        {
                            mw.webContents.send('update-status', 0);

                            ipcMain.on('button-press', (event, pressed) => {
                                if (pressed == 0) 
                                {
                                    console.log("Enter pressed");

                                    //run exe file
                                    if (process.platform === "win32") {
                                        exec(path.join(store.get('downloadfileTest'), "/MetaF.exe"), function(err, data) {
                                            if (err) {
                                                throw err;
                                            }
                                        });

                                        mw.minimize();
                                    }

                                    //run app file for mac

                                    if (process.platform === "darwin") {
                                        exec(path.join(store.get('downloadfileTest'), "/MetaF.app/Contents/MacOS/MetaF"), function(err, data) {
                                            if (err) {
                                                throw err;
                                            }
                                        });
                                    }
                                }
                            })
                        }
                    })

                })
            } else {
                ipcMain.on('read-version', (event, version) => {
                    //switch to install panel
                    mw.webContents.send('update-status', 3);

                    //download
                    ipcMain.on('button-press', (event, pressed) => {
                        if (pressed == 2) 
                        {
                            dialog.showOpenDialog(mw, {
                                //defaultPath: "Desktop",
                                properties: ['openDirectory', 'createDirectory']
                            }).then(result => {
                                if (!result.canceled) {
                                    installInProgress = true;
                                    downloadFile("http://23.88.99.110/Mac/Version.zip", filePath, path.join(result.filePaths[0], "/Version.zip"), 0, "test");
                                    //console.log(result.filePaths[0]);
                                }
                            }).catch(err => {
                                console.log(err);
                            })
                        }
                    })

                })
            }
        }
    })
})