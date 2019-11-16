//localStorage.clear();
let config;
let filePath ;
let directoryPath;
let baseName;
let currentHeight;
let currentWidth ;
let textBox = document.querySelector(".text-box")
let preferencesBox = document.querySelector('.preferences');
let preferencesSelectPathButton = preferencesBox.querySelector('.preferences__selectPath');
let preferencesBoxCancelButton = document.querySelector('.preferences__cancel');
let preferencesBoxSaveButton = document.querySelector('.preferences__save');
let preferencesBoxSaveAndCloseButton = document.querySelector('.preferences__save.save_close');
let noSaveAlert = document.querySelector(".no_save_alert");
let controlKeyPressed = false;
document.addEventListener("contextmenu", showContextMenu);
document.querySelector(".text-box").focus();

loadConfig();
loadFile();
pruneRecentFiles();

function showContextMenu() {
  createContextMenu().popup();
}

preferencesBoxCancelButton.addEventListener('click', () => {
  preferencesBox.style.display = 'none';
  if(currentHeight){
    pre.currentWindow.setSize(currentWidth, currentHeight)
  }
});

preferencesSelectPathButton.addEventListener('click', (event) => {
  let selectedSavePath = preferencesBox.querySelector('.preferences__selectedPath');
  pre.mainProcess.selectDefaultDirectory(pre.currentWindow);
  pre.ipcRenderer.on('directory-selected', (event, directory) => {
    selectedSavePath.value = directory;
    setCurrentDirectoryPathText(directory)
  })
});

function renderContent(content) {
  textBox.value = content;
}

pre.ipcRenderer.on("file-opened", (event, filePaths, content) => {
  generatePaths(filePaths);
  addToRecentFiles();
  setTitle();
  renderContent(content)
});

pre.ipcRenderer.on('file-not-found', (e)=>{
  pruneRecentFiles();
  pre.remote.dialog.showMessageBox(pre.currentWindow, {
    type: "info",
    title: "File Not Found",
    message: "We couldn't locate this file. It must have been deleted, moved or renamed... ",
    buttons: ["OK"],
    defaultId: 0,
  })
});
pre.ipcRenderer.on("log", (event,log) => {
  console.log(log)
});

pre.ipcRenderer.on("file-changed", (event, file, content) => {
  if(content !== textBox.value) {
    pre.remote.dialog.showMessageBox(pre.currentWindow, {
      type: "info",
      title: "Overwrite Current Unsaved Changes?",
      message: "Another application has changed this file. Load changes?",
      buttons: ["Yes", "Cancel"],
      defaultId: 0,
      cancelId: 1,
    }).then(result => {
      if (result['response'] === 1) {
        return;
      }
      return renderContent(content)
    });
  }
});

function saveConfig() {
  const form = document.querySelector('form');
  const config = Object.fromEntries(new FormData(form).entries());
  pre.config.setConfig(config);
  loadConfig();
  generatePaths();
  setTitle();
}

preferencesBoxSaveButton.addEventListener('click', (event) => {
  event.preventDefault();
  saveConfig()
});

preferencesBoxSaveAndCloseButton.addEventListener('click', (event) => {
  event.preventDefault();
  saveConfig();
  preferencesBox.style.display = 'none'
});

function loadConfig() {
  config = pre.config.getConfig();
  document.body.bgColor = config.backgroundColor;
  document.body.style.color = config.color;
  document.body.style.fontSize = config.fontSize;
}

function updateWindowSize() {
  preferencesBox.style.display = 'flex';
  let boxHeight = preferencesBox.clientHeight;
  let windowWidth = pre.currentWindow.getSize()[0];
  let windowHeight = pre.currentWindow.getSize()[1];
  if (boxHeight > windowHeight-40) {
    currentHeight = windowHeight;
    currentWidth = windowWidth;
    pre.currentWindow.setSize(windowWidth, boxHeight + 80);
  }
}

function setCurrentDirectoryPathText(directory=null) {
  let preferredDirectory = directory || pre.config.getConfig()['preferredDirectoryPath'];
  let currentDirectoryPath = document.querySelector('.current-directory-path');
  currentDirectoryPath.innerText = preferredDirectory

}

function setFormValues() {
  const config = pre.config.getConfig();
  document.getElementById('color').value = config.color;
  document.getElementById('fontSize').value = config.fontSize;
  document.getElementById('preferredDirectoryPath').value = config.preferredDirectoryPath;
  document.getElementById('backgroundColor').value = config.backgroundColor;
}

