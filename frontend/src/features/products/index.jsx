import React from "react"
import { createRoot } from "react-dom/client"

import ProductsApp from "./ProductsApp"
import "./products.css"

const host = document.getElementById("timestock-products-root")

if (host) {
  const user = {
    firstName: host.dataset.firstName || "",
    lastName: host.dataset.lastName || "",
    role: host.dataset.role || "employee",
  }

  createRoot(host).render(<ProductsApp user={user} />)
}
