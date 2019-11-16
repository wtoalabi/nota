const electron = require('electron');
const {remote, ipcRenderer,shell} = electron;
const path = require("path");
const mainProcess = remote.require('./main.js');
const app = remote.app;
const fs = require("fs");
const BrowserWindow = remote.BrowserWindow;
const currentWindow = remote.getCurrentWindow();
const config = require('./config');
const EventEmitter = require('events');


window.pre = {
  EventEmitter,
  remote,
  config,
  fs,
  path,
  mainProcess,
  app,
  BrowserWindow,
  currentWindow,
  ipcRenderer,
  shell,
};

window.__devtron = {require: require, process: process}