function showFile() {
  return pre.shell.showItemInFolder(filePath);
}

let createContextMenu = () => {
  return pre.remote.Menu.buildFromTemplate([
    {
      label: "Recent Files",
      click(window) {
        ///pre.mainProcess.getFileFromUser(pre.currentWindow);
      },
     submenu: config.recentFiles.filter((filtered)=>{
       return filtered['baseName'] !== baseName;
     }).map((each)=>{
       return {
         label: each['baseName'],
         click(){
           //console.log(each['filePath'])
           pre.mainProcess.openFile(pre.currentWindow, each['filePath'])
         }
       }
     })
    },
    {
      label: "Select File to Open",
      click() {
        pre.mainProcess.getFileFromUser(pre.currentWindow);
      },
    },
    {
      label: "Reveal File in Folder",
      click() {
        showFile();
      },
      enabled: !!textBox.value,
    },
    {
      label: "Preferences",
      click() {
        setFormValues();
        updateWindowSize();
        setCurrentDirectoryPathText()
      },
    },
    {type: 'separator'},
    {
      label: stayOnTop() ? "Disable Stay on Top" : "Stay on Top",
      click() {
        stayOnTop() ? pre.currentWindow.setAlwaysOnTop(false) : pre.currentWindow.setAlwaysOnTop(true);
      },
    },
    {type: 'separator'},
    {label: 'Cut', role: 'cut'},
    {label: 'Copy', role: 'copy'},
    {label: 'Paste', role: 'paste'},
    {label: 'Select All', role: 'selectall'},
  ]);
}

stayOnTop = () => pre.currentWindow.isAlwaysOnTop();

function getDates() {
  let year = new Date().getFullYear();
  let month = new Date().getMonth();
  let day = new Date().getDate();
  return {year, month, day};
}

function generatePathsFrom(filePaths) {
  filePath = filePaths['filePath'];
  directoryPath = filePaths['directoryPath'];
  baseName = filePaths['baseName']
}

function generatePaths(filePaths) {
  if(filePaths){
    return generatePathsFrom(filePaths)
  }
  let directory  = config.preferredDirectoryPath;
  if(!directory){
    directory = (pre.app.getPath('documents'))+'\\nota'
    pre.config.setConfig({preferredDirectoryPath: directory})
  }
  let {year, month, day} = getDates();
  let formattedDatePath = `${year}\\${month}\\${day}`;
  baseName = `${year}-${month}-${day}.txt`;
  filePath = `${directory}\\${formattedDatePath}\\${baseName}`;
  directoryPath = `${directory}\\${formattedDatePath}`;
}

textBox.addEventListener('keyup',(event)=>{
  fileOneTimeEvent.emit("prepareFile");
  pre.mainProcess.saveText(pre.currentWindow, filePath, directoryPath, event.target.value);
});

function addToRecentFiles() {
  let recentFiles = config.recentFiles;
  for(let index in recentFiles){
    if(recentFiles.hasOwnProperty(index)){
      if(recentFiles[index]['baseName'] === baseName){
        recentFiles.splice(index, 1)
      }
    }
  }
  config['recentFiles'] = recentFiles;
  let fileObject = {
    baseName,
    filePath,
    directoryPath
  };
  recentFiles.unshift(fileObject);
  let last10  = recentFiles.slice(0,10);
  pre.config.setConfig({'recentFiles': last10})
}

function loadFile() {
  generatePaths();
  pre.mainProcess.openFile(pre.currentWindow, filePath,{newFile:true});
}

function pruneRecentFiles(){
  let recentFiles = config.recentFiles;
  let existing =recentFiles.filter(each=>{
    if(pre.fs.existsSync(each['filePath'])){
      return each;
    }
  });
  config = pre.config.setConfig({'recentFiles': existing})
}
let fileOneTimeEvent = new pre.EventEmitter();
fileOneTimeEvent.once('prepareFile',()=>{
  setTitle();
  addToRecentFiles();
  pre.mainProcess.startWatchingFile(pre.currentWindow, filePath);
  fileOneTimeEvent.removeAllListeners();
});
function setTitle(){
  pre.currentWindow.setTitle(baseName)
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Control" && e.ctrlKey === true) {
    controlKeyPressed = true;
  }
})
document.addEventListener("keyup", (e) => {
  if (e.code === "KeyS" && controlKeyPressed) {
    noSaveAlert.style.display = "block"
    setTimeout(()=>{
      noSaveAlert.style.display = "none";
    },2000)
  }
  controlKeyPressed = false;
});
//'0159229469 TxtLight GTB'