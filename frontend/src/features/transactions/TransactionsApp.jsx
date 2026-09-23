import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import {
  AlertCircle,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpDown,
  ArrowUpFromLine,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Eraser,
  History,
  LoaderCircle,
  PackageOpen,
  PencilLine,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Warehouse,
} from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import ProductsNotificationCenter from "../products/ProductsNotificationCenter"
import {
  deleteOrder,
  getOrderStatuses,
  getOrderTransactions,
  getStockTransactions,
  updateOrderStatus,
} from "./api"

const PAGE_SIZE = 5
const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
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

const defaultStatuses = [
  {
    id: "fallback-in-production",
    status_code: "in_production",
    description: "Order is currently being manufactured",
  },
  {
    id: "fallback-completed",
    status_code: "completed",
    description: "Production of the order is complete",
  },
  {
    id: "fallback-on-hold",
    status_code: "on_hold",
    description: "Order is on hold pending further action",
  },
  {
    id: "fallback-cancelled",
    status_code: "cancelled",
    description: "Order has been cancelled",
  },
]

const initialFilters = {
  stock: {
    search: "",
    type: "all",
    startDate: "",
    endDate: "",
    minPrice: "",
    maxPrice: "",
    sort: "date_created:desc",
  },
  production: {
    search: "",
    status: "all",
    startDate: "",
    endDate: "",
    minPrice: "",
    maxPrice: "",
    sort: "date_created:desc",
  },
  orders: {
    search: "",
    status: "all",
    startDate: "",
    endDate: "",
    minPrice: "",
    maxPrice: "",
    sort: "date_created:desc",
  },
}

const stockSortOptions = [
  ["date_created:desc", "Newest first"],
  ["date_created:asc", "Oldest first"],
  ["quantity:desc", "Quantity: high to low"],
  ["quantity:asc", "Quantity: low to high"],
  ["material_name:asc", "Material: A to Z"],
  ["transaction_id:asc", "Transaction ID"],
]

const orderSortOptions = [
  ["date_created:desc", "Newest first"],
  ["date_created:asc", "Oldest first"],
  ["total_amount:desc", "Amount: high to low"],
  ["total_amount:asc", "Amount: low to high"],
  ["customer_name:asc", "Customer: A to Z"],
  ["status_code:asc", "Status: A to Z"],
]

function asNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function displayValue(value, fallback = "Not provided") {
  const text = String(value ?? "").trim()
  return text || fallback
}

function formatStatus(value) {
  const text = String(value || "unknown").replaceAll("_", " ").replaceAll("-", " ")
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function parseDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getDateKey(value) {
  const text = String(value || "")
  const match = text.match(/^\d{4}-\d{2}-\d{2}/)
  if (match) return match[0]
  const date = parseDate(value)
  return date ? date.toISOString().slice(0, 10) : ""
}

function getRangeError(filters, kind) {
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
    return "Start date must be on or before the end date."
  }

  if (kind !== "stock") {
    const minimum = filters.minPrice === "" ? null : Number(filters.minPrice)
    const maximum = filters.maxPrice === "" ? null : Number(filters.maxPrice)
    if (minimum !== null && maximum !== null && minimum > maximum) {
      return "Minimum amount cannot be greater than the maximum amount."
    }
  }

  return ""
}

function filterAndSortRows(rows, kind, filters) {
  const query = filters.search.trim().toLowerCase()
  const dateRangeValid =
    !filters.startDate || !filters.endDate || filters.startDate <= filters.endDate
  const minimum = filters.minPrice === "" ? Number.NEGATIVE_INFINITY : Number(filters.minPrice)
  const maximum = filters.maxPrice === "" ? Number.POSITIVE_INFINITY : Number(filters.maxPrice)
  const priceRangeValid = minimum <= maximum

  const filtered = rows.filter((row) => {
    const matchesSearch =
      !query ||
      Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(query))
    const rowDate = getDateKey(row.date_created)
    const matchesDate =
      !dateRangeValid ||
      ((!filters.startDate || rowDate >= filters.startDate) &&
        (!filters.endDate || rowDate <= filters.endDate))
    const matchesType =
      kind !== "stock" || filters.type === "all" || row.type_code === filters.type
    const matchesStatus =
      kind !== "orders" || filters.status === "all" || row.status_code === filters.status
    const amount = asNumber(row.total_amount)
    const matchesPrice =
      kind === "stock" || !priceRangeValid || (amount >= minimum && amount <= maximum)

    return matchesSearch && matchesDate && matchesType && matchesStatus && matchesPrice
  })

  const [sortKey, direction = "asc"] = filters.sort.split(":")
  const numericKeys = new Set(["quantity", "total_amount", "total_items_ordered"])

  return [...filtered].sort((first, second) => {
    let comparison = 0
    if (sortKey === "date_created") {
      comparison = (parseDate(first[sortKey])?.getTime() || 0) - (parseDate(second[sortKey])?.getTime() || 0)
    } else if (numericKeys.has(sortKey)) {
      comparison = asNumber(first[sortKey]) - asNumber(second[sortKey])
    } else {
      comparison = String(first[sortKey] ?? "").localeCompare(String(second[sortKey] ?? ""), undefined, {
        numeric: true,
        sensitivity: "base",
      })
    }
    return direction === "desc" ? -comparison : comparison
  })
}

