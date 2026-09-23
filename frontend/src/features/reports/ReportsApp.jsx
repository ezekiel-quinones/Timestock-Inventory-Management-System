import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Download,
  FileText,
  Gauge,
  LoaderCircle,
  PackageCheck,
  PackageOpen,
  ShoppingBag,
  TrendingUp,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import ProductsNotificationCenter from "../products/ProductsNotificationCenter"

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const numberFormatter = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 })
const decimalFormatter = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const dayFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
})

function asNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function formatCurrency(value) {
  return currencyFormatter.format(asNumber(value))
}

function formatNumber(value) {
  return numberFormatter.format(asNumber(value))
}

function formatDecimal(value) {
  return decimalFormatter.format(asNumber(value))
}

function formatSigned(value) {
  const number = asNumber(value)
  return `${number > 0 ? "+" : ""}${decimalFormatter.format(number)}`
}

function formatDay(value) {
  const parts = String(value || "").split("-").map(Number)
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return String(value || "")
  return dayFormatter.format(new Date(parts[0], parts[1] - 1, parts[2]))
}

function periodLabel(year, month) {
  return `${MONTHS[month - 1] || "Month"} ${year}`
}

function periodIndex(year, month) {
  return year * 12 + month - 1
}

function offsetPeriod(year, month, amount) {
  const date = new Date(year, month - 1 + amount, 1)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

function reportIsReady(report) {
  return Boolean(report && !report.empty)
}

function EmptyReport({ message }) {
  return (
    <div className="reports-empty" role="status">
      <span aria-hidden="true"><FileText /></span>
      <strong>No report activity</strong>
      <p>{message || "No records were available for this report in the selected month."}</p>
    </div>
  )
}

function ReportCard({
  badge,
  children,
  className = "",
  description,
  icon: Icon,
  index,
  report,
  reduceMotion,
  title,
}) {
  const unavailable = !report || report.empty

  return (
    <motion.div
      className={`reports-panel-slot ${className}`}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.34, delay: index * 0.045 }}
    >
      <Card className="reports-panel">
        <div className="reports-panel-heading">
          <div className="reports-panel-title">
            <span className="reports-panel-icon" aria-hidden="true"><Icon /></span>
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
          </div>
          <Badge variant="outline" className={unavailable ? "reports-panel-badge is-empty" : "reports-panel-badge"}>
            {unavailable ? "No data" : badge}
          </Badge>
        </div>
        <CardContent className="reports-panel-content">
          {unavailable ? <EmptyReport message={report?.message} /> : children}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function SummaryCard({ definition, index, reduceMotion }) {
  const Icon = definition.icon

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.3, delay: index * 0.05 }}
    >
      <Card className="reports-summary-card" data-tone={definition.tone}>
        <CardContent className="reports-summary-content">
          <div className="reports-summary-heading">
            <div>
              <p>{definition.label}</p>
              <small>{definition.description}</small>
            </div>
            <span className="reports-summary-icon" aria-hidden="true"><Icon /></span>
          </div>
          <div className="reports-summary-value">
            <strong title={definition.available ? definition.value : "No data"}>
              {definition.available ? definition.value : "--"}
            </strong>
            <span>{definition.available ? definition.detail : "No activity for this period"}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function PeriodToolbar({ errorMessage, month, year }) {
  const [selectedYear, setSelectedYear] = React.useState(String(year))
  const [selectedMonth, setSelectedMonth] = React.useState(String(month))
  const [validationError, setValidationError] = React.useState("")
  const [isApplying, setIsApplying] = React.useState(false)
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const activeIndex = periodIndex(year, month)
  const earliestIndex = periodIndex(2010, 1)
  const currentIndex = periodIndex(currentYear, currentMonth)
  const pdfHref = `/api/reports/pdf?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`

  function updateYear(event) {
    setSelectedYear(event.target.value)
    setValidationError("")
  }

  function updateMonth(value) {
    setSelectedMonth(value)
    setValidationError("")
  }

  function submitPeriod(event) {
    const nextYear = Number(selectedYear)
    const nextMonth = Number(selectedMonth)
    const invalidYear = !Number.isInteger(nextYear) || nextYear < 2010 || nextYear > 2100
    const invalidMonth = !Number.isInteger(nextMonth) || nextMonth < 1 || nextMonth > 12
    const futurePeriod = !invalidYear && !invalidMonth && periodIndex(nextYear, nextMonth) > currentIndex

    if (invalidYear || invalidMonth || futurePeriod) {
      event.preventDefault()
      setValidationError(
        futurePeriod
          ? "Choose the current month or an earlier reporting period."
          : "Choose a valid month and a year from 2010 to 2100.",
      )
      return
    }

    setIsApplying(true)
  }

  function openAdjacentPeriod(amount) {
    const next = offsetPeriod(year, month, amount)
    window.location.assign(`/Reports.html?year=${next.year}&month=${next.month}`)
  }

  return (
    <Card className="reports-period-card">
      <CardContent className="reports-period-content">
        <div className="reports-period-context">
          <span className="reports-period-icon" aria-hidden="true"><CalendarDays /></span>
          <div>
            <span className="reports-eyebrow">Active reporting period</span>
            <strong>{periodLabel(year, month)}</strong>
            <small>Monthly close and inventory activity</small>
          </div>
          <div className="reports-period-nav" aria-label="Browse report periods">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="products-button reports-nav-button"
              aria-label="View previous month"
              disabled={activeIndex <= earliestIndex}
              onClick={() => openAdjacentPeriod(-1)}
            >
              <ArrowLeft aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="products-button reports-nav-button"
              aria-label="View next month"
              disabled={activeIndex >= currentIndex}
              onClick={() => openAdjacentPeriod(1)}
            >
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>

        <form className="reports-period-form" method="get" action="/Reports.html" onSubmit={submitPeriod}>
          <div className="reports-filter-field reports-filter-field--year">
            <Label htmlFor="reports-year">Year</Label>
            <Input
              id="reports-year"
              name="year"
              type="number"
              min="2010"
              max="2100"
              step="1"
              required
              value={selectedYear}
              onChange={updateYear}
            />
          </div>
          <div className="reports-filter-field">
            <Label htmlFor="reports-month">Month</Label>
            <Select value={selectedMonth} onValueChange={updateMonth}>
              <SelectTrigger id="reports-month" aria-label="Report month">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((name, index) => {
                  const value = String(index + 1)
                  const yearNumber = Number(selectedYear)
                  const disabled = yearNumber === currentYear && index + 1 > currentMonth
                  return <SelectItem value={value} disabled={disabled} key={name}>{name}</SelectItem>
                })}
              </SelectContent>
            </Select>
            <input type="hidden" name="month" value={selectedMonth} />
          </div>
          <Button
            type="submit"
            className="products-button products-button--primary reports-apply-button"
            disabled={isApplying}
          >
            {isApplying ? <LoaderCircle className="reports-spinning" aria-hidden="true" /> : <BarChart3 aria-hidden="true" />}
            {isApplying ? "Generating" : "Generate report"}
          </Button>
          {validationError && <p className="reports-period-error" role="alert">{validationError}</p>}
        </form>

        <div className="reports-export">
          <span>Portable report</span>
          <p>All six sections in one PDF.</p>
          {errorMessage ? (
            <Button type="button" className="reports-export-button" disabled title="Resolve the report error before exporting">
              <Download aria-hidden="true" />
              Export PDF
            </Button>
          ) : (
            <Button className="reports-export-button" asChild>
              <a href={pdfHref} download>
                <Download aria-hidden="true" />
                Export PDF
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ValueTile({ detail, label, tone = "default", value }) {
  return (
    <div className="reports-value-tile" data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  )
}

function SalesReport({ index, reduceMotion, report }) {
  const rows = report?.breakdown || []
  const chartRows = rows.map((row) => ({
    label: formatDay(row.day),
    revenue: asNumber(row.revenue),
  }))

  return (
    <ReportCard
      badge={`${rows.length} active ${rows.length === 1 ? "day" : "days"}`}
      className="reports-panel-slot--wide"
      description={report?.title || "Completed order activity by day"}
      icon={BarChart3}
      index={index}
      report={report}
      reduceMotion={reduceMotion}
      title="Sales performance"
    >
      <div className="reports-sales-layout">
        <section className="reports-chart-region" aria-labelledby="reports-revenue-chart-title">
          <div className="reports-subheading">
            <div>
              <span className="reports-eyebrow">Revenue cadence</span>
              <h3 id="reports-revenue-chart-title">Revenue by active day</h3>
            </div>
            <Badge variant="secondary" className="reports-subheading-badge">
              {formatCurrency(report?.total_revenue)}
            </Badge>
          </div>
          <div className="reports-area-chart" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartRows} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="reportsRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1787a0" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#1787a0" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e3ecef" strokeDasharray="3 4" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#708690", fontSize: 10 }}
                  minTickGap={24}
                />
                <Tooltip
                  animationDuration={0}
                  cursor={false}
                  formatter={(value) => [formatCurrency(value), "Revenue"]}
                  contentStyle={{
                    background: "#102f40",
                    border: "1px solid #214a5c",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "11px",
                  }}
                  itemStyle={{ color: "#d9f6f9" }}
                  isAnimationActive={false}
                  labelStyle={{ color: "#fff", fontWeight: 700 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1787a0"
                  strokeWidth={2.5}
                  fill="url(#reportsRevenueFill)"
                  isAnimationActive={!reduceMotion}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="reports-table-region" aria-labelledby="reports-daily-breakdown-title">
          <div className="reports-subheading">
            <div>
              <span className="reports-eyebrow">Daily ledger</span>
              <h3 id="reports-daily-breakdown-title">Completed sales breakdown</h3>
            </div>
          </div>
          <div className="reports-table-scroller reports-table-scroller--sales">
            <Table className="reports-table">
              <caption className="sr-only">Daily completed order, unit, and revenue totals</caption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Date</TableHead>
                  <TableHead scope="col" className="is-numeric">Orders</TableHead>
                  <TableHead scope="col" className="is-numeric">Units</TableHead>
                  <TableHead scope="col" className="is-numeric">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.day}>
                    <TableCell><strong>{formatDay(row.day)}</strong><small>{row.day}</small></TableCell>
                    <TableCell className="is-numeric">{formatNumber(row.orders)}</TableCell>
                    <TableCell className="is-numeric">{formatNumber(row.sales)}</TableCell>
                    <TableCell className="is-numeric is-emphasis">{formatCurrency(row.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </ReportCard>
  )
}

function TurnoverReport({ index, reduceMotion, report }) {
  return (
    <ReportCard
      badge="Monthly efficiency"
      description={report?.title || "Cost of goods compared with average inventory"}
      icon={Gauge}
      index={index}
      report={report}
      reduceMotion={reduceMotion}
      title="Inventory turnover"
    >
      <div className="reports-value-grid reports-value-grid--three">
        <ValueTile label="Cost of goods" value={formatCurrency(report?.cogs)} />
        <ValueTile label="Average inventory" value={formatCurrency(report?.avg_inventory)} tone="blue" />
        <ValueTile label="Turnover rate" value={`${formatDecimal(report?.turnover_rate)}x`} tone="green" />
      </div>
      <div className="reports-analysis-note">
        <Activity aria-hidden="true" />
        <div>
          <span>Operational reading</span>
          <p>{report?.interpretation}</p>
        </div>
      </div>
    </ReportCard>
  )
}

function MovingAverageReport({ index, reduceMotion, report }) {
  return (
    <ReportCard
      badge="Sales momentum"
      description={report?.title || "Actual sales compared with rolling baselines"}
      icon={TrendingUp}
      index={index}
      report={report}
      reduceMotion={reduceMotion}
      title="Moving averages"
    >
      <div className="reports-feature-value">
        <div>
          <span>Actual monthly sales</span>
          <strong>{formatCurrency(report?.total_sales)}</strong>
        </div>
        <Badge variant="outline"><PackageCheck aria-hidden="true" />{report?.top_product || "No sales"}</Badge>
      </div>
      <div className="reports-value-grid reports-value-grid--two">
        <ValueTile
          detail="Short-term baseline"
          label="3-month average"
          value={report?.ma3 === null || report?.ma3 === undefined ? "Not enough data" : formatCurrency(report.ma3)}
          tone="blue"
        />
        <ValueTile
          detail="Long-term baseline"
          label="6-month average"
          value={report?.ma6 === null || report?.ma6 === undefined ? "Not enough data" : formatCurrency(report.ma6)}
          tone="gold"
        />
      </div>
    </ReportCard>
  )
}

function StlReport({ index, reduceMotion, report }) {
  const interpretations = report?.interpretations || []

  return (
    <ReportCard
      badge="Demand signal"
      className="reports-panel-slot--wide"
      description={report?.title || "Trend, seasonality, and irregular demand components"}
      icon={Activity}
      index={index}
      report={report}
      reduceMotion={reduceMotion}
      title="Demand decomposition"
    >
      <div className="reports-stl-layout">
        <div className="reports-top-product">
          <span className="reports-top-product-icon" aria-hidden="true"><ShoppingBag /></span>
          <div>
            <span>Top-ordered product</span>
            <strong>{report?.top_product || "Not available"}</strong>
            <small>Highest order quantity in the selected month</small>
          </div>
        </div>
        <div className="reports-value-grid reports-value-grid--three">
          <ValueTile label="Trend" value={formatSigned(report?.trend)} tone={asNumber(report?.trend) >= 0 ? "green" : "red"} />
          <ValueTile label="Seasonal" value={formatSigned(report?.seasonal)} tone={asNumber(report?.seasonal) >= 0 ? "blue" : "gold"} />
          <ValueTile label="Residual" value={formatSigned(report?.residual)} tone={asNumber(report?.residual) >= 0 ? "green" : "red"} />
        </div>
        <div className="reports-interpretations">
          <span className="reports-eyebrow">Model interpretation</span>
          <ul>
            {interpretations.map((item, itemIndex) => (
              <li key={`${item}-${itemIndex}`}>
                <CheckCircle2 aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ReportCard>
  )
}

function StockMovementReport({ index, reduceMotion, report }) {
  const rows = report?.breakdown || []

  return (
    <ReportCard
      badge={`${rows.length} ${rows.length === 1 ? "material" : "materials"}`}
      className="reports-panel-slot--wide"
      description={report?.title || "Stock-in and stock-out transaction frequency"}
      icon={Boxes}
      index={index}
      report={report}
      reduceMotion={reduceMotion}
      title="Stock movement"
    >
      <div className="reports-ledger-summary">
        <ValueTile label="Stock-in events" value={formatNumber(report?.total_stock_in_events)} tone="green" />
        <ValueTile label="Stock-out events" value={formatNumber(report?.total_stock_out_events)} tone="gold" />
      </div>
      <div className="reports-table-scroller">
        <Table className="reports-table reports-table--ledger">
          <caption className="sr-only">Material stock-in and stock-out event frequency</caption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Material</TableHead>
              <TableHead scope="col">Reference</TableHead>
              <TableHead scope="col" className="is-numeric">Stock-in events</TableHead>
              <TableHead scope="col" className="is-numeric">Stock-out events</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={`${row.material_id}-${rowIndex}`}>
                <TableCell className="reports-name-cell"><PackageOpen aria-hidden="true" /><strong>{row.material_name}</strong></TableCell>
                <TableCell className="reports-reference">{row.material_id || "--"}</TableCell>
                <TableCell className="is-numeric is-positive">{formatNumber(row.stock_in_events)}</TableCell>
                <TableCell className="is-numeric is-warm">{formatNumber(row.stock_out_events)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ReportCard>
  )
}

function ProductsSoldReport({ index, reduceMotion, report }) {
  const rows = report?.breakdown || []

  return (
    <ReportCard
      badge={`${rows.length} ${rows.length === 1 ? "product" : "products"}`}
      className="reports-panel-slot--wide"
      description={report?.title || "Completed product quantity and sales value"}
      icon={PackageCheck}
      index={index}
      report={report}
      reduceMotion={reduceMotion}
      title="Products sold"
    >
      <div className="reports-ledger-summary">
        <ValueTile label="Total quantity" value={formatNumber(report?.total_quantity_all)} tone="blue" />
        <ValueTile label="Total sales" value={formatCurrency(report?.total_sales_all)} tone="green" />
      </div>
      <div className="reports-table-scroller">
        <Table className="reports-table reports-table--ledger">
          <caption className="sr-only">Completed product sales by product</caption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Product</TableHead>
              <TableHead scope="col" className="is-numeric">Quantity sold</TableHead>
              <TableHead scope="col" className="is-numeric">Total sales</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={`${row.product_name}-${rowIndex}`}>
                <TableCell className="reports-name-cell"><ShoppingBag aria-hidden="true" /><strong>{row.product_name}</strong></TableCell>
                <TableCell className="is-numeric">{formatNumber(row.total_quantity)}</TableCell>
                <TableCell className="is-numeric is-emphasis">{formatCurrency(row.total_sales)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ReportCard>
  )
}

function ReportsApp({ initialData, user }) {
  const reduceMotion = useReducedMotion()
  const { error: errorMessage, month, reports, year } = initialData
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "TimeStock user"
  const isAdmin = String(user.role).toLowerCase() === "admin"
  const roleLabel = isAdmin ? "Administrator" : "Employee"
  const profileInitial = (user.firstName || roleLabel).slice(0, 1).toUpperCase()
  const availableCount = Object.values(reports).filter(reportIsReady).length
  const salesReady = reportIsReady(reports.sales)
  const turnoverReady = reportIsReady(reports.turnover)
  const summaryDefinitions = [
    {
      label: "Total revenue",
      description: "Completed order value",
      value: formatCurrency(reports.sales?.total_revenue),
      detail: periodLabel(year, month),
      available: salesReady,
      icon: CircleDollarSign,
      tone: "gold",
    },
    {
      label: "Completed orders",
      description: "Fulfilled transactions",
      value: formatNumber(reports.sales?.total_orders),
      detail: "orders closed",
      available: salesReady,
      icon: PackageCheck,
      tone: "cyan",
    },
    {
      label: "Units sold",
      description: "Products across orders",
      value: formatNumber(reports.sales?.total_sales),
      detail: "units completed",
      available: salesReady,
      icon: ShoppingBag,
      tone: "blue",
    },
    {
      label: "Inventory turnover",
      description: "Monthly efficiency",
      value: `${formatDecimal(reports.turnover?.turnover_rate)}x`,
      detail: "inventory cycles",
      available: turnoverReady,
      icon: Gauge,
      tone: "green",
    },
  ]

  return (
    <div className="reports-app">
      <motion.header
        className="products-header"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.3 }}
      >
        <div className="products-header-identity">
          <span className="products-eyebrow">Monthly reporting</span>
          <h1>Reports</h1>
          <p>Verified sales and inventory records prepared for review.</p>
        </div>
        <div className="products-header-actions">
          <div className="products-header-notifications"><ProductsNotificationCenter /></div>
          <div className="products-profile" aria-label={`${displayName}, ${roleLabel}`}>
            <div>
              <span>Welcome back</span>
              <strong>{displayName}</strong>
              <small>{roleLabel}</small>
            </div>
            <span className="products-profile-avatar" aria-hidden="true">{profileInitial}</span>
          </div>
        </div>
      </motion.header>

      <div className="reports-content">
        <motion.section
          className="reports-intro"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.32 }}
          aria-labelledby="reports-overview-title"
        >
          <div>
            <span className="reports-eyebrow">Business report</span>
            <h2 id="reports-overview-title">Monthly performance review</h2>
            <p>Review completed sales, stock movement, inventory efficiency, and demand signals for one accounting period.</p>
          </div>
          <div className="reports-intro-status" aria-label="Report status">
            <Badge variant="outline"><CalendarDays aria-hidden="true" />{periodLabel(year, month)}</Badge>
            <Badge variant="outline" data-ready={availableCount > 0}>
              <CheckCircle2 aria-hidden="true" />{availableCount} of 6 ready
            </Badge>
          </div>
        </motion.section>

        <PeriodToolbar errorMessage={errorMessage} month={month} year={year} />

        {errorMessage && (
          <motion.div
            className="reports-error"
            initial={reduceMotion ? false : { opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertTitle>This report could not be completed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {!errorMessage && availableCount === 0 && (
          <Alert className="reports-no-activity">
            <FileText aria-hidden="true" />
            <AlertTitle>No recorded activity for {periodLabel(year, month)}</AlertTitle>
            <AlertDescription>The report sections below identify which datasets have no records for this period.</AlertDescription>
          </Alert>
        )}

        <section className="reports-summary-section" aria-labelledby="reports-summary-title">
          <div className="reports-section-heading">
            <div>
              <span className="reports-eyebrow">Executive snapshot</span>
              <h2 id="reports-summary-title">Period at a glance</h2>
            </div>
            <span>{periodLabel(year, month)}</span>
          </div>
          <div className="reports-summary-grid">
            {summaryDefinitions.map((definition, index) => (
              <SummaryCard definition={definition} index={index} key={definition.label} reduceMotion={reduceMotion} />
            ))}
          </div>
        </section>

        <section className="reports-detail-section" aria-labelledby="reports-detail-title">
          <div className="reports-section-heading reports-section-heading--detail">
            <div>
              <span className="reports-eyebrow">Report library</span>
              <h2 id="reports-detail-title">Detailed monthly records</h2>
              <p>Six views generated from the same TimeStock calculations used by the PDF report.</p>
            </div>
            <Badge variant="secondary"><FileText aria-hidden="true" />6 report sections</Badge>
          </div>

          <div className="reports-grid">
            <SalesReport index={0} reduceMotion={reduceMotion} report={reports.sales} />
            <TurnoverReport index={1} reduceMotion={reduceMotion} report={reports.turnover} />
            <MovingAverageReport index={2} reduceMotion={reduceMotion} report={reports.movingAverage} />
            <StlReport index={3} reduceMotion={reduceMotion} report={reports.stl} />
            <StockMovementReport index={4} reduceMotion={reduceMotion} report={reports.stockMovement} />
            <ProductsSoldReport index={5} reduceMotion={reduceMotion} report={reports.productsSold} />
          </div>
        </section>

        <footer className="reports-source-note">
          <FileText aria-hidden="true" />
          <p><strong>Report integrity:</strong> This workspace displays the existing server-calculated records without changing source data. PDF export uses the same six report datasets.</p>
        </footer>
      </div>
    </div>
  )
}

export default ReportsApp
