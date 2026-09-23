const EMOJI_PATTERN = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F\u200D]/gu
const BLOCK_END_PATTERN = /<\/(?:div|h[1-6]|li|p|section)>/gi

function findJsonEnd(source, start) {
  const opening = source[start]

  if (opening === '"') {
    let escaped = false
    for (let index = start + 1; index < source.length; index += 1) {
      const character = source[index]
      if (escaped) {
        escaped = false
      } else if (character === "\\") {
        escaped = true
      } else if (character === '"') {
        return index + 1
      }
    }
    throw new Error("Unterminated JSON string")
  }

  if (opening === "[" || opening === "{") {
    const stack = [opening]
    let inString = false
    let escaped = false

    for (let index = start + 1; index < source.length; index += 1) {
      const character = source[index]

      if (inString) {
        if (escaped) escaped = false
        else if (character === "\\") escaped = true
        else if (character === '"') inString = false
        continue
      }

      if (character === '"') {
        inString = true
      } else if (character === "[" || character === "{") {
        stack.push(character)
      } else if (character === "]" || character === "}") {
        stack.pop()
        if (stack.length === 0) return index + 1
      }
    }

    throw new Error("Unterminated JSON value")
  }

  let end = start
  while (end < source.length && source[end] !== "," && source[end] !== ")") end += 1
  return end
}

function readJsonValue(source, cursor) {
  let start = cursor
  while (/\s/.test(source[start] || "")) start += 1
  const end = findJsonEnd(source, start)
  return {
    value: JSON.parse(source.slice(start, end)),
    cursor: end,
  }
}

function movePastComma(source, cursor) {
  let next = cursor
  while (/\s/.test(source[next] || "")) next += 1
  if (source[next] !== ",") throw new Error("Invalid Plotly figure arguments")
  return next + 1
}

export function cleanServerText(value) {
  const source = String(value ?? "")
  if (!source) return ""

  const withLineBreaks = source
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(BLOCK_END_PATTERN, "\n")

  let text
  if (typeof DOMParser === "function") {
    const document = new DOMParser().parseFromString(withLineBreaks, "text/html")
    text = document.body.textContent || ""
  } else {
    text = withLineBreaks.replace(/<[^>]+>/g, "")
  }

  return text
    .replace(EMOJI_PATTERN, "")
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim()
}

export function reportLines(value) {
  return cleanServerText(value)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function recommendationTone(value) {
  const source = cleanServerText(value).toLowerCase()
  if (/decreas|decline|slowing|volatile|warning|not enough|no valid|demand issues/.test(source)) {
    return "risk"
  }
  if (/increas|upward|higher demand|reliable|positive seasonality|top seller/.test(source)) {
    return "positive"
  }
  if (/monitor|stable|no major change|lower demand|seasonality/.test(source)) {
    return "watch"
  }
  return "neutral"
}

export function parsePlotlySource(value) {
  const source = String(value ?? "").trim()
  if (!source || !source.startsWith('"')) {
    return {
      data: [],
      layout: {},
      config: {},
      emptyMessage: cleanServerText(source) || "No chart data is available.",
    }
  }

  try {
    const identifier = readJsonValue(source, 0)
    const dataResult = readJsonValue(source, movePastComma(source, identifier.cursor))
    const layoutResult = readJsonValue(source, movePastComma(source, dataResult.cursor))
    const configResult = readJsonValue(source, movePastComma(source, layoutResult.cursor))

    return {
      data: Array.isArray(dataResult.value) ? dataResult.value : [],
      layout: layoutResult.value || {},
      config: configResult.value || {},
      emptyMessage: "",
    }
  } catch {
    return {
      data: [],
      layout: {},
      config: {},
      emptyMessage: "This chart could not be prepared from the current analytics response.",
    }
  }
}

export function readAnalyticsBootstrap(documentRoot = document) {
  const element = documentRoot.getElementById("timestock-analytics-data")
  if (!element) throw new Error("Analytics data was not included in the page.")
  return JSON.parse(element.textContent || "{}")
}

export function normalizeSnapshot(payload) {
  const charts = payload?.charts || {}

  return {
    charts: {
      performance: parsePlotlySource(charts.performance),
      turnover: parsePlotlySource(charts.turnover),
      stl: parsePlotlySource(charts.stl),
      movingAverage: parsePlotlySource(charts.movingAverage),
    },
    reports: payload?.reports || {},
    recommendations: payload?.recommendations || {},
  }
}
