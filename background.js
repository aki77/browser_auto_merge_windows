const getMainWindow = async () => {
  const windows = await browser.windows.getAll({ windowTypes: ["normal"] });
  const mainId = Math.min(...windows.map(({ id }) => id));
  return windows.find(({ id }) => id === mainId);
};

const moveToMainWindow = async tab => {
  const mainWindow = await getMainWindow();
  if (!mainWindow) return;

  const mainTabs = await browser.tabs.query({ windowId: mainWindow.id });
  browser.tabs.move(tab.id, {
    windowId: mainWindow.id,
    index: mainTabs.length
  });
};

const onTabCreated = async tab => {
  console.log("tab created", tab);
  const { windowId } = tab;
  const window = await browser.windows.get(windowId);

  if (window.type !== "normal") return; // NOTE: pwa
  const tabs = await browser.tabs.query({ windowId });
  if (tabs.length > 1) return; // NOTE: not new window
  if (tab.url === "chrome://newtab/") return;

  await moveToMainWindow(tab);
  await browser.tabs.update(tab.id, { active: true });
  console.log("merged");
};

let timer = null;
const onFocusChanged = windowId => {
  console.log("focus changed");
  // NOTE: browser focused
  if (windowId > 0) {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    browser.tabs.onCreated.removeListener(onTabCreated);
    console.log("disabled");
  } else {
    // NOTE: exclude "open a new window"
    timer = setTimeout(() => {
      browser.tabs.onCreated.addListener(onTabCreated);
      timer = null;
      console.log("enabled");
    }, 500);
  }
};

const init = async () => {
  const window = browser.windows.getLastFocused();
  onFocusChanged((window.focused && window.id) || -1);
  browser.windows.onFocusChanged.addListener(onFocusChanged);
};

init();
