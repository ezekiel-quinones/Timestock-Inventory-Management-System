import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import {
  AlertCircle,
  ArrowDownUp,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Gauge,
  Hammer,
  Layers3,
  LoaderCircle,
  PackageCheck,
  PackageOpen,
  PackagePlus,
  PencilLine,
  Plus,
  Search,
  Trash2,
  TrendingUp,
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
import RecipeDialog from "../products/RecipeDialog"
import {
  apiRequest,
  getMaterialCategories,
  getMaterials,
  getMaterialSummary,
  getProducts,
  getSuppliers,
} from "./api"
import MaterialFormDialog from "./MaterialFormDialog"
import { BulkStockDialog, SingleStockDialog } from "./StockDialogs"

const PAGE_SIZE = 8
const numberFormatter = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 })
const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const summaryDefinitions = [
  {
    key: "total",
    label: "Total materials",
    description: "Inventory records",
    icon: Boxes,
    tone: "cyan",
  },
  {
    key: "used",
    label: "Most used material",
    description: "Consumption, last 3 months",
    icon: TrendingUp,
    tone: "blue",
  },
  {
    key: "stock",
    label: "Total material stock",
    description: "Combined on-hand quantity",
    icon: PackageCheck,
    tone: "gold",
  },
]

const sortOptions = [
  ["default", "Default order"],
  ["nameAsc", "Name: A to Z"],
  ["nameDesc", "Name: Z to A"],
  ["qtyAsc", "Quantity: low to high"],
  ["qtyDesc", "Quantity: high to low"],
  ["costAsc", "Cost: low to high"],
  ["costDesc", "Cost: high to low"],
  ["ratingAsc", "Movement: low to high"],
  ["ratingDesc", "Movement: high to low"],
]

function asNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function getSummaryValue(summary, key) {
  if (!summary) return { primary: "", secondary: "" }

  if (key === "total") {
    return {
      primary: numberFormatter.format(asNumber(summary.total_materials)),
      secondary: "material records",
    }
  }
  if (key === "used") {
    return {
      primary: summary.most_used_material?.item_name || "No usage",
      secondary: `${numberFormatter.format(
        asNumber(summary.most_used_material?.total_used),
      )} units consumed`,
    }
  }
  return {
    primary: numberFormatter.format(asNumber(summary.total_material_quantity)),
    secondary: "units on hand",
  }
}

