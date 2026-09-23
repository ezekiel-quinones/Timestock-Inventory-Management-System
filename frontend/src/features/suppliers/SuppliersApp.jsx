import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpDown,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eraser,
  Factory,
  Mail,
  MapPin,
  PackageOpen,
  Phone,
  RefreshCw,
  Search,
  Trophy,
  UserRound,
} from "lucide-react"

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
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import ProductsNotificationCenter from "../products/ProductsNotificationCenter"
import { getStockFlow, getSuppliers } from "./api"

const PAGE_SIZE = 5
const numberFormatter = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 })
const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "short",
  day: "2-digit",
})
const timeFormatter = new Intl.DateTimeFormat("en-PH", {
  hour: "numeric",
  minute: "2-digit",
})
const syncFormatter = new Intl.DateTimeFormat("en-PH", {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
})

const sortOptions = [
  ["default", "Default"],
  ["nameAsc", "Name A-Z"],
  ["nameDesc", "Name Z-A"],
  ["dateAsc", "Date created: oldest first"],
  ["dateDesc", "Date created: newest first"],
]

function asNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function displayValue(value, fallback = "Not provided") {
  const text = String(value ?? "").trim()
  return text || fallback
}

function getContactPerson(supplier) {
  const name = [supplier?.firstname, supplier?.lastname]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ")
  return name || "Not provided"
}

function parseDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getTelHref(value) {
  const phone = String(value || "").trim().replace(/[^+\d]/g, "")
  return phone ? `tel:${phone}` : ""
}

function getMailHref(value) {
  const email = String(value || "").trim()
  return email ? `mailto:${email}` : ""
}

