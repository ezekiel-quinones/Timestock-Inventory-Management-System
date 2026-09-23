import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"
import { AlertCircle, LoaderCircle, PackagePlus, PencilLine, Save } from "lucide-react"

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

const emptyProduct = {
  itemName: "",
  description: "",
  categoryId: "",
  width: "",
  height: "",
  status: "Available",
  unitPrice: "",
  materialsCost: "",
}

function getInitialProduct(product) {
  if (!product) return emptyProduct

  return {
    itemName: product.item_name || "",
    description: product.item_description || "",
    categoryId: product.category_id || "",
    width: product.width ?? "",
    height: product.height ?? "",
    status: product.status === "Available" ? "Available" : "Unavailable",
    unitPrice: product.unit_price ?? "",
    materialsCost: product.materials_cost ?? "",
  }
}

function validateProduct(values) {
  const errors = {}
  const name = values.itemName.trim()
  const description = values.description.trim()
  const unitPrice = Number(values.unitPrice)
  const materialsCost = Number(values.materialsCost)
  const width = values.width === "" ? null : Number(values.width)
  const height = values.height === "" ? null : Number(values.height)

  if (!name) errors.itemName = "Product name is required."
  else if (name.length > 100) errors.itemName = "Use no more than 100 characters."

  if (description.length > 500) {
    errors.description = "Use no more than 500 characters."
  }

  if (!values.categoryId) errors.categoryId = "Select a product category."
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    errors.unitPrice = "Enter a non-negative unit price."
  }
  if (!Number.isFinite(materialsCost) || materialsCost < 0) {
    errors.materialsCost = "Enter a non-negative materials cost."
  }
  if (
    Number.isFinite(unitPrice) &&
    Number.isFinite(materialsCost) &&
    materialsCost > unitPrice
  ) {
    errors.materialsCost = "Materials cost cannot exceed the unit price."
  }
  if (width !== null && (!Number.isFinite(width) || width < 0)) {
    errors.width = "Width must be zero or greater."
  }
  if (height !== null && (!Number.isFinite(height) || height < 0)) {
    errors.height = "Height must be zero or greater."
  }

  return {
    errors,
    payload: {
      item_name: name,
      item_description: description,
      category_id: values.categoryId,
      unit_price: unitPrice,
      materials_cost: materialsCost,
      status: values.status,
      width,
      height,
    },
  }
}

function FieldError({ children }) {
  if (!children) return null
  return <p className="products-field-error">{children}</p>
}

function ProductFormDialog({
  open,
  onOpenChange,
  mode,
  product,
  categories,
  categoriesLoading,
  categoriesError,
  busy,
  onSubmit,
}) {
  const [values, setValues] = React.useState(emptyProduct)
  const [errors, setErrors] = React.useState({})
  const reduceMotion = useReducedMotion()
  const editing = mode === "edit"
  const title = editing ? "Edit product" : "Create product"
  const HeadingIcon = editing ? PencilLine : PackagePlus

  React.useEffect(() => {
    if (!open) return
    setValues(getInitialProduct(product))
    setErrors({})
  }, [open, product])

  function updateValue(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const result = validateProduct(values)

    if (Object.keys(result.errors).length > 0) {
      setErrors(result.errors)
      return
    }

    try {
      await onSubmit(
        editing ? { ...result.payload, id: product.product_id } : result.payload,
      )
    } catch (error) {
      setErrors((current) => ({ ...current, form: error.message }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !busy && onOpenChange(nextOpen)}>
      <DialogContent
        overlayClassName="products-dialog-overlay"
        className="products-dialog sm:max-w-2xl"
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
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Update the catalog details stored for this product."
                  : "Add a new product to the TimeStock catalog."}
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

            {categoriesError && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertDescription>{categoriesError}</AlertDescription>
              </Alert>
            )}

            <div className="products-form-grid products-form-grid--wide">
              <div className="products-field products-field--full">
                <Label htmlFor={`${mode}-product-name`}>Product name</Label>
                <Input
                  id={`${mode}-product-name`}
                  value={values.itemName}
                  maxLength={100}
                  autoFocus
                  aria-invalid={Boolean(errors.itemName)}
                  onChange={(event) => updateValue("itemName", event.target.value)}
                />
                <FieldError>{errors.itemName}</FieldError>
              </div>

              <div className="products-field products-field--full">
                <div className="products-field-label-row">
                  <Label htmlFor={`${mode}-product-description`}>Description</Label>
                  <span>{values.description.length}/500</span>
                </div>
                <Textarea
                  id={`${mode}-product-description`}
                  value={values.description}
                  maxLength={500}
                  aria-invalid={Boolean(errors.description)}
                  onChange={(event) => updateValue("description", event.target.value)}
                />
                <FieldError>{errors.description}</FieldError>
              </div>

              <div className="products-field">
                <Label htmlFor={`${mode}-product-category`}>Category</Label>
                <Select
                  value={values.categoryId || undefined}
                  disabled={categoriesLoading || categories.length === 0}
                  onValueChange={(value) => updateValue("categoryId", value)}
                >
                  <SelectTrigger
                    id={`${mode}-product-category`}
                    aria-invalid={Boolean(errors.categoryId)}
                  >
                    <SelectValue
                      placeholder={categoriesLoading ? "Loading categories..." : "Select category"}
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
                <FieldError>{errors.categoryId}</FieldError>
              </div>

              <div className="products-field">
                <Label htmlFor={`${mode}-product-status`}>Availability</Label>
                <Select
                  value={values.status}
                  onValueChange={(value) => updateValue("status", value)}
                >
                  <SelectTrigger id={`${mode}-product-status`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Unavailable">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="products-field">
                <Label htmlFor={`${mode}-product-width`}>Width</Label>
                <Input
                  id={`${mode}-product-width`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.width}
                  aria-invalid={Boolean(errors.width)}
                  placeholder="Optional"
                  onChange={(event) => updateValue("width", event.target.value)}
                />
                <FieldError>{errors.width}</FieldError>
              </div>

              <div className="products-field">
                <Label htmlFor={`${mode}-product-height`}>Height</Label>
                <Input
                  id={`${mode}-product-height`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.height}
                  aria-invalid={Boolean(errors.height)}
                  placeholder="Optional"
                  onChange={(event) => updateValue("height", event.target.value)}
                />
                <FieldError>{errors.height}</FieldError>
              </div>

              <div className="products-field">
                <Label htmlFor={`${mode}-product-price`}>Unit price</Label>
                <div className="products-money-input">
                  <span>PHP</span>
                  <Input
                    id={`${mode}-product-price`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={values.unitPrice}
                    aria-invalid={Boolean(errors.unitPrice)}
                    onChange={(event) => updateValue("unitPrice", event.target.value)}
                  />
                </div>
                <FieldError>{errors.unitPrice}</FieldError>
              </div>

              <div className="products-field">
                <Label htmlFor={`${mode}-product-material-cost`}>Materials cost</Label>
                <div className="products-money-input">
                  <span>PHP</span>
                  <Input
                    id={`${mode}-product-material-cost`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={values.materialsCost}
                    aria-invalid={Boolean(errors.materialsCost)}
                    onChange={(event) => updateValue("materialsCost", event.target.value)}
                  />
                </div>
                <FieldError>{errors.materialsCost}</FieldError>
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
                disabled={busy || categoriesLoading}
              >
                {busy ? <LoaderCircle className="animate-spin" /> : <Save />}
                {busy ? "Saving..." : editing ? "Save changes" : "Create product"}
              </Button>
            </DialogFooter>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}

export default ProductFormDialog
