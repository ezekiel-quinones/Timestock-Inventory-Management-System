import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import {
  Activity,
  AlertCircle,
  BarChart3,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  FileText,
  Gauge,
  Lightbulb,
  PackageCheck,
  RadioTower,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import PlotlyLibrary from "plotly.js-basic-dist-min"
import createPlotlyComponent from "react-plotly.js/factory"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

import AnalyticsNotificationCenter from "./AnalyticsNotificationCenter"
import { getAnalyticsSnapshot, getAnalyticsSummary } from "./api"
import {
  cleanServerText,
  normalizeSnapshot,
  recommendationTone,
  reportLines,
} from "./data"

const Plot = createPlotlyComponent(PlotlyLibrary)
const AUTO_REFRESH_MS = 30_000

const numberFormatter = new Intl.NumberFormat("en-PH", {
  maximumFractionDigits: 0,
})
const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const timeFormatter = new Intl.DateTimeFormat("en-PH", {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
})

const periodLabels = {
  week: "This week",
  month: "This month",
  year: "This year",
}

const metricDefinitions = [
  {
    key: "total_orders",
    label: "Total orders",
    description: "Completed product orders",
    icon: Boxes,
    tone: "cyan",
    format: (value) => numberFormatter.format(value),
  },
  {
    key: "total_sales",
    label: "Units sold",
    description: "Products sold in the period",
    icon: ShoppingBag,
    tone: "blue",
    format: (value) => numberFormatter.format(value),
  },
  {
    key: "total_revenue",
    label: "Total revenue",
    description: "Revenue from completed sales",
    icon: CircleDollarSign,
    tone: "gold",
    format: (value) => currencyFormatter.format(value),
  },
]

const chartPalettes = {
  performance: ["#147f9b", "#456fa7", "#cc8a2e"],
  turnover: ["#d27369", "#67a5bc", "#3d9775"],
  stl: ["#277da1", "#46986d", "#c66762"],
  movingAverage: ["#347da4", "#d0902e", "#46946b"],
}

function asFiniteNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function styleAxis(axis = {}) {
  const title = typeof axis.title === "string"
    ? { text: axis.title }
    : { ...(axis.title || {}) }

  return {
    ...axis,
    automargin: true,
    gridcolor: axis.showgrid === false ? undefined : "#e6edf0",
    linecolor: "#d4e0e5",
    tickcolor: "#d4e0e5",
    tickfont: { ...(axis.tickfont || {}), color: "#667f8b", size: 11 },
    title: {
      ...title,
      font: { ...(title.font || {}), color: "#4c6875", size: 12 },
      standoff: 12,
    },
    zerolinecolor: "#d9e4e8",
  }
}

function getStyledFigure(figure, chartKey, height) {
  const palette = chartPalettes[chartKey] || chartPalettes.performance
  const data = (figure?.data || []).map((trace, index) => {
    const color = palette[index % palette.length]
    const isBar = trace.type === "bar"
    const isLine = trace.type === "scatter"

    return {
      ...trace,
      ...(isBar
        ? { marker: { ...(trace.marker || {}), color, line: { width: 0 } } }
        : {}),
      ...(isLine
        ? {
            line: { ...(trace.line || {}), color, width: 2.5 },
            marker: { ...(trace.marker || {}), color, size: trace.marker?.size || 6 },
          }
        : {}),
    }
  })

  const {
    height: ignoredHeight,
    title: ignoredTitle,
    width: ignoredWidth,
    ...serverLayout
  } = figure?.layout || {}
  const layout = {
    ...serverLayout,
    autosize: true,
    height,
    hoverlabel: {
      bgcolor: "#102f40",
      bordercolor: "#102f40",
      font: { color: "#ffffff", family: "Open Sans, Segoe UI, sans-serif", size: 12 },
    },
    font: {
      ...(serverLayout.font || {}),
      color: "#496571",
      family: "Open Sans, Segoe UI, sans-serif",
      size: 12,
    },
    legend: {
      ...(serverLayout.legend || {}),
      bgcolor: "rgba(255,255,255,0)",
      font: { color: "#405e6b", size: 11 },
      orientation: "h",
      x: 0,
      y: chartKey === "stl" ? 1.1 : 1.12,
    },
    margin: chartKey === "stl"
      ? { l: 58, r: 28, t: 44, b: 52 }
      : { l: 58, r: 58, t: 42, b: 55 },
    paper_bgcolor: "rgba(255,255,255,0)",
    plot_bgcolor: "#ffffff",
    uirevision: chartKey,
  }

  Object.keys(layout).forEach((key) => {
    if (/^[xy]axis\d*$/.test(key)) layout[key] = styleAxis(layout[key])
  })

  if (Array.isArray(layout.annotations)) {
    layout.annotations = layout.annotations.map((annotation) => ({
      ...annotation,
      font: { ...(annotation.font || {}), color: "#365767", size: 12 },
    }))
  }

  const config = {
    ...(figure?.config || {}),
    displaylogo: false,
    responsive: true,
    scrollZoom: false,
    toImageButtonOptions: {
      filename: `timestock-${chartKey}`,
      format: "png",
      height,
      scale: 2,
      width: 1200,
    },
  }

  return { data, layout, config }
}

function MetricCard({ definition, error, index, loading, period, value, reduceMotion }) {
  const Icon = definition.icon

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.34, delay: index * 0.06 }}
    >
      <Card className="analytics-metric-card" data-tone={definition.tone}>
        <CardContent className="analytics-metric-content">
          <div className="analytics-metric-heading">
            <div>
              <p>{definition.label}</p>
              <small>{definition.description}</small>
            </div>
            <span className="analytics-metric-icon" aria-hidden="true"><Icon /></span>
          </div>
          {loading ? (
            <div className="analytics-metric-loading">
              <Skeleton className="h-7 w-32" aria-label={`Loading ${definition.label}`} />
              <Skeleton className="h-3 w-20" />
            </div>
          ) : (
            <div className="analytics-metric-value">
              <strong className={error ? "is-unavailable" : undefined}>
                {error ? "Unavailable" : definition.format(asFiniteNumber(value))}
              </strong>
              <span>{periodLabels[period]}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function ReportDialog({ report, title }) {
  const [open, setOpen] = React.useState(false)
  const lines = reportLines(report)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="analytics-button analytics-report-button"
        onClick={() => setOpen(true)}
      >
        <FileText aria-hidden="true" />
        View analysis
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="analytics-dialog max-w-2xl"
          overlayClassName="analytics-dialog-overlay"
        >
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            <DialogHeader className="analytics-dialog-heading">
              <div className="analytics-dialog-icon" aria-hidden="true"><FileText /></div>
              <div>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>Calculated from the same records shown in this chart.</DialogDescription>
              </div>
            </DialogHeader>
            <div className="analytics-report-list">
              {lines.length === 0 ? (
                <div className="analytics-dialog-empty">
                  <BarChart3 aria-hidden="true" />
                  No analysis is available for this chart.
                </div>
              ) : lines.map((line, index) => {
                const separator = line.indexOf(":")
                const isHeading = /report$|analysis$|seasonality$|fluctuations\)$/i.test(line)

                if (isHeading || separator < 1 || separator > 48) {
                  return isHeading
                    ? <h3 key={`${line}-${index}`}>{line}</h3>
                    : <p key={`${line}-${index}`}>{line}</p>
                }

                return (
                  <div className="analytics-report-row" key={`${line}-${index}`}>
                    <span>{line.slice(0, separator)}</span>
                    <strong>{line.slice(separator + 1).trim()}</strong>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ChartView({ chartKey, figure, height, title }) {
  const styledFigure = React.useMemo(
    () => getStyledFigure(figure, chartKey, height),
    [chartKey, figure, height],
  )

  if (!figure || figure.emptyMessage || figure.data.length === 0) {
    return (
      <div className="analytics-chart-empty" role="status" style={{ minHeight: height }}>
        <BarChart3 aria-hidden="true" />
        <strong>No chart data</strong>
        <p>{figure?.emptyMessage || "No chart data is available."}</p>
      </div>
    )
  }

  return (
    <div className="analytics-plot" aria-label={`${title} interactive chart`} style={{ height }}>
      <Plot
        data={styledFigure.data}
        layout={styledFigure.layout}
        config={styledFigure.config}
        divId={`analytics-${chartKey}-plot`}
        useResizeHandler
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  )
}

function ChartCard({ chartKey, description, figure, height = 390, icon: Icon, report, title }) {
  return (
    <Card className="analytics-chart-card">
      <CardContent className="analytics-chart-content">
        <div className="analytics-chart-heading">
          <div className="analytics-chart-title">
            <span className="analytics-chart-icon" aria-hidden="true"><Icon /></span>
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
          </div>
          <ReportDialog report={report} title={`${title} analysis`} />
        </div>
        <ChartView chartKey={chartKey} figure={figure} height={height} title={title} />
      </CardContent>
    </Card>
  )
}

function RecommendationItem({ value }) {
  const tone = recommendationTone(value)
  const text = cleanServerText(value)
  const Icon = tone === "positive"
    ? TrendingUp
    : tone === "risk"
      ? TrendingDown
      : tone === "watch"
        ? Clock3
        : Lightbulb

  if (!text) return null

  return (
    <li className="analytics-recommendation-item" data-tone={tone}>
      <span aria-hidden="true"><Icon /></span>
      <p>{text}</p>
    </li>
  )
}

function StlRecommendations({ confidence, flatRecommendations, groupedRecommendations, reduceMotion }) {
  const groups = Array.isArray(groupedRecommendations) && groupedRecommendations.length > 0
    ? groupedRecommendations
    : [{ month: "Forecast guidance", recs: flatRecommendations || [] }]
  const [expanded, setExpanded] = React.useState(() => new Set(groups[0]?.month ? [groups[0].month] : []))

  React.useEffect(() => {
    if (expanded.size === 0 && groups[0]?.month) setExpanded(new Set([groups[0].month]))
  }, [expanded.size, groups])

  function toggleMonth(month) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(month)) next.delete(month)
      else next.add(month)
      return next
    })
  }

  const confidenceLabel = cleanServerText(confidence?.label || "No confidence data")
  const confidenceScore = asFiniteNumber(confidence?.score)
  const confidenceTone = /high/i.test(confidenceLabel)
    ? "high"
    : /moderate/i.test(confidenceLabel)
      ? "moderate"
      : "low"

  return (
    <Card className="analytics-insight-card analytics-insight-card--forecast">
      <CardContent className="analytics-insight-content">
        <div className="analytics-insight-heading">
          <span className="analytics-insight-icon" aria-hidden="true"><ShieldCheck /></span>
          <div>
            <span className="analytics-eyebrow">STL guidance</span>
            <h2>Order demand outlook</h2>
            <p>Trend, seasonality, and variability signals grouped by forecast month.</p>
          </div>
        </div>

        <div className="analytics-confidence" data-tone={confidenceTone}>
          <div>
            <span>Model confidence</span>
            <strong>{confidenceLabel}</strong>
          </div>
          <Badge variant="outline">{confidenceScore.toFixed(1)}%</Badge>
        </div>

        <div className="analytics-months">
          {groups.map((group, groupIndex) => {
            const month = cleanServerText(group?.month || `Period ${groupIndex + 1}`)
            const isExpanded = expanded.has(group?.month)
            const recs = Array.isArray(group?.recs) ? group.recs : []

            return (
              <section className="analytics-month" key={`${group?.month}-${groupIndex}`}>
                <button
                  type="button"
                  className="analytics-month-trigger"
                  aria-expanded={isExpanded}
                  onClick={() => toggleMonth(group?.month)}
                >
                  <span><CalendarDays aria-hidden="true" />{month}</span>
                  <ChevronDown className={isExpanded ? "is-expanded" : ""} aria-hidden="true" />
                </button>
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      className="analytics-month-content"
                      initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: reduceMotion ? 0 : 0.2 }}
                    >
                      {recs.length > 0 ? (
                        <ul>{recs.map((rec, index) => <RecommendationItem key={`${rec}-${index}`} value={rec} />)}</ul>
                      ) : (
                        <p className="analytics-recommendation-empty">No guidance is available for this period.</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function MovingAverageRecommendations({ recommendations }) {
  const items = Array.isArray(recommendations) ? recommendations : []

  return (
    <Card className="analytics-insight-card">
      <CardContent className="analytics-insight-content">
        <div className="analytics-insight-heading">
          <span className="analytics-insight-icon" aria-hidden="true"><Lightbulb /></span>
          <div>
            <span className="analytics-eyebrow">Sales guidance</span>
            <h2>Moving-average signals</h2>
            <p>Practical inventory actions based on short and long-term sales movement.</p>
          </div>
        </div>
        {items.length > 0 ? (
          <ul className="analytics-recommendation-list">
            {items.map((item, index) => <RecommendationItem key={`${item}-${index}`} value={item} />)}
          </ul>
        ) : (
          <div className="analytics-insight-empty">
            <CheckCircle2 aria-hidden="true" />
            No moving-average guidance is available yet.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AnalyticsApp({ initialSnapshot, user }) {
  const [period, setPeriod] = React.useState("week")
  const [summary, setSummary] = React.useState(null)
  const [summaryLoading, setSummaryLoading] = React.useState(true)
  const [summaryError, setSummaryError] = React.useState("")
  const [snapshot, setSnapshot] = React.useState(initialSnapshot)
  const [refreshError, setRefreshError] = React.useState("")
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [lastUpdated, setLastUpdated] = React.useState(() => new Date())
  const refreshControllerRef = React.useRef(null)
  const refreshInFlightRef = React.useRef(false)
  const periodRef = React.useRef(period)
  const reduceMotion = useReducedMotion()

  periodRef.current = period

  React.useEffect(() => {
    const controller = new AbortController()
    let active = true
    const requestedPeriod = period

    async function loadSummary() {
      setSummaryLoading(true)
      setSummary(null)
      try {
        const data = await getAnalyticsSummary(requestedPeriod, controller.signal)
        if (!active) return
        setSummary(data)
        setSummaryError("")
      } catch (error) {
        if (error.name !== "AbortError" && active) {
          setSummaryError("The period summary could not be refreshed.")
        }
      } finally {
        if (active) setSummaryLoading(false)
      }
    }

    loadSummary()
    return () => {
      active = false
      controller.abort()
    }
  }, [period])

  const refreshAll = React.useCallback(async () => {
    if (refreshInFlightRef.current) return
    refreshInFlightRef.current = true
    setIsRefreshing(true)
    refreshControllerRef.current?.abort()
    const controller = new AbortController()
    refreshControllerRef.current = controller
    const requestedPeriod = period

    const [snapshotResult, summaryResult] = await Promise.allSettled([
      getAnalyticsSnapshot(controller.signal),
      getAnalyticsSummary(requestedPeriod, controller.signal),
    ])

    if (!controller.signal.aborted) {
      if (snapshotResult.status === "fulfilled") {
        React.startTransition(() => setSnapshot(normalizeSnapshot(snapshotResult.value)))
        setRefreshError("")
        setLastUpdated(new Date())
      } else {
        setRefreshError("Live chart data could not be refreshed. The last successful snapshot is still shown.")
      }

      if (summaryResult.status === "fulfilled" && periodRef.current === requestedPeriod) {
        setSummary(summaryResult.value)
        setSummaryError("")
      } else if (summaryResult.status === "rejected" && periodRef.current === requestedPeriod) {
        setSummaryError("The period summary could not be refreshed.")
      }
    }

    if (refreshControllerRef.current === controller) {
      refreshInFlightRef.current = false
      setIsRefreshing(false)
    }
  }, [period])

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      if (!document.hidden) refreshAll()
    }, AUTO_REFRESH_MS)

    function handleVisibilityChange() {
      if (!document.hidden) refreshAll()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [refreshAll])

  React.useEffect(() => () => refreshControllerRef.current?.abort(), [])

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "TimeStock user"
  const roleLabel = user.role === "admin" ? "Administrator" : "Employee"
  const profileInitial = user.role === "admin" ? "A" : "E"

  return (
    <div className="analytics-app">
      <motion.header
        className="analytics-header"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.3 }}
      >
        <div className="analytics-header-identity">
          <span className="analytics-eyebrow">Decision intelligence</span>
          <h1>Analytics</h1>
          <p>Sales, inventory efficiency, and demand signals in one workspace.</p>
        </div>
        <div className="analytics-header-actions">
          <div className="analytics-header-notifications"><AnalyticsNotificationCenter /></div>
          <div className="analytics-profile" aria-label={`${displayName}, ${roleLabel}`}>
            <div>
              <span>Welcome back</span>
              <strong>{displayName}</strong>
              <small>{roleLabel}</small>
            </div>
            <span className="analytics-profile-avatar" aria-hidden="true">{profileInitial}</span>
          </div>
        </div>
      </motion.header>

      <div className="analytics-content">
        <section className="analytics-intro" aria-labelledby="analytics-overview-title">
          <div>
            <span className="analytics-eyebrow">Performance overview</span>
            <h2 id="analytics-overview-title">Operational analytics</h2>
            <p>Explore completed order performance and forward-looking stock guidance.</p>
          </div>
          <div className="analytics-live-controls">
            <div className="analytics-live-status" role="status">
              <RadioTower aria-hidden="true" />
              <div>
                <strong>Live analytics</strong>
                <span>Updated {timeFormatter.format(lastUpdated)}</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="analytics-button analytics-refresh-button"
              disabled={isRefreshing}
              onClick={refreshAll}
            >
              <RefreshCw className={isRefreshing ? "is-spinning" : ""} aria-hidden="true" />
              {isRefreshing ? "Refreshing" : "Refresh data"}
            </Button>
          </div>
        </section>

        <AnimatePresence>
          {(summaryError || refreshError) && (
            <motion.div
              className="analytics-feedback"
              initial={reduceMotion ? false : { opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
            >
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertTitle>Some analytics are temporarily unavailable</AlertTitle>
                <AlertDescription>{refreshError || summaryError}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="analytics-summary" aria-labelledby="period-summary-title">
          <div className="analytics-section-bar">
            <div>
              <span className="analytics-eyebrow">Period summary</span>
              <h2 id="period-summary-title">Completed sales snapshot</h2>
            </div>
            <div className="analytics-period-filter" role="group" aria-label="Summary period">
              {Object.entries(periodLabels).map(([value, label]) => (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={period === value ? "is-active" : ""}
                  aria-pressed={period === value}
                  key={value}
                  onClick={() => setPeriod(value)}
                >
                  {label.replace("This ", "")}
                </Button>
              ))}
            </div>
          </div>

          <div className="analytics-metrics" aria-live="polite" aria-busy={summaryLoading}>
            {metricDefinitions.map((definition, index) => (
              <MetricCard
                definition={definition}
                error={Boolean(summaryError && summary === null)}
                index={index}
                key={definition.key}
                loading={summaryLoading}
                period={period}
                reduceMotion={reduceMotion}
                value={summary?.[definition.key]}
              />
            ))}
          </div>
        </section>

        <section className="analytics-chart-section" aria-labelledby="performance-chart-title">
          <div className="analytics-section-heading">
            <div>
              <span className="analytics-eyebrow">Historical performance</span>
              <h2 id="performance-chart-title">Sales and inventory movement</h2>
              <p>Compare completed demand with revenue and monthly inventory efficiency.</p>
            </div>
            <Badge variant="outline" className="analytics-section-badge">
              <PackageCheck aria-hidden="true" />
              Completed records
            </Badge>
          </div>
          <motion.div
            className="analytics-chart-grid"
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.4, delay: 0.12 }}
          >
            <ChartCard
              chartKey="performance"
              description="Monthly completed orders, units sold, and revenue."
              figure={snapshot.charts.performance}
              icon={BarChart3}
              report={snapshot.reports.performance}
              title="Orders, sales, and revenue"
            />
            <ChartCard
              chartKey="turnover"
              description="COGS and average inventory compared with turnover rate."
              figure={snapshot.charts.turnover}
              icon={Gauge}
              report={snapshot.reports.turnover}
              title="Inventory turnover rate"
            />
          </motion.div>
        </section>

        <section className="analytics-deep-section" aria-labelledby="demand-forecast-title">
          <div className="analytics-section-heading">
            <div>
              <span className="analytics-eyebrow">Demand decomposition</span>
              <h2 id="demand-forecast-title">Monthly order forecast signals</h2>
              <p>Separate long-term trend, recurring seasonality, and irregular demand shifts.</p>
            </div>
          </div>
          <motion.div
            className="analytics-deep-grid"
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.4, delay: 0.18 }}
          >
            <ChartCard
              chartKey="stl"
              description="STL components reveal structural and seasonal changes in order quantity."
              figure={snapshot.charts.stl}
              height={510}
              icon={TrendingUp}
              report={snapshot.reports.stl}
              title="STL order decomposition"
            />
            <StlRecommendations
              confidence={snapshot.recommendations.stlConfidence}
              flatRecommendations={snapshot.recommendations.stlFlat}
              groupedRecommendations={snapshot.recommendations.stlGrouped}
              reduceMotion={reduceMotion}
            />
          </motion.div>
        </section>

        <section className="analytics-deep-section" aria-labelledby="sales-signal-title">
          <div className="analytics-section-heading">
            <div>
              <span className="analytics-eyebrow">Sales momentum</span>
              <h2 id="sales-signal-title">Moving-average guidance</h2>
              <p>Compare actual sales with three and six-month baselines to detect momentum changes.</p>
            </div>
          </div>
          <motion.div
            className="analytics-deep-grid analytics-deep-grid--sales"
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.4, delay: 0.24 }}
          >
            <ChartCard
              chartKey="movingAverage"
              description="Actual monthly sales against short and long-term rolling averages."
              figure={snapshot.charts.movingAverage}
              height={430}
              icon={Activity}
              report={snapshot.reports.movingAverage}
              title="Monthly sales momentum"
            />
            <MovingAverageRecommendations recommendations={snapshot.recommendations.movingAverage} />
          </motion.div>
        </section>
      </div>
    </div>
  )
}

export default AnalyticsApp
