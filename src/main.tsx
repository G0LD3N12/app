import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AudioManagerProvider } from "./context/AudioManagerContext";
import "./index.css";
import { getDesktopPlatform } from "./utils/platform";

document.documentElement.dataset.platform = getDesktopPlatform();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AudioManagerProvider>
      <App />
    </AudioManagerProvider>
  </React.StrictMode>,
);
