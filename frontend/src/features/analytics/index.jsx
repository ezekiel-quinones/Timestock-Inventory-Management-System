import React from "react"
import { createRoot } from "react-dom/client"

import AnalyticsApp from "./AnalyticsApp"
import { normalizeSnapshot, readAnalyticsBootstrap } from "./data"
import "./analytics.css"

const host = document.getElementById("timestock-analytics-root")

if (host) {
  const user = {
    firstName: host.dataset.firstName || "",
    lastName: host.dataset.lastName || "",
    role: host.dataset.role || "employee",
  }

  let initialSnapshot
  try {
    initialSnapshot = normalizeSnapshot(readAnalyticsBootstrap())
  } catch {
    initialSnapshot = normalizeSnapshot({})
  }

  createRoot(host).render(<AnalyticsApp initialSnapshot={initialSnapshot} user={user} />)
}
