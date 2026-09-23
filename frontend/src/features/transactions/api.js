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

async function getArray(path, invalidMessage, signal) {
  const data = await apiRequest(path, { signal })
  if (!Array.isArray(data)) throw new Error(invalidMessage)
  return data
}

export function getStockTransactions(signal) {
  return getArray(
    "/api/stock-transactions",
    "The stock transaction response was invalid.",
    signal,
  )
}

export function getOrderTransactions(signal) {
  return getArray(
    "/api/order-transactions",
    "The order transaction response was invalid.",
    signal,
  )
}

export function getOrderStatuses(signal) {
  return getArray("/api/order-statuses", "The order status response was invalid.", signal)
}

export function updateOrderStatus(transactionId, statusCode) {
  return apiRequest("/api/orders/update-status", {
    method: "PUT",
    body: {
      transaction_id: transactionId,
      status_code: statusCode,
    },
  })
}

export function deleteOrder(transactionId) {
  return apiRequest(`/api/orders/${encodeURIComponent(transactionId)}`, {
    method: "DELETE",
  })
}
