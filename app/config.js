function setDefaultConfig() {
  localStorage.setItem('config', JSON.stringify({
    'backgroundColor': '#002b36',
    'color': '#ffffff',
    'preferredDirectoryPath': null,
    'recentFiles': [],
    'fontSize': "14px",
  }));
  return getConfig();
}

function getConfig() {
  let config = JSON.parse(localStorage.getItem('config'));
  if (config !== null) {
    return config
  }
  return setDefaultConfig();
}

function setConfig(config) {
  let current = getConfig();
  let updated = {...current, ...config}
   localStorage.setItem('config', JSON.stringify(updated))
  return updated;
}

module.exports = {
  getConfig,
  setConfig,
  setDefaultConfig
}