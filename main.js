'use strict';

const {app, BrowserWindow, dialog, Menu, ipcMain} = require('electron');
const path = require("path");
const fs = require("fs");
let eventsTimeOut = 0;
require('electron-reload')(__dirname, {
  electron: require(`${__dirname}\\node_modules\\electron`)
});
require("path");

app.on('ready', () => {
  createWindow();
});


let windows = new Set();
let openFiles = new Map();

const createWindow = exports.createWindow = () => {
  let x, y;
  let currentWindow = BrowserWindow.getFocusedWindow();
  if (currentWindow) {
    const [currentX, currentY] = currentWindow.getPosition();
    x = currentX + 110;
    y = currentY + 10;
  }
  let preload = path.resolve(__dirname + '/app/preload.js');
  let newWindow = new BrowserWindow({
    width: 900,
    icon: __dirname + "\\icons\\icon.ico",
    height: 500,
    show: false,
    x: x,
    y: y,
    webPreferences: {
      nodeIntegration: false,
      preload: preload
    },
  });
  newWindow.webContents.loadURL('file://' + __dirname + '/app/index.html');
  newWindow.on("closed", () => {
    windows.delete(newWindow);
    stopWatchingFiles(newWindow);
    newWindow = null;
  })
  windows.add(newWindow);
  Menu.setApplicationMenu(Menu.buildFromTemplate([]))
  //newWindow.webContents.openDevTools();
  newWindow.setMenuBarVisibility(false)
  newWindow.on('ready-to-show', () => {
    newWindow.show();
  })
  return newWindow;
};

const selectDefaultDirectory = exports.selectDefaultDirectory = (targetWindow) => {
  const directories = dialog.showOpenDialog(targetWindow, {
    defaultPath: app.getPath('desktop'),
    properties: ['openDirectory'],
    "message": "Select Defaults Directory"
  });
  directories.then(response => {
    if (!response) {
      return;
    }
    const directory = response['filePaths'][0];
    targetWindow.webContents.send("directory-selected", directory);
  })
};
app.on("activate", (e, hasVisibleWindow) => {
  if (!hasVisibleWindow) {
    createWindow();
  }
})

app.on('will-finish-launching', () => {
  app.on('open-file', (event, file) => {
    const win = createWindow();
    win.once('ready-to-show', () => {
      openFile(win, file)
    })
  })
})

const saveText = exports.saveText = async (window, filePath, directoryPath, text) => {
  window.webContents.send("log", [__dirname + "\\icons\\icon.ico"]);
  return fs.mkdir(directoryPath, {recursive: true}, (err) => {
    if (err) {
      //s
    } else {
      fs.writeFileSync(filePath, text);
    }
  });
};

const openFile = exports.openFile = (window, file,{newFile=false}={}) => {
  if (fs.existsSync(file)) {
    startWatchingFiles(window, file);
    const content = fs.readFileSync((file)).toString();
    let baseName = path.basename(file);
    let directoryPath = path.dirname(file);
    let paths = {filePath: file, directoryPath, baseName};
    return window.webContents.send("file-opened", paths, content);
  }
  if(!newFile){
    window.webContents.send("file-not-found", false);
  }

};
const startWatchingFiles = exports.startWatchingFile = (targetWindow, file) => {
  const watcher = fs.watchFile(file, (event) => {
    if (eventsTimeOut < 1) {
      eventsTimeOut++;
      if (event['birthtime']) {
        if (!targetWindow.isFocused()) {
          const content = fs.readFileSync(file).toString();
          targetWindow.webContents.send("file-changed", file, content);
        }
      }
    }
    setTimeout(() => eventsTimeOut = 0, 2000);
  });
  openFiles.set(targetWindow, watcher);
  watcher.on('error', () => {
    targetWindow.webContents.send("log", "folder deleted!");
    if (!fs.existsSync(file)) {
      targetWindow.webContents.send("log", "folder deleted!");
    }
  })
};
const stopWatchingFiles = (window) => {
  if (openFiles.has(window)) {
    openFiles.get(window).stop();
    openFiles.delete(window)
  }
};

const getFileFromUser = exports.getFileFromUser = (targetWindow) => {
  const files = dialog.showOpenDialog(targetWindow, {
    properties: ['openFile'],
    filters: [
      {name: 'Text Files', extensions: ['txt']},
    ]
  });
  files.then(response => {
    if (!response) {
      return;
    }
    const file = response['filePaths'][0];
    startWatchingFiles(targetWindow, file);
    openFile(targetWindow, file)
  })
};