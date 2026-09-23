import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Eraser,
  FileText,
  Layers3,
  LoaderCircle,
  Package,
  PackageOpen,
  PanelsTopLeft,
  Plus,
  ReceiptText,
  RefreshCcw,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
  WalletCards,
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
import { Textarea } from "@/components/ui/textarea"

import ProductsNotificationCenter from "../products/ProductsNotificationCenter"
import {
  createMaterial,
  getMaterials,
  getOrderStatuses,
  getProductQuote,
  getProducts,
  placeOrder,
  stockMaterials,
} from "./api"
import QuotationDialog from "./QuotationDialog"
import ReceiptDialog from "./ReceiptDialog"

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const numberFormatter = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 })

function asNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function createCartId() {
  const suffix = window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 11)
  return `CART-${suffix}`
}

function isGlassMaterial(name) {
  return /glass\s*\d+x\d+/i.test(String(name || ""))
}

function getGlassDimensions(name) {
  const match = String(name || "").match(/glass\s*(\d+)x(\d+)/i)
  if (!match) return null
  return { width: Number(match[1]), height: Number(match[2]) }
}

function getEligibleGlass(materialName, glassMaterials) {
  const required = getGlassDimensions(materialName)
  if (!required) return []

  return glassMaterials.filter((glass) => {
    const dimensions = getGlassDimensions(glass.item_name)
    return (
      dimensions &&
      dimensions.width >= required.width &&
      dimensions.height >= required.height &&
      asNumber(glass.current_stock) > 0
    )
  })
}

function getDefaultGlassId(materialName, glassMaterials) {
  const required = getGlassDimensions(materialName)
  const eligible = getEligibleGlass(materialName, glassMaterials)
  if (!required || eligible.length === 0) return ""

  const exact = eligible.find((glass) => {
    const dimensions = getGlassDimensions(glass.item_name)
    return dimensions?.width === required.width && dimensions?.height === required.height
  })
  return String((exact || eligible[0]).material_id)
}

function normalizeQuoteMaterial(material, glassMaterials) {
  const usedQuantity = Number.parseFloat(material.used_quantity ?? 0)
  let unitCost = Number.parseFloat(material.unit_cost)

  if (!Number.isFinite(unitCost) && material.line_cost && usedQuantity > 0) {
    unitCost = Number.parseFloat(material.line_cost) / usedQuantity
  }
  if (!Number.isFinite(unitCost)) unitCost = 0

  const normalized = {
    ...material,
    used_quantity: Number.isFinite(usedQuantity) ? usedQuantity : 0,
    unit_cost: unitCost,
    line_cost: (Number.isFinite(usedQuantity) ? usedQuantity : 0) * unitCost,
    required_material_name: material.item_name,
  }

  if (isGlassMaterial(material.item_name)) {
    const selectedGlassId = getDefaultGlassId(material.item_name, glassMaterials)
    if (selectedGlassId) normalized.selected_glass_id = selectedGlassId
  }

  return normalized
}

function calculateTotals(cart) {
  return cart.reduce(
    (totals, item) => {
      const feePercent = asNumber(item.misc_fee)
      const adjustedUnitPrice = asNumber(item.unit_price) * (1 + feePercent / 100)
      totals.product += adjustedUnitPrice * asNumber(item.quantity)
      totals.material += item.materials.reduce(
        (sum, material) => sum + asNumber(material.line_cost) * asNumber(item.quantity),
        0,
      )
      totals.units += asNumber(item.quantity)
      return totals
    },
    { product: 0, material: 0, units: 0 },
  )
}

function computeGlassLeftover(requiredName, selectedName) {
  const required = String(requiredName || "").match(/(\d+)x(\d+)$/i)
  const selected = String(selectedName || "").match(/(\d+)x(\d+)$/i)
  if (!required || !selected) return null

  const requiredWidth = Number(required[1])
  const requiredHeight = Number(required[2])
  const selectedWidth = Number(selected[1])
  const selectedHeight = Number(selected[2])

  if (selectedWidth < requiredWidth || selectedHeight < requiredHeight) return null
  const leftoverHeight = selectedHeight - requiredHeight
  if (leftoverHeight <= 0) return null

  const prefix = selectedName.replace(/\d+x\d+$/i, "").trim()
  const name = `${prefix} ${requiredWidth}x${leftoverHeight}`
  return name.replace(/^./, (character) => character.toUpperCase())
}

function collectLeftovers(cart, glassMaterials) {
  const aggregated = new Map()

  cart.forEach((item) => {
    item.materials.forEach((material) => {
      if (!material.selected_glass_id) return
      const selected = glassMaterials.find(
        (glass) => String(glass.material_id) === String(material.selected_glass_id),
      )
      if (!selected) return

      const name = computeGlassLeftover(material.required_material_name, selected.item_name)
      const quantity = asNumber(item.quantity) * asNumber(material.used_quantity)
      if (!name || quantity === 0) return

      const key = name.toLowerCase()
      const current = aggregated.get(key)
      aggregated.set(key, {
        name,
        quantity: (current?.quantity || 0) + quantity,
      })
    })
  })

  return [...aggregated.values()]
}