function SummaryCard({ definition, summary, loading, index, reduceMotion }) {
  const Icon = definition.icon
  const value = getSummaryValue(summary, definition.key)

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.32, delay: index * 0.055 }}
    >
      <Card className="products-summary-card" data-tone={definition.tone}>
        <CardContent className="products-summary-content">
          <div className="products-summary-heading">
            <div>
              <p>{definition.label}</p>
              <small>{definition.description}</small>
            </div>
            <span className="products-summary-icon" aria-hidden="true">
              <Icon />
            </span>
          </div>
          {loading ? (
            <div className="products-summary-loading">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          ) : (
            <div className="products-summary-value">
              <strong title={value.primary}>{value.primary}</strong>
              <span>{value.secondary}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function MaterialStatusBadge({ material }) {
  const inStock = asNumber(material.current_stock) !== 0
  return (
    <Badge
      variant="outline"
      className={inStock ? "products-status products-status--available" : "products-status"}
    >
      {inStock ? "In-stock" : "Out of Stock"}
    </Badge>
  )
}

function MovementRating({ value }) {
  const rating = Math.max(0, Math.min(100, asNumber(value)))
  const tone = rating >= 80 ? "high" : rating >= 50 ? "medium" : "low"

  return (
    <div className="materials-rating" data-tone={tone} aria-label={`${rating.toFixed(2)} percent`}>
      <div className="materials-rating-track" aria-hidden="true">
        <span style={{ width: `${rating}%` }} />
      </div>
      <strong>{rating.toFixed(2)}%</strong>
    </div>
  )
}

function MaterialActions({ material, isAdmin, onEdit, onDelete, onStock }) {
  return (
    <div className="products-row-actions materials-row-actions">
      {isAdmin && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="products-button products-button--edit"
          onClick={() => onEdit(material)}
        >
          <PencilLine />
          Edit
        </Button>
      )}
      {isAdmin && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="products-button products-button--danger"
          onClick={() => onDelete(material)}
        >
          <Trash2 />
          Delete
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="products-button products-button--primary"
        onClick={() => onStock(material)}
      >
        <PackagePlus />
        Stock
      </Button>
    </div>
  )
}

function MaterialTable({
  materials,
  loading,
  error,
  isAdmin,
  highlightId,
  highlightActive,
  onEdit,
  onDelete,
  onStock,
}) {
  return (
    <div className="products-table-wrap">
      <Table className="products-table materials-table" aria-busy={loading}>
        <caption className="sr-only">Material inventory records</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Material</TableHead>
            <TableHead scope="col">Category</TableHead>
            <TableHead scope="col">Quantity</TableHead>
            <TableHead scope="col">Measurement</TableHead>
            <TableHead scope="col">Material cost</TableHead>
            <TableHead scope="col">Movement rating</TableHead>
            <TableHead scope="col">Availability</TableHead>
            <TableHead scope="col">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody aria-live="polite">
          {loading &&
            Array.from({ length: PAGE_SIZE }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: 8 }).map((__, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!loading && error && (
            <TableRow>
              <TableCell colSpan={8} className="products-table-message">
                <AlertCircle aria-hidden="true" />
                Materials could not be loaded.
              </TableCell>
            </TableRow>
          )}

          {!loading && !error && materials.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="products-table-message">
                <PackageOpen aria-hidden="true" />
                No materials match the selected filters.
              </TableCell>
            </TableRow>
          )}

          {!loading &&
            !error &&
            materials.map((material) => {
              const highlighted =
                highlightActive && String(material.material_id) === String(highlightId)
              return (
                <TableRow
                  key={material.material_id}
                  data-highlighted={highlighted ? "true" : undefined}
                >
                  <TableCell>
                    <div className="products-product-cell materials-material-cell">
                      <span className="products-product-icon" aria-hidden="true">
                        <Hammer />
                      </span>
                      <div>
                        <strong>{material.item_name || "Unnamed material"}</strong>
                        <span>{material.material_id}</span>
                        <p title={material.item_description || ""}>
                          {material.item_description || "No description"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{material.item_category_name || "Uncategorized"}</TableCell>
                  <TableCell className="materials-quantity-cell">
                    {numberFormatter.format(asNumber(material.current_stock))}
                  </TableCell>
                  <TableCell>{material.unit_measurement || "N/A"}</TableCell>
                  <TableCell className="products-money-cell">
                    {currencyFormatter.format(asNumber(material.material_cost))}
                  </TableCell>
                  <TableCell>
                    <MovementRating value={material.fast_moving_rating} />
                  </TableCell>
                  <TableCell>
                    <MaterialStatusBadge material={material} />
                  </TableCell>
                  <TableCell>
                    <MaterialActions
                      material={material}
                      isAdmin={isAdmin}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onStock={onStock}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
        </TableBody>
      </Table>
    </div>
  )
}

function MaterialCards({
  materials,
  loading,
  error,
  isAdmin,
  highlightId,
  highlightActive,
  onEdit,
  onDelete,
  onStock,
  reduceMotion,
}) {
  if (loading) {
    return (
      <div className="products-mobile-cards">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton className="h-64 w-full" key={index} />
        ))}
      </div>
    )
  }

  if (error || materials.length === 0) {
    return (
      <div className="products-mobile-empty">
        {error ? <AlertCircle aria-hidden="true" /> : <PackageOpen aria-hidden="true" />}
        <p>{error ? "Materials could not be loaded." : "No materials match the selected filters."}</p>
      </div>
    )
  }

  return (
    <div className="products-mobile-cards">
      {materials.map((material, index) => {
        const highlighted = highlightActive && String(material.material_id) === String(highlightId)
        return (
          <motion.article
            className="products-mobile-card materials-mobile-card"
            key={material.material_id}
            data-highlighted={highlighted ? "true" : undefined}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, delay: index * 0.03 }}
          >
            <div className="products-mobile-card-heading">
              <span className="products-product-icon" aria-hidden="true">
                <Hammer />
              </span>
              <div>
                <strong>{material.item_name || "Unnamed material"}</strong>
                <span>{material.material_id}</span>
              </div>
              <MaterialStatusBadge material={material} />
            </div>
            <p className="products-mobile-description">
              {material.item_description || "No description"}
            </p>
            <dl className="products-mobile-details materials-mobile-details">
              <div>
                <dt>Category</dt>
                <dd>{material.item_category_name || "Uncategorized"}</dd>
              </div>
              <div>
                <dt>Stock</dt>
                <dd>
                  {numberFormatter.format(asNumber(material.current_stock))}{" "}
                  {material.unit_measurement || ""}
                </dd>
              </div>
              <div>
                <dt>Material cost</dt>
                <dd>{currencyFormatter.format(asNumber(material.material_cost))}</dd>
              </div>
              <div>
                <dt>Movement</dt>
                <dd>{asNumber(material.fast_moving_rating).toFixed(2)}%</dd>
              </div>
            </dl>
            <MaterialActions
              material={material}
              isAdmin={isAdmin}
              onEdit={onEdit}
              onDelete={onDelete}
              onStock={onStock}
            />
          </motion.article>
        )
      })}
    </div>
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
    <nav className="products-pagination" aria-label="Material pages">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="products-button products-button--neutral"
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
        className="products-button products-button--neutral"
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

function MaterialsApp({ user }) {
  const [materials, setMaterials] = React.useState(null)
  const [summary, setSummary] = React.useState(null)
  const [loadErrors, setLoadErrors] = React.useState({})
  const [filters, setFilters] = React.useState({
    search: "",
    category: "all",
    availability: "all",
    minQuantity: "",
    maxQuantity: "",
    minCost: "",
    maxCost: "",
    minRating: "",
    maxRating: "",
    sort: "default",
  })
  const [page, setPage] = React.useState(1)
  const [categories, setCategories] = React.useState([])
  const [suppliers, setSuppliers] = React.useState([])
  const [lookupsLoading, setLookupsLoading] = React.useState(false)
  const [lookupErrors, setLookupErrors] = React.useState({})
  const [materialDialogOpen, setMaterialDialogOpen] = React.useState(false)
  const [materialDialogMode, setMaterialDialogMode] = React.useState("create")
  const [selectedMaterial, setSelectedMaterial] = React.useState(null)
  const [materialBusy, setMaterialBusy] = React.useState(false)
  const [singleStockTarget, setSingleStockTarget] = React.useState(null)
  const [bulkStockOpen, setBulkStockOpen] = React.useState(false)
  const [stockBusy, setStockBusy] = React.useState(false)
  const [products, setProducts] = React.useState(null)
  const [recipeDialogOpen, setRecipeDialogOpen] = React.useState(false)
  const [recipeButtonBusy, setRecipeButtonBusy] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState(null)
  const [deleteBusy, setDeleteBusy] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState("")
  const [feedback, setFeedback] = React.useState(null)
  const [highlightActive, setHighlightActive] = React.useState(false)
  const [highlightId] = React.useState(
    () => new URLSearchParams(window.location.search).get("highlight") || "",
  )
  const reduceMotion = useReducedMotion()
  const deferredSearch = React.useDeferredValue(filters.search)
  const isAdmin = user.role === "admin"

  async function loadInventory(signal) {
    const [materialsResult, summaryResult] = await Promise.allSettled([
      getMaterials(signal),
      getMaterialSummary(signal),
    ])

    if (materialsResult.status === "fulfilled") {
      setMaterials(materialsResult.value)
      setLoadErrors((current) => {
        const next = { ...current }
        delete next.materials
        return next
      })
    } else if (materialsResult.reason?.name !== "AbortError") {
      setMaterials([])
      setLoadErrors((current) => ({
        ...current,
        materials: materialsResult.reason?.message || "Materials could not be loaded.",
      }))
    }

    if (summaryResult.status === "fulfilled") {
      setSummary(summaryResult.value)
      setLoadErrors((current) => {
        const next = { ...current }
        delete next.summary
        return next
      })
    } else if (summaryResult.reason?.name !== "AbortError") {
      setSummary({})
      setLoadErrors((current) => ({
        ...current,
        summary: summaryResult.reason?.message || "Material summary could not be loaded.",
      }))
    }
  }

  React.useEffect(() => {
    const controller = new AbortController()
    loadInventory(controller.signal)
    return () => controller.abort()
  }, [])

  React.useEffect(() => {
    if (!feedback) return undefined
    const timeout = window.setTimeout(() => setFeedback(null), 4500)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  async function loadLookups() {
    setLookupsLoading(true)
    setLookupErrors({})
    const [categoryResult, supplierResult] = await Promise.allSettled([
      getMaterialCategories(),
      getSuppliers(),
    ])
    const nextErrors = {}

    if (categoryResult.status === "fulfilled") setCategories(categoryResult.value)
    else nextErrors.categories = categoryResult.reason?.message || "Categories could not be loaded."

    if (supplierResult.status === "fulfilled") setSuppliers(supplierResult.value)
    else nextErrors.suppliers = supplierResult.reason?.message || "Suppliers could not be loaded."

    setLookupErrors(nextErrors)
    setLookupsLoading(false)
  }

  function notify(type, message) {
    setFeedback({ type, message })
  }

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }))
    setPage(1)
  }

  function clearFilters() {
    setFilters({
      search: "",
      category: "all",
      availability: "all",
      minQuantity: "",
      maxQuantity: "",
      minCost: "",
      maxCost: "",
      minRating: "",
      maxRating: "",
      sort: "default",
    })
    setPage(1)
  }

  function openCreateDialog() {
    setMaterialDialogMode("create")
    setSelectedMaterial(null)
    setMaterialDialogOpen(true)
    loadLookups()
  }

  function openEditDialog(material) {
    setMaterialDialogMode("edit")
    setSelectedMaterial(material)
    setMaterialDialogOpen(true)
    loadLookups()
  }

  function openSingleStockDialog(material) {
    setSingleStockTarget(material)
    loadLookups()
  }

  function openBulkStockDialog() {
    setBulkStockOpen(true)
    loadLookups()
  }

  async function refreshAfterMutation() {
    await loadInventory()
  }

  async function saveMaterial(payload) {
    setMaterialBusy(true)
    try {
      const editing = materialDialogMode === "edit"
      const result = await apiRequest(editing ? "/api/material/update" : "/api/materials", {
        method: editing ? "PUT" : "POST",
        body: payload,
      })
      setMaterialDialogOpen(false)
      notify("success", result?.message || (editing ? "Material updated." : "Material added."))
      await refreshAfterMutation()
    } finally {
      setMaterialBusy(false)
    }
  }

  async function stockMaterials(payload, mode) {
    setStockBusy(true)
    try {
      const result = await apiRequest("/api/stock-materials", { method: "POST", body: payload })
      if (mode === "single") setSingleStockTarget(null)
      else setBulkStockOpen(false)
      notify(
        "success",
        result?.message ||
          (mode === "single" ? "Material stocked successfully." : "Materials stocked successfully."),
      )
      await refreshAfterMutation()
    } finally {
      setStockBusy(false)
    }
  }

  async function openRecipeDialog() {
    if (products) {
      setRecipeDialogOpen(true)
      return
    }

    setRecipeButtonBusy(true)
    try {
      setProducts(await getProducts())
      setRecipeDialogOpen(true)
    } catch (error) {
      notify("error", error.message)
    } finally {
      setRecipeButtonBusy(false)
    }
  }

  async function deleteMaterial() {
    if (!deleteTarget) return
    setDeleteBusy(true)
    setDeleteError("")
    try {
      const result = await apiRequest(
        `/api/materials/${encodeURIComponent(deleteTarget.material_id)}`,
        { method: "DELETE" },
      )
      setDeleteTarget(null)
      notify("success", result?.message || "Material deleted.")
      await refreshAfterMutation()
    } catch (error) {
      setDeleteError(error.message)
    } finally {
      setDeleteBusy(false)
    }
  }

  const allMaterials = materials || []
  const query = deferredSearch.trim().toLowerCase()
  const readMinimum = (value) => (value === "" ? Number.NEGATIVE_INFINITY : Number(value))
  const readMaximum = (value) => (value === "" ? Number.POSITIVE_INFINITY : Number(value))
  const minQuantity = readMinimum(filters.minQuantity)
  const maxQuantity = readMaximum(filters.maxQuantity)
  const minCost = readMinimum(filters.minCost)
  const maxCost = readMaximum(filters.maxCost)
  const minRating = readMinimum(filters.minRating)
  const maxRating = readMaximum(filters.maxRating)

  const filteredMaterials = allMaterials.filter((material) => {
    const currentStock = asNumber(material.current_stock)
    const cost = asNumber(material.material_cost)
    const rating = asNumber(material.fast_moving_rating)
    const availability = currentStock === 0 ? "out" : "in"
    const matchesSearch =
      !query ||
      [material.material_id, material.item_name, material.item_description].some((value) =>
        String(value || "").toLowerCase().includes(query),
      )

    return (
      matchesSearch &&
      (filters.category === "all" || material.item_category_name === filters.category) &&
      (filters.availability === "all" || availability === filters.availability) &&
      currentStock >= minQuantity &&
      currentStock <= maxQuantity &&
      cost >= minCost &&
      cost <= maxCost &&
      rating >= minRating &&
      rating <= maxRating
    )
  })

  const sortedMaterials = [...filteredMaterials]
  if (filters.sort === "nameAsc") {
    sortedMaterials.sort((a, b) => String(a.item_name).localeCompare(String(b.item_name)))
  } else if (filters.sort === "nameDesc") {
    sortedMaterials.sort((a, b) => String(b.item_name).localeCompare(String(a.item_name)))
  } else if (filters.sort === "qtyAsc") {
    sortedMaterials.sort((a, b) => asNumber(a.current_stock) - asNumber(b.current_stock))
  } else if (filters.sort === "qtyDesc") {
    sortedMaterials.sort((a, b) => asNumber(b.current_stock) - asNumber(a.current_stock))
  } else if (filters.sort === "costAsc") {
    sortedMaterials.sort((a, b) => asNumber(a.material_cost) - asNumber(b.material_cost))
  } else if (filters.sort === "costDesc") {
    sortedMaterials.sort((a, b) => asNumber(b.material_cost) - asNumber(a.material_cost))
  } else if (filters.sort === "ratingAsc") {
    sortedMaterials.sort(
      (a, b) => asNumber(a.fast_moving_rating) - asNumber(b.fast_moving_rating),
    )
  } else if (filters.sort === "ratingDesc") {
    sortedMaterials.sort(
      (a, b) => asNumber(b.fast_moving_rating) - asNumber(a.fast_moving_rating),
    )
  }

  const totalPages = Math.max(1, Math.ceil(sortedMaterials.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedMaterials = sortedMaterials.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )
  const categoryNames = [...new Set(allMaterials.map((material) => material.item_category_name))]
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b)))

  React.useEffect(() => {
    if (!highlightId || materials === null) return undefined
    const index = sortedMaterials.findIndex(
      (material) => String(material.material_id) === String(highlightId),
    )
    if (index < 0) return undefined

    setPage(Math.floor(index / PAGE_SIZE) + 1)
    setHighlightActive(true)
    const fadeTimeout = window.setTimeout(() => setHighlightActive(false), 3200)
    return () => window.clearTimeout(fadeTimeout)
  }, [highlightId, materials])

  React.useEffect(() => {
    if (!highlightActive) return undefined
    const frame = window.requestAnimationFrame(() => {
      const highlightedElements = [...document.querySelectorAll('[data-highlighted="true"]')]
      const visibleElement = highlightedElements.find((element) => element.offsetParent !== null)
      visibleElement?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [currentPage, highlightActive, reduceMotion])

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "TimeStock user"
  const roleLabel = isAdmin ? "Administrator" : "Employee"
  const materialLookupError = [lookupErrors.categories, lookupErrors.suppliers]
    .filter(Boolean)
    .join(" ")

  return (
    <div className="products-app materials-app">
      <motion.header
        className="products-header"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.3 }}
      >
        <div className="products-header-identity">
          <span className="products-eyebrow">Inventory workspace</span>
          <h1>Materials</h1>
          <p>Monitor material stock, costs, suppliers, and product recipes.</p>
        </div>
        <div className="products-header-actions">
          <div className="products-header-notifications">
            <ProductsNotificationCenter />
          </div>
          <div className="products-profile" aria-label={`${displayName}, ${roleLabel}`}>
            <div>
              <span>Welcome back</span>
              <strong>{displayName}</strong>
              <small>{roleLabel}</small>
            </div>
            <span className="products-profile-avatar" aria-hidden="true">
              {isAdmin ? "A" : "E"}
            </span>
          </div>
        </div>
      </motion.header>

      <div className="products-content">
        <section className="products-page-intro">
          <div>
            <span className="products-eyebrow">Materials management</span>
            <h2>Inventory catalog</h2>
            <p>Search material records and record stock movement without leaving the catalog.</p>
          </div>
          <div className="products-primary-actions materials-primary-actions">
            {isAdmin && (
              <Button
                type="button"
                variant="outline"
                className="products-button products-button--neutral"
                disabled={recipeButtonBusy}
                onClick={openRecipeDialog}
              >
                {recipeButtonBusy ? <LoaderCircle className="animate-spin" /> : <Layers3 />}
                Product materials
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="products-button products-button--neutral"
              onClick={openBulkStockDialog}
            >
              <Boxes />
              Bulk stock
            </Button>
            {isAdmin && (
              <Button
                type="button"
                variant="outline"
                className="products-button products-button--primary"
                onClick={openCreateDialog}
              >
                <Plus />
                Add material
              </Button>
            )}
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
                {feedback.type === "success" ? (
                  <CheckCircle2 aria-hidden="true" />
                ) : (
                  <AlertCircle aria-hidden="true" />
                )}
                <AlertTitle>{feedback.type === "success" ? "Saved" : "Action failed"}</AlertTitle>
                <AlertDescription>{feedback.message}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {Object.keys(loadErrors).length > 0 && (
          <Alert variant="destructive" className="products-load-alert">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>Some material data is unavailable</AlertTitle>
            <AlertDescription>{loadErrors.materials || loadErrors.summary}</AlertDescription>
          </Alert>
        )}

        <section className="products-summary-grid materials-summary-grid" aria-label="Material summary">
          {summaryDefinitions.map((definition, index) => (
            <SummaryCard
              key={definition.key}
              definition={definition}
              summary={summary}
              loading={summary === null}
              index={index}
              reduceMotion={reduceMotion}
            />
          ))}
        </section>

        <motion.section
          className="products-catalog-card"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.36, delay: 0.16 }}
        >
          <div className="products-catalog-heading">
            <div>
              <span className="products-eyebrow">Catalog records</span>
              <h2>Materials inventory</h2>
              <p>
                {numberFormatter.format(sortedMaterials.length)} matching record
                {sortedMaterials.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="materials-catalog-status" aria-live="polite">
              <Gauge aria-hidden="true" />
              <span>{numberFormatter.format(allMaterials.length)} total</span>
            </div>
          </div>

          <div className="products-filters materials-filters" aria-label="Material filters">
            <div className="products-search-field materials-search-field">
              <Label htmlFor="materials-search" className="sr-only">Search materials</Label>
              <Search aria-hidden="true" />
              <Input
                id="materials-search"
                type="search"
                value={filters.search}
                placeholder="Search materials, IDs, descriptions..."
                onChange={(event) => updateFilter("search", event.target.value)}
              />
            </div>

            <div className="products-filter-field">
              <Label htmlFor="materials-category-filter">Category</Label>
              <Select
                value={filters.category}
                onValueChange={(value) => updateFilter("category", value)}
              >
                <SelectTrigger id="materials-category-filter"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categoryNames.map((category) => (
                    <SelectItem key={category} value={String(category)}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="products-filter-field">
              <Label htmlFor="materials-availability-filter">Availability</Label>
              <Select
                value={filters.availability}
                onValueChange={(value) => updateFilter("availability", value)}
              >
                <SelectTrigger id="materials-availability-filter"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All availability</SelectItem>
                  <SelectItem value="in">In-stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="materials-range-filter">
              <Label htmlFor="materials-min-quantity">Quantity range</Label>
              <div>
                <Input
                  id="materials-min-quantity"
                  type="number"
                  value={filters.minQuantity}
                  placeholder="Min"
                  aria-label="Minimum quantity"
                  onChange={(event) => updateFilter("minQuantity", event.target.value)}
                />
                <span aria-hidden="true">to</span>
                <Input
                  type="number"
                  value={filters.maxQuantity}
                  placeholder="Max"
                  aria-label="Maximum quantity"
                  onChange={(event) => updateFilter("maxQuantity", event.target.value)}
                />
              </div>
            </div>

            <div className="materials-range-filter">
              <Label htmlFor="materials-min-cost">Cost range</Label>
              <div>
                <Input
                  id="materials-min-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.minCost}
                  placeholder="Min"
                  aria-label="Minimum material cost"
                  onChange={(event) => updateFilter("minCost", event.target.value)}
                />
                <span aria-hidden="true">to</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.maxCost}
                  placeholder="Max"
                  aria-label="Maximum material cost"
                  onChange={(event) => updateFilter("maxCost", event.target.value)}
                />
              </div>
            </div>

            <div className="materials-range-filter">
              <Label htmlFor="materials-min-rating">Movement rating (%)</Label>
              <div>
                <Input
                  id="materials-min-rating"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={filters.minRating}
                  placeholder="Min"
                  aria-label="Minimum movement rating"
                  onChange={(event) => updateFilter("minRating", event.target.value)}
                />
                <span aria-hidden="true">to</span>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={filters.maxRating}
                  placeholder="Max"
                  aria-label="Maximum movement rating"
                  onChange={(event) => updateFilter("maxRating", event.target.value)}
                />
              </div>
            </div>

            <div className="products-filter-field">
              <Label htmlFor="materials-sort">Sort by</Label>
              <Select value={filters.sort} onValueChange={(value) => updateFilter("sort", value)}>
                <SelectTrigger id="materials-sort">
                  <ArrowDownUp aria-hidden="true" />
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
              className="products-button products-button--neutral products-clear-button materials-clear-button"
              onClick={clearFilters}
            >
              <Eraser />
              Clear
            </Button>
          </div>

          <MaterialTable
            materials={paginatedMaterials}
            loading={materials === null}
            error={loadErrors.materials}
            isAdmin={isAdmin}
            highlightId={highlightId}
            highlightActive={highlightActive}
            onEdit={openEditDialog}
            onDelete={(material) => {
              setDeleteError("")
              setDeleteTarget(material)
            }}
            onStock={openSingleStockDialog}
          />
          <MaterialCards
            materials={paginatedMaterials}
            loading={materials === null}
            error={loadErrors.materials}
            isAdmin={isAdmin}
            highlightId={highlightId}
            highlightActive={highlightActive}
            onEdit={openEditDialog}
            onDelete={(material) => {
              setDeleteError("")
              setDeleteTarget(material)
            }}
            onStock={openSingleStockDialog}
            reduceMotion={reduceMotion}
          />

          <div className="products-catalog-footer">
            <p>
              Showing {sortedMaterials.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}-
              {Math.min(currentPage * PAGE_SIZE, sortedMaterials.length)} of {sortedMaterials.length}
            </p>
            <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </motion.section>
      </div>

      {isAdmin && (
        <MaterialFormDialog
          open={materialDialogOpen}
          onOpenChange={setMaterialDialogOpen}
          mode={materialDialogMode}
          material={selectedMaterial}
          categories={categories}
          suppliers={suppliers}
          lookupsLoading={lookupsLoading}
          lookupError={materialLookupError}
          busy={materialBusy}
          onSubmit={saveMaterial}
        />
      )}

      <SingleStockDialog
        open={Boolean(singleStockTarget)}
        onOpenChange={(nextOpen) => !nextOpen && setSingleStockTarget(null)}
        material={singleStockTarget}
        suppliers={suppliers}
        lookupsLoading={lookupsLoading}
        lookupError={lookupErrors.suppliers}
        busy={stockBusy}
        onSubmit={(payload) => stockMaterials(payload, "single")}
      />

      <BulkStockDialog
        open={bulkStockOpen}
        onOpenChange={setBulkStockOpen}
        materials={allMaterials}
        suppliers={suppliers}
        lookupsLoading={lookupsLoading}
        lookupError={lookupErrors.suppliers}
        busy={stockBusy}
        onSubmit={(payload) => stockMaterials(payload, "bulk")}
      />

      {isAdmin && (
        <RecipeDialog
          open={recipeDialogOpen}
          onOpenChange={setRecipeDialogOpen}
          products={products || []}
          onNotify={notify}
        />
      )}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deleteBusy) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent
          overlayClassName="materials-confirm-overlay"
          className="products-confirm-dialog materials-confirm-dialog"
        >
          <AlertDialogHeader>
            <span className="products-confirm-icon" aria-hidden="true"><Trash2 /></span>
            <AlertDialogTitle>Delete this material permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This hard delete removes {deleteTarget?.item_name || "the material"}, its item record,
              linked product recipes, and linked stock transaction items. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="products-button products-button--neutral">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="products-button products-button--danger"
              disabled={deleteBusy}
              onClick={(event) => {
                event.preventDefault()
                deleteMaterial()
              }}
            >
              {deleteBusy ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              {deleteBusy ? "Deleting..." : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default MaterialsApp
