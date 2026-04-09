const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("jkprPortal", {
  /** Present after the web app loads if you want to branch UI in the future */
  isDesktopShell: true,
});
