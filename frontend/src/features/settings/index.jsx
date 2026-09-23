import React from "react"
import { createRoot } from "react-dom/client"

import SettingsApp from "./SettingsApp"
import "./settings.css"

const host = document.getElementById("timestock-settings-root")

if (host) {
  const user = {
    firstName: host.dataset.firstName || "",
    lastName: host.dataset.lastName || "",
    role: host.dataset.role || "employee",
  }

  createRoot(host).render(<SettingsApp user={user} />)
}
