import React from "react"
import { createRoot } from "react-dom/client"

import "../products/products.css"
import ReportsApp from "./ReportsApp"
import { normalizeReportsBootstrap, readReportsBootstrap } from "./data"
import "./reports.css"

const host = document.getElementById("timestock-reports-root")

if (host) {
  const user = {
    firstName: host.dataset.firstName || "",
    lastName: host.dataset.lastName || "",
    role: host.dataset.role || "employee",
  }
  const fallbackPeriod = {
    year: Number(host.dataset.year),
    month: Number(host.dataset.month),
  }

  let initialData
  try {
    initialData = normalizeReportsBootstrap(readReportsBootstrap(), fallbackPeriod)
  } catch {
    initialData = normalizeReportsBootstrap(
      { error: "The report data included in this page could not be read." },
      fallbackPeriod,
    )
  }

  createRoot(host).render(<ReportsApp initialData={initialData} user={user} />)
}
