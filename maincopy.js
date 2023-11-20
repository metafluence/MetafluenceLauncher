const path = require("path");
const { app, dialog, BrowserWindow, ipcMain, ipcRenderer, shell } = require("electron");
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const { log } = require("console");
const Store = require("electron-store");
const http = require("http");
var DecompressZip = require("decompress-zip");
var exec = require("child_process").spawn;
const isFirstInstanceApp = app.requestSingleInstanceLock();

let mw;
let installInProgress = false;
let versiontxt;
let versionType = "public";
const store = new Store();
let savePathCopy;
let fileExists = false;
let installLoc;
let defaultPath;
let connectionLost = false;
let isUpdate = false;

autoUpdater.autoDownload = false;

if(!isFirstInstanceApp)
{
    app.quit();
}

function CreateMainWindow() {
    const mainWindow = new BrowserWindow({
        title: 'Metafluence Launcher',
        width: 900,
        height: 600,
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
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    })

    mw = mainWindow;
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
                    mw.webContents.send('send-phase', "Downloading... " + "(" + downloadSpeed + " " + dataRate + ")");
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
            mw.webContents.send('update-status', 3);
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
    var percentage = ((received * 100) / total).toFixed(0);

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
            isUpdate = false;
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
      if (connectionLost == true) {
        mw.webContents.send('lost-connection', 0);
        if(store.has('lastSelectedVersion')) {
            mw.webContents.send('fetch-version', store.get('lastSelectedVersion'), process.platform);
            mw.webContents.send('send-version', store.get('lastSelectedVersion'), process.platform);
        }
        else{
            mw.webContents.send('fetch-version', "public", process.platform);
            mw.webContents.send('send-version', "public", process.platform);
        }
      }

      return true;
    }).on('error', (err) => {
        if (connectionLost == false) {
            if (!mw.isDestroyed() && !mw.isMinimized()) {
                mw.webContents.send('lost-connection', 1);
                connectionLost = true;
            }
        }

        if(installInProgress & !isUpdate)
        {
            if (fs.existsSync(savePathCopy)) {
                fs.rmdirSync(path.join(savePathCopy, ".."), {recursive: true},(err) => {
                    if (err) {
                        console.log(err);
                    }
                })
            }
            installInProgress = false;
            isUpdate = false;
        }

        return false;
    });
}

app.on('before-quit', () => {
    if (installInProgress & !isUpdate) {
        if (fs.existsSync(savePathCopy)) {
            fs.rmdirSync(path.join(savePathCopy, ".."), {recursive: true},(err) => {
                if (err) {
                    console.log(err);
                }
            })
        }
    }

    if (isUpdate)
    {
        fs.unlink(savePathCopy, (err) => {
            if (err) {
                console.error("Error while removing the file!");
            }
        })
    }
})

