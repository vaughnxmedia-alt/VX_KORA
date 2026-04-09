const { app, BrowserWindow, shell, session } = require("electron");
const path = require("path");

/** Production site origin (no trailing slash). Override when testing: JKPR_PORTAL_BASE_URL=https://staging.example.com */
function portalBaseUrl() {
  const raw = process.env.JKPR_PORTAL_BASE_URL || "https://jahknowspr.com";
  return raw.replace(/\/$/, "");
}

function authUrl() {
  return `${portalBaseUrl()}/auth`;
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: "#ffffff",
    show: false,
    title: "JahKnowsPR Portal",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 14, y: 14 },
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const splashPath = path.join(__dirname, "..", "static", "splash.html");
  mainWindow.loadFile(splashPath);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.once("did-finish-load", () => {
    const url = mainWindow.webContents.getURL();
    if (url.startsWith("file:")) {
      const delay = Number(process.env.JKPR_SPLASH_MS || "550");
      setTimeout(() => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        mainWindow.loadURL(authUrl());
      }, Number.isFinite(delay) ? delay : 550);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("mailto:") || url.startsWith("tel:")) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const s = session.defaultSession;
  const ua = s.getUserAgent();
  if (!ua.includes("JKPRPortal/")) {
    s.setUserAgent(`${ua} JKPRPortal/${app.getVersion()}`);
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
