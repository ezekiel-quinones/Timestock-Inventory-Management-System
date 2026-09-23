import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  AlertCircle,
  Boxes,
  Calculator,
  Layers3,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
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

import { apiRequest, getMaterials, getProductMaterials } from "./api"

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

let entrySequence = 0

function createEntry(values = {}) {
  entrySequence += 1
  return {
    clientId: `recipe-entry-${entrySequence}`,
    materialId: values.material_id || "",
    usedQuantity: values.used_quantity ?? "",
    unitCost: values.unit_cost ?? "",
    existing: Boolean(values.existing),
  }
}

function RecipeDialog({ open, onOpenChange, products, onNotify }) {
  const [materials, setMaterials] = React.useState([])
  const [selectedProductId, setSelectedProductId] = React.useState("")
  const [entries, setEntries] = React.useState([])
  const [catalogLoading, setCatalogLoading] = React.useState(false)
  const [recipeLoading, setRecipeLoading] = React.useState(false)
  const [busyAction, setBusyAction] = React.useState("")
  const [error, setError] = React.useState("")
  const [deleteTarget, setDeleteTarget] = React.useState(null)
  const reduceMotion = useReducedMotion()

  const availableProducts = products.filter((product) => product.status === "Available")

  React.useEffect(() => {
    if (!open) return undefined

    const controller = new AbortController()
    setSelectedProductId("")
    setEntries([])
    setError("")
    setCatalogLoading(true)

    getMaterials(controller.signal)
      .then(setMaterials)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setCatalogLoading(false)
      })

    return () => controller.abort()
  }, [open])

  React.useEffect(() => {
    if (!open || !selectedProductId) {
      setEntries([])
      return undefined
    }

    const controller = new AbortController()
    setRecipeLoading(true)
    setError("")

    getProductMaterials(selectedProductId, controller.signal)
      .then((rows) => {
        setEntries(rows.map((row) => createEntry({ ...row, existing: true })))
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setRecipeLoading(false)
      })

    return () => controller.abort()
  }, [open, selectedProductId])

  function updateEntry(clientId, field, value) {
    setEntries((current) =>
      current.map((entry) => {
        if (entry.clientId !== clientId) return entry

        if (field === "materialId") {
          const material = materials.find((item) => item.material_id === value)
          return {
            ...entry,
            materialId: value,
            unitCost: material?.material_cost ?? "",
          }
        }

        return { ...entry, [field]: value }
      }),
    )
    setError("")
  }

  function addEntry() {
    if (!selectedProductId) {
      setError("Select a product before adding materials.")
      return
    }
    setEntries((current) => [...current, createEntry()])
  }

  function removeNewEntry(clientId) {
    setEntries((current) => current.filter((entry) => entry.clientId !== clientId))
  }

  async function reloadRecipe() {
    const rows = await getProductMaterials(selectedProductId)
    setEntries(rows.map((row) => createEntry({ ...row, existing: true })))
  }

  async function finishMutation(message) {
    try {
      await reloadRecipe()
    } catch {
      setError(`${message} The latest recipe could not be reloaded; close and reopen this dialog.`)
    }
    onNotify("success", message)
  }

  function validateEntry(entry) {
    const quantity = Number(entry.usedQuantity)
    const cost = Number(entry.unitCost)

    if (!entry.materialId) return "Select a material for every new row."
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return "Material quantities must be greater than zero."
    }
    if (!Number.isFinite(cost) || cost < 0) {
      return "Material unit costs must be zero or greater."
    }
    return ""
  }

  async function addNewMaterials() {
    const newEntries = entries.filter((entry) => !entry.existing)
    if (!selectedProductId) {
      setError("Select a product first.")
      return
    }
    if (newEntries.length === 0) {
      setError("Add at least one new material row before saving.")
      return
    }

    const validationError = newEntries.map(validateEntry).find(Boolean)
    if (validationError) {
      setError(validationError)
      return
    }

    setBusyAction("add")
    setError("")
    try {
      const result = await apiRequest("/api/product-materials/add", {
        method: "POST",
        body: {
          product_id: selectedProductId,
          materials: newEntries.map((entry) => ({
            material_id: entry.materialId,
            used_quantity: Number(entry.usedQuantity),
            unit_cost: Number(entry.unitCost),
          })),
        },
      })
      await finishMutation(result?.message || "Materials were added to the product.")
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyAction("")
    }
  }

  async function updateExistingMaterial(entry) {
    const validationError = validateEntry(entry)
    if (validationError) {
      setError(validationError)
      return
    }

    setBusyAction(entry.clientId)
    setError("")
    try {
      await apiRequest("/api/product-materials/update", {
        method: "PUT",
        body: {
          product_id: selectedProductId,
          material_id: entry.materialId,
          used_quantity: Number(entry.usedQuantity),
          unit_cost: Number(entry.unitCost),
        },
      })
      await finishMutation("Product material was updated.")
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyAction("")
    }
  }

  async function deleteExistingMaterial() {
    if (!deleteTarget) return

    setBusyAction(deleteTarget.clientId)
    setError("")
    try {
      const params = new URLSearchParams({
        product_id: selectedProductId,
        material_id: deleteTarget.materialId,
      })
      const result = await apiRequest(`/api/product-materials/delete?${params}`, {
        method: "DELETE",
      })
      setDeleteTarget(null)
      await finishMutation(result?.message || "Product material was removed.")
    } catch (requestError) {
      setDeleteTarget(null)
      setError(requestError.message)
    } finally {
      setBusyAction("")
    }
  }

  const totalCost = entries.reduce((total, entry) => {
    const quantity = Number(entry.usedQuantity)
    const cost = Number(entry.unitCost)
    return total + (Number.isFinite(quantity) && Number.isFinite(cost) ? quantity * cost : 0)
  }, 0)

  const selectedMaterialIds = new Set(entries.map((entry) => entry.materialId).filter(Boolean))

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => !busyAction && onOpenChange(nextOpen)}>
        <DialogContent
          overlayClassName="products-dialog-overlay"
          className="products-dialog products-recipe-dialog sm:max-w-4xl"
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
          >
            <DialogHeader className="products-dialog-header">
              <span className="products-dialog-icon" aria-hidden="true">
                <Layers3 />
              </span>
              <div>
                <DialogTitle>Product materials</DialogTitle>
                <DialogDescription>
                  Maintain the material recipe and estimated unit cost for an available product.
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="products-recipe-body">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle aria-hidden="true" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="products-recipe-toolbar">
                <div className="products-field">
                  <Label htmlFor="recipe-product">Available product</Label>
                  <Select
                    value={selectedProductId || undefined}
                    disabled={
                      catalogLoading || availableProducts.length === 0 || Boolean(busyAction)
                    }
                    onValueChange={setSelectedProductId}
                  >
                    <SelectTrigger id="recipe-product">
                      <SelectValue
                        placeholder={catalogLoading ? "Loading catalog..." : "Select product"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProducts.map((product) => (
                        <SelectItem key={product.product_id} value={String(product.product_id)}>
                          {product.item_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="products-recipe-total" aria-live="polite">
                  <span className="products-recipe-total__icon" aria-hidden="true">
                    <Calculator />
                  </span>
                  <div>
                    <small>Estimated recipe cost</small>
                    <strong>{currencyFormatter.format(totalCost)}</strong>
                  </div>
                </div>
              </div>

              <div className="products-recipe-list" aria-busy={recipeLoading}>
                {recipeLoading && (
                  <div className="products-recipe-empty">
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                    <p>Loading product materials...</p>
                  </div>
                )}

                {!recipeLoading && selectedProductId && entries.length === 0 && (
                  <div className="products-recipe-empty">
                    <Boxes aria-hidden="true" />
                    <div>
                      <strong>No materials assigned</strong>
                      <p>Add the first material row for this product.</p>
                    </div>
                  </div>
                )}

                {!recipeLoading && !selectedProductId && (
                  <div className="products-recipe-empty">
                    <Boxes aria-hidden="true" />
                    <div>
                      <strong>Select a product</strong>
                      <p>Its current material recipe will appear here.</p>
                    </div>
                  </div>
                )}

                {!recipeLoading &&
                  entries.map((entry, index) => {
                    const material = materials.find(
                      (item) => item.material_id === entry.materialId,
                    )
                    const rowBusy = busyAction === entry.clientId

                    return (
                      <motion.div
                        className="products-recipe-row"
                        key={entry.clientId}
                        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.18, delay: index * 0.025 }}
                      >
                        <div className="products-field products-recipe-row__material">
                          <Label htmlFor={`${entry.clientId}-material`}>Material</Label>
                          <Select
                            value={entry.materialId || undefined}
                            disabled={entry.existing || Boolean(busyAction)}
                            onValueChange={(value) =>
                              updateEntry(entry.clientId, "materialId", value)
                            }
                          >
                            <SelectTrigger id={`${entry.clientId}-material`}>
                              <SelectValue placeholder="Select material" />
                            </SelectTrigger>
                            <SelectContent>
                              {materials.map((item) => (
                                <SelectItem
                                  key={item.material_id}
                                  value={String(item.material_id)}
                                  disabled={
                                    selectedMaterialIds.has(item.material_id) &&
                                    item.material_id !== entry.materialId
                                  }
                                >
                                  {item.item_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <small>{material?.unit_measurement || "Unit not specified"}</small>
                        </div>

                        <div className="products-field">
                          <Label htmlFor={`${entry.clientId}-quantity`}>Used quantity</Label>
                          <Input
                            id={`${entry.clientId}-quantity`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={entry.usedQuantity}
                            disabled={Boolean(busyAction)}
                            onChange={(event) =>
                              updateEntry(entry.clientId, "usedQuantity", event.target.value)
                            }
                          />
                        </div>

                        <div className="products-field">
                          <Label htmlFor={`${entry.clientId}-cost`}>Unit cost</Label>
                          <div className="products-money-input products-money-input--compact">
                            <span>PHP</span>
                            <Input
                              id={`${entry.clientId}-cost`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={entry.unitCost}
                              disabled={Boolean(busyAction)}
                              onChange={(event) =>
                                updateEntry(entry.clientId, "unitCost", event.target.value)
                              }
                            />
                          </div>
                        </div>

                        <div className="products-recipe-row__actions">
                          {entry.existing ? (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="products-button products-button--primary"
                                disabled={Boolean(busyAction)}
                                onClick={() => updateExistingMaterial(entry)}
                              >
                                {rowBusy ? <LoaderCircle className="animate-spin" /> : <Save />}
                                Update
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="products-button products-button--danger"
                                disabled={Boolean(busyAction)}
                                onClick={() => setDeleteTarget(entry)}
                              >
                                <Trash2 />
                                Delete
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="products-button products-button--danger"
                              disabled={Boolean(busyAction)}
                              onClick={() => removeNewEntry(entry.clientId)}
                            >
                              <Trash2 />
                              Remove
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
              </div>

              <Button
                type="button"
                variant="outline"
                className="products-button products-button--neutral products-add-material"
                disabled={
                  !selectedProductId || catalogLoading || recipeLoading || Boolean(busyAction)
                }
                onClick={addEntry}
              >
                <Plus />
                Add material row
              </Button>
            </div>

            <DialogFooter className="products-dialog-footer">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="products-button products-button--neutral">
                  Close
                </Button>
              </DialogClose>
              <Button
                type="button"
                variant="outline"
                className="products-button products-button--primary"
                disabled={Boolean(busyAction) || !selectedProductId}
                onClick={addNewMaterials}
              >
                {busyAction === "add" ? <LoaderCircle className="animate-spin" /> : <Save />}
                {busyAction === "add" ? "Saving..." : "Save new materials"}
              </Button>
            </DialogFooter>
          </motion.div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(next) => !next && setDeleteTarget(null)}>
        <AlertDialogContent
          overlayClassName="products-confirm-overlay"
          className="products-confirm-dialog"
        >
          <AlertDialogHeader>
            <span className="products-confirm-icon" aria-hidden="true">
              <Trash2 />
            </span>
            <AlertDialogTitle>Remove this material?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the material from this product recipe. It does not delete the material
              from inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="products-button products-button--neutral">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="products-button products-button--danger"
              disabled={Boolean(busyAction)}
              onClick={(event) => {
                event.preventDefault()
                deleteExistingMaterial()
              }}
            >
              {busyAction ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              Remove material
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default RecipeDialog
