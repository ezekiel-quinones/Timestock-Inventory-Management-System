function getErrorMessage(data, status) {
  if (Array.isArray(data?.detail)) {
    const messages = data.detail.map((issue) => issue?.msg).filter(Boolean)
    if (messages.length > 0) return messages.join(" ")
  }

  if (typeof data?.detail === "string") return data.detail
  if (typeof data?.message === "string") return data.message
  if (typeof data === "string" && data.trim()) return data.trim()
  return `Request failed with status ${status}.`
}

async function parseTextResponse(response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function apiRequest(path, options = {}) {
  const { body, formData, responseType, headers, ...requestOptions } = options
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      Accept: responseType === "blob" ? "text/csv, application/octet-stream" : "application/json, text/plain",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: formData || (body === undefined ? undefined : JSON.stringify(body)),
    ...requestOptions,
  })

  if (responseType === "blob") {
    if (!response.ok) {
      const errorData = await parseTextResponse(response)
      throw new Error(getErrorMessage(errorData, response.status))
    }

    const disposition = response.headers.get("Content-Disposition") || ""
    const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
    const plainName = disposition.match(/filename="?([^";]+)"?/i)?.[1]
    return {
      blob: await response.blob(),
      filename: encodedName ? decodeURIComponent(encodedName) : plainName || "deleted-transactions.csv",
    }
  }

  const data = await parseTextResponse(response)
  if (!response.ok) throw new Error(getErrorMessage(data, response.status))
  if (data?.success === false) throw new Error(getErrorMessage(data, response.status))
  return data
}

export function getProfile(signal) {
  return apiRequest("/api/profile", { signal })
}

export function updateProfile(body) {
  return apiRequest("/api/profile/update", { method: "PUT", body })
}

export function createAdmin(body) {
  return apiRequest("/api/admin/create", { method: "POST", body })
}

export function createEmployee(body) {
  return apiRequest("/api/settings/add-employees", { method: "POST", body })
}

export function changeOwnPassword(currentPassword, newPassword) {
  const formData = new FormData()
  formData.append("current_password", currentPassword)
  formData.append("new_password", newPassword)
  return apiRequest("/api/change-password", { method: "POST", formData })
}

export function getEmployees(query = "", limit = 50, signal) {
  const params = new URLSearchParams({ role: "employee", limit: String(limit) })
  if (query.trim().length >= 2) params.set("q", query.trim())
  return apiRequest(`/api/users/list?${params}`, { signal })
}

export function changeEmployeePassword(body) {
  return apiRequest("/api/settings/change-employee-password", { method: "POST", body })
}

export function previewOldTransactions(years, signal) {
  return apiRequest(`/api/maintenance/preview-delete/${encodeURIComponent(years)}`, { signal })
}

export function deleteOldTransactions(years) {
  return apiRequest(`/api/maintenance/delete-old-transactions/${encodeURIComponent(years)}`, {
    method: "DELETE",
    responseType: "blob",
  })
}

export async function getAuditLogs(signal) {
  const data = await apiRequest("/api/audit-logs?limit=1000", { signal })
  return Array.isArray(data?.logs) ? data.logs : []
}

export function getAlerts(signal) {
  return apiRequest("/api/all-alerts", { signal })
}
