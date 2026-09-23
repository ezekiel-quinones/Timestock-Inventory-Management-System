import { readAnalyticsBootstrap } from "./data"

async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
  })

  const redirectedToLogin = response.redirected && new URL(response.url).pathname === "/login"
  if (response.status === 401 || redirectedToLogin) {
    window.location.assign("/login")
    throw new Error("Your session has expired.")
  }

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`)
  }

  return response
}

export async function getAnalyticsSummary(period, signal) {
  const response = await request(
    `/api/analytics/order-rev-sales?period=${encodeURIComponent(period)}`,
    { headers: { Accept: "application/json" }, signal },
  )
  return response.json()
}

export async function getAnalyticsSnapshot(signal) {
  const response = await request(`/Analytics.html?refresh=${Date.now()}`, {
    headers: { Accept: "text/html" },
    signal,
  })
  const html = await response.text()
  const nextDocument = new DOMParser().parseFromString(html, "text/html")
  return readAnalyticsBootstrap(nextDocument)
}

export async function getAlerts(signal) {
  const response = await request("/api/all-alerts", {
    headers: { Accept: "application/json" },
    signal,
  })
  return response.json()
}