function SummaryCard({ label, description, value, icon: Icon, tone, index, reduceMotion }) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.3, delay: index * 0.05 }}
    >
      <Card className="products-summary-card orders-summary-card" data-tone={tone}>
        <CardContent className="products-summary-content">
          <div className="products-summary-heading">
            <div>
              <p>{label}</p>
              <small>{description}</small>
            </div>
            <span className="products-summary-icon" aria-hidden="true"><Icon /></span>
          </div>
          <div className="products-summary-value">
            <strong title={value}>{value}</strong>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function ProductCatalog({
  products,
  loading,
  error,
  search,
  onSearchChange,
  quickSelect,
  onQuickSelect,
  addingProductId,
  onAdd,
  selectedProduct,
  selectedQuote,
  quoteLoading,
  quoteError,
}) {
  const deferredSearch = React.useDeferredValue(search)
  const query = deferredSearch.trim().toLowerCase()
  const filteredProducts = products.filter((product) =>
    !query ||
    [product.product_id, product.item_name, product.item_description].some((value) =>
      String(value || "").toLowerCase().includes(query),
    ),
  )

  return (
    <section className="orders-panel orders-catalog-panel">
      <div className="orders-panel-heading">
        <div>
          <span className="products-eyebrow">Available catalog</span>
          <h2>Select products</h2>
          <p>{filteredProducts.length} available product{filteredProducts.length === 1 ? "" : "s"}</p>
        </div>
        <span className="orders-panel-icon" aria-hidden="true"><Package /></span>
      </div>

      <div className="orders-catalog-tools">
        <div className="products-search-field orders-search-field">
          <Label htmlFor="orders-product-search" className="sr-only">Search available products</Label>
          <Search aria-hidden="true" />
          <Input
            id="orders-product-search"
            type="search"
            value={search}
            placeholder="Search products or IDs..."
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <div className="products-filter-field orders-quick-select">
          <Label htmlFor="orders-quick-select">Quick select</Label>
          <Select value={quickSelect} onValueChange={onQuickSelect} disabled={loading || Boolean(error)}>
            <SelectTrigger id="orders-quick-select">
              <SelectValue placeholder="Choose a product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.product_id} value={String(product.product_id)}>
                  {product.item_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="orders-product-list" aria-live="polite" aria-busy={loading}>
        {loading && Array.from({ length: 5 }).map((_, index) => (
          <Skeleton className="h-[4.35rem] w-full" key={index} />
        ))}
        {!loading && error && (
          <div className="orders-inline-empty orders-inline-empty--error">
            <AlertCircle aria-hidden="true" />
            <p>Products could not be loaded.</p>
          </div>
        )}
        {!loading && !error && filteredProducts.length === 0 && (
          <div className="orders-inline-empty">
            <PackageOpen aria-hidden="true" />
            <p>No available products match this search.</p>
          </div>
        )}
        {!loading && !error && filteredProducts.map((product) => (
          <button
            type="button"
            className="orders-product-row"
            key={product.product_id}
            disabled={addingProductId === product.product_id}
            onClick={() => onAdd(product)}
          >
            <span className="products-product-icon" aria-hidden="true"><Package /></span>
            <span className="orders-product-copy">
              <strong>{product.item_name || "Unnamed product"}</strong>
              <small>{product.product_id}</small>
            </span>
            <span className="orders-product-price">
              <strong>{currencyFormatter.format(asNumber(product.unit_price))}</strong>
              <small>unit price</small>
            </span>
            <span className="orders-add-product" aria-hidden="true">
              {addingProductId === product.product_id ? <LoaderCircle className="animate-spin" /> : <Plus />}
            </span>
          </button>
        ))}
      </div>

      <div className="orders-quote-preview">
        <div className="orders-subheading">
          <div>
            <span className="products-eyebrow">Recipe drill-down</span>
            <h3>Material quotation</h3>
          </div>
          {selectedProduct && <Badge variant="secondary">{selectedProduct.product_id}</Badge>}
        </div>

        {!selectedProduct && (
          <div className="orders-preview-placeholder">
            <Layers3 aria-hidden="true" />
            <strong>Select a product</strong>
            <p>Its material recipe and backend quotation cost will appear here.</p>
          </div>
        )}
        {selectedProduct && quoteLoading && (
          <div className="orders-quote-skeleton">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}
        {selectedProduct && !quoteLoading && quoteError && (
          <div className="orders-inline-empty orders-inline-empty--error">
            <AlertCircle aria-hidden="true" />
            <p>{quoteError}</p>
          </div>
        )}
        {selectedProduct && !quoteLoading && !quoteError && selectedQuote && (
          <>
            <div className="orders-selected-product">
              <div>
                <strong>{selectedProduct.item_name}</strong>
                <span>Configured recipe</span>
              </div>
              <div>
                <small>Quotation cost</small>
                <strong>{currencyFormatter.format(asNumber(selectedQuote.total_cost))}</strong>
              </div>
            </div>
            <div className="orders-recipe-list">
              {selectedQuote.materials.length === 0 ? (
                <p className="orders-recipe-empty">No materials are configured for this product.</p>
              ) : selectedQuote.materials.map((material, index) => (
                <div className="orders-recipe-row" key={`${material.material_id}-${index}`}>
                  <div>
                    <strong>{material.item_name}</strong>
                    <small>{material.material_id}</small>
                  </div>
                  <span>
                    <small>Used</small>
                    <b>{numberFormatter.format(asNumber(material.used_quantity))} {material.unit_measurement}</b>
                  </span>
                  <span>
                    <small>Unit cost</small>
                    <b>{currencyFormatter.format(asNumber(material.unit_cost))}</b>
                  </span>
                  <span>
                    <small>Line cost</small>
                    <b>{currencyFormatter.format(asNumber(material.line_cost))}</b>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function CartPanel({
  cart,
  glassMaterials,
  totals,
  onClear,
  onDuplicate,
  onRemove,
  onUpdateItem,
  onUpdateMaterial,
  onSelectGlass,
  reduceMotion,
}) {
  return (
    <section className="orders-panel orders-cart-panel">
      <div className="orders-panel-heading orders-cart-heading">
        <div>
          <span className="products-eyebrow">Current order</span>
          <h2>Order cart</h2>
          <p aria-live="polite">{cart.length} line{cart.length === 1 ? "" : "s"}, {numberFormatter.format(totals.units)} units</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="products-button products-button--danger"
          disabled={cart.length === 0}
          onClick={onClear}
        >
          <Eraser />
          Clear cart
        </Button>
      </div>

      {cart.length === 0 ? (
        <div className="orders-cart-empty">
          <span aria-hidden="true"><ShoppingCart /></span>
          <strong>Your cart is ready</strong>
          <p>Select a product from the catalog to start building an order.</p>
        </div>
      ) : (
        <div className="orders-cart-list" aria-live="polite">
          <AnimatePresence initial={false}>
            {cart.map((item, index) => {
              const adjustedUnitPrice = asNumber(item.unit_price) * (1 + asNumber(item.misc_fee) / 100)
              const lineTotal = adjustedUnitPrice * asNumber(item.quantity)

              return (
                <motion.article
                  className="orders-cart-item"
                  key={item.cart_id}
                  initial={reduceMotion ? false : { opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: reduceMotion ? 0 : 0.2 }}
                >
                  <div className="orders-cart-item-heading">
                    <span className="orders-line-number" aria-hidden="true">{index + 1}</span>
                    <div>
                      <strong>{item.item_name}</strong>
                      <span>{item.product_id}</span>
                    </div>
                    <div className="orders-cart-actions">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="products-button products-button--neutral"
                        aria-label={`Duplicate ${item.item_name}`}
                        onClick={() => onDuplicate(item.cart_id)}
                      >
                        <Copy />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="products-button products-button--danger"
                        aria-label={`Remove ${item.item_name}`}
                        onClick={() => onRemove(item.cart_id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>

                  <div className="orders-price-grid">
                    <div className="products-field">
                      <Label htmlFor={`${item.cart_id}-price`}>Unit price</Label>
                      <Input
                        id={`${item.cart_id}-price`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        aria-label={`${item.item_name} unit price`}
                        onChange={(event) => onUpdateItem(item.cart_id, "unit_price", event.target.value)}
                      />
                    </div>
                    <div className="products-field">
                      <Label htmlFor={`${item.cart_id}-fee`}>Misc. fee (%)</Label>
                      <Input
                        id={`${item.cart_id}-fee`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.misc_fee}
                        aria-label={`${item.item_name} miscellaneous fee percentage`}
                        onChange={(event) => onUpdateItem(item.cart_id, "misc_fee", event.target.value)}
                      />
                    </div>
                    <div className="products-field">
                      <Label htmlFor={`${item.cart_id}-quantity`}>Quantity</Label>
                      <Input
                        id={`${item.cart_id}-quantity`}
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        aria-label={`${item.item_name} quantity`}
                        onChange={(event) => onUpdateItem(item.cart_id, "quantity", event.target.value)}
                      />
                    </div>
                    <div className="orders-line-total">
                      <span>Product total</span>
                      <strong>{currencyFormatter.format(lineTotal)}</strong>
                    </div>
                  </div>

                  <details className="orders-material-details" open>
                    <summary>
                      <span><Layers3 aria-hidden="true" /> Material usage</span>
                      <Badge variant="secondary">{item.materials.length}</Badge>
                    </summary>
                    <div className="orders-cart-materials">
                      {item.materials.length === 0 && (
                        <p className="orders-recipe-empty">No material recipe is configured.</p>
                      )}
                      {item.materials.map((material, materialIndex) => {
                        const glassOptions = getEligibleGlass(material.item_name, glassMaterials)
                        const glass = isGlassMaterial(material.item_name)

                        return (
                          <div className="orders-cart-material-row" key={`${material.material_id}-${materialIndex}`}>
                            <div className="orders-cart-material-name">
                              <strong>{material.item_name}</strong>
                              <small>{material.material_id}</small>
                              {glass && (
                                <div className="orders-glass-picker">
                                  <Label htmlFor={`${item.cart_id}-${materialIndex}-glass`}>
                                    Stock glass
                                  </Label>
                                  <select
                                    id={`${item.cart_id}-${materialIndex}-glass`}
                                    value={material.selected_glass_id || ""}
                                    disabled={glassOptions.length === 0}
                                    aria-label={`Stock glass for ${material.item_name}`}
                                    onChange={(event) =>
                                      onSelectGlass(item.cart_id, materialIndex, event.target.value)
                                    }
                                  >
                                    {glassOptions.length === 0 && <option value="">No compatible glass</option>}
                                    {glassOptions.map((option) => (
                                      <option key={option.material_id} value={option.material_id}>
                                        {option.item_name} (Stock: {numberFormatter.format(asNumber(option.current_stock))})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                            <div className="products-field orders-used-quantity">
                              <Label htmlFor={`${item.cart_id}-${materialIndex}-used`}>Used qty</Label>
                              <div>
                                <Input
                                  id={`${item.cart_id}-${materialIndex}-used`}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={material.used_quantity}
                                  aria-label={`${material.item_name} used quantity in ${material.unit_measurement}`}
                                  onChange={(event) =>
                                    onUpdateMaterial(item.cart_id, materialIndex, event.target.value)
                                  }
                                />
                                <span>{material.unit_measurement}</span>
                              </div>
                            </div>
                            <div className="orders-material-cost">
                              <span>Unit cost</span>
                              <strong>{currencyFormatter.format(asNumber(material.unit_cost))}</strong>
                            </div>
                            <div className="orders-material-cost">
                              <span>Line cost</span>
                              <strong>{currencyFormatter.format(asNumber(material.line_cost))}</strong>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </details>
                </motion.article>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <div className="orders-totals">
        <div>
          <span>Product total</span>
          <small>Includes miscellaneous fees</small>
          <strong>{currencyFormatter.format(totals.product)}</strong>
        </div>
        <div>
          <span>Material quotation</span>
          <small>Recipe usage across quantities</small>
          <strong>{currencyFormatter.format(totals.material)}</strong>
        </div>
      </div>
    </section>
  )
}

function CustomerPanel({
  customer,
  statuses,
  statusesLoading,
  statusError,
  errors,
  fieldRefs,
  receiptButtonRef,
  quotationButtonRef,
  placeOrderButtonRef,
  isAdmin,
  orderBusy,
  cartEmpty,
  onChange,
  onReceipt,
  onQuotation,
  onPlaceOrder,
}) {
  const fields = [
    ["firstname", "First name", "Maria", "text"],
    ["lastname", "Last name", "Santos", "text"],
    ["contact_number", "Contact number", "10 to 11 digits", "tel"],
    ["email", "Email", "customer@example.com", "email"],
  ]

  return (
    <section className="orders-panel orders-customer-panel">
      <div className="orders-panel-heading">
        <div>
          <span className="products-eyebrow">Customer & fulfillment</span>
          <h2>Customer details</h2>
          <p>Used for order creation and customer-facing documents</p>
        </div>
        <span className="orders-panel-icon" aria-hidden="true"><UserRound /></span>
      </div>

      {!isAdmin && (
        <Alert className="orders-role-alert">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Order placement is restricted</AlertTitle>
          <AlertDescription>
            Employee sessions can prepare receipts and quotations, but only administrators can place orders.
          </AlertDescription>
        </Alert>
      )}

      <div className="orders-customer-grid">
        {fields.map(([field, label, placeholder, type]) => (
          <div className="products-field" key={field}>
            <Label htmlFor={`orders-${field}`}>{label}</Label>
            <Input
              ref={(element) => { fieldRefs.current[field] = element }}
              id={`orders-${field}`}
              type={type}
              value={customer[field]}
              placeholder={placeholder}
              aria-required="true"
              aria-invalid={Boolean(errors[field])}
              aria-describedby={errors[field] ? `orders-${field}-error` : undefined}
              onChange={(event) => onChange(field, event.target.value)}
            />
            {errors[field] && <span className="products-field-error" id={`orders-${field}-error`}>{errors[field]}</span>}
          </div>
        ))}

        <div className="products-field products-field--full">
          <Label htmlFor="orders-address">Address</Label>
          <Textarea
            ref={(element) => { fieldRefs.current.address = element }}
            id="orders-address"
            value={customer.address}
            placeholder="Complete customer address"
            aria-required="true"
            aria-invalid={Boolean(errors.address)}
            aria-describedby={errors.address ? "orders-address-error" : undefined}
            onChange={(event) => onChange("address", event.target.value)}
          />
          {errors.address && <span className="products-field-error" id="orders-address-error">{errors.address}</span>}
        </div>

        <div className="products-field products-field--full">
          <Label htmlFor="orders-status">Order status</Label>
          <Select
            value={customer.status_id || undefined}
            disabled={statusesLoading || Boolean(statusError)}
            onValueChange={(value) => onChange("status_id", value)}
          >
            <SelectTrigger
              ref={(element) => { fieldRefs.current.status_id = element }}
              id="orders-status"
              aria-invalid={Boolean(errors.status_id)}
              aria-required="true"
              aria-describedby={errors.status_id ? "orders-status-error" : undefined}
            >
              <SelectValue placeholder={statusesLoading ? "Loading statuses..." : "Select an order status"} />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.id} value={String(status.id)}>
                  {status.status_code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.status_id && <span className="products-field-error" id="orders-status-error">{errors.status_id}</span>}
          {statusError && <span className="products-field-error">{statusError}</span>}
        </div>
      </div>

      <div className="orders-customer-actions">
        <div>
          <Button
            ref={receiptButtonRef}
            type="button"
            variant="outline"
            className="products-button products-button--neutral"
            onClick={onReceipt}
          >
            <ReceiptText />
            Receipt
          </Button>
          <Button
            ref={quotationButtonRef}
            type="button"
            variant="outline"
            className="products-button products-button--neutral"
            onClick={onQuotation}
          >
            <FileText />
            Quotation
          </Button>
        </div>
        <Button
          ref={placeOrderButtonRef}
          type="button"
          variant="outline"
          className="products-button products-button--primary orders-place-order"
          disabled={!isAdmin || orderBusy || cartEmpty || Boolean(statusError)}
          onClick={onPlaceOrder}
        >
          {orderBusy ? <LoaderCircle className="animate-spin" /> : <ClipboardCheck />}
          {orderBusy ? "Placing order..." : "Review & place order"}
        </Button>
      </div>
    </section>
  )
}

function OrdersApp({ user }) {
  const [products, setProducts] = React.useState(null)
  const [materials, setMaterials] = React.useState(null)
  const [statuses, setStatuses] = React.useState(null)
  const [loadErrors, setLoadErrors] = React.useState({})
  const [productSearch, setProductSearch] = React.useState("")
  const [quickSelect, setQuickSelect] = React.useState("")
  const [addingProductId, setAddingProductId] = React.useState("")
  const [selectedProduct, setSelectedProduct] = React.useState(null)
  const [selectedQuote, setSelectedQuote] = React.useState(null)
  const [quoteLoading, setQuoteLoading] = React.useState(false)
  const [quoteError, setQuoteError] = React.useState("")
  const [cart, setCart] = React.useState([])
  const [customer, setCustomer] = React.useState({
    firstname: "",
    lastname: "",
    contact_number: "",
    email: "",
    address: "",
    status_id: "",
  })
  const [customerErrors, setCustomerErrors] = React.useState({})
  const [feedback, setFeedback] = React.useState(null)
  const [receiptOpen, setReceiptOpen] = React.useState(false)
  const [quotationOpen, setQuotationOpen] = React.useState(false)
  const [confirmOrderOpen, setConfirmOrderOpen] = React.useState(false)
  const [orderBusy, setOrderBusy] = React.useState(false)
  const [orderError, setOrderError] = React.useState("")
  const [documentVersion, setDocumentVersion] = React.useState(0)
  const fieldRefs = React.useRef({})
  const receiptButtonRef = React.useRef(null)
  const quotationButtonRef = React.useRef(null)
  const placeOrderButtonRef = React.useRef(null)
  const reduceMotion = useReducedMotion()
  const isAdmin = user.role === "admin"

  async function loadInitialData(signal) {
    const [productsResult, materialsResult, statusesResult] = await Promise.allSettled([
      getProducts(signal),
      getMaterials(signal),
      getOrderStatuses(signal),
    ])
    const errors = {}

    if (productsResult.status === "fulfilled") setProducts(productsResult.value)
    else if (productsResult.reason?.name !== "AbortError") {
      setProducts([])
      errors.products = productsResult.reason?.message || "Products could not be loaded."
    }

    if (materialsResult.status === "fulfilled") setMaterials(materialsResult.value)
    else if (materialsResult.reason?.name !== "AbortError") {
      setMaterials([])
      errors.materials = materialsResult.reason?.message || "Materials could not be loaded."
    }

    if (statusesResult.status === "fulfilled") {
      setStatuses(statusesResult.value)
      const defaultStatus =
        statusesResult.value.find((status) => status.id === "OS00004") || statusesResult.value[0]
      setCustomer((current) => ({
        ...current,
        status_id: current.status_id || String(defaultStatus?.id || ""),
      }))
    } else if (statusesResult.reason?.name !== "AbortError") {
      setStatuses([])
      errors.statuses = statusesResult.reason?.message || "Order statuses could not be loaded."
    }

    setLoadErrors(errors)
  }

  React.useEffect(() => {
    const controller = new AbortController()
    loadInitialData(controller.signal)
    return () => controller.abort()
  }, [])

  React.useEffect(() => {
    if (!feedback) return undefined
    const timeout = window.setTimeout(() => setFeedback(null), 5000)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  function notify(type, message) {
    setFeedback({ type, message })
  }

  function invalidateDocuments() {
    setDocumentVersion((current) => current + 1)
  }

  function changeCart(updater) {
    setCart(updater)
    invalidateDocuments()
  }

  const availableProducts = (products || []).filter((product) => product.status === "Available")
  const glassMaterials = (materials || []).filter((material) => isGlassMaterial(material.item_name))
  const totals = calculateTotals(cart)
  const leftovers = collectLeftovers(cart, glassMaterials)

  async function addProduct(product) {
    setAddingProductId(product.product_id)
    setSelectedProduct(product)
    setSelectedQuote(null)
    setQuoteError("")
    setQuoteLoading(true)

    try {
      const quote = await getProductQuote(product.product_id)
      const normalizedMaterials = quote.materials.map((material) =>
        normalizeQuoteMaterial(material, glassMaterials),
      )
      setSelectedQuote({ ...quote, materials: normalizedMaterials })

      changeCart((current) => {
        const existingIndex = current.findIndex((item) => item.product_id === product.product_id)
        if (existingIndex >= 0) {
          return current.map((item, index) =>
            index === existingIndex ? { ...item, quantity: item.quantity + 1 } : item,
          )
        }

        return [
          ...current,
          {
            cart_id: createCartId(),
            product_id: product.product_id,
            item_name: product.item_name,
            unit_price: asNumber(product.unit_price),
            misc_fee: 0,
            quantity: 1,
            materials: normalizedMaterials,
            material_total: asNumber(quote.total_cost),
          },
        ]
      })
      notify("success", `${product.item_name} added to the order cart.`)
    } catch (error) {
      setQuoteError(error.message)
      notify("error", error.message)
    } finally {
      setQuoteLoading(false)
      setAddingProductId("")
      setQuickSelect("")
    }
  }

  function handleQuickSelect(productId) {
    setQuickSelect(productId)
    const product = availableProducts.find((item) => String(item.product_id) === String(productId))
    if (product) addProduct(product)
  }

  function clearCart() {
    changeCart(() => [])
    setSelectedProduct(null)
    setSelectedQuote(null)
    setQuoteError("")
    setQuickSelect("")
  }

  function duplicateCartItem(cartId) {
    changeCart((current) => {
      const item = current.find((entry) => entry.cart_id === cartId)
      if (!item) return current
      return [
        ...current,
        {
          ...item,
          cart_id: createCartId(),
          materials: item.materials.map((material) => ({ ...material })),
        },
      ]
    })
  }

  function removeCartItem(cartId) {
    changeCart((current) => current.filter((item) => item.cart_id !== cartId))
  }

  function updateCartItem(cartId, field, rawValue) {
    changeCart((current) =>
      current.map((item) => {
        if (item.cart_id !== cartId) return item

        if (field === "unit_price") {
          const value = Number.parseFloat(rawValue)
          return Number.isFinite(value) ? { ...item, unit_price: Math.max(0, value) } : item
        }
        if (field === "misc_fee") {
          const value = Number.parseFloat(rawValue)
          return { ...item, misc_fee: Number.isFinite(value) ? Math.max(0, value) : 0 }
        }
        const quantity = Math.max(1, Number.parseInt(rawValue, 10) || 1)
        return { ...item, quantity }
      }),
    )
  }

  function updateMaterialQuantity(cartId, materialIndex, rawValue) {
    const usedQuantity = Math.max(0, Number.parseFloat(rawValue) || 0)
    changeCart((current) =>
      current.map((item) => {
        if (item.cart_id !== cartId) return item
        return {
          ...item,
          materials: item.materials.map((material, index) =>
            index === materialIndex
              ? {
                  ...material,
                  used_quantity: usedQuantity,
                  line_cost: asNumber(material.unit_cost) * usedQuantity,
                }
              : material,
          ),
        }
      }),
    )
  }

  function selectGlass(cartId, materialIndex, materialId) {
    changeCart((current) =>
      current.map((item) => {
        if (item.cart_id !== cartId) return item
        return {
          ...item,
          materials: item.materials.map((material, index) =>
            index === materialIndex ? { ...material, selected_glass_id: materialId } : material,
          ),
        }
      }),
    )
  }

  function updateCustomer(field, value) {
    setCustomer((current) => ({ ...current, [field]: value }))
    setCustomerErrors((current) => {
      const next = { ...current }
      delete next[field]
      return next
    })
    invalidateDocuments()
  }

  function validateOrder() {
    const checks = [
      ["firstname", !customer.firstname.trim(), "Enter the customer's first name."],
      ["lastname", !customer.lastname.trim(), "Enter the customer's last name."],
      ["contact_number", !customer.contact_number.trim(), "Enter the customer's contact number."],
      ["email", !customer.email.trim(), "Enter the customer's email."],
      ["address", !customer.address.trim(), "Enter the customer's address."],
      ["status_id", !customer.status_id, "Select an order status."],
      ["firstname", !/^[A-Za-z\s]+$/.test(customer.firstname.trim()), "First name should only contain letters."],
      ["lastname", !/^[A-Za-z\s]+$/.test(customer.lastname.trim()), "Last name should only contain letters."],
      ["contact_number", !/^[0-9]{10,11}$/.test(customer.contact_number.trim()), "Contact number must be 10 to 11 digits."],
      ["email", !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim()), "Enter a valid email address."],
      ["address", customer.address.trim().length < 5, "Address must contain at least five characters."],
    ]
    const failed = checks.find(([, invalid]) => invalid)

    if (cart.length === 0) {
      notify("error", "Add at least one product before placing an order.")
      return false
    }
    const invalidPricing = cart.some(
      (item) =>
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        !Number.isFinite(item.unit_price) ||
        item.unit_price < 0 ||
        !Number.isFinite(item.misc_fee) ||
        item.misc_fee < 0 ||
        item.materials.some(
          (material) =>
            !Number.isFinite(material.used_quantity) || material.used_quantity < 0,
        ),
    )
    if (invalidPricing) {
      notify("error", "Cart prices and material quantities must be valid non-negative values.")
      return false
    }
    if (!failed) {
      setCustomerErrors({})
      return true
    }

    const [field, , message] = failed
    setCustomerErrors({ [field]: message })
    notify("error", message)
    window.requestAnimationFrame(() => fieldRefs.current[field]?.focus())
    return false
  }

  function reviewOrder() {
    if (!isAdmin) {
      notify("error", "Administrator access is required to place an order.")
      return
    }
    if (validateOrder()) {
      setFeedback(null)
      setOrderError("")
      setConfirmOrderOpen(true)
    }
  }

  function openReceiptDialog() {
    setFeedback(null)
    setReceiptOpen(true)
  }

  function openQuotationDialog() {
    setFeedback(null)
    setQuotationOpen(true)
  }

  async function processLeftovers(entries) {
    const failures = []

    for (const leftover of entries) {
      const existing = glassMaterials.find(
        (material) =>
          String(material.item_name || "").toLowerCase() === leftover.name.toLowerCase(),
      )

      try {
        if (existing) {
          await stockMaterials({
            stock_type_id: "STT00001",
            items: [{ material_id: String(existing.material_id), quantity: leftover.quantity }],
          })
        } else {
          await createMaterial({
            item_name: leftover.name,
            item_description: "Auto-generated leftover glass",
            supplier_id: "SUPL00001",
            category_id: "MCAT00001",
            unit_measurement: "pcs",
            material_cost: 0,
            current_stock: leftover.quantity,
            minimum_stock: 10,
            maximum_stock: 100,
          })
        }
      } catch (error) {
        failures.push(`${leftover.name}: ${error.message}`)
      }
    }

    return failures
  }

  async function submitOrder() {
    setOrderError("")
    setOrderBusy(true)

    try {
      const payload = {
        customer: {
          firstname: customer.firstname.trim(),
          lastname: customer.lastname.trim(),
          contact_number: customer.contact_number.trim(),
          email: customer.email.trim(),
          address: customer.address.trim(),
        },
        status_id: customer.status_id,
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          misc_fee: item.misc_fee,
          materials: item.materials.map((material) => ({
            original_material_id: material.material_id,
            used_quantity: material.used_quantity,
            ...(material.selected_glass_id
              ? { selected_glass_id: material.selected_glass_id }
              : {}),
          })),
        })),
      }

      const result = await placeOrder(payload)
      const leftoverFailures = await processLeftovers(leftovers)
      setConfirmOrderOpen(false)
      setCart([])
      setSelectedProduct(null)
      setSelectedQuote(null)
      setReceiptOpen(false)
      setQuotationOpen(false)
      invalidateDocuments()

      const defaultStatus =
        (statuses || []).find((status) => status.id === "OS00004") || (statuses || [])[0]
      setCustomer({
        firstname: "",
        lastname: "",
        contact_number: "",
        email: "",
        address: "",
        status_id: String(defaultStatus?.id || ""),
      })

      try {
        setMaterials(await getMaterials())
      } catch {
        // The committed order remains successful even if the local inventory refresh fails.
      }

      if (leftoverFailures.length > 0) {
        notify(
          "warning",
          `${result?.message || "Order successfully placed."} Some leftovers could not be recorded: ${leftoverFailures.join(" ")}`,
        )
      } else {
        notify("success", result?.message || "Order successfully placed.")
      }
    } catch (error) {
      setOrderError(error.message)
    } finally {
      setOrderBusy(false)
    }
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "TimeStock user"
  const roleLabel = isAdmin ? "Administrator" : "Employee"
  const summaryCards = [
    { label: "Cart lines", description: "Distinct order entries", value: numberFormatter.format(cart.length), icon: ShoppingCart, tone: "cyan" },
    { label: "Ordered units", description: "Across all cart lines", value: numberFormatter.format(totals.units), icon: Boxes, tone: "blue" },
    { label: "Product total", description: "Including misc. fees", value: currencyFormatter.format(totals.product), icon: WalletCards, tone: "gold" },
    { label: "Material quote", description: "Recipe costing reference", value: currencyFormatter.format(totals.material), icon: PanelsTopLeft, tone: "violet" },
  ]

  return (
    <div className="products-app orders-app">
      <motion.header
        className="products-header"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.3 }}
      >
        <div className="products-header-identity">
          <span className="products-eyebrow">Sales workspace</span>
          <h1>Orders & quotes</h1>
          <p>Build priced orders, customer receipts, and detailed quotations.</p>
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

      <div className="products-content orders-content">
        <section className="products-page-intro orders-page-intro">
          <div>
            <span className="products-eyebrow">Order builder</span>
            <h2>From catalog to customer document</h2>
            <p>Select products, tune pricing and material usage, then complete the customer workflow.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="products-button products-button--danger"
            disabled={cart.length === 0}
            onClick={clearCart}
          >
            <Eraser />
            Clear quote & cart
          </Button>
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
              <Alert
                variant={feedback.type === "success" ? "success" : feedback.type === "error" ? "destructive" : "default"}
                className={feedback.type === "warning" ? "orders-warning-feedback" : undefined}
              >
                {feedback.type === "success" ? <CheckCircle2 aria-hidden="true" /> : <AlertCircle aria-hidden="true" />}
                <AlertTitle>
                  {feedback.type === "success" ? "Completed" : feedback.type === "warning" ? "Completed with a warning" : "Action failed"}
                </AlertTitle>
                <AlertDescription>{feedback.message}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {Object.keys(loadErrors).length > 0 && (
          <Alert variant="destructive" className="products-load-alert orders-load-alert">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>Some order data is unavailable</AlertTitle>
            <AlertDescription>
              {[loadErrors.products, loadErrors.materials, loadErrors.statuses].filter(Boolean).join(" ")}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="products-button products-button--neutral orders-retry-button"
                onClick={() => loadInitialData()}
              >
                <RefreshCcw />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <section className="products-summary-grid orders-summary-grid" aria-label="Order summary">
          {summaryCards.map((card, index) => (
            <SummaryCard key={card.label} {...card} index={index} reduceMotion={reduceMotion} />
          ))}
        </section>

        <motion.div
          className="orders-builder-grid"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.34, delay: 0.14 }}
        >
          <ProductCatalog
            products={availableProducts}
            loading={products === null}
            error={loadErrors.products}
            search={productSearch}
            onSearchChange={setProductSearch}
            quickSelect={quickSelect}
            onQuickSelect={handleQuickSelect}
            addingProductId={addingProductId}
            onAdd={addProduct}
            selectedProduct={selectedProduct}
            selectedQuote={selectedQuote}
            quoteLoading={quoteLoading}
            quoteError={quoteError}
          />
          <CartPanel
            cart={cart}
            glassMaterials={glassMaterials}
            totals={totals}
            onClear={clearCart}
            onDuplicate={duplicateCartItem}
            onRemove={removeCartItem}
            onUpdateItem={updateCartItem}
            onUpdateMaterial={updateMaterialQuantity}
            onSelectGlass={selectGlass}
            reduceMotion={reduceMotion}
          />
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.3, delay: 0.2 }}
        >
          <CustomerPanel
            customer={customer}
            statuses={statuses || []}
            statusesLoading={statuses === null}
            statusError={loadErrors.statuses}
            errors={customerErrors}
            fieldRefs={fieldRefs}
            receiptButtonRef={receiptButtonRef}
            quotationButtonRef={quotationButtonRef}
            placeOrderButtonRef={placeOrderButtonRef}
            isAdmin={isAdmin}
            orderBusy={orderBusy}
            cartEmpty={cart.length === 0}
            onChange={updateCustomer}
            onReceipt={openReceiptDialog}
            onQuotation={openQuotationDialog}
            onPlaceOrder={reviewOrder}
          />
        </motion.div>
      </div>

      <ReceiptDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        cart={cart}
        customer={customer}
        invalidationToken={documentVersion}
        returnFocusRef={receiptButtonRef}
      />
      <QuotationDialog
        open={quotationOpen}
        onOpenChange={setQuotationOpen}
        cart={cart}
        customer={customer}
        invalidationToken={documentVersion}
        returnFocusRef={quotationButtonRef}
      />

      <AlertDialog
        open={confirmOrderOpen}
        onOpenChange={(nextOpen) => {
          if (!orderBusy) {
            setConfirmOrderOpen(nextOpen)
            if (!nextOpen) setOrderError("")
          }
        }}
      >
        <AlertDialogContent
          overlayClassName="orders-confirm-overlay"
          className="products-confirm-dialog orders-confirm-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            placeOrderButtonRef.current?.focus()
          }}
        >
          <AlertDialogHeader>
            <span className="products-confirm-icon orders-confirm-icon" aria-hidden="true"><ClipboardCheck /></span>
            <AlertDialogTitle>Place this order?</AlertDialogTitle>
            <AlertDialogDescription>
              This creates a new customer and order, then deducts submitted material quantities from inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="orders-confirm-summary">
            <div><span>Cart lines</span><strong>{cart.length}</strong></div>
            <div><span>Units</span><strong>{numberFormatter.format(totals.units)}</strong></div>
            <div><span>Product total</span><strong>{currencyFormatter.format(totals.product)}</strong></div>
            <div><span>Glass leftovers</span><strong>{leftovers.length}</strong></div>
          </div>
          {orderError && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertDescription>{orderError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="products-button products-button--neutral" disabled={orderBusy}>
              Go back
            </AlertDialogCancel>
            <AlertDialogAction
              className="products-button products-button--primary"
              disabled={orderBusy}
              onClick={(event) => {
                event.preventDefault()
                submitOrder()
              }}
            >
              {orderBusy ? <LoaderCircle className="animate-spin" /> : <ClipboardCheck />}
              {orderBusy ? "Placing order..." : "Place order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default OrdersApp
