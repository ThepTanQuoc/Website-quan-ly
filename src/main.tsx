import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { installStorageShim } from "./lib/storage";

// Module 1 (Báo giá) dùng window.storage — cài shim trước khi render.
installStorageShim();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
