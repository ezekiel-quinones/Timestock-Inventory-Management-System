import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import {
  AlertCircle,
  ArrowDownUp,
  Banknote,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Layers3,
  LoaderCircle,
  Package,
  PackageCheck,
  PackageOpen,
  PencilLine,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Wrench,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { apiRequest, getProductCategories, getProducts, getProductSummary } from "./api"
import ProductFormDialog from "./ProductFormDialog"
import ProductsNotificationCenter from "./ProductsNotificationCenter"
import RecipeDialog from "./RecipeDialog"

const PAGE_SIZE = 5
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

const summaryDefinitions = [
  {
    key: "total",
    label: "Total products",
    description: "Catalog records",
    icon: Package,
    tone: "cyan",
  },
  {
    key: "ordered",
    label: "Most ordered",
    description: "Last 30 days",
    icon: TrendingUp,
    tone: "blue",
  },
  {
    key: "revenue",
    label: "Highest revenue",
    description: "Completed orders, 30 days",
    icon: Banknote,
    tone: "gold",
  },
  {
    key: "production",
    label: "In production",
    description: "Active production orders",
    icon: Wrench,
    tone: "violet",
  },
]

const sortOptions = [
  { value: "default", label: "Default order" },
  { value: "nameAsc", label: "Name: A to Z" },
  { value: "nameDesc", label: "Name: Z to A" },
  { value: "priceAsc", label: "Price: low to high" },
  { value: "priceDesc", label: "Price: high to low" },
  { value: "dateNew", label: "Newest first" },
  { value: "dateOld", label: "Oldest first" },
]

function asNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Not available" : dateFormatter.format(date)
}

function formatDimensions(product) {
  if (product.width === null || product.width === undefined) return "Not set"
  if (product.height === null || product.height === undefined) return "Not set"
  return `${product.width} x ${product.height}`
}

