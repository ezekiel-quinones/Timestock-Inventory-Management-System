function getErrorMessage(data, status) {
  if (Array.isArray(data?.detail)) {
    return data.detail.map((issue) => issue.msg).filter(Boolean).join(" ")
  }

  return data?.detail || data?.message || data?.error || `Request failed with status ${status}.`
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...options.headers,
    },
    ...options,
  })

  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { detail: text }
    }
  }

  if (!response.ok) {
    if (response.status === 401) window.location.assign("/login")
    throw new Error(getErrorMessage(data, response.status))
  }

  return data
}

export async function getSuppliers(signal) {
  const data = await apiRequest("/api/suppliers", { signal })
  if (!Array.isArray(data)) throw new Error("The supplier directory response was invalid.")
  return data
}

export async function getStockFlow(signal) {
  const data = await apiRequest("/api/dashboard/stock-flow", { signal })
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("The supplier stock summary response was invalid.")
  }
  return data
}
