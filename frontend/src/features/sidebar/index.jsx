import React from "react"
import { createRoot } from "react-dom/client"

import SidebarApp from "./SidebarApp"
import "./sidebar.css"

const host = document.getElementById("timestock-sidebar-root")

if (host) {
  const role = host.dataset.role || ""
  createRoot(host).render(
    <React.StrictMode>
      <SidebarApp host={host} role={role} />
    </React.StrictMode>,
  )
}
