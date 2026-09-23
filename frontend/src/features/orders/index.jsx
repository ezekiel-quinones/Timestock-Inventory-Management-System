import React from "react"
import { createRoot } from "react-dom/client"

import "../products/products.css"
import OrdersApp from "./OrdersApp"
import "./orders.css"

const host = document.getElementById("timestock-orders-root")

if (host) {
  const user = {
    firstName: host.dataset.firstName || "",
    lastName: host.dataset.lastName || "",
    role: host.dataset.role || "employee",
  }

  createRoot(host).render(<OrdersApp user={user} />)
}
