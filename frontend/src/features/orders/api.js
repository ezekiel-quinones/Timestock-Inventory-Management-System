function getErrorMessage(data, status) {
  if (Array.isArray(data?.detail)) {
    return data.detail.map((issue) => issue.msg).filter(Boolean).join(" ")
  }

  return data?.detail || data?.message || data?.error || `Request failed with status ${status}.`
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
    if (response.status === 401 && path !== "/api/orders") window.location.assign("/login")
    throw new Error(getErrorMessage(data, response.status))
  }

  return data
}

async function getArray(path, label, signal) {
  const data = await apiRequest(path, { signal })
  if (!Array.isArray(data)) throw new Error(`The ${label} response was invalid.`)
  return data
}

export function getProducts(signal) {
  return getArray("/api/products", "product list", signal)
}

export function getMaterials(signal) {
  return getArray("/api/materials", "material list", signal)
}

export function getOrderStatuses(signal) {
  return getArray("/api/order-statuses", "order status list", signal)
}

export async function getProductQuote(productId, signal) {
  const data = await apiRequest(`/api/products/${encodeURIComponent(productId)}/quote`, {
    signal,
  })
  if (!Array.isArray(data?.materials)) throw new Error("The product quote response was invalid.")
  return data
}

export function placeOrder(payload) {
  return apiRequest("/api/orders", { method: "POST", body: payload })
}

export function stockMaterials(payload) {
  return apiRequest("/api/stock-materials", { method: "POST", body: payload })
}

export function createMaterial(payload) {
  return apiRequest("/api/materials", { method: "POST", body: payload })
}

export async function generatePdf(path, payload, signal) {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/pdf, application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  })

  const contentType = response.headers.get("content-type") || ""
  if (!response.ok || contentType.includes("application/json")) {
    let data = null
    try {
      data = await response.json()
    } catch {
      data = null
    }
    throw new Error(getErrorMessage(data, response.status))
  }

  return response.blob()
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error("The selected logo could not be read."))
    reader.readAsDataURL(file)
  })
}
