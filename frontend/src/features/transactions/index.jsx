import React from "react"
import { createRoot } from "react-dom/client"

import "../products/products.css"
import TransactionsApp from "./TransactionsApp"
import "./transactions.css"

const host = document.getElementById("timestock-transactions-root")

if (host) {
  const user = {
    firstName: host.dataset.firstName || "",
    lastName: host.dataset.lastName || "",
    role: host.dataset.role || "employee",
  }

  createRoot(host).render(<TransactionsApp user={user} />)
}
