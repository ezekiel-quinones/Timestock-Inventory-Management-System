const REPORT_KEYS = [
  "sales",
  "turnover",
  "stl",
  "movingAverage",
  "stockMovement",
  "productsSold",
]

function previousMonth() {
  const date = new Date()
  date.setDate(1)
  date.setMonth(date.getMonth() - 1)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

function asInteger(value, fallback) {
  const number = Number(value)
  return Number.isInteger(number) ? number : fallback
}

function normalizeReport(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null

  return {
    ...value,
    empty: Boolean(value.empty),
    message: String(value.message || ""),
    breakdown: Array.isArray(value.breakdown) ? value.breakdown : [],
    interpretations: Array.isArray(value.interpretations) ? value.interpretations : [],
  }
}

export function readReportsBootstrap(documentRoot = document) {
  const element = documentRoot.getElementById("timestock-reports-data")
  if (!element) throw new Error("Reports data was not included in the page.")
  return JSON.parse(element.textContent || "{}")
}

export function normalizeReportsBootstrap(payload = {}, fallbackPeriod = {}) {
  const defaultPeriod = previousMonth()
  const reports = payload?.reports || {}
  const normalizedReports = {}

  REPORT_KEYS.forEach((key) => {
    normalizedReports[key] = normalizeReport(reports[key])
  })

  return {
    year: asInteger(payload.year, asInteger(fallbackPeriod.year, defaultPeriod.year)),
    month: asInteger(payload.month, asInteger(fallbackPeriod.month, defaultPeriod.month)),
    error: String(payload.error || ""),
    reports: normalizedReports,
  }
}
