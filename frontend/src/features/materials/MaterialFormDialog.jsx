import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  AlertCircle,
  Calculator,
  Hammer,
  LoaderCircle,
  PencilLine,
  Save,
  TriangleAlert,
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
import { Textarea } from "@/components/ui/textarea"

const unitOptions = [
  ["ft", "ft (Feet)"],
  ["sqft", "sqft (Square Feet)"],
  ["pcs", "pcs (Pieces)"],
  ["m", "m (Meters)"],
  ["cm", "cm (Centimeters)"],
  ["mm", "mm (Millimeters)"],
  ["in", "in (Inches)"],
  ["sqm", "sqm (Square Meters)"],
]

function emptyValues() {
  return {
    itemName: "",
    description: "",
    supplierId: "",
    categoryId: "",
    unitMeasurement: "ft",
    materialCost: "",
    currentStock: "",
    minimumStock: "",
    maximumStock: "",
    glassWidth: "",
    glassHeight: "",
    glassUnitCost: "",
  }
}

function extractGlassSize(value) {
  const match = String(value || "").match(
    /(\d+(?:\.\d+)?)\s*(?:x|\*|by)\s*(\d+(?:\.\d+)?)/i,
  )
  if (!match) return null
  return { width: Number(match[1]), height: Number(match[2]) }
}

function getInitialValues(material) {
  if (!material) return emptyValues()

  const values = {
    itemName: material.item_name || "",
    description: material.item_description || "",
    supplierId: String(material.supplier_id || ""),
    categoryId: String(material.category_id || ""),
    unitMeasurement: material.unit_measurement || "ft",
    materialCost: material.material_cost ?? "",
    currentStock: material.current_stock ?? "",
    minimumStock: material.minimum_stock ?? "",
    maximumStock: material.maximum_stock ?? "",
    glassWidth: "",
    glassHeight: "",
    glassUnitCost: "",
  }
  const size = extractGlassSize(material.item_name)

  if (String(material.item_name || "").toLowerCase().includes("glass") && size) {
    values.glassWidth = size.width
    values.glassHeight = size.height
    const area = size.width * size.height
    values.glassUnitCost = area > 0 ? (Number(material.material_cost) / area).toFixed(2) : ""
  }

  return values
}

function asRequiredNumber(value) {
  if (value === "" || value === null || value === undefined) return Number.NaN
  return Number(value)
}

function usesGlassCalculator(values, editing) {
  const isGlass = values.itemName.trim().toLowerCase().includes("glass")
  return isGlass && (!editing || Boolean(extractGlassSize(values.itemName)))
}

function validateMaterial(values, editing, materialId) {
  const errors = {}
  const itemName = values.itemName.trim()
  const itemDescription = values.description.trim()
  const currentStock = asRequiredNumber(values.currentStock)
  const minimumStock = asRequiredNumber(values.minimumStock)
  const maximumStock = asRequiredNumber(values.maximumStock)
  const glassMode = usesGlassCalculator(values, editing)
  let materialCost

  if (!itemName) errors.itemName = "Item name is required."
  if (!itemDescription) errors.description = "Item description is required."
  if (!values.categoryId) errors.categoryId = "Select a material category."
  if (!values.supplierId) errors.supplierId = "Select a supplier."
  if (!values.unitMeasurement) errors.unitMeasurement = "Select a unit of measurement."

  if (glassMode) {
    const width = asRequiredNumber(values.glassWidth)
    const height = asRequiredNumber(values.glassHeight)
    const unitCost = asRequiredNumber(values.glassUnitCost)
    if (!Number.isFinite(width) || width < 0) errors.glassWidth = "Enter a valid width."
    if (!Number.isFinite(height) || height < 0) errors.glassHeight = "Enter a valid height."
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      errors.glassUnitCost = "Enter a valid cost per square foot."
    }
    materialCost = width * height * unitCost
  } else {
    materialCost = asRequiredNumber(values.materialCost)
    if (!Number.isFinite(materialCost) || materialCost < 0) {
      errors.materialCost = "Material cost must be zero or greater."
    }
  }

  if (!Number.isFinite(currentStock) || currentStock < 0) {
    errors.currentStock = "Current stock must be zero or greater."
  }
  if (!Number.isFinite(minimumStock) || minimumStock < 0) {
    errors.minimumStock = "Minimum stock must be zero or greater."
  }
  if (!Number.isFinite(maximumStock) || maximumStock < 0) {
    errors.maximumStock = "Maximum stock must be zero or greater."
  }
  if (
    Number.isFinite(minimumStock) &&
    Number.isFinite(maximumStock) &&
    maximumStock < minimumStock
  ) {
    errors.maximumStock = "Maximum stock cannot be less than minimum stock."
  }

  return {
    errors,
    payload: {
      ...(editing ? { material_id: materialId } : {}),
      item_name: itemName,
      item_description: itemDescription,
      supplier_id: values.supplierId,
      category_id: values.categoryId,
      unit_measurement: values.unitMeasurement,
      material_cost: materialCost,
      current_stock: currentStock,
      minimum_stock: minimumStock,
      maximum_stock: maximumStock,
    },
  }
}

