import React from "react";
import { createRoot } from "react-dom/client";
import ElectionDashboard from "./components/election-dashboard";
import "./app/globals.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode><ElectionDashboard /></React.StrictMode>
);
