import React from "react"
import { createRoot } from "react-dom/client"

import "../products/products.css"
import MaterialsApp from "./MaterialsApp"
import "./materials.css"

const host = document.getElementById("timestock-materials-root")

if (host) {
  const user = {
    firstName: host.dataset.firstName || "",
    lastName: host.dataset.lastName || "",
    role: host.dataset.role || "employee",
  }

  createRoot(host).render(<MaterialsApp user={user} />)
}
