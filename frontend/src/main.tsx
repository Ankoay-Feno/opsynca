import React from "react";
import ReactDOM from "react-dom/client";

import { RagApp } from "./apps/RagApp";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RagApp />
  </React.StrictMode>,
);