function SummaryCard({ label, description, value, icon: Icon, tone, loading, index, reduceMotion }) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.3, delay: index * 0.05 }}
    >
      <Card className="products-summary-card transactions-summary-card" data-tone={tone}>
        <CardContent className="products-summary-content transactions-summary-content">
          <div className="products-summary-heading">
            <div>
              <p>{label}</p>
              <small>{description}</small>
            </div>
            <span className="products-summary-icon" aria-hidden="true">
              <Icon />
            </span>
          </div>
          {loading ? (
            <div className="products-summary-loading">
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          ) : (
            <div className="products-summary-value">
              <strong title={String(value)}>{value}</strong>
              <span>Live ledger snapshot</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function StatusBadge({ status }) {
  return (
    <Badge variant="outline" className="transactions-status" data-status={status || "unknown"}>
      <span aria-hidden="true" />
      {formatStatus(status)}
    </Badge>
  )
}

function StockTypeBadge({ type }) {
  const incoming = type === "stock-in"
  const Icon = incoming ? ArrowDownToLine : ArrowUpFromLine
  return (
    <Badge variant="outline" className="transactions-stock-type" data-type={type || "unknown"}>
      <Icon aria-hidden="true" />
      {formatStatus(type)}
    </Badge>
  )
}

function SortableHead({ label, sortKey, sort, onSort, className = "" }) {
  const [activeKey, direction] = sort.split(":")
  const active = activeKey === sortKey
  const SortIcon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown

  return (
    <TableHead
      scope="col"
      className={className}
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        className={`transactions-sort-button${active ? " is-active" : ""}`}
        onClick={() => onSort(sortKey)}
      >
        {label}
        <SortIcon aria-hidden="true" />
      </button>
    </TableHead>
  )
}

function TransactionDate({ value }) {
  const date = parseDate(value)
  return (
    <div className="transactions-date-cell">
      <CalendarDays aria-hidden="true" />
      <div>
        <strong>{date ? dateFormatter.format(date) : "Unknown date"}</strong>
        <span>{date ? timeFormatter.format(date) : "Time unavailable"}</span>
      </div>
    </div>
  )
}

function Pagination({ page, totalPages, label, onPageChange }) {
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
    <nav className="products-pagination" aria-label={`${label} pages`}>
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
        Previous
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
        Next
        <ChevronRight />
      </Button>
    </nav>
  )
}

function TransactionFilters({ kind, filters, statuses, rangeError, onChange, onClear }) {
  const isStock = kind === "stock"
  const isHistory = kind === "orders"
  const hasPrice = !isStock
  const sortOptions = isStock ? stockSortOptions : orderSortOptions
  const searchLabel = isStock ? "Search stock transactions" : "Search order transactions"

  return (
    <div className="transactions-filters" data-kind={kind} aria-label={`${searchLabel} filters`}>
      <div className="products-search-field transactions-search-field">
        <Label htmlFor={`${kind}-search`} className="sr-only">{searchLabel}</Label>
        <Search aria-hidden="true" />
        <Input
          id={`${kind}-search`}
          type="search"
          value={filters.search}
          placeholder={isStock ? "Search materials, suppliers, transaction IDs..." : "Search customers, products, transaction IDs..."}
          onChange={(event) => onChange("search", event.target.value)}
        />
      </div>

      {isStock && (
        <div className="products-filter-field">
          <Label htmlFor="stock-type-filter">Movement</Label>
          <Select value={filters.type} onValueChange={(value) => onChange("type", value)}>
            <SelectTrigger id="stock-type-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All movements</SelectItem>
              <SelectItem value="stock-in">Stock in</SelectItem>
              <SelectItem value="stock-out">Stock out</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {isHistory && (
        <div className="products-filter-field">
          <Label htmlFor="order-status-filter">Status</Label>
          <Select value={filters.status} onValueChange={(value) => onChange("status", value)}>
            <SelectTrigger id="order-status-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statuses
                .filter((status) => status.status_code !== "in_production")
                .map((status) => (
                  <SelectItem key={status.id || status.status_code} value={status.status_code}>
                    {formatStatus(status.status_code)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="transactions-range-filter transactions-date-filter">
        <Label htmlFor={`${kind}-start-date`}>Date range</Label>
        <div>
          <Input
            id={`${kind}-start-date`}
            type="date"
            value={filters.startDate}
            max={filters.endDate || undefined}
            aria-label="Start date"
            onChange={(event) => onChange("startDate", event.target.value)}
          />
          <span aria-hidden="true">to</span>
          <Input
            type="date"
            value={filters.endDate}
            min={filters.startDate || undefined}
            aria-label="End date"
            onChange={(event) => onChange("endDate", event.target.value)}
          />
        </div>
      </div>

      {hasPrice && (
        <div className="transactions-range-filter">
          <Label htmlFor={`${kind}-min-amount`}>Amount range</Label>
          <div>
            <Input
              id={`${kind}-min-amount`}
              type="number"
              min="0"
              step="0.01"
              value={filters.minPrice}
              placeholder="Min"
              aria-label="Minimum amount"
              onChange={(event) => onChange("minPrice", event.target.value)}
            />
            <span aria-hidden="true">to</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={filters.maxPrice}
              placeholder="Max"
              aria-label="Maximum amount"
              onChange={(event) => onChange("maxPrice", event.target.value)}
            />
          </div>
        </div>
      )}

      <div className="products-filter-field">
        <Label htmlFor={`${kind}-sort`}>Sort by</Label>
        <Select value={filters.sort} onValueChange={(value) => onChange("sort", value)}>
          <SelectTrigger id={`${kind}-sort`}>
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
        className="products-button transactions-clear-button"
        onClick={onClear}
      >
        <Eraser />
        Clear
      </Button>

      {rangeError && (
        <p className="transactions-filter-error" role="alert">
          <AlertCircle aria-hidden="true" />
          {rangeError}
        </p>
      )}
    </div>
  )
}

function TableState({ colSpan, loading, error, emptyMessage, onRetry }) {
  if (loading) {
    return Array.from({ length: PAGE_SIZE }).map((_, rowIndex) => (
      <TableRow key={rowIndex}>
        {Array.from({ length: colSpan }).map((__, cellIndex) => (
          <TableCell key={cellIndex}><Skeleton className="h-4 w-full" /></TableCell>
        ))}
      </TableRow>
    ))
  }

  if (error) {
    return (
      <TableRow>
        <TableCell colSpan={colSpan} className="products-table-message transactions-table-message">
          <AlertCircle aria-hidden="true" />
          <span>Transaction records could not be loaded.</span>
          <Button type="button" variant="outline" size="sm" className="products-button" onClick={onRetry}>
            <RefreshCw />
            Retry
          </Button>
        </TableCell>
      </TableRow>
    )
  }

  if (emptyMessage) {
    return (
      <TableRow>
        <TableCell colSpan={colSpan} className="products-table-message transactions-table-message">
          <PackageOpen aria-hidden="true" />
          <span>{emptyMessage}</span>
        </TableCell>
      </TableRow>
    )
  }

  return null
}

function OrderActions({ order, onUpdate, onDelete }) {
  return (
    <div className="products-row-actions transactions-row-actions">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="products-button products-button--edit"
        onClick={() => onUpdate(order)}
      >
        <PencilLine />
        Status
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="products-button products-button--danger"
        onClick={() => onDelete(order)}
      >
        <Trash2 />
        Delete
      </Button>
    </div>
  )
}

function StockTable({ rows, loading, error, emptyMessage, sort, onSort, onRetry }) {
  return (
    <div className="products-table-wrap transactions-table-wrap">
      <Table className="products-table transactions-table transactions-stock-table" aria-busy={loading}>
        <caption className="sr-only">Stock transaction records</caption>
        <TableHeader>
          <TableRow>
            <SortableHead label="Date" sortKey="date_created" sort={sort} onSort={onSort} />
            <SortableHead label="Transaction ID" sortKey="transaction_id" sort={sort} onSort={onSort} />
            <SortableHead label="Stock type" sortKey="stock_type" sort={sort} onSort={onSort} />
            <SortableHead label="Type code" sortKey="type_code" sort={sort} onSort={onSort} />
            <SortableHead label="Material" sortKey="material_name" sort={sort} onSort={onSort} />
            <SortableHead label="Description" sortKey="item_description" sort={sort} onSort={onSort} />
            <SortableHead label="Quantity" sortKey="quantity" sort={sort} onSort={onSort} className="is-numeric" />
            <SortableHead label="Unit" sortKey="unit" sort={sort} onSort={onSort} />
            <SortableHead label="Supplier" sortKey="supplier_name" sort={sort} onSort={onSort} />
            <SortableHead label="Contact" sortKey="supplier_contact" sort={sort} onSort={onSort} />
          </TableRow>
        </TableHeader>
        <TableBody aria-live="polite">
          <TableState
            colSpan={10}
            loading={loading}
            error={error}
            emptyMessage={emptyMessage}
            onRetry={onRetry}
          />
          {!loading && !error && rows.map((row, index) => (
            <TableRow key={`${row.transaction_id}-${row.material_name}-${index}`}>
              <TableCell><TransactionDate value={row.date_created} /></TableCell>
              <TableCell className="transactions-id-cell">{displayValue(row.transaction_id)}</TableCell>
              <TableCell>{displayValue(row.stock_type, "Stock movement")}</TableCell>
              <TableCell><StockTypeBadge type={row.type_code} /></TableCell>
              <TableCell>
                <div className="transactions-primary-cell">
                  <span className="transactions-record-icon" aria-hidden="true"><Boxes /></span>
                  <strong>{displayValue(row.material_name, "Unnamed material")}</strong>
                </div>
              </TableCell>
              <TableCell className="transactions-description-cell" title={displayValue(row.item_description, "No description")}>
                {displayValue(row.item_description, "No description")}
              </TableCell>
              <TableCell className="transactions-number-cell">{numberFormatter.format(asNumber(row.quantity))}</TableCell>
              <TableCell>{displayValue(row.unit, "N/A")}</TableCell>
              <TableCell>{displayValue(row.supplier_name)}</TableCell>
              <TableCell>{displayValue(row.supplier_contact)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function OrderTable({ rows, loading, error, emptyMessage, sort, isAdmin, onSort, onRetry, onUpdate, onDelete }) {
  const columnCount = isAdmin ? 10 : 9
  return (
    <div className="products-table-wrap transactions-table-wrap">
      <Table className="products-table transactions-table transactions-order-table" aria-busy={loading}>
        <caption className="sr-only">Order transaction records</caption>
        <TableHeader>
          <TableRow>
            <SortableHead label="Date" sortKey="date_created" sort={sort} onSort={onSort} />
            <SortableHead label="Transaction ID" sortKey="transaction_id" sort={sort} onSort={onSort} />
            <SortableHead label="Products ordered" sortKey="product_names" sort={sort} onSort={onSort} />
            <SortableHead label="Customer" sortKey="customer_name" sort={sort} onSort={onSort} />
            <SortableHead label="Contact" sortKey="contact_number" sort={sort} onSort={onSort} />
            <SortableHead label="Email" sortKey="customer_email" sort={sort} onSort={onSort} />
            <SortableHead label="Address" sortKey="address" sort={sort} onSort={onSort} />
            <SortableHead label="Status" sortKey="status_code" sort={sort} onSort={onSort} />
            {isAdmin && <TableHead scope="col">Actions</TableHead>}
            <SortableHead label="Total amount" sortKey="total_amount" sort={sort} onSort={onSort} className="is-numeric" />
          </TableRow>
        </TableHeader>
        <TableBody aria-live="polite">
          <TableState
            colSpan={columnCount}
            loading={loading}
            error={error}
            emptyMessage={emptyMessage}
            onRetry={onRetry}
          />
          {!loading && !error && rows.map((row) => (
            <TableRow key={row.transaction_id}>
              <TableCell><TransactionDate value={row.date_created} /></TableCell>
              <TableCell className="transactions-id-cell">{displayValue(row.transaction_id)}</TableCell>
              <TableCell>
                <div className="transactions-order-products">
                  <span className="transactions-record-icon" aria-hidden="true"><Warehouse /></span>
                  <div>
                    <strong title={displayValue(row.product_names, "No products listed")}>
                      {displayValue(row.product_names, "No products listed")}
                    </strong>
                    <span>{numberFormatter.format(asNumber(row.total_items_ordered))} item(s)</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>{displayValue(row.customer_name, "Unknown customer")}</TableCell>
              <TableCell>{displayValue(row.contact_number)}</TableCell>
              <TableCell className="transactions-email-cell" title={displayValue(row.customer_email)}>
                {displayValue(row.customer_email)}
              </TableCell>
              <TableCell className="transactions-address-cell" title={displayValue(row.address)}>
                {displayValue(row.address)}
              </TableCell>
              <TableCell><StatusBadge status={row.status_code} /></TableCell>
              {isAdmin && (
                <TableCell>
                  <OrderActions order={row} onUpdate={onUpdate} onDelete={onDelete} />
                </TableCell>
              )}
              <TableCell className="products-money-cell transactions-amount-cell">
                {currencyFormatter.format(asNumber(row.total_amount))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function MobileState({ loading, error, emptyMessage, onRetry }) {
  if (loading) {
    return (
      <div className="products-mobile-cards">
        {Array.from({ length: 3 }).map((_, index) => <Skeleton className="h-56 w-full" key={index} />)}
      </div>
    )
  }

  if (error || emptyMessage) {
    return (
      <div className="products-mobile-empty transactions-mobile-empty">
        {error ? <AlertCircle aria-hidden="true" /> : <PackageOpen aria-hidden="true" />}
        <p>{error ? "Transaction records could not be loaded." : emptyMessage}</p>
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

function StockCards({ rows, loading, error, emptyMessage, reduceMotion, onRetry }) {
  const state = <MobileState loading={loading} error={error} emptyMessage={emptyMessage} onRetry={onRetry} />
  if (loading || error || emptyMessage) return state

  return (
    <div className="products-mobile-cards">
      {rows.map((row, index) => (
        <motion.article
          className="products-mobile-card transactions-mobile-card"
          key={`${row.transaction_id}-${row.material_name}-${index}`}
          initial={reduceMotion ? false : { opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, delay: index * 0.025 }}
        >
          <div className="products-mobile-card-heading">
            <span className="products-product-icon" aria-hidden="true"><Boxes /></span>
            <div>
              <strong>{displayValue(row.material_name, "Unnamed material")}</strong>
              <span>{displayValue(row.transaction_id)}</span>
            </div>
            <StockTypeBadge type={row.type_code} />
          </div>
          <p className="products-mobile-description">
            {displayValue(row.item_description, "No material description")}
          </p>
          <dl className="products-mobile-details transactions-mobile-details">
            <div><dt>Date</dt><dd>{parseDate(row.date_created) ? dateFormatter.format(parseDate(row.date_created)) : "Unknown"}</dd></div>
            <div><dt>Quantity</dt><dd>{numberFormatter.format(asNumber(row.quantity))} {displayValue(row.unit, "")}</dd></div>
            <div><dt>Stock type</dt><dd>{displayValue(row.stock_type, "Movement")}</dd></div>
            <div><dt>Supplier</dt><dd>{displayValue(row.supplier_name)}</dd></div>
            <div><dt>Contact</dt><dd>{displayValue(row.supplier_contact)}</dd></div>
          </dl>
        </motion.article>
      ))}
    </div>
  )
}

function OrderCards({ rows, loading, error, emptyMessage, isAdmin, reduceMotion, onRetry, onUpdate, onDelete }) {
  const state = <MobileState loading={loading} error={error} emptyMessage={emptyMessage} onRetry={onRetry} />
  if (loading || error || emptyMessage) return state

  return (
    <div className="products-mobile-cards">
      {rows.map((row, index) => (
        <motion.article
          className="products-mobile-card transactions-mobile-card"
          key={row.transaction_id}
          initial={reduceMotion ? false : { opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, delay: index * 0.025 }}
        >
          <div className="products-mobile-card-heading transactions-order-card-heading">
            <span className="products-product-icon" aria-hidden="true"><UserRound /></span>
            <div>
              <strong>{displayValue(row.customer_name, "Unknown customer")}</strong>
              <span>{displayValue(row.transaction_id)}</span>
            </div>
            <StatusBadge status={row.status_code} />
          </div>
          <p className="products-mobile-description">
            {displayValue(row.product_names, "No products listed")}
          </p>
          <dl className="products-mobile-details transactions-mobile-details">
            <div><dt>Date</dt><dd>{parseDate(row.date_created) ? dateFormatter.format(parseDate(row.date_created)) : "Unknown"}</dd></div>
            <div><dt>Amount</dt><dd>{currencyFormatter.format(asNumber(row.total_amount))}</dd></div>
            <div><dt>Items</dt><dd>{numberFormatter.format(asNumber(row.total_items_ordered))}</dd></div>
            <div><dt>Contact</dt><dd>{displayValue(row.contact_number)}</dd></div>
            <div><dt>Email</dt><dd>{displayValue(row.customer_email)}</dd></div>
            <div className="transactions-mobile-detail-wide"><dt>Address</dt><dd>{displayValue(row.address)}</dd></div>
          </dl>
          {isAdmin && <OrderActions order={row} onUpdate={onUpdate} onDelete={onDelete} />}
        </motion.article>
      ))}
    </div>
  )
}

function TransactionLedger({
  kind,
  rows,
  rawCount,
  loading,
  error,
  filters,
  statuses,
  page,
  isAdmin,
  reduceMotion,
  onFilterChange,
  onClearFilters,
  onPageChange,
  onSort,
  onRetry,
  onUpdate,
  onDelete,
}) {
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const rangeError = getRangeError(filters, kind)
  const labels = {
    stock: "stock transactions",
    production: "in-production orders",
    orders: "order transactions",
  }
  const emptyMessage = !loading && !error && pageRows.length === 0
    ? rawCount === 0
      ? kind === "production"
        ? "No orders are currently in production."
        : `No ${labels[kind]} are available.`
      : `No ${labels[kind]} match the selected filters.`
    : ""

  return (
    <>
      <TransactionFilters
        kind={kind}
        filters={filters}
        statuses={statuses}
        rangeError={rangeError}
        onChange={(field, value) => onFilterChange(kind, field, value)}
        onClear={() => onClearFilters(kind)}
      />

      {kind === "stock" ? (
        <>
          <StockTable
            rows={pageRows}
            loading={loading}
            error={error}
            emptyMessage={emptyMessage}
            sort={filters.sort}
            onSort={(key) => onSort(kind, key)}
            onRetry={onRetry}
          />
          <StockCards
            rows={pageRows}
            loading={loading}
            error={error}
            emptyMessage={emptyMessage}
            reduceMotion={reduceMotion}
            onRetry={onRetry}
          />
        </>
      ) : (
        <>
          <OrderTable
            rows={pageRows}
            loading={loading}
            error={error}
            emptyMessage={emptyMessage}
            sort={filters.sort}
            isAdmin={isAdmin}
            onSort={(key) => onSort(kind, key)}
            onRetry={onRetry}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
          <OrderCards
            rows={pageRows}
            loading={loading}
            error={error}
            emptyMessage={emptyMessage}
            isAdmin={isAdmin}
            reduceMotion={reduceMotion}
            onRetry={onRetry}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </>
      )}

      <div className="products-catalog-footer transactions-catalog-footer">
        <p>
          Showing {rows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}-
          {Math.min(currentPage * PAGE_SIZE, rows.length)} of {numberFormatter.format(rows.length)} matching records
        </p>
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          label={labels[kind]}
          onPageChange={(nextPage) => onPageChange(kind, nextPage)}
        />
      </div>
    </>
  )
}

function TransactionsApp({ user }) {
  const [stockTransactions, setStockTransactions] = React.useState(null)
  const [orderTransactions, setOrderTransactions] = React.useState(null)
  const [statuses, setStatuses] = React.useState([])
  const [loadErrors, setLoadErrors] = React.useState({})
  const [refreshing, setRefreshing] = React.useState(false)
  const [lastSynced, setLastSynced] = React.useState(null)
  const [activeTab, setActiveTab] = React.useState("stock")
  const [filters, setFilters] = React.useState(initialFilters)
  const [pages, setPages] = React.useState({ stock: 1, production: 1, orders: 1 })
  const [feedback, setFeedback] = React.useState(null)
  const [statusTarget, setStatusTarget] = React.useState(null)
  const [selectedStatus, setSelectedStatus] = React.useState("")
  const [statusBusy, setStatusBusy] = React.useState(false)
  const [statusError, setStatusError] = React.useState("")
  const [deleteTarget, setDeleteTarget] = React.useState(null)
  const [deleteBusy, setDeleteBusy] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState("")
  const reduceMotion = useReducedMotion()
  const deferredFilters = React.useDeferredValue(filters)
  const isAdmin = user.role === "admin"

  async function loadTransactions(signal) {
    setRefreshing(true)
    const [stockResult, orderResult] = await Promise.allSettled([
      getStockTransactions(signal),
      getOrderTransactions(signal),
    ])

    if (signal?.aborted) return

    // Order records and status options share a DuckDB connection on the server.
    // Fetch the lookup only after the ledger query has released that connection.
    const [statusResult] = await Promise.allSettled([getOrderStatuses(signal)])

    if (signal?.aborted) return

    const nextErrors = {}
    let loadedAny = false

    if (stockResult.status === "fulfilled") {
      setStockTransactions(stockResult.value)
      loadedAny = true
    } else if (stockResult.reason?.name !== "AbortError") {
      setStockTransactions((current) => current ?? [])
      nextErrors.stock = stockResult.reason?.message || "Stock transactions could not be loaded."
    }

    if (orderResult.status === "fulfilled") {
      setOrderTransactions(orderResult.value)
      loadedAny = true
    } else if (orderResult.reason?.name !== "AbortError") {
      setOrderTransactions((current) => current ?? [])
      nextErrors.orders = orderResult.reason?.message || "Order transactions could not be loaded."
    }

    if (statusResult.status === "fulfilled") {
      setStatuses(statusResult.value)
      loadedAny = true
    }

    setLoadErrors(nextErrors)
    if (loadedAny) setLastSynced(new Date())
    setRefreshing(false)
  }

  async function reloadOrders() {
    try {
      const data = await getOrderTransactions()
      setOrderTransactions(data)
      setLoadErrors((current) => {
        const next = { ...current }
        delete next.orders
        return next
      })
      setLastSynced(new Date())
      return true
    } catch (error) {
      setLoadErrors((current) => ({
        ...current,
        orders: error.message || "Order transactions could not be refreshed.",
      }))
      return false
    }
  }

  React.useEffect(() => {
    const controller = new AbortController()
    loadTransactions(controller.signal)
    return () => controller.abort()
  }, [])

  React.useEffect(() => {
    if (!feedback) return undefined
    const timeout = window.setTimeout(() => setFeedback(null), 4500)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  function notify(type, message) {
    setFeedback({ type, message })
  }

  function updateFilter(kind, field, value) {
    setFilters((current) => ({
      ...current,
      [kind]: { ...current[kind], [field]: value },
    }))
    setPages((current) => ({ ...current, [kind]: 1 }))
  }

  function clearFilters(kind) {
    setFilters((current) => ({
      ...current,
      [kind]: { ...initialFilters[kind] },
    }))
    setPages((current) => ({ ...current, [kind]: 1 }))
  }

  function sortByColumn(kind, key) {
    const [currentKey, currentDirection] = filters[kind].sort.split(":")
    const defaultDirection = ["date_created", "quantity", "total_amount", "total_items_ordered"].includes(key)
      ? "desc"
      : "asc"
    const direction = currentKey === key
      ? currentDirection === "asc" ? "desc" : "asc"
      : defaultDirection
    updateFilter(kind, "sort", `${key}:${direction}`)
  }

  function openStatusDialog(order) {
    setStatusError("")
    setSelectedStatus(order.status_code || "")
    setStatusTarget(order)
  }

  async function submitStatusUpdate(event) {
    event.preventDefault()
    if (!statusTarget || !selectedStatus || selectedStatus === statusTarget.status_code) return

    setStatusBusy(true)
    setStatusError("")
    try {
      const result = await updateOrderStatus(statusTarget.transaction_id, selectedStatus)
      setStatusTarget(null)
      notify("success", result?.message || "Order status updated successfully.")
      const refreshed = await reloadOrders()
      if (!refreshed) notify("error", "Status saved, but the order ledger could not be refreshed.")
    } catch (error) {
      setStatusError(error.message || "The order status could not be updated.")
    } finally {
      setStatusBusy(false)
    }
  }

  async function confirmDeleteOrder() {
    if (!deleteTarget) return
    setDeleteBusy(true)
    setDeleteError("")
    try {
      const result = await deleteOrder(deleteTarget.transaction_id)
      setDeleteTarget(null)
      notify("success", result?.message || "Order deleted successfully.")
      const refreshed = await reloadOrders()
      if (!refreshed) notify("error", "Order deleted, but the ledger could not be refreshed.")
    } catch (error) {
      setDeleteError(error.message || "The order could not be deleted.")
    } finally {
      setDeleteBusy(false)
    }
  }

  const stockRows = stockTransactions || []
  const allOrders = orderTransactions || []
  const productionRows = allOrders.filter((order) => order.status_code === "in_production")
  const historyRows = allOrders.filter((order) => order.status_code !== "in_production")
  const availableStatuses = statuses.length > 0 ? statuses : defaultStatuses
  const filteredStockRows = filterAndSortRows(stockRows, "stock", deferredFilters.stock)
  const filteredProductionRows = filterAndSortRows(productionRows, "production", deferredFilters.production)
  const filteredHistoryRows = filterAndSortRows(historyRows, "orders", deferredFilters.orders)
  const inboundCount = stockRows.filter((row) => row.type_code === "stock-in").length
  const orderValue = allOrders.reduce((total, order) => total + asNumber(order.total_amount), 0)
  const initialLoading = stockTransactions === null || orderTransactions === null
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "TimeStock user"
  const roleLabel = isAdmin ? "Administrator" : "Employee"
  const errorMessages = [...new Set(Object.values(loadErrors).filter(Boolean))]
  const summaries = [
    {
      label: "Stock activity",
      description: "Recorded item movements",
      value: numberFormatter.format(stockRows.length),
      icon: History,
      tone: "cyan",
    },
    {
      label: "Inbound entries",
      description: "Stock additions logged",
      value: numberFormatter.format(inboundCount),
      icon: ArrowDownToLine,
      tone: "blue",
    },
    {
      label: "Production queue",
      description: "Orders being manufactured",
      value: numberFormatter.format(productionRows.length),
      icon: Warehouse,
      tone: "gold",
    },
    {
      label: "Order value",
      description: "Value across order records",
      value: currencyFormatter.format(orderValue),
      icon: CircleDollarSign,
      tone: "violet",
    },
  ]

  return (
    <div className="products-app transactions-app">
      <motion.header
        className="products-header"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.28 }}
      >
        <div className="products-header-identity">
          <span className="products-eyebrow">Operations workspace</span>
          <h1>Transactions</h1>
          <p>Trace stock movement and order progress from one ledger.</p>
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

      <div className="products-content transactions-content">
        <section className="products-page-intro transactions-intro">
          <div>
            <span className="products-eyebrow">Movement control</span>
            <h2>Unified transaction ledger</h2>
            <p>Search stock activity, monitor production, and review every recorded order.</p>
          </div>
          <div className="transactions-sync-panel" aria-live="polite">
            <div>
              <span className="transactions-sync-icon" aria-hidden="true"><Clock3 /></span>
              <span>
                <small>Last synchronized</small>
                <strong>{lastSynced ? syncFormatter.format(lastSynced) : "Waiting for data"}</strong>
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              className="products-button products-button--primary transactions-refresh-button"
              disabled={refreshing}
              onClick={() => loadTransactions()}
            >
              <RefreshCw className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing..." : "Refresh ledger"}
            </Button>
          </div>
        </section>

        <AnimatePresence>
          {feedback && (
            <motion.div
              className="products-feedback"
              initial={reduceMotion ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
            >
              <Alert variant={feedback.type === "success" ? "success" : "destructive"}>
                {feedback.type === "success" ? <CheckCircle2 aria-hidden="true" /> : <AlertCircle aria-hidden="true" />}
                <AlertTitle>{feedback.type === "success" ? "Ledger updated" : "Action needs attention"}</AlertTitle>
                <AlertDescription>{feedback.message}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {errorMessages.length > 0 && (
          <Alert variant="destructive" className="products-load-alert transactions-load-alert">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>Some transaction data is unavailable</AlertTitle>
            <AlertDescription>{errorMessages.join(" ")}</AlertDescription>
          </Alert>
        )}

        <section className="products-summary-grid transactions-summary-grid" aria-label="Transaction summary">
          {summaries.map((summary, index) => (
            <SummaryCard
              key={summary.label}
              {...summary}
              loading={initialLoading}
              index={index}
              reduceMotion={reduceMotion}
            />
          ))}
        </section>

        <motion.section
          className="products-catalog-card transactions-ledger-card"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.34, delay: 0.14 }}
        >
          <Tabs
            value={activeTab}
            onValueChange={(value) => React.startTransition(() => setActiveTab(value))}
          >
            <div className="products-catalog-heading transactions-ledger-heading">
              <div>
                <span className="products-eyebrow">Ledger records</span>
                <h2>Transaction history</h2>
                <p>Five records per page, with composable filters and column sorting.</p>
              </div>
              <TabsList className="products-tabs-list transactions-tabs-list" aria-label="Transaction ledgers">
                <TabsTrigger value="stock">
                  <Boxes aria-hidden="true" />
                  Stock
                  <Badge variant="secondary">{numberFormatter.format(stockRows.length)}</Badge>
                </TabsTrigger>
                <TabsTrigger value="production">
                  <Warehouse aria-hidden="true" />
                  In production
                  <Badge variant="secondary">{numberFormatter.format(productionRows.length)}</Badge>
                </TabsTrigger>
                <TabsTrigger value="orders">
                  <History aria-hidden="true" />
                  Order history
                  <Badge variant="secondary">{numberFormatter.format(historyRows.length)}</Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="stock" className="products-tab-content transactions-tab-content">
              <TransactionLedger
                kind="stock"
                rows={filteredStockRows}
                rawCount={stockRows.length}
                loading={stockTransactions === null}
                error={Boolean(loadErrors.stock && stockRows.length === 0)}
                filters={filters.stock}
                statuses={availableStatuses}
                page={pages.stock}
                isAdmin={isAdmin}
                reduceMotion={reduceMotion}
                onFilterChange={updateFilter}
                onClearFilters={clearFilters}
                onPageChange={(kind, page) => setPages((current) => ({ ...current, [kind]: page }))}
                onSort={sortByColumn}
                onRetry={() => loadTransactions()}
                onUpdate={openStatusDialog}
                onDelete={(order) => setDeleteTarget(order)}
              />
            </TabsContent>

            <TabsContent value="production" className="products-tab-content transactions-tab-content">
              <TransactionLedger
                kind="production"
                rows={filteredProductionRows}
                rawCount={productionRows.length}
                loading={orderTransactions === null}
                error={Boolean(loadErrors.orders && allOrders.length === 0)}
                filters={filters.production}
                statuses={availableStatuses}
                page={pages.production}
                isAdmin={isAdmin}
                reduceMotion={reduceMotion}
                onFilterChange={updateFilter}
                onClearFilters={clearFilters}
                onPageChange={(kind, page) => setPages((current) => ({ ...current, [kind]: page }))}
                onSort={sortByColumn}
                onRetry={() => loadTransactions()}
                onUpdate={openStatusDialog}
                onDelete={(order) => {
                  setDeleteError("")
                  setDeleteTarget(order)
                }}
              />
            </TabsContent>

            <TabsContent value="orders" className="products-tab-content transactions-tab-content">
              <TransactionLedger
                kind="orders"
                rows={filteredHistoryRows}
                rawCount={historyRows.length}
                loading={orderTransactions === null}
                error={Boolean(loadErrors.orders && allOrders.length === 0)}
                filters={filters.orders}
                statuses={availableStatuses}
                page={pages.orders}
                isAdmin={isAdmin}
                reduceMotion={reduceMotion}
                onFilterChange={updateFilter}
                onClearFilters={clearFilters}
                onPageChange={(kind, page) => setPages((current) => ({ ...current, [kind]: page }))}
                onSort={sortByColumn}
                onRetry={() => loadTransactions()}
                onUpdate={openStatusDialog}
                onDelete={(order) => {
                  setDeleteError("")
                  setDeleteTarget(order)
                }}
              />
            </TabsContent>
          </Tabs>
        </motion.section>
      </div>

      {isAdmin && (
        <Dialog
          open={Boolean(statusTarget)}
          onOpenChange={(nextOpen) => {
            if (!nextOpen && !statusBusy) setStatusTarget(null)
          }}
        >
          <DialogContent
            overlayClassName="transactions-dialog-overlay"
            className="products-dialog transactions-status-dialog"
          >
            <DialogHeader className="products-dialog-header">
              <span className="products-dialog-icon" aria-hidden="true"><PencilLine /></span>
              <div>
                <DialogTitle>Update order status</DialogTitle>
                <DialogDescription>
                  Move this order to the next accurate stage in the production workflow.
                </DialogDescription>
              </div>
            </DialogHeader>
            <form className="products-form transactions-status-form" onSubmit={submitStatusUpdate}>
              <div className="transactions-order-context">
                <span className="transactions-record-icon" aria-hidden="true"><Warehouse /></span>
                <div>
                  <small>{displayValue(statusTarget?.transaction_id, "Order")}</small>
                  <strong>{displayValue(statusTarget?.customer_name, "Unknown customer")}</strong>
                  <p>{displayValue(statusTarget?.product_names, "No products listed")}</p>
                </div>
                <StatusBadge status={statusTarget?.status_code} />
              </div>
              <div className="products-field">
                <Label htmlFor="transaction-status-select">New status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus} disabled={statusBusy}>
                  <SelectTrigger id="transaction-status-select"><SelectValue placeholder="Select a status" /></SelectTrigger>
                  <SelectContent>
                    {availableStatuses.map((status) => (
                      <SelectItem key={status.id || status.status_code} value={status.status_code}>
                        {formatStatus(status.status_code)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="transactions-status-help">
                  {availableStatuses.find((status) => status.status_code === selectedStatus)?.description ||
                    "Select the current production state for this order."}
                </p>
              </div>
              {statusError && (
                <Alert variant="destructive">
                  <AlertCircle aria-hidden="true" />
                  <AlertDescription>{statusError}</AlertDescription>
                </Alert>
              )}
              <DialogFooter className="products-dialog-footer">
                <Button
                  type="button"
                  variant="outline"
                  className="products-button"
                  disabled={statusBusy}
                  onClick={() => setStatusTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="outline"
                  className="products-button products-button--primary"
                  disabled={statusBusy || !selectedStatus || selectedStatus === statusTarget?.status_code}
                >
                  {statusBusy ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}
                  {statusBusy ? "Updating..." : "Update status"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {isAdmin && (
        <AlertDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(nextOpen) => {
            if (!nextOpen && !deleteBusy) setDeleteTarget(null)
          }}
        >
          <AlertDialogContent
            overlayClassName="transactions-confirm-overlay"
            className="products-confirm-dialog transactions-confirm-dialog"
          >
            <AlertDialogHeader>
              <span className="products-confirm-icon" aria-hidden="true"><Trash2 /></span>
              <AlertDialogTitle>Delete this order permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                Order {displayValue(deleteTarget?.transaction_id, "record")} for {displayValue(deleteTarget?.customer_name, "this customer")} and its linked items will be removed. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteError && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertDescription>{deleteError}</AlertDescription>
              </Alert>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel className="products-button" disabled={deleteBusy}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="products-button products-button--danger"
                disabled={deleteBusy}
                onClick={(event) => {
                  event.preventDefault()
                  confirmDeleteOrder()
                }}
              >
                {deleteBusy ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                {deleteBusy ? "Deleting..." : "Delete permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

export default TransactionsApp
