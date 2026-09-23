import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  AlertCircle,
  Boxes,
  Factory,
  LoaderCircle,
  PackagePlus,
  Plus,
  Trash2,
  UserRoundPlus,
} from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
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

const DEFAULT_SUPPLIER = "__default-supplier__"
let rowSequence = 0

function createStockRow() {
  rowSequence += 1
  return { clientId: `stock-row-${rowSequence}`, materialId: "", quantity: "" }
}

function SingleStockDialog({
  open,
  onOpenChange,
  material,
  suppliers,
  lookupsLoading,
  lookupError,
  busy,
  onSubmit,
}) {
  const [quantity, setQuantity] = React.useState("1")
  const [supplierId, setSupplierId] = React.useState("")
  const [error, setError] = React.useState("")
  const reduceMotion = useReducedMotion()

  React.useEffect(() => {
    if (!open) return
    setQuantity("1")
    setSupplierId("")
    setError("")
  }, [open, material])

  async function handleSubmit(event) {
    event.preventDefault()
    const parsedQuantity = Number(quantity)

    if (!material?.material_id) {
      setError("Material not specified.")
      return
    }
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      setError("Enter a whole-number quantity of at least one.")
      return
    }
    if (!supplierId) {
      setError("Select a supplier.")
      return
    }

    try {
      await onSubmit({
        stock_type_id: "STT00001",
        supplier_id: supplierId,
        items: [{ material_id: material.material_id, quantity: parsedQuantity }],
      })
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !busy && onOpenChange(nextOpen)}>
      <DialogContent
        overlayClassName="materials-dialog-overlay"
        className="products-dialog materials-dialog materials-stock-dialog"
      >
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          <DialogHeader className="products-dialog-header">
            <span className="products-dialog-icon" aria-hidden="true">
              <PackagePlus />
            </span>
            <div>
              <DialogTitle>Stock material</DialogTitle>
              <DialogDescription>
                Record a manual stock-in transaction for this material.
              </DialogDescription>
            </div>
          </DialogHeader>

          <form className="products-form" onSubmit={handleSubmit} noValidate>
            {(error || lookupError) && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertDescription>{error || lookupError}</AlertDescription>
              </Alert>
            )}

            <div className="materials-stock-overview">
              <div>
                <span>Material</span>
                <strong>{material?.item_name || "Not selected"}</strong>
                <small>{material?.material_id || ""}</small>
              </div>
              <div>
                <span>Current stock</span>
                <strong>{Number(material?.current_stock || 0).toLocaleString("en-PH")}</strong>
                <small>{material?.unit_measurement || "units"}</small>
              </div>
            </div>

            <div className="products-form-grid">
              <div className="products-field">
                <Label htmlFor="single-stock-quantity">Quantity to add</Label>
                <Input
                  id="single-stock-quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  autoFocus
                  onChange={(event) => {
                    setQuantity(event.target.value)
                    setError("")
                  }}
                />
              </div>

              <div className="products-field">
                <Label htmlFor="single-stock-supplier">Supplier</Label>
                <Select
                  value={supplierId || undefined}
                  disabled={lookupsLoading || suppliers.length === 0}
                  onValueChange={(value) => {
                    setSupplierId(value)
                    setError("")
                  }}
                >
                  <SelectTrigger id="single-stock-supplier">
                    <SelectValue
                      placeholder={lookupsLoading ? "Loading suppliers..." : "Select supplier"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={String(supplier.id)}>
                        {supplier.contact_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="products-dialog-footer">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="products-button products-button--neutral">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant="outline"
                className="products-button products-button--primary"
                disabled={busy || lookupsLoading}
              >
                {busy ? <LoaderCircle className="animate-spin" /> : <PackagePlus />}
                {busy ? "Recording..." : "Stock material"}
              </Button>
            </DialogFooter>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}

function BulkStockDialog({
  open,
  onOpenChange,
  materials,
  suppliers,
  lookupsLoading,
  lookupError,
  busy,
  onSubmit,
}) {
  const [rows, setRows] = React.useState(() => [createStockRow()])
  const [supplierId, setSupplierId] = React.useState(DEFAULT_SUPPLIER)
  const [showNewSupplier, setShowNewSupplier] = React.useState(false)
  const [newSupplier, setNewSupplier] = React.useState({
    firstname: "",
    lastname: "",
    contact_name: "",
    contact_number: "",
    email: "",
    address: "",
  })
  const [error, setError] = React.useState("")
  const reduceMotion = useReducedMotion()

  React.useEffect(() => {
    if (!open) return
    setRows([createStockRow()])
    setSupplierId(DEFAULT_SUPPLIER)
    setShowNewSupplier(false)
    setNewSupplier({
      firstname: "",
      lastname: "",
      contact_name: "",
      contact_number: "",
      email: "",
      address: "",
    })
    setError("")
  }, [open])

  function updateRow(clientId, field, value) {
    setRows((current) =>
      current.map((row) => (row.clientId === clientId ? { ...row, [field]: value } : row)),
    )
    setError("")
  }

  function updateSupplier(field, value) {
    setNewSupplier((current) => ({ ...current, [field]: value }))
    setError("")
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (rows.length === 0) {
      setError("Add at least one material row.")
      return
    }

    const items = rows.map((row) => ({
      material_id: row.materialId,
      quantity: Number(row.quantity),
    }))
    const invalidItem = items.some(
      (item) => !item.material_id || !Number.isInteger(item.quantity) || item.quantity < 1,
    )

    if (invalidItem) {
      setError("Select a material and enter a whole-number quantity for every row.")
      return
    }

    const selectedSupplierId = supplierId === DEFAULT_SUPPLIER ? null : supplierId
    const normalizedSupplier = Object.fromEntries(
      Object.entries(newSupplier).map(([key, value]) => [key, value.trim()]),
    )
    const hasNewSupplierDetails = showNewSupplier && Object.values(normalizedSupplier).some(Boolean)

    if (!selectedSupplierId && hasNewSupplierDetails) {
      const missingSupplierDetails = Object.values(normalizedSupplier).some((value) => !value)
      if (missingSupplierDetails) {
        setError("Complete all new supplier fields, or clear them to use the default supplier.")
        return
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedSupplier.email)) {
        setError("Enter a valid email address for the new supplier.")
        return
      }
    }

    try {
      await onSubmit({
        stock_type_id: "STT00001",
        supplier_id: selectedSupplierId,
        supplier: !selectedSupplierId && hasNewSupplierDetails ? normalizedSupplier : null,
        items,
      })
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !busy && onOpenChange(nextOpen)}>
      <DialogContent
        overlayClassName="materials-dialog-overlay"
        className="products-dialog materials-dialog materials-bulk-dialog"
      >
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          <DialogHeader className="products-dialog-header">
            <span className="products-dialog-icon" aria-hidden="true">
              <Boxes />
            </span>
            <div>
              <DialogTitle>Bulk stock materials</DialogTitle>
              <DialogDescription>
                Record multiple materials under one manual stock-in transaction.
              </DialogDescription>
            </div>
          </DialogHeader>

          <form className="products-form materials-bulk-form" onSubmit={handleSubmit} noValidate>
            {(error || lookupError) && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertDescription>{error || lookupError}</AlertDescription>
              </Alert>
            )}

            <section className="materials-stock-section" aria-labelledby="bulk-materials-heading">
              <div className="materials-section-heading">
                <div>
                  <span className="products-eyebrow">Stock lines</span>
                  <h3 id="bulk-materials-heading">Materials</h3>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="products-button products-button--neutral"
                  onClick={() => setRows((current) => [...current, createStockRow()])}
                >
                  <Plus />
                  Add row
                </Button>
              </div>

              <div className="materials-stock-rows">
                {rows.map((row, index) => (
                  <motion.div
                    className="materials-stock-row"
                    key={row.clientId}
                    initial={reduceMotion ? false : { opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.17, delay: index * 0.025 }}
                  >
                    <div className="products-field">
                      <Label htmlFor={`${row.clientId}-material`}>Material</Label>
                      <Select
                        value={row.materialId || undefined}
                        disabled={materials.length === 0}
                        onValueChange={(value) => updateRow(row.clientId, "materialId", value)}
                      >
                        <SelectTrigger id={`${row.clientId}-material`}>
                          <SelectValue placeholder="Select material" />
                        </SelectTrigger>
                        <SelectContent>
                          {materials.map((material) => (
                            <SelectItem key={material.material_id} value={String(material.material_id)}>
                              {material.item_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="products-field">
                      <Label htmlFor={`${row.clientId}-quantity`}>Quantity</Label>
                      <Input
                        id={`${row.clientId}-quantity`}
                        type="number"
                        min="1"
                        step="1"
                        value={row.quantity}
                        placeholder="1"
                        onChange={(event) => updateRow(row.clientId, "quantity", event.target.value)}
                      />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="products-button products-button--danger materials-remove-row"
                      aria-label={`Remove material row ${index + 1}`}
                      disabled={rows.length === 1}
                      onClick={() =>
                        setRows((current) => current.filter((item) => item.clientId !== row.clientId))
                      }
                    >
                      <Trash2 />
                    </Button>
                  </motion.div>
                ))}
              </div>
            </section>

            <section className="materials-stock-section" aria-labelledby="bulk-supplier-heading">
              <div className="materials-section-heading">
                <div>
                  <span className="products-eyebrow">Source</span>
                  <h3 id="bulk-supplier-heading">Supplier</h3>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="products-button products-button--neutral"
                  aria-expanded={showNewSupplier}
                  onClick={() =>
                    setShowNewSupplier((current) => {
                      const next = !current
                      if (next) setSupplierId(DEFAULT_SUPPLIER)
                      return next
                    })
                  }
                >
                  <UserRoundPlus />
                  {showNewSupplier ? "Hide new supplier" : "Add new supplier"}
                </Button>
              </div>

              <div className="products-field">
                <Label htmlFor="bulk-stock-supplier">Existing supplier</Label>
                <Select
                  value={supplierId}
                  disabled={lookupsLoading}
                  onValueChange={(value) => {
                    setSupplierId(value)
                    if (value !== DEFAULT_SUPPLIER) setShowNewSupplier(false)
                    setError("")
                  }}
                >
                  <SelectTrigger id="bulk-stock-supplier">
                    <Factory aria-hidden="true" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DEFAULT_SUPPLIER}>Use default supplier</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={String(supplier.id)}>
                        {supplier.contact_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="materials-field-help">
                  With no selection or new details, the system uses the earliest supplier record.
                </p>
              </div>

              {showNewSupplier && (
                <motion.fieldset
                  className="materials-new-supplier"
                  initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: reduceMotion ? 0 : 0.2 }}
                >
                  <legend>New supplier details</legend>
                  <div className="products-form-grid">
                    <div className="products-field">
                      <Label htmlFor="new-supplier-firstname">First name</Label>
                      <Input
                        id="new-supplier-firstname"
                        value={newSupplier.firstname}
                        onChange={(event) => updateSupplier("firstname", event.target.value)}
                      />
                    </div>
                    <div className="products-field">
                      <Label htmlFor="new-supplier-lastname">Last name</Label>
                      <Input
                        id="new-supplier-lastname"
                        value={newSupplier.lastname}
                        onChange={(event) => updateSupplier("lastname", event.target.value)}
                      />
                    </div>
                    <div className="products-field">
                      <Label htmlFor="new-supplier-contact-name">Contact name</Label>
                      <Input
                        id="new-supplier-contact-name"
                        value={newSupplier.contact_name}
                        onChange={(event) => updateSupplier("contact_name", event.target.value)}
                      />
                    </div>
                    <div className="products-field">
                      <Label htmlFor="new-supplier-phone">Contact number</Label>
                      <Input
                        id="new-supplier-phone"
                        value={newSupplier.contact_number}
                        onChange={(event) => updateSupplier("contact_number", event.target.value)}
                      />
                    </div>
                    <div className="products-field">
                      <Label htmlFor="new-supplier-email">Email</Label>
                      <Input
                        id="new-supplier-email"
                        type="email"
                        value={newSupplier.email}
                        onChange={(event) => updateSupplier("email", event.target.value)}
                      />
                    </div>
                    <div className="products-field">
                      <Label htmlFor="new-supplier-address">Address</Label>
                      <Input
                        id="new-supplier-address"
                        value={newSupplier.address}
                        onChange={(event) => updateSupplier("address", event.target.value)}
                      />
                    </div>
                  </div>
                </motion.fieldset>
              )}
            </section>

            <DialogFooter className="products-dialog-footer">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="products-button products-button--neutral">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant="outline"
                className="products-button products-button--primary"
                disabled={busy || lookupsLoading || materials.length === 0}
              >
                {busy ? <LoaderCircle className="animate-spin" /> : <Boxes />}
                {busy ? "Recording..." : "Record stock-in"}
              </Button>
            </DialogFooter>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}

export { BulkStockDialog, SingleStockDialog }
