import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import {
  AlertCircle,
  ArrowUpRight,
  Banknote,
  Bell,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  PackageSearch,
  ShoppingCart,
  TrendingUp,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const numberFormatter = new Intl.NumberFormat("en-PH")
const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})
const headingDateFormatter = new Intl.DateTimeFormat("en-PH", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
})

const metricDefinitions = [
  {
    key: "total_sales",
    label: "All-time sales",
    description: "Completed units sold",
    icon: ShoppingCart,
    tone: "cyan",
    format: (value) => numberFormatter.format(value),
  },
  {
    key: "total_orders",
    label: "All-time orders",
    description: "Completed customer orders",
    icon: Boxes,
    tone: "blue",
    format: (value) => numberFormatter.format(value),
  },
  {
    key: "total_revenue",
    label: "All-time revenue",
    description: "Recorded completed revenue",
    icon: Banknote,
    tone: "gold",
    format: (value) => currencyFormatter.format(value),
  },
]

const fastestBarColors = [
  "#0f7895",
  "#168da7",
  "#22a1b7",
  "#38b2c3",
  "#58c0ce",
  "#75cbd5",
  "#8fd5dd",
  "#a5dde4",
  "#b9e5e9",
  "#ccecef",
]

function asFiniteNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

async function fetchJson(url, signal) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  })

  if (response.status === 401) {
    window.location.assign("/login")
    throw new Error("Your session has expired.")
  }

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`)
  }

  return response.json()
}

function getSeenAlerts() {
  try {
    const stored = JSON.parse(window.localStorage.getItem("seenAlerts") || "[]")
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

function getAlertMessages(alertGroups) {
  return Object.values(alertGroups || {}).flatMap((alerts) =>
    Array.isArray(alerts) ? alerts.map((alert) => String(alert.message || "")) : [],
  )
}

function extractAlertId(alert) {
  const directId =
    alert?.material_id ||
    alert?.materialId ||
    alert?.id ||
    alert?.item_id ||
    alert?.mat_id ||
    ""

  if (directId) return String(directId)

  const message = String(alert?.message || "")
  const patterns = [
    /([A-Z]{2,}-\d{1,6})/,
    /([A-Z]{2,}\d{1,6})/,
    /([A-Z]{1,4}-[A-Z]{1,4}-\d{1,4})/,
    /([A-Z]{2,}\d{2,6})/,
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match) return match[1]
  }

  return ""
}

function getCategoryIcon(category) {
  const normalized = category.toLowerCase()
  if (normalized.includes("reorder")) return PackageSearch
  if (normalized.includes("minimum")) return AlertCircle
  return TrendingUp
}

function normalizeStatus(status) {
  return String(status || "unknown")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
}

function formatStatus(status) {
  return normalizeStatus(status)
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function formatTransactionDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Date unavailable" : dateFormatter.format(date)
}

function truncateLabel(value, length = 18) {
  const label = String(value || "")
  return label.length > length ? `${label.slice(0, length - 1)}...` : label
}

function MetricCard({ definition, value, loading, index, reduceMotion }) {
  const Icon = definition.icon

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.38, delay: index * 0.07 }}
    >
      <Card className="overview-metric-card" data-tone={definition.tone}>
        <CardContent className="overview-metric-card__content">
          <div className="overview-metric-card__heading">
            <div>
              <p>{definition.label}</p>
              <small>{definition.description}</small>
            </div>
            <div className="overview-metric-card__icon" aria-hidden="true">
              <Icon />
            </div>
          </div>
          {loading ? (
            <div className="overview-metric-card__loading">
              <Skeleton className="h-7 w-32" aria-label="Loading metric" />
              <Skeleton className="h-3 w-20" />
            </div>
          ) : (
            <div className="overview-metric-card__value">
              <strong>{definition.format(asFiniteNumber(value))}</strong>
              <span>All time</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function NotificationCenter() {
  const [open, setOpen] = React.useState(false)
  const [alertGroups, setAlertGroups] = React.useState({})
  const [expandedGroups, setExpandedGroups] = React.useState(() => new Set())
  const [hasUnseen, setHasUnseen] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const wrapperRef = React.useRef(null)
  const panelRef = React.useRef(null)
  const reduceMotion = useReducedMotion()

  React.useEffect(() => {
    const controller = new AbortController()
    let active = true
    let requestInFlight = false

    async function loadAlerts() {
      if (requestInFlight) return
      requestInFlight = true

      try {
        const data = await fetchJson("/api/all-alerts", controller.signal)
        if (!active) return

        const groups = data?.alerts || {}
        const messages = getAlertMessages(groups)
        setAlertGroups(groups)
        setError("")

        if (open) {
          window.localStorage.setItem("seenAlerts", JSON.stringify(messages))
          setHasUnseen(false)
        } else {
          const seen = getSeenAlerts()
          setHasUnseen(messages.some((message) => !seen.includes(message)))
        }
      } catch (requestError) {
        if (requestError.name !== "AbortError" && active) {
          setError("Alerts are temporarily unavailable.")
        }
      } finally {
        if (active) {
          setLoading(false)
          requestInFlight = false
        }
      }
    }

    loadAlerts()
    const interval = open ? null : window.setInterval(loadAlerts, 1000)

    return () => {
      active = false
      controller.abort()
      if (interval) window.clearInterval(interval)
    }
  }, [open])

  React.useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false)
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    window.requestAnimationFrame(() => panelRef.current?.focus())

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  function toggleGroup(category) {
    setExpandedGroups((current) => {
      const next = new Set(current)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  function selectAlert(alert) {
    const message = String(alert?.message || "")
    const seen = getSeenAlerts()
    if (message && !seen.includes(message)) {
      seen.push(message)
      window.localStorage.setItem("seenAlerts", JSON.stringify(seen))
    }

    const messages = getAlertMessages(alertGroups)
    setHasUnseen(messages.some((item) => !seen.includes(item)))

    const materialId = extractAlertId(alert)
    if (materialId) {
      window.location.assign(`/Materials.html?highlight=${encodeURIComponent(materialId)}`)
    }
  }

  const totalAlerts = Object.values(alertGroups).reduce(
    (total, alerts) => total + (Array.isArray(alerts) ? alerts.length : 0),
    0,
  )

  return (
    <div className="overview-notifications" ref={wrapperRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="overview-notifications__trigger"
        aria-label={open ? "Close system alerts" : "Open system alerts"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell aria-hidden="true" />
        {hasUnseen && <span className="overview-notifications__ping" aria-hidden="true" />}
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              className="overview-notifications__backdrop"
              aria-label="Close system alerts"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
              onClick={() => setOpen(false)}
            />
            <motion.section
              ref={panelRef}
              className="overview-notifications__panel"
              role="dialog"
              aria-label="System alerts"
              tabIndex={-1}
              initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
            >
              <div className="overview-notifications__header">
                <div>
                  <span className="overview-eyebrow">Notification center</span>
                  <h2>System alerts</h2>
                </div>
                <Badge variant="secondary">{totalAlerts} active</Badge>
              </div>

              <div className="overview-notifications__body" aria-live="polite">
                {loading && (
                  <div className="overview-alert-skeletons">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                )}

                {!loading && error && (
                  <div className="overview-empty-state overview-empty-state--compact">
                    <AlertCircle aria-hidden="true" />
                    <p>{error}</p>
                  </div>
                )}

                {!loading && !error && totalAlerts === 0 && (
                  <div className="overview-empty-state overview-empty-state--compact">
                    <CheckCircle2 aria-hidden="true" />
                    <p>No active system alerts.</p>
                  </div>
                )}

                {!loading &&
                  !error &&
                  Object.entries(alertGroups).map(([category, alerts]) => {
                    const CategoryIcon = getCategoryIcon(category)
                    const items = Array.isArray(alerts) ? alerts : []
                    const expanded = expandedGroups.has(category)
                    const visibleItems = expanded ? items : items.slice(0, 1)

                    return (
                      <section className="overview-alert-group" key={category}>
                        <div className="overview-alert-group__heading">
                          <span className="overview-alert-group__icon">
                            <CategoryIcon aria-hidden="true" />
                          </span>
                          <div>
                            <h3>{category}</h3>
                            <p>{items.length} current</p>
                          </div>
                        </div>

                        {items.length === 0 ? (
                          <p className="overview-alert-group__empty">No current alerts</p>
                        ) : (
                          <div className="overview-alert-group__items">
                            {visibleItems.map((alert, index) => {
                              const materialId = extractAlertId(alert)
                              return (
                                <button
                                  type="button"
                                  className="overview-alert-item"
                                  key={`${alert.message}-${index}`}
                                  onClick={() => selectAlert(alert)}
                                >
                                  <span>{alert.message}</span>
                                  <small>
                                    <Clock3 aria-hidden="true" />
                                    {alert.display_time || alert.timestamp || "Just now"}
                                  </small>
                                  {materialId && (
                                    <ArrowUpRight
                                      className="overview-alert-item__link-icon"
                                      aria-hidden="true"
                                    />
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="overview-alert-group__toggle"
                            onClick={() => toggleGroup(category)}
                          >
                            {expanded ? "View less" : `View ${items.length - 1} more`}
                            <ChevronDown
                              className={expanded ? "is-expanded" : ""}
                              aria-hidden="true"
                            />
                          </Button>
                        )}
                      </section>
                    )
                  })}
              </div>
            </motion.section>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function FastestMovingTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload

  return (
    <div className="overview-chart-tooltip">
      <strong>{item.item_name}</strong>
      <span>
        {numberFormatter.format(asFiniteNumber(item.total_material_used))}
        {item.unit_measurement ? ` ${item.unit_measurement}` : ""} used
      </span>
    </div>
  )
}

function ReorderTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload

  return (
    <div className="overview-chart-tooltip">
      <strong>{item.item_name}</strong>
      <span>Current stock: {numberFormatter.format(asFiniteNumber(item.current_stock))}</span>
      <span>Reorder point: {numberFormatter.format(asFiniteNumber(item.reorder_point))}</span>
      <span>Daily usage: {numberFormatter.format(asFiniteNumber(item.avg_daily_usage))}</span>
    </div>
  )
}

function ChartEmptyState({ message }) {
  return (
    <div className="overview-empty-state overview-chart-empty">
      <TrendingUp aria-hidden="true" />
      <div>
        <strong>No chart data yet</strong>
        <p>{message}</p>
      </div>
    </div>
  )
}

function FastestMovingChart({ data, loading, error, reduceMotion }) {
  return (
    <Card className="overview-chart-card rounded-2xl border-slate-200/80 bg-white shadow-none">
      <CardHeader className="overview-card-heading">
        <div>
          <span className="overview-eyebrow">Material velocity</span>
          <CardTitle className="text-lg">Fastest-moving materials</CardTitle>
          <CardDescription>Top material consumption from completed orders</CardDescription>
        </div>
        <Badge variant="outline" className="overview-chart-badge">
          Last 3 months
        </Badge>
      </CardHeader>
      <CardContent className="overview-chart-content">
        {loading && <Skeleton className="h-full min-h-80 w-full" />}
        {!loading && error && <ChartEmptyState message="Material usage could not be loaded." />}
        {!loading && !error && data.length === 0 && (
          <ChartEmptyState message="No completed material usage was recorded in this period." />
        )}
        {!loading && !error && data.length > 0 && (
          <div className="overview-chart-frame" role="img" aria-label="Fastest-moving materials bar chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 8, right: 22, bottom: 8, left: 12 }}
              >
                <CartesianGrid stroke="#e9eff3" strokeDasharray="4 4" horizontal={false} />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7f8c", fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="item_name"
                  width={126}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => truncateLabel(value)}
                  tick={{ fill: "#3b5361", fontSize: 11, fontWeight: 600 }}
                />
                <Tooltip content={<FastestMovingTooltip />} cursor={{ fill: "rgba(15, 120, 149, 0.05)" }} />
                <Bar
                  dataKey="total_material_used"
                  radius={[0, 7, 7, 0]}
                  maxBarSize={28}
                  isAnimationActive={!reduceMotion}
                  animationDuration={800}
                >
                  {data.map((item, index) => (
                    <Cell
                      key={`${item.item_name}-${index}`}
                      fill={fastestBarColors[index % fastestBarColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ReorderPointChart({ data, loading, error, reduceMotion }) {
  return (
    <Card className="overview-chart-card rounded-2xl border-slate-200/80 bg-white shadow-none">
      <CardHeader className="overview-card-heading">
        <div>
          <span className="overview-eyebrow">Stock planning</span>
          <CardTitle className="text-lg">Reorder point vs. current stock</CardTitle>
          <CardDescription>Current quantity measured against calculated reorder levels</CardDescription>
        </div>
        <Badge variant="outline" className="overview-chart-badge">
          60-day usage
        </Badge>
      </CardHeader>
      <CardContent className="overview-chart-content">
        {loading && <Skeleton className="h-full min-h-80 w-full" />}
        {!loading && error && <ChartEmptyState message="Reorder data could not be loaded." />}
        {!loading && !error && data.length === 0 && (
          <ChartEmptyState message="No stock-out activity was recorded in the last 60 days." />
        )}
        {!loading && !error && data.length > 0 && (
          <div className="overview-chart-frame" role="img" aria-label="Current stock and reorder point chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 12, right: 18, bottom: 44, left: 0 }}>
                <CartesianGrid stroke="#e9eff3" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="item_name"
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  height={54}
                  tickFormatter={(value) => truncateLabel(value, 13)}
                  tick={{ fill: "#607580", fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={42}
                  tick={{ fill: "#6b7f8c", fontSize: 11 }}
                />
                <Tooltip content={<ReorderTooltip />} cursor={{ fill: "rgba(15, 120, 149, 0.05)" }} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ color: "#5a707c", fontSize: 11 }}
                />
                <Bar
                  dataKey="current_stock"
                  name="Current stock"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                  isAnimationActive={!reduceMotion}
                  animationDuration={800}
                >
                  {data.map((item) => (
                    <Cell
                      key={item.material_id || item.item_name}
                      fill={
                        asFiniteNumber(item.current_stock) <= asFiniteNumber(item.reorder_point)
                          ? "#e66b68"
                          : "#2aa981"
                      }
                    />
                  ))}
                </Bar>
                <Line
                  type="monotone"
                  dataKey="reorder_point"
                  name="Reorder point"
                  stroke="#e2a93b"
                  strokeWidth={2.5}
                  strokeDasharray="6 5"
                  dot={{ r: 3, fill: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={!reduceMotion}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RecentTransactions({ transactions, loading, error, reduceMotion }) {
  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.42, delay: 0.24 }}
    >
      <Card className="overview-transactions-card rounded-2xl border-slate-200/80 bg-white shadow-none">
        <CardHeader className="overview-card-heading overview-transactions-heading">
          <div>
            <span className="overview-eyebrow">Order activity</span>
            <CardTitle className="text-lg">Recent transactions</CardTitle>
            <CardDescription>The five latest customer orders across all statuses</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="overview-view-all">
            <a href="/Transactions.html">
              View all transactions
              <ArrowUpRight aria-hidden="true" />
            </a>
          </Button>
        </CardHeader>
        <CardContent className="overview-table-content p-0">
          <Table className="overview-table">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody aria-live="polite">
              {loading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 5 }).map((__, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && error && (
                <TableRow>
                  <TableCell colSpan={5} className="overview-table-message">
                    <AlertCircle aria-hidden="true" />
                    Failed to load recent transactions.
                  </TableCell>
                </TableRow>
              )}

              {!loading && !error && transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="overview-table-message">
                    <CheckCircle2 aria-hidden="true" />
                    No recent transactions found.
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                !error &&
                transactions.map((transaction, index) => {
                  const status = normalizeStatus(transaction.status_code)
                  return (
                    <TableRow key={`${transaction.date_created}-${transaction.customer_name}-${index}`}>
                      <TableCell className="overview-table__date">
                        <CalendarDays aria-hidden="true" />
                        {formatTransactionDate(transaction.date_created)}
                      </TableCell>
                      <TableCell className="overview-table__customer">
                        {transaction.customer_name || "Customer unavailable"}
                      </TableCell>
                      <TableCell className="overview-table__price">
                        {currencyFormatter.format(asFiniteNumber(transaction.total_amount))}
                      </TableCell>
                      <TableCell className="overview-table__product">
                        {transaction.product_names || "No product details"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="overview-status-badge"
                          data-status={status}
                        >
                          {formatStatus(transaction.status_code)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.section>
  )
}

function OverviewApp({ user }) {
  const [metrics, setMetrics] = React.useState(null)
  const [transactions, setTransactions] = React.useState(null)
  const [charts, setCharts] = React.useState(null)
  const [errors, setErrors] = React.useState({})
  const reduceMotion = useReducedMotion()

  React.useEffect(() => {
    const controller = new AbortController()

    async function loadOverview() {
      const requests = await Promise.allSettled([
        fetchJson("/api/dashboard/metrics", controller.signal),
        fetchJson("/api/recent-transactions", controller.signal),
        fetchJson("/api/dashboard/charts", controller.signal),
      ])

      if (controller.signal.aborted) return

      const nextErrors = {}
      const [metricsResult, transactionsResult, chartsResult] = requests

      if (metricsResult.status === "fulfilled") {
        setMetrics(metricsResult.value)
      } else {
        setMetrics({})
        nextErrors.metrics = true
      }

      if (transactionsResult.status === "fulfilled") {
        setTransactions(transactionsResult.value?.transactions || [])
      } else {
        setTransactions([])
        nextErrors.transactions = true
      }

      if (chartsResult.status === "fulfilled") {
        setCharts({
          fastestMoving: chartsResult.value?.fastest_moving || [],
          reorderPoints: chartsResult.value?.reorder_points || [],
        })
      } else {
        setCharts({ fastestMoving: [], reorderPoints: [] })
        nextErrors.charts = true
      }

      setErrors(nextErrors)
    }

    loadOverview()
    return () => controller.abort()
  }, [])

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "TimeStock user"
  const roleLabel = user.role === "admin" ? "Administrator" : "Employee"
  const profileInitial = user.role === "admin" ? "A" : "E"

  return (
    <div className="overview-app">
      <motion.header
        className="overview-header"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.35 }}
      >
        <div className="overview-header__identity">
          <span className="overview-eyebrow">Inventory command center</span>
          <div className="overview-title-row">
            <h1>Overview</h1>
          </div>
          <p>{headingDateFormatter.format(new Date())}</p>
        </div>

        <div className="overview-header__actions">
          <div className="overview-header__notification">
            <NotificationCenter />
          </div>
          <div className="overview-profile" aria-label={`${displayName}, ${roleLabel}`}>
            <div className="overview-profile__copy">
              <span>Welcome back</span>
              <strong>{displayName}</strong>
              <small>{roleLabel}</small>
            </div>
            <div className="overview-profile__avatar" aria-hidden="true">
              {profileInitial}
            </div>
          </div>
        </div>
      </motion.header>

      <div className="overview-content">
        <section className="overview-intro" aria-labelledby="overview-summary-title">
          <div>
            <span className="overview-eyebrow">Business snapshot</span>
            <h2 id="overview-summary-title">Your operation at a glance</h2>
            <p>Monitor completed sales, material demand, stock thresholds, and recent orders.</p>
          </div>
        </section>

        {Object.keys(errors).length > 0 && (
          <div className="overview-data-notice" role="status">
            <AlertCircle aria-hidden="true" />
            Some dashboard sections could not be refreshed. Existing database records were not changed.
          </div>
        )}

        <section className="overview-metrics" aria-label="All-time dashboard metrics">
          {metricDefinitions.map((definition, index) => (
            <MetricCard
              key={definition.key}
              definition={definition}
              value={metrics?.[definition.key]}
              loading={metrics === null}
              index={index}
              reduceMotion={reduceMotion}
            />
          ))}
        </section>

        <motion.section
          className="overview-charts"
          aria-label="Inventory charts"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.42, delay: 0.18 }}
        >
          <FastestMovingChart
            data={charts?.fastestMoving || []}
            loading={charts === null}
            error={errors.charts}
            reduceMotion={reduceMotion}
          />
          <ReorderPointChart
            data={charts?.reorderPoints || []}
            loading={charts === null}
            error={errors.charts}
            reduceMotion={reduceMotion}
          />
        </motion.section>

        <RecentTransactions
          transactions={transactions || []}
          loading={transactions === null}
          error={errors.transactions}
          reduceMotion={reduceMotion}
        />
      </div>
    </div>
  )
}

export default OverviewApp