app.whenReady().then(() => {

    //get default path for installation - currently user's program files
    if(process.platform === "win32")
    {
        defaultPath = process.env.ProgramFiles;
    }
    if(process.platform === "darwin")
    {
        defaultPath = process.env.HOME;
    }
    installLoc = defaultPath;

    if (typeof mw === "undefined") {
        CreateMainWindow();
    }

    let connectionInterval = setInterval(checkInternetConnection, 8000);

    ipcMain.on('connection', (event, pressed) => {
        if (pressed == 0) {
            checkInternetConnection();
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
    })

    mw.webContents.on('did-finish-load', () => {

        mw.webContents.send('get-app-version', app.getVersion());
        
        checkInternetConnection();

        if(store.has('lastSelectedVersion')) {
            mw.webContents.send('fetch-version', store.get('lastSelectedVersion'), process.platform);
            mw.webContents.send('send-version', store.get('lastSelectedVersion'), process.platform);
        }
        else{
            mw.webContents.send('fetch-version', "public", process.platform);
            mw.webContents.send('send-version', "public", process.platform);
        }

        mw.on("minimize", () => {
            clearInterval(connectionInterval);
        })

        mw.on("restore", () => {
            connectionInterval = setInterval(checkInternetConnection, 8000);
        })

        autoUpdater.checkForUpdates();
        // autoUpdater.on('update-available', () => {
        //     if (!settingsOpened) {
        //         dialog.showMessageBox({
        //             type: 'info',
        //             buttons: ['DOWNLOAD NOW'],
        //             cancelId: 1,
        //             title: 'New Version',
        //             detail: 'New version of the launcher is available. Go to the Settings and download!'
        //         }).then(({ response, checkboxChecked }) => {
        //             if (response == 0)
        //             {
        //                 //CreateSettingsWindow();
        //                 settingsOpened = true;
        //                 sw.webContents.on('did-finish-load', () => {
        //                     autoUpdater.downloadUpdate();
        //                 })
        //             }
        //         })
        //     }
        // })
    })

    ipcMain.on('read-version', (event, version) => {
        versiontxt = version;
        console.log(versiontxt);
    })

    let filePath;
    let savedPath;
    ipcMain.on('version-selected', (event, option) => {
        versionType = option;
        store.set('lastSelectedVersion', option);
        mw.webContents.send('version-text-changed', versiontxt, option);

        if (versionType == "public") {
            filePath = path.join(app.getPath("userData"), '/version.txt');
            if (store.has('downloadfilePublic')) {
                if (process.platform === "win32") {
                    savedPath = path.join(store.get('downloadfilePublic'), "/Metafluence.exe");
                }
                if (process.platform === "darwin") {
                    savedPath = path.join(store.get('downloadfilePublic'), "/Metafluence-Mac-Shipping.app/Contents/MacOS/Metafluence-Mac-Shipping");
                }
            }
        }
        else {
            filePath = path.join(app.getPath("userData"), '/versionTest.txt');
            if (store.has('downloadfileTest')) {
                if (process.platform === "win32") {
                    savedPath = path.join(store.get('downloadfileTest'), "/Metafluence.exe");
                }
                if (process.platform === "darwin") {
                    savedPath = path.join(store.get('downloadfileTest'), "/Metafluence.app/Contents/MacOS/Metafluence");
                }
            }
        }

        if (fs.existsSync(filePath)) {
            if (typeof savedPath !== "undefined" && fs.existsSync(savedPath)) {
                fileExists = true;
            }
            else {
                fileExists = false;
            }
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
            mw.webContents.send('update-status', 2);
        }
    })

    //listen for check for updates request
    ipcMain.on('update-check-request', (event, request) => {

        if (request == 1) {
            mw.webContents.send('fetch-version', versionType, process.platform);
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
                            fs.rmdir(store.get('downloadfileTest'), {recursive: true},(err) => {
                                if (err) {
                                    console.log(err);
                                }
                            })
                        }

                        if (process.platform === "win32") {
                            fs.rmdir(store.get('downloadfileTest'), {recursive: true},(err) => {
                                if (err) {
                                    console.log(err);
                                }
                            })
                        }
                    }

                    //change window to install window
                    mw.webContents.send('update-status', 2);
                }
            })

        }
    })

    ipcMain.on('button-press', (event, pressed) => {
        if (pressed == 1) //update pressed
        {
            //switch to install panel
            mw.webContents.send('update-status', 2);

            installInProgress = true;
            isUpdate = true;
            mw.webContents.send('send-phase', "Downloading...");
            if (versionType == "public") {
                if(process.platform === "win32")
                {
                    downloadFile("http://128.140.45.21/Version.zip", filePath, path.join(store.get('downloadfilePublic'), "/Version.zip"), 1, "public");
                }
                if(process.platform === "darwin")
                {
                    downloadFile("http://128.140.45.21/Mac/Version.zip", filePath, path.join(store.get('downloadfilePublic'), "/Version.zip"), 1, "public");
                }
            }
            else{
                if(process.platform === "win32")
                {
                    downloadFile("http://94.130.76.49/Version.zip", filePath, path.join(store.get('downloadfileTest'), "/Version.zip"), 1, "test");
                }
                if(process.platform === "darwin")
                {
                    downloadFile("http://94.130.76.49/Mac/Version.zip", filePath, path.join(store.get('downloadfileTest'), "/Version.zip"), 1, "test");
                }
            }
        }

        if (pressed == 0) //enter pressed
        {
            console.log("Enter pressed");

           if (versionType == "public") 
           {
                //run exe file
                if (process.platform === "win32") {
                    exec(path.join(store.get('downloadfilePublic'), "/Metafluence.exe"), [], {'detached': true});
                    setTimeout(() => {
                        app.quit();
                    }, 5000)
                }

                //run app file for mac

                if (process.platform === "darwin") {
                    exec(path.join(store.get('downloadfilePublic'), "/Metafluence-Mac-Shipping.app/Contents/MacOS/Metafluence-Mac-Shipping"), [], {'detached': true});
                    setTimeout(() => {
                        app.quit();
                    }, 5000)
                }
            }
            else{

                //run exe file
                if (process.platform === "win32") {
                    exec(path.join(store.get('downloadfileTest'), "/Metafluence.exe"), [], {'detached': true});
                    setTimeout(() => {
                        app.quit();
                    }, 5000)
                }

                //run app file for mac

                if (process.platform === "darwin") {
                    exec(path.join(store.get('downloadfileTest'), "/Metafluence.app/Contents/MacOS/Metafluence"), [], {'detached': true});
                    setTimeout(() => {
                        app.quit();
                    }, 5000)
                }
            }

            mw.minimize();
        }

        if (pressed == 2) { //install from mainwindow pressed

            mw.webContents.send('choose-location');

            if (versionType == "test") {
                if (process.platform === "win32") {
                    defaultPath = process.env.APPDATA;
                }
                if (process.platform === "darwin") {
                    defaultPath = process.env.HOME;
                }
            }
            else {
                if (process.platform === "win32") {
                    defaultPath = process.env.ProgramFiles;
                }
                if (process.platform === "darwin") {
                    defaultPath = process.env.HOME;
                }
            }
            installLoc = defaultPath
            mw.webContents.send('location', defaultPath);
        }

        if (pressed == 3) { //install from install window pressed
            installInProgress = true;
            isUpdate = false;
            let newPath;

            //check whether chosen location already contains Metafluence folder at the end of the path
            let joinPath = "";
            const folderSegments = installLoc.split('/');
            const lastSegment = folderSegments[folderSegments.length - 1];
            if(lastSegment != "Metafluence")
            {
                joinPath = "/Metafluence";
            }
            if(versionType == "test")
            {
                joinPath += "/TestVersion";
                newPath = path.join(installLoc, joinPath);
            }
            else{
                joinPath += "/PublicVersion";
                newPath = path.join(installLoc, joinPath);               
            }
            if(fs.existsSync(newPath))
            {
                fs.rmdirSync(newPath, {recursive: true},(err) => {
                    if (err) {
                        console.log(err);
                    }
                })
            }
            fs.mkdir(newPath, {recursive: true}, (err) => {
                if(err)
                {
                    console.log("error at creating Metafluence folder");
                }
                else{
                    if (versionType == "public") {
                        if(process.platform === "win32")
                        {
                            downloadFile("http://128.140.45.21/Version.zip", filePath, path.join(newPath, "/Version.zip"), 0, "public");
                        }
                        if(process.platform === "darwin")
                        {
                            downloadFile("http://128.140.45.21/Mac/Version.zip", filePath, path.join(newPath, "/Version.zip"), 0, "public");
                        }
                    }
                    else{
                        if(process.platform === "win32")
                        {
                            downloadFile("http://94.130.76.49/Version.zip", filePath, path.join(newPath, "/Version.zip"), 0, "test");
                        }
                        if(process.platform === "darwin")
                        {
                            downloadFile("http://94.130.76.49/Mac/Version.zip", filePath, path.join(newPath, "/Version.zip"), 0, "test");
                        }
                    }
                }
            })
        }
    })

    ipcMain.on('f-button-press', (event, pressed) => {
         dialog.showOpenDialog(mw, {
            defaultPath,
            properties: ['openDirectory', 'createDirectory']
         }).then(result => {
            if (!result.canceled) {
                mw.webContents.send('location', result.filePaths[0]);
                installLoc = result.filePaths[0];
            }
        }).catch(err => {
            console.log(err);
        })
    })

    // autoUpdater.on('checking-for-update', () => {
    //     if (settingsOpened) {
    //         sw.webContents.send('updated', "check");
    //     }
    // })

    // autoUpdater.on('update-not-available', () => {
    //     if (settingsOpened) {
    //         sw.webContents.send('updated', "noupdate");
    //     }
    // })

    autoUpdater.on('update-available', () => {
        mw.webContents.send('updated', "update");
    })
    
    ipcMain.on('restart-app', ()=>{
        autoUpdater.downloadUpdate();
    })

    autoUpdater.on(('update-downloaded'), () => {
        autoUpdater.quitAndInstall();
    })

    autoUpdater.on(('download-progress'), (progress) => {
        launcherIsUpdating = true;
        let downloadText = Math.round(progress.percent);
        mw.webContents.send("updated", downloadText);
    })
})