function getSummaryValue(summary, key) {
  if (!summary) return { primary: "", secondary: "" }

  if (key === "total") {
    return {
      primary: numberFormatter.format(asNumber(summary.total_product_quantity)),
      secondary: "products",
    }
  }
  if (key === "ordered") {
    return {
      primary: summary.most_used_product?.item_name || "No activity",
      secondary: `${numberFormatter.format(
        asNumber(summary.most_used_product?.total_sold),
      )} units ordered`,
    }
  }
  if (key === "revenue") {
    return {
      primary: summary.highest_revenue_product?.item_name || "No revenue",
      secondary: currencyFormatter.format(
        asNumber(summary.highest_revenue_product?.revenue),
      ),
    }
  }
  return {
    primary: numberFormatter.format(asNumber(summary.in_production_count)),
    secondary: "orders",
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

function ProductStatusBadge({ status }) {
  const available = status === "Available"
  return (
    <Badge
      variant="outline"
      className={available ? "products-status products-status--available" : "products-status"}
    >
      {available ? "Available" : status || "Unavailable"}
    </Badge>
  )
}

function ProductActions({ product, onEdit, onDelete }) {
  return (
    <div className="products-row-actions">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="products-button products-button--edit"
        onClick={() => onEdit(product)}
      >
        <PencilLine />
        Edit
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="products-button products-button--danger"
        onClick={() => onDelete(product)}
      >
        <Trash2 />
        Delete
      </Button>
    </div>
  )
}

function ProductTable({ products, loading, error, isAdmin, onEdit, onDelete }) {
  return (
    <div className="products-table-wrap">
      <Table className="products-table" aria-busy={loading}>
        <caption className="sr-only">Product inventory records</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Product</TableHead>
            <TableHead scope="col">Category</TableHead>
            <TableHead scope="col">Unit price</TableHead>
            <TableHead scope="col">Materials</TableHead>
            <TableHead scope="col">Dimensions</TableHead>
            <TableHead scope="col">Date added</TableHead>
            <TableHead scope="col">Status</TableHead>
            {isAdmin && <TableHead scope="col">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody aria-live="polite">
          {loading &&
            Array.from({ length: PAGE_SIZE }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: isAdmin ? 8 : 7 }).map((__, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!loading && error && (
            <TableRow>
              <TableCell colSpan={isAdmin ? 8 : 7} className="products-table-message">
                <AlertCircle aria-hidden="true" />
                Products could not be loaded.
              </TableCell>
            </TableRow>
          )}

          {!loading && !error && products.length === 0 && (
            <TableRow>
              <TableCell colSpan={isAdmin ? 8 : 7} className="products-table-message">
                <PackageOpen aria-hidden="true" />
                No products match the selected filters.
              </TableCell>
            </TableRow>
          )}

          {!loading &&
            !error &&
            products.map((product) => (
              <TableRow key={product.product_id}>
                <TableCell>
                  <div className="products-product-cell">
                    <span className="products-product-icon" aria-hidden="true">
                      <Package />
                    </span>
                    <div>
                      <strong>{product.item_name || "Unnamed product"}</strong>
                      <span>{product.product_id}</span>
                      <p title={product.item_description || ""}>
                        {product.item_description || "No description"}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{product.item_category_name || "Uncategorized"}</TableCell>
                <TableCell className="products-money-cell">
                  {currencyFormatter.format(asNumber(product.unit_price))}
                </TableCell>
                <TableCell className="products-money-cell products-money-cell--muted">
                  {currencyFormatter.format(asNumber(product.materials_cost))}
                </TableCell>
                <TableCell>{formatDimensions(product)}</TableCell>
                <TableCell className="products-date-cell">
                  <CalendarDays aria-hidden="true" />
                  {formatDate(product.date_created)}
                </TableCell>
                <TableCell>
                  <ProductStatusBadge status={product.status} />
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <ProductActions product={product} onEdit={onEdit} onDelete={onDelete} />
                  </TableCell>
                )}
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ProductCards({ products, loading, error, isAdmin, onEdit, onDelete, reduceMotion }) {
  if (loading) {
    return (
      <div className="products-mobile-cards">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton className="h-52 w-full" key={index} />
        ))}
      </div>
    )
  }

  if (error || products.length === 0) {
    return (
      <div className="products-mobile-empty">
        {error ? <AlertCircle aria-hidden="true" /> : <PackageOpen aria-hidden="true" />}
        <p>{error ? "Products could not be loaded." : "No products match the selected filters."}</p>
      </div>
    )
  }

  return (
    <div className="products-mobile-cards">
      {products.map((product, index) => (
        <motion.article
          className="products-mobile-card"
          key={product.product_id}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22, delay: index * 0.035 }}
        >
          <div className="products-mobile-card-heading">
            <span className="products-product-icon" aria-hidden="true">
              <Package />
            </span>
            <div>
              <strong>{product.item_name || "Unnamed product"}</strong>
              <span>{product.product_id}</span>
            </div>
            <ProductStatusBadge status={product.status} />
          </div>
          <p className="products-mobile-description">
            {product.item_description || "No description"}
          </p>
          <dl className="products-mobile-details">
            <div>
              <dt>Category</dt>
              <dd>{product.item_category_name || "Uncategorized"}</dd>
            </div>
            <div>
              <dt>Unit price</dt>
              <dd>{currencyFormatter.format(asNumber(product.unit_price))}</dd>
            </div>
            <div>
              <dt>Materials</dt>
              <dd>{currencyFormatter.format(asNumber(product.materials_cost))}</dd>
            </div>
            <div>
              <dt>Dimensions</dt>
              <dd>{formatDimensions(product)}</dd>
            </div>
          </dl>
          {isAdmin && <ProductActions product={product} onEdit={onEdit} onDelete={onDelete} />}
        </motion.article>
      ))}
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
    <nav className="products-pagination" aria-label="Product pages">
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
            <span key={item} aria-hidden="true">
              ...
            </span>
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

function ProductsApp({ user }) {
  const [products, setProducts] = React.useState(null)
  const [summary, setSummary] = React.useState(null)
  const [loadErrors, setLoadErrors] = React.useState({})
  const [activeTab, setActiveTab] = React.useState("available")
  const [filters, setFilters] = React.useState({
    search: "",
    category: "all",
    minPrice: "",
    maxPrice: "",
    sort: "default",
  })
  const [pages, setPages] = React.useState({ available: 1, unavailable: 1 })
  const [categories, setCategories] = React.useState([])
  const [categoriesLoading, setCategoriesLoading] = React.useState(false)
  const [categoriesError, setCategoriesError] = React.useState("")
  const [productDialogOpen, setProductDialogOpen] = React.useState(false)
  const [productDialogMode, setProductDialogMode] = React.useState("create")
  const [selectedProduct, setSelectedProduct] = React.useState(null)
  const [productBusy, setProductBusy] = React.useState(false)
  const [recipeDialogOpen, setRecipeDialogOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState(null)
  const [deleteBusy, setDeleteBusy] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState("")
  const [feedback, setFeedback] = React.useState(null)
  const reduceMotion = useReducedMotion()
  const isAdmin = user.role === "admin"

  React.useEffect(() => {
    const controller = new AbortController()

    async function loadInitialData() {
      try {
        setProducts(await getProducts(controller.signal))
      } catch (error) {
        if (error.name !== "AbortError") {
          setProducts([])
          setLoadErrors((current) => ({ ...current, products: error.message }))
        }
      }

      if (controller.signal.aborted) return

      try {
        setSummary(await getProductSummary(controller.signal))
      } catch (error) {
        if (error.name !== "AbortError") {
          setSummary({})
          setLoadErrors((current) => ({ ...current, summary: error.message }))
        }
      }
    }

    loadInitialData()
    return () => controller.abort()
  }, [])

  React.useEffect(() => {
    if (!feedback) return undefined
    const timeout = window.setTimeout(() => setFeedback(null), 4500)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  async function refreshCatalog() {
    const nextProducts = await getProducts()
    setProducts(nextProducts)
    setSummary(await getProductSummary())
    setLoadErrors({})
  }

  async function ensureCategories() {
    if (categories.length > 0) return categories

    setCategoriesLoading(true)
    setCategoriesError("")
    try {
      const nextCategories = await getProductCategories()
      setCategories(nextCategories)
      return nextCategories
    } catch (error) {
      setCategoriesError(error.message)
      return []
    } finally {
      setCategoriesLoading(false)
    }
  }

  function notify(type, message) {
    setFeedback({ type, message })
  }

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }))
    setPages({ available: 1, unavailable: 1 })
  }

  function clearFilters() {
    setFilters({
      search: "",
      category: "all",
      minPrice: "",
      maxPrice: "",
      sort: "default",
    })
    setPages({ available: 1, unavailable: 1 })
  }

  async function openCreateDialog() {
    setProductDialogMode("create")
    setSelectedProduct(null)
    setProductDialogOpen(true)
    await ensureCategories()
  }

  async function openEditDialog(product) {
    setProductDialogMode("edit")
    setSelectedProduct(product)
    setProductDialogOpen(true)
    const nextCategories = await ensureCategories()

    if (!product.category_id) {
      const matchingCategory = nextCategories.find(
        (category) =>
          String(category.category_name).toLowerCase() ===
          String(product.item_category_name).toLowerCase(),
      )
      if (matchingCategory) {
        setSelectedProduct({ ...product, category_id: matchingCategory.id })
      }
    }
  }

  async function saveProduct(payload) {
    setProductBusy(true)
    try {
      const editing = productDialogMode === "edit"
      const result = await apiRequest(editing ? "/api/products/update" : "/api/products", {
        method: editing ? "PUT" : "POST",
        body: payload,
      })
      setProductDialogOpen(false)
      notify("success", result?.message || (editing ? "Product updated." : "Product created."))
      await refreshCatalog()
    } finally {
      setProductBusy(false)
    }
  }

  async function deleteProduct() {
    if (!deleteTarget) return
    setDeleteBusy(true)
    setDeleteError("")
    try {
      const result = await apiRequest(
        `/api/products/${encodeURIComponent(deleteTarget.product_id)}`,
        { method: "DELETE" },
      )
      if (result?.success === false) throw new Error(result.message || "Product was not found.")
      setDeleteTarget(null)
      notify("success", result?.message || "Product deleted.")
      await refreshCatalog()
    } catch (error) {
      setDeleteError(error.message)
    } finally {
      setDeleteBusy(false)
    }
  }

  const allProducts = products || []
  const availableProducts = allProducts.filter((product) => product.status === "Available")
  const unavailableProducts = allProducts.filter((product) => product.status !== "Available")
  const sourceProducts = activeTab === "available" ? availableProducts : unavailableProducts
  const query = filters.search.trim().toLowerCase()
  const minPrice = filters.minPrice === "" ? 0 : Number(filters.minPrice)
  const maxPrice = filters.maxPrice === "" ? Number.POSITIVE_INFINITY : Number(filters.maxPrice)

  const filteredProducts = sourceProducts.filter((product) => {
    const matchesSearch =
      !query ||
      Object.values(product).some((value) => String(value ?? "").toLowerCase().includes(query))
    const matchesCategory =
      filters.category === "all" || product.item_category_name === filters.category
    const price = asNumber(product.unit_price)
    const matchesPrice =
      (!Number.isFinite(minPrice) || price >= minPrice) &&
      (!Number.isFinite(maxPrice) || price <= maxPrice)
    return matchesSearch && matchesCategory && matchesPrice
  })

  const sortedProducts = [...filteredProducts]
  if (filters.sort === "nameAsc") {
    sortedProducts.sort((a, b) => String(a.item_name).localeCompare(String(b.item_name)))
  } else if (filters.sort === "nameDesc") {
    sortedProducts.sort((a, b) => String(b.item_name).localeCompare(String(a.item_name)))
  } else if (filters.sort === "priceAsc") {
    sortedProducts.sort((a, b) => asNumber(a.unit_price) - asNumber(b.unit_price))
  } else if (filters.sort === "priceDesc") {
    sortedProducts.sort((a, b) => asNumber(b.unit_price) - asNumber(a.unit_price))
  } else if (filters.sort === "dateNew") {
    sortedProducts.sort((a, b) => new Date(b.date_created) - new Date(a.date_created))
  } else if (filters.sort === "dateOld") {
    sortedProducts.sort((a, b) => new Date(a.date_created) - new Date(b.date_created))
  }

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE))
  const currentPage = Math.min(pages[activeTab], totalPages)
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )
  const categoryNames = [...new Set(allProducts.map((product) => product.item_category_name))]
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b)))
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "TimeStock user"
  const roleLabel = isAdmin ? "Administrator" : "Employee"

  return (
    <div className="products-app">
      <motion.header
        className="products-header"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.3 }}
      >
        <div className="products-header-identity">
          <span className="products-eyebrow">Catalog workspace</span>
          <h1>Products</h1>
          <p>Manage product details, pricing, availability, and material recipes.</p>
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
            <span className="products-eyebrow">Product management</span>
            <h2>Inventory catalog</h2>
            <p>Search and maintain the products used throughout TimeStock operations.</p>
          </div>
          {isAdmin && (
            <div className="products-primary-actions">
              <Button
                type="button"
                variant="outline"
                className="products-button products-button--neutral"
                onClick={() => setRecipeDialogOpen(true)}
              >
                <Layers3 />
                Product materials
              </Button>
              <Button
                type="button"
                variant="outline"
                className="products-button products-button--primary"
                onClick={openCreateDialog}
              >
                <Plus />
                Add product
              </Button>
            </div>
          )}
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
            <AlertTitle>Some product data is unavailable</AlertTitle>
            <AlertDescription>
              {loadErrors.products || loadErrors.summary}
            </AlertDescription>
          </Alert>
        )}

        <section className="products-summary-grid" aria-label="Product summary">
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
          transition={{ duration: reduceMotion ? 0 : 0.36, delay: 0.18 }}
        >
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value)
              setPages((current) => ({ ...current, [value]: 1 }))
            }}
          >
            <div className="products-catalog-heading">
              <div>
                <span className="products-eyebrow">Catalog records</span>
                <h2>Product inventory</h2>
                <p>
                  {numberFormatter.format(sortedProducts.length)} matching record
                  {sortedProducts.length === 1 ? "" : "s"}
                </p>
              </div>
              <TabsList className="products-tabs-list">
                <TabsTrigger value="available">
                  <PackageCheck />
                  Available
                  <Badge variant="secondary">{availableProducts.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="unavailable">
                  <PackageOpen />
                  Unavailable
                  <Badge variant="secondary">{unavailableProducts.length}</Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="products-filters" aria-label="Product filters">
              <div className="products-search-field">
                <Label htmlFor="products-search" className="sr-only">
                  Search products
                </Label>
                <Search aria-hidden="true" />
                <Input
                  id="products-search"
                  type="search"
                  value={filters.search}
                  placeholder="Search products, IDs, descriptions..."
                  onChange={(event) => updateFilter("search", event.target.value)}
                />
              </div>

              <div className="products-filter-field">
                <Label htmlFor="products-category-filter">Category</Label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => updateFilter("category", value)}
                >
                  <SelectTrigger id="products-category-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categoryNames.map((category) => (
                      <SelectItem key={category} value={String(category)}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="products-price-filter">
                <div className="products-filter-field">
                  <Label htmlFor="products-min-price">Minimum price</Label>
                  <Input
                    id="products-min-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={filters.minPrice}
                    placeholder="Min"
                    onChange={(event) => updateFilter("minPrice", event.target.value)}
                  />
                </div>
                <span aria-hidden="true">to</span>
                <div className="products-filter-field">
                  <Label htmlFor="products-max-price">Maximum price</Label>
                  <Input
                    id="products-max-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={filters.maxPrice}
                    placeholder="Max"
                    onChange={(event) => updateFilter("maxPrice", event.target.value)}
                  />
                </div>
              </div>

              <div className="products-filter-field">
                <Label htmlFor="products-sort">Sort by</Label>
                <Select
                  value={filters.sort}
                  onValueChange={(value) => updateFilter("sort", value)}
                >
                  <SelectTrigger id="products-sort">
                    <ArrowDownUp aria-hidden="true" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                variant="outline"
                className="products-button products-button--neutral products-clear-button"
                onClick={clearFilters}
              >
                <Eraser />
                Clear
              </Button>
            </div>

            {(["available", "unavailable"]).map((tab) => (
              <TabsContent value={tab} key={tab} className="products-tab-content">
                <ProductTable
                  products={paginatedProducts}
                  loading={products === null}
                  error={loadErrors.products}
                  isAdmin={isAdmin}
                  onEdit={openEditDialog}
                  onDelete={(product) => {
                    setDeleteError("")
                    setDeleteTarget(product)
                  }}
                />
                <ProductCards
                  products={paginatedProducts}
                  loading={products === null}
                  error={loadErrors.products}
                  isAdmin={isAdmin}
                  onEdit={openEditDialog}
                  onDelete={(product) => {
                    setDeleteError("")
                    setDeleteTarget(product)
                  }}
                  reduceMotion={reduceMotion}
                />
              </TabsContent>
            ))}

            <div className="products-catalog-footer">
              <p>
                Showing {sortedProducts.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}-
                {Math.min(currentPage * PAGE_SIZE, sortedProducts.length)} of {sortedProducts.length}
              </p>
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={(page) =>
                  setPages((current) => ({ ...current, [activeTab]: page }))
                }
              />
            </div>
          </Tabs>
        </motion.section>
      </div>

      {isAdmin && (
        <>
          <ProductFormDialog
            open={productDialogOpen}
            onOpenChange={setProductDialogOpen}
            mode={productDialogMode}
            product={selectedProduct}
            categories={categories}
            categoriesLoading={categoriesLoading}
            categoriesError={categoriesError}
            busy={productBusy}
            onSubmit={saveProduct}
          />
          <RecipeDialog
            open={recipeDialogOpen}
            onOpenChange={setRecipeDialogOpen}
            products={allProducts}
            onNotify={notify}
          />
        </>
      )}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deleteBusy) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent
          overlayClassName="products-confirm-overlay"
          className="products-confirm-dialog"
        >
          <AlertDialogHeader>
            <span className="products-confirm-icon" aria-hidden="true">
              <Trash2 />
            </span>
            <AlertDialogTitle>Delete this product permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This hard delete removes the product, its material recipe, and linked order-item
              records. Use the Unavailable status instead if the product may be needed for history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="products-button products-button--neutral">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="products-button products-button--danger"
              disabled={deleteBusy}
              onClick={(event) => {
                event.preventDefault()
                deleteProduct()
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

export default ProductsApp
