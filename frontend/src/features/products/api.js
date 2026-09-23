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

export async function getProducts(signal) {
  const data = await apiRequest("/api/products", { signal })
  if (!Array.isArray(data)) throw new Error("The product list response was invalid.")
  return data
}

export async function getProductSummary(signal) {
  return apiRequest("/api/summary/products", { signal })
}

export async function getProductCategories(signal) {
  const data = await apiRequest("/api/product-categories", { signal })
  if (!Array.isArray(data)) throw new Error("The category list response was invalid.")
  return data
}

export async function getMaterials(signal) {
  const data = await apiRequest("/api/materials", { signal })
  if (!Array.isArray(data)) throw new Error("The material list response was invalid.")
  return data
}

export async function getProductMaterials(productId, signal) {
  const data = await apiRequest(
    `/api/product-materials/${encodeURIComponent(productId)}`,
    { signal },
  )
  if (!Array.isArray(data)) throw new Error("The product recipe response was invalid.")
  return data
}
