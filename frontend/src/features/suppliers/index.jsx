import React from "react"
import { createRoot } from "react-dom/client"

import "../products/products.css"
import SuppliersApp from "./SuppliersApp"
import "./suppliers.css"

const host = document.getElementById("timestock-suppliers-root")

if (host) {
  const user = {
    firstName: host.dataset.firstName || "",
    lastName: host.dataset.lastName || "",
    role: host.dataset.role || "employee",
  }

  createRoot(host).render(<SuppliersApp user={user} />)
}
