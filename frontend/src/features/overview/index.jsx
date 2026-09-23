import React from "react"
import { createRoot } from "react-dom/client"

import OverviewApp from "./OverviewApp"
import "./overview.css"

const host = document.getElementById("timestock-overview-root")

if (host) {
  const user = {
    firstName: host.dataset.firstName || "",
    lastName: host.dataset.lastName || "",
    role: host.dataset.role || "employee",
  }

  createRoot(host).render(
    <React.StrictMode>
      <OverviewApp user={user} />
    </React.StrictMode>,
  )
}
