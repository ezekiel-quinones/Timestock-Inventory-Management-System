function getErrorMessage(data, status) {
  if (Array.isArray(data?.detail)) {
    return data.detail.map((issue) => issue.msg).filter(Boolean).join(" ")
  }

  return data?.detail || data?.message || `Request failed with status ${status}.`
}

export async function apiRequest(path, options = {}) {
  const { body, headers, ...requestOptions } = options
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...requestOptions,
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

async function getArray(path, label, signal) {
  const data = await apiRequest(path, { signal })
  if (!Array.isArray(data)) throw new Error(`The ${label} response was invalid.`)
  return data
}

export function getMaterials(signal) {
  return getArray("/api/materials", "material list", signal)
}

export function getMaterialCategories(signal) {
  return getArray("/api/material-categories", "material category list", signal)
}

export function getSuppliers(signal) {
  return getArray("/api/suppliers", "supplier list", signal)
}

export function getProducts(signal) {
  return getArray("/api/products", "product list", signal)
}

export function getMaterialSummary(signal) {
  return apiRequest("/api/summary/materials", { signal })
}