function FieldError({ id, children }) {
  if (!children) return null
  return <p id={id} className="products-field-error" role="alert">{children}</p>
}

function MaterialFormDialog({
  open,
  onOpenChange,
  mode,
  material,
  categories,
  suppliers,
  lookupsLoading,
  lookupError,
  busy,
  onSubmit,
}) {
  const [values, setValues] = React.useState(emptyValues)
  const [errors, setErrors] = React.useState({})
  const [stockWarning, setStockWarning] = React.useState(false)
  const reduceMotion = useReducedMotion()
  const editing = mode === "edit"
  const glassMode = usesGlassCalculator(values, editing)
  const HeadingIcon = editing ? PencilLine : Hammer

  React.useEffect(() => {
    if (!open) return
    setValues(getInitialValues(material))
    setErrors({})
    setStockWarning(false)
  }, [open, material])

  function updateValue(field, value) {
    setValues((current) => {
      const next = { ...current, [field]: value }
      if (field === "itemName") {
        const size = extractGlassSize(value)
        if (size) {
          next.glassWidth = size.width
          next.glassHeight = size.height
        }
      }
      return next
    })
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))

    if (editing && field === "currentStock" && String(value) !== String(material?.current_stock ?? "")) {
      setStockWarning(true)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const result = validateMaterial(values, editing, material?.material_id)

    if (Object.keys(result.errors).length > 0) {
      setErrors(result.errors)
      return
    }

    try {
      await onSubmit(result.payload)
    } catch (error) {
      setErrors((current) => ({ ...current, form: error.message }))
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !busy && onOpenChange(nextOpen)}>
      <DialogContent
        overlayClassName="materials-dialog-overlay"
        className="products-dialog materials-dialog materials-form-dialog"
      >
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          <DialogHeader className="products-dialog-header">
            <span className="products-dialog-icon" aria-hidden="true">
              <HeadingIcon />
            </span>
            <div>
              <DialogTitle>{editing ? "Edit material" : "Add material"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Update the inventory record without changing its material ID."
                  : "Create a material record and its opening stock balance."}
              </DialogDescription>
            </div>
          </DialogHeader>

          <form className="products-form" onSubmit={handleSubmit} noValidate>
            {errors.form && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertDescription>{errors.form}</AlertDescription>
              </Alert>
            )}

            {lookupError && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertDescription>{lookupError}</AlertDescription>
              </Alert>
            )}

            {stockWarning && (
              <Alert className="materials-stock-warning">
                <TriangleAlert aria-hidden="true" />
                <AlertDescription>
                  Changing current stock here will not create a stock transaction history record.
                  Use Stock material for normal stock-in activity.
                </AlertDescription>
              </Alert>
            )}

            <div className="products-form-grid materials-form-grid">
              {!editing && (
                <div className="products-field">
                  <Label htmlFor="create-material-date">Record date</Label>
                  <Input id="create-material-date" type="date" value={today} readOnly />
                </div>
              )}

              <div className={`products-field${editing ? " products-field--full" : ""}`}>
                <Label htmlFor={`${mode}-material-name`}>Item name</Label>
                <Input
                  id={`${mode}-material-name`}
                  value={values.itemName}
                  autoFocus
                  aria-invalid={Boolean(errors.itemName)}
                  aria-describedby={errors.itemName ? `${mode}-material-name-error` : undefined}
                  placeholder="e.g. Clear Glass 4 x 8"
                  onChange={(event) => updateValue("itemName", event.target.value)}
                />
                <FieldError id={`${mode}-material-name-error`}>{errors.itemName}</FieldError>
              </div>

              <div className="products-field products-field--full">
                <Label htmlFor={`${mode}-material-description`}>Description</Label>
                <Textarea
                  id={`${mode}-material-description`}
                  value={values.description}
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={
                    errors.description ? `${mode}-material-description-error` : undefined
                  }
                  placeholder="Describe this material"
                  onChange={(event) => updateValue("description", event.target.value)}
                />
                <FieldError id={`${mode}-material-description-error`}>
                  {errors.description}
                </FieldError>
              </div>

              <div className="products-field">
                <Label htmlFor={`${mode}-material-supplier`}>Supplier</Label>
                <Select
                  value={values.supplierId || undefined}
                  disabled={lookupsLoading || suppliers.length === 0}
                  onValueChange={(value) => updateValue("supplierId", value)}
                >
                  <SelectTrigger
                    id={`${mode}-material-supplier`}
                    aria-invalid={Boolean(errors.supplierId)}
                    aria-describedby={
                      errors.supplierId ? `${mode}-material-supplier-error` : undefined
                    }
                  >
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
                <FieldError id={`${mode}-material-supplier-error`}>
                  {errors.supplierId}
                </FieldError>
              </div>

              <div className="products-field">
                <Label htmlFor={`${mode}-material-category`}>Category</Label>
                <Select
                  value={values.categoryId || undefined}
                  disabled={lookupsLoading || categories.length === 0}
                  onValueChange={(value) => updateValue("categoryId", value)}
                >
                  <SelectTrigger
                    id={`${mode}-material-category`}
                    aria-invalid={Boolean(errors.categoryId)}
                    aria-describedby={
                      errors.categoryId ? `${mode}-material-category-error` : undefined
                    }
                  >
                    <SelectValue
                      placeholder={lookupsLoading ? "Loading categories..." : "Select category"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.category_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError id={`${mode}-material-category-error`}>
                  {errors.categoryId}
                </FieldError>
              </div>

              <div className="products-field">
                <Label htmlFor={`${mode}-material-unit`}>Unit measurement</Label>
                <Select
                  value={values.unitMeasurement}
                  onValueChange={(value) => updateValue("unitMeasurement", value)}
                >
                  <SelectTrigger
                    id={`${mode}-material-unit`}
                    aria-invalid={Boolean(errors.unitMeasurement)}
                    aria-describedby={
                      errors.unitMeasurement ? `${mode}-material-unit-error` : undefined
                    }
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError id={`${mode}-material-unit-error`}>
                  {errors.unitMeasurement}
                </FieldError>
              </div>

              {!glassMode && (
                <div className="products-field">
                  <Label htmlFor={`${mode}-material-cost`}>Material cost</Label>
                  <div className="products-money-input">
                    <span>PHP</span>
                    <Input
                      id={`${mode}-material-cost`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={values.materialCost}
                      aria-invalid={Boolean(errors.materialCost)}
                      aria-describedby={
                        errors.materialCost ? `${mode}-material-cost-error` : undefined
                      }
                      onChange={(event) => updateValue("materialCost", event.target.value)}
                    />
                  </div>
                  <FieldError id={`${mode}-material-cost-error`}>
                    {errors.materialCost}
                  </FieldError>
                </div>
              )}

              {glassMode && (
                <div className="materials-glass-panel products-field--full">
                  <div className="materials-glass-heading">
                    <span aria-hidden="true"><Calculator /></span>
                    <div>
                      <strong>Glass cost calculator</strong>
                      <p>Material cost = width x height x cost per square foot.</p>
                    </div>
                  </div>
                  <div className="materials-glass-grid">
                    <div className="products-field">
                      <Label htmlFor={`${mode}-glass-width`}>Width (ft)</Label>
                      <Input
                        id={`${mode}-glass-width`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={values.glassWidth}
                        aria-invalid={Boolean(errors.glassWidth)}
                        aria-describedby={
                          errors.glassWidth ? `${mode}-glass-width-error` : undefined
                        }
                        onChange={(event) => updateValue("glassWidth", event.target.value)}
                      />
                      <FieldError id={`${mode}-glass-width-error`}>
                        {errors.glassWidth}
                      </FieldError>
                    </div>
                    <div className="products-field">
                      <Label htmlFor={`${mode}-glass-height`}>Height (ft)</Label>
                      <Input
                        id={`${mode}-glass-height`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={values.glassHeight}
                        aria-invalid={Boolean(errors.glassHeight)}
                        aria-describedby={
                          errors.glassHeight ? `${mode}-glass-height-error` : undefined
                        }
                        onChange={(event) => updateValue("glassHeight", event.target.value)}
                      />
                      <FieldError id={`${mode}-glass-height-error`}>
                        {errors.glassHeight}
                      </FieldError>
                    </div>
                    <div className="products-field">
                      <Label htmlFor={`${mode}-glass-cost`}>Cost per sqft</Label>
                      <div className="products-money-input">
                        <span>PHP</span>
                        <Input
                          id={`${mode}-glass-cost`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={values.glassUnitCost}
                          aria-invalid={Boolean(errors.glassUnitCost)}
                          aria-describedby={
                            errors.glassUnitCost ? `${mode}-glass-cost-error` : undefined
                          }
                          onChange={(event) => updateValue("glassUnitCost", event.target.value)}
                        />
                      </div>
                      <FieldError id={`${mode}-glass-cost-error`}>
                        {errors.glassUnitCost}
                      </FieldError>
                    </div>
                  </div>
                </div>
              )}

              <div className="products-field">
                <Label htmlFor={`${mode}-material-current-stock`}>Current stock</Label>
                <Input
                  id={`${mode}-material-current-stock`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.currentStock}
                  aria-invalid={Boolean(errors.currentStock)}
                  aria-describedby={
                    errors.currentStock ? `${mode}-material-current-stock-error` : undefined
                  }
                  onChange={(event) => updateValue("currentStock", event.target.value)}
                />
                <FieldError id={`${mode}-material-current-stock-error`}>
                  {errors.currentStock}
                </FieldError>
              </div>

              <div className="products-field">
                <Label htmlFor={`${mode}-material-minimum-stock`}>Minimum stock</Label>
                <Input
                  id={`${mode}-material-minimum-stock`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.minimumStock}
                  aria-invalid={Boolean(errors.minimumStock)}
                  aria-describedby={
                    errors.minimumStock ? `${mode}-material-minimum-stock-error` : undefined
                  }
                  onChange={(event) => updateValue("minimumStock", event.target.value)}
                />
                <FieldError id={`${mode}-material-minimum-stock-error`}>
                  {errors.minimumStock}
                </FieldError>
              </div>

              <div className="products-field">
                <Label htmlFor={`${mode}-material-maximum-stock`}>Maximum stock</Label>
                <Input
                  id={`${mode}-material-maximum-stock`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.maximumStock}
                  aria-invalid={Boolean(errors.maximumStock)}
                  aria-describedby={
                    errors.maximumStock ? `${mode}-material-maximum-stock-error` : undefined
                  }
                  onChange={(event) => updateValue("maximumStock", event.target.value)}
                />
                <FieldError id={`${mode}-material-maximum-stock-error`}>
                  {errors.maximumStock}
                </FieldError>
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
                {busy ? <LoaderCircle className="animate-spin" /> : <Save />}
                {busy ? "Saving..." : editing ? "Save changes" : "Add material"}
              </Button>
            </DialogFooter>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}

export default MaterialFormDialog