function SummaryCard({ label, description, value, detail, icon: Icon, tone, loading, index, reduceMotion }) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.3, delay: index * 0.05 }}
    >
      <Card className="products-summary-card suppliers-summary-card" data-tone={tone}>
        <CardContent className="products-summary-content suppliers-summary-content">
          <div className="products-summary-heading">
            <div>
              <p>{label}</p>
              <small>{description}</small>
            </div>
            <span className="products-summary-icon" aria-hidden="true"><Icon /></span>
          </div>
          {loading ? (
            <div className="products-summary-loading">
              <Skeleton className="suppliers-value-skeleton" />
              <Skeleton className="suppliers-detail-skeleton" />
            </div>
          ) : (
            <div className="products-summary-value">
              <strong title={String(value)}>{value}</strong>
              <span>{detail}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (number) => number === 1 || number === totalPages || Math.abs(number - page) <= 1,
  )
  const compactPages = []
  pages.forEach((number, index) => {
    if (index > 0 && number - pages[index - 1] > 1) compactPages.push(`gap-${number}`)
    compactPages.push(number)
  })

  return (
    <nav className="products-pagination" aria-label="Supplier pages">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="products-button"
        disabled={page === 1}
        aria-label="Previous page"
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft />
        <span className="suppliers-pagination-label">Previous</span>
      </Button>
      <div className="products-pagination-pages">
        {compactPages.map((item) =>
          typeof item === "string" ? (
            <span key={item} aria-hidden="true">...</span>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={`products-button products-page-button${item === page ? " is-active" : ""}`}
              key={item}
              aria-label={`Page ${item}`}
              aria-current={item === page ? "page" : undefined}
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          ),
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="products-button"
        disabled={page === totalPages}
        aria-label="Next page"
        onClick={() => onPageChange(page + 1)}
      >
        <span className="suppliers-pagination-label">Next</span>
        <ChevronRight />
      </Button>
    </nav>
  )
}

function SupplierTable({ suppliers, loading, error, emptyMessage, onRetry }) {
  return (
    <div className="products-table-wrap suppliers-table-wrap">
      <Table className="products-table suppliers-table" aria-busy={loading}>
        <caption className="sr-only">Registered supplier directory</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">ID</TableHead>
            <TableHead scope="col">Contact name</TableHead>
            <TableHead scope="col">Contact person</TableHead>
            <TableHead scope="col">Contact number</TableHead>
            <TableHead scope="col">Email</TableHead>
            <TableHead scope="col">Address</TableHead>
            <TableHead scope="col">Date created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody aria-live="polite">
          {loading && Array.from({ length: PAGE_SIZE }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: 7 }).map((__, cellIndex) => (
                <TableCell key={cellIndex}><Skeleton className="h-4 w-full" /></TableCell>
              ))}
            </TableRow>
          ))}

          {!loading && error && (
            <TableRow>
              <TableCell colSpan={7} className="products-table-message suppliers-table-message">
                <AlertCircle aria-hidden="true" />
                <span>The supplier directory could not be loaded.</span>
                <Button type="button" variant="outline" size="sm" className="products-button" onClick={onRetry}>
                  <RefreshCw />
                  Retry
                </Button>
              </TableCell>
            </TableRow>
          )}

          {!loading && !error && emptyMessage && (
            <TableRow>
              <TableCell colSpan={7} className="products-table-message suppliers-table-message">
                <PackageOpen aria-hidden="true" />
                <span>{emptyMessage}</span>
              </TableCell>
            </TableRow>
          )}

          {!loading && !error && suppliers.map((supplier) => {
            const created = parseDate(supplier.date_created)
            const phoneHref = getTelHref(supplier.contact_number)
            const mailHref = getMailHref(supplier.email)
            return (
              <TableRow key={supplier.id}>
                <TableCell>
                  <span className="suppliers-id-cell">{displayValue(supplier.id, "No ID")}</span>
                </TableCell>
                <TableCell>
                  <div className="products-product-cell suppliers-name-cell">
                    <span className="products-product-icon" aria-hidden="true"><Factory /></span>
                    <div>
                      <strong title={displayValue(supplier.contact_name, "Unnamed supplier")}>
                        {displayValue(supplier.contact_name, "Unnamed supplier")}
                      </strong>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="suppliers-person-cell">
                    <UserRound aria-hidden="true" />
                    <span>{getContactPerson(supplier)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {phoneHref ? (
                    <a className="suppliers-contact-link" href={phoneHref}>
                      <Phone aria-hidden="true" />
                      <span>{displayValue(supplier.contact_number)}</span>
                    </a>
                  ) : displayValue(supplier.contact_number)}
                </TableCell>
                <TableCell>
                  {mailHref ? (
                    <a className="suppliers-contact-link suppliers-email-link" href={mailHref} title={supplier.email}>
                      <Mail aria-hidden="true" />
                      <span>{displayValue(supplier.email)}</span>
                    </a>
                  ) : displayValue(supplier.email)}
                </TableCell>
                <TableCell>
                  <div className="suppliers-address-cell" title={displayValue(supplier.address)}>
                    <MapPin aria-hidden="true" />
                    <span>{displayValue(supplier.address)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="products-date-cell suppliers-date-cell">
                    <CalendarDays aria-hidden="true" />
                    <div>
                      <strong>{created ? dateFormatter.format(created) : "Unknown date"}</strong>
                      <span>{created ? timeFormatter.format(created) : "Time unavailable"}</span>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function MobileState({ loading, error, emptyMessage, onRetry }) {
  if (loading) {
    return (
      <div className="products-mobile-cards">
        {Array.from({ length: 3 }).map((_, index) => <Skeleton className="suppliers-card-skeleton" key={index} />)}
      </div>
    )
  }

  if (error || emptyMessage) {
    return (
      <div className="products-mobile-empty suppliers-mobile-empty">
        {error ? <AlertCircle aria-hidden="true" /> : <PackageOpen aria-hidden="true" />}
        <p>{error ? "The supplier directory could not be loaded." : emptyMessage}</p>
        {error && (
          <Button type="button" variant="outline" size="sm" className="products-button" onClick={onRetry}>
            <RefreshCw />
            Retry
          </Button>
        )}
      </div>
    )
  }

  return null
}

function SupplierCards({ suppliers, loading, error, emptyMessage, reduceMotion, onRetry }) {
  if (loading || error || emptyMessage) {
    return <MobileState loading={loading} error={error} emptyMessage={emptyMessage} onRetry={onRetry} />
  }

  return (
    <div className="products-mobile-cards">
      {suppliers.map((supplier, index) => {
        const created = parseDate(supplier.date_created)
        const phoneHref = getTelHref(supplier.contact_number)
        const mailHref = getMailHref(supplier.email)
        return (
          <motion.article
            className="products-mobile-card suppliers-mobile-card"
            key={supplier.id}
            initial={reduceMotion ? false : { opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, delay: index * 0.03 }}
          >
            <div className="products-mobile-card-heading suppliers-mobile-card-heading">
              <span className="products-product-icon" aria-hidden="true"><Factory /></span>
              <div>
                <strong>{displayValue(supplier.contact_name, "Unnamed supplier")}</strong>
                <span>{displayValue(supplier.id, "No ID")}</span>
              </div>
              <Badge variant="outline" className="suppliers-directory-badge">Supplier</Badge>
            </div>
            <dl className="products-mobile-details suppliers-mobile-details">
              <div><dt>Contact person</dt><dd>{getContactPerson(supplier)}</dd></div>
              <div><dt>Phone</dt><dd>{displayValue(supplier.contact_number)}</dd></div>
              <div><dt>Email</dt><dd>{displayValue(supplier.email)}</dd></div>
              <div><dt>Date added</dt><dd>{created ? dateFormatter.format(created) : "Unknown"}</dd></div>
              <div className="suppliers-mobile-detail-wide"><dt>Address</dt><dd>{displayValue(supplier.address)}</dd></div>
            </dl>
            {(phoneHref || mailHref) && (
              <div className="products-row-actions suppliers-mobile-actions">
                {phoneHref && (
                  <Button asChild type="button" variant="outline" size="sm" className="products-button products-button--primary">
                    <a href={phoneHref}><Phone />Call</a>
                  </Button>
                )}
                {mailHref && (
                  <Button asChild type="button" variant="outline" size="sm" className="products-button">
                    <a href={mailHref}><Mail />Email</a>
                  </Button>
                )}
              </div>
            )}
          </motion.article>
        )
      })}
    </div>
  )
}

function SuppliersApp({ user }) {
  const [suppliers, setSuppliers] = React.useState(null)
  const [stockFlow, setStockFlow] = React.useState(null)
  const [loadErrors, setLoadErrors] = React.useState({})
  const [refreshing, setRefreshing] = React.useState(false)
  const [lastSynced, setLastSynced] = React.useState(null)
  const [filters, setFilters] = React.useState({ search: "", sort: "default" })
  const [page, setPage] = React.useState(1)
  const reduceMotion = useReducedMotion()
  const deferredSearch = React.useDeferredValue(filters.search)
  const isAdmin = user.role === "admin"

  async function loadDirectory(signal) {
    setRefreshing(true)
    const supplierResult = await getSuppliers(signal)
      .then((value) => ({ status: "fulfilled", value }))
      .catch((reason) => ({ status: "rejected", reason }))

    if (signal?.aborted) return

    const flowResult = await getStockFlow(signal)
      .then((value) => ({ status: "fulfilled", value }))
      .catch((reason) => ({ status: "rejected", reason }))

    if (signal?.aborted) return

    const nextErrors = {}
    let loadedAny = false
    if (supplierResult.status === "fulfilled") {
      setSuppliers(supplierResult.value)
      loadedAny = true
    } else if (supplierResult.reason?.name !== "AbortError") {
      setSuppliers((current) => current ?? [])
      nextErrors.suppliers = supplierResult.reason?.message || "Suppliers could not be loaded."
    }

    if (flowResult.status === "fulfilled") {
      setStockFlow(flowResult.value)
      loadedAny = true
    } else if (flowResult.reason?.name !== "AbortError") {
      setStockFlow((current) => current ?? {})
      nextErrors.stockFlow = flowResult.reason?.message || "Stock flow could not be loaded."
    }

    setLoadErrors(nextErrors)
    if (loadedAny) setLastSynced(new Date())
    setRefreshing(false)
  }

  React.useEffect(() => {
    const controller = new AbortController()
    loadDirectory(controller.signal)
    return () => controller.abort()
  }, [])

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }))
    setPage(1)
  }

  function clearFilters() {
    setFilters({ search: "", sort: "default" })
    setPage(1)
  }

  const allSuppliers = suppliers || []
  const query = deferredSearch.trim().toLowerCase()
  const filteredSuppliers = allSuppliers.filter((supplier) => {
    if (!query) return true
    return [
      supplier.id,
      supplier.contact_name,
      getContactPerson(supplier),
      supplier.contact_number,
      supplier.email,
      supplier.address,
      supplier.date_created,
    ].some((value) => String(value || "").toLowerCase().includes(query))
  })

  const sortedSuppliers = [...filteredSuppliers]
  if (filters.sort === "nameAsc") {
    sortedSuppliers.sort((first, second) => String(first.contact_name || "").localeCompare(String(second.contact_name || ""), undefined, { sensitivity: "base" }))
  } else if (filters.sort === "nameDesc") {
    sortedSuppliers.sort((first, second) => String(second.contact_name || "").localeCompare(String(first.contact_name || ""), undefined, { sensitivity: "base" }))
  } else if (filters.sort === "dateDesc") {
    sortedSuppliers.sort((first, second) => (parseDate(second.date_created)?.getTime() || 0) - (parseDate(first.date_created)?.getTime() || 0))
  } else if (filters.sort === "dateAsc") {
    sortedSuppliers.sort((first, second) => (parseDate(first.date_created)?.getTime() || 0) - (parseDate(second.date_created)?.getTime() || 0))
  }

  const totalPages = Math.max(1, Math.ceil(sortedSuppliers.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageSuppliers = sortedSuppliers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const blockingError = Boolean(loadErrors.suppliers && allSuppliers.length === 0)
  const emptyMessage = suppliers !== null && !blockingError && pageSuppliers.length === 0
    ? allSuppliers.length === 0
      ? "No supplier records are available."
      : "No suppliers match the current search and sort settings."
    : ""
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "TimeStock user"
  const roleLabel = isAdmin ? "Administrator" : "Employee"
  const errorMessages = [...new Set(Object.values(loadErrors).filter(Boolean))]
  const topSupplier = displayValue(stockFlow?.top_supplier, "No activity")
  const summaries = [
    {
      label: "Total stock in",
      description: "Quantity of stock received",
      value: numberFormatter.format(asNumber(stockFlow?.stock_in)),
      detail: "Recorded during the last month",
      icon: ArrowDownToLine,
      tone: "blue",
      loading: stockFlow === null,
    },
    {
      label: "Total stock out",
      description: "Quantity of stock issued",
      value: numberFormatter.format(asNumber(stockFlow?.stock_out)),
      detail: "Recorded during the last month",
      icon: ArrowUpFromLine,
      tone: "gold",
      loading: stockFlow === null,
    },
    {
      label: "Top supplier",
      description: "Highest stock-in contribution",
      value: topSupplier,
      detail: stockFlow?.top_supplier
        ? `${numberFormatter.format(asNumber(stockFlow.top_supplier_total))} received quantity`
        : "No recent stock-in activity",
      icon: Trophy,
      tone: "violet",
      loading: stockFlow === null,
    },
  ]

  return (
    <div className="products-app suppliers-app">
      <motion.header
        className="products-header"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.28 }}
      >
        <div className="products-header-identity">
          <span className="products-eyebrow">Partner workspace</span>
          <h1>Suppliers</h1>
          <p>Review supplier contacts and recent inventory flow in one directory.</p>
        </div>
        <div className="products-header-actions">
          <div className="products-header-notifications"><ProductsNotificationCenter /></div>
          <div className="products-profile" aria-label={`${displayName}, ${roleLabel}`}>
            <div>
              <span>Welcome back</span>
              <strong>{displayName}</strong>
              <small>{roleLabel}</small>
            </div>
            <span className="products-profile-avatar" aria-hidden="true">{isAdmin ? "A" : "E"}</span>
          </div>
        </div>
      </motion.header>

      <div className="products-content suppliers-content">
        <section className="products-page-intro suppliers-intro">
          <div>
            <span className="products-eyebrow">Supply network</span>
            <h2>Supplier directory</h2>
            <p>Find partner contacts quickly and review their relationship to recent stock movement.</p>
          </div>
          <div className="suppliers-sync-panel" aria-live="polite">
            <div>
              <span className="suppliers-sync-icon" aria-hidden="true"><Clock3 /></span>
              <span>
                <small>Last synchronized</small>
                <strong>{lastSynced ? syncFormatter.format(lastSynced) : "Waiting for data"}</strong>
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              className="products-button products-button--primary suppliers-refresh-button"
              disabled={refreshing}
              onClick={() => loadDirectory()}
            >
              <RefreshCw className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing..." : "Refresh directory"}
            </Button>
          </div>
        </section>

        {errorMessages.length > 0 && (
          <Alert variant="destructive" className="products-load-alert suppliers-load-alert">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>Some supplier data is unavailable</AlertTitle>
            <AlertDescription>{errorMessages.join(" ")}</AlertDescription>
          </Alert>
        )}

        <section className="products-summary-grid suppliers-summary-grid" aria-label="Supplier summary">
          {summaries.map((summary, index) => (
            <SummaryCard
              key={summary.label}
              {...summary}
              index={index}
              reduceMotion={reduceMotion}
            />
          ))}
        </section>

        <motion.section
          className="products-catalog-card suppliers-directory-card"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.34, delay: 0.14 }}
        >
          <div className="products-catalog-heading suppliers-directory-heading">
            <div>
              <span className="products-eyebrow">Partner records</span>
              <h2>Registered suppliers</h2>
              <p>{numberFormatter.format(sortedSuppliers.length)} matching {sortedSuppliers.length === 1 ? "record" : "records"}</p>
            </div>
            <div className="suppliers-directory-status" aria-live="polite">
              <Building2 aria-hidden="true" />
              <span>{numberFormatter.format(allSuppliers.length)} total</span>
            </div>
          </div>

          <div className="suppliers-filters" aria-label="Supplier filters">
            <div className="products-search-field suppliers-search-field">
              <Label htmlFor="suppliers-search" className="sr-only">Search suppliers</Label>
              <Search aria-hidden="true" />
              <Input
                id="suppliers-search"
                type="search"
                value={filters.search}
                placeholder="Search suppliers, contacts, email, phone, address..."
                onChange={(event) => updateFilter("search", event.target.value)}
              />
            </div>
            <div className="products-filter-field suppliers-sort-field">
              <Label htmlFor="suppliers-sort">Sort by</Label>
              <Select value={filters.sort} onValueChange={(value) => updateFilter("sort", value)}>
                <SelectTrigger id="suppliers-sort">
                  <ArrowUpDown aria-hidden="true" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              className="products-button suppliers-clear-button"
              onClick={clearFilters}
            >
              <Eraser />
              Clear
            </Button>
          </div>

          <SupplierTable
            suppliers={pageSuppliers}
            loading={suppliers === null}
            error={blockingError}
            emptyMessage={emptyMessage}
            onRetry={() => loadDirectory()}
          />
          <SupplierCards
            suppliers={pageSuppliers}
            loading={suppliers === null}
            error={blockingError}
            emptyMessage={emptyMessage}
            reduceMotion={reduceMotion}
            onRetry={() => loadDirectory()}
          />

          <div className="products-catalog-footer suppliers-catalog-footer">
            <p>
              Showing {sortedSuppliers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}-
              {Math.min(currentPage * PAGE_SIZE, sortedSuppliers.length)} of {numberFormatter.format(sortedSuppliers.length)} matching records
            </p>
            <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </motion.section>
      </div>
    </div>
  )
}

export default SuppliersApp
