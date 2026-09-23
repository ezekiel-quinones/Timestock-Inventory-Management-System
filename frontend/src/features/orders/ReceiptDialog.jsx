import * as React from "react"
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Download,
  FileText,
  ImagePlus,
  ListPlus,
  LoaderCircle,
  Plus,
  ReceiptText,
  Trash2,
} from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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

import { fileToDataUrl, generatePdf } from "./api"

let nextManualItemId = 1

function createManualItem() {
  return {
    id: `manual-${nextManualItemId++}`,
    name: "",
    quantity: "1",
    unitPrice: "",
  }
}

function ReceiptDialog({ open, onOpenChange, cart, customer, invalidationToken, returnFocusRef }) {
  const [companyName, setCompanyName] = React.useState("")
  const [downPayment, setDownPayment] = React.useState("")
  const [logoFile, setLogoFile] = React.useState(null)
  const [manualEnabled, setManualEnabled] = React.useState(false)
  const [manualItems, setManualItems] = React.useState(() => [createManualItem()])
  const [previewUrl, setPreviewUrl] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")
  const [success, setSuccess] = React.useState("")
  const messageRef = React.useRef(null)

  React.useEffect(() => {
    setPreviewUrl("")
    setSuccess("")
  }, [invalidationToken])

  React.useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl],
  )

  React.useEffect(() => {
    if (error || success) messageRef.current?.focus()
  }, [error, success])

  function invalidatePreview() {
    setPreviewUrl("")
    setError("")
    setSuccess("")
  }

  function updateManualItem(id, field, value) {
    invalidatePreview()
    setManualItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    )
  }

  function validateCustomer() {
    const labels = {
      firstname: "first name",
      lastname: "last name",
      contact_number: "contact number",
      email: "email",
      address: "address",
    }

    for (const [field, label] of Object.entries(labels)) {
      if (!String(customer[field] || "").trim()) {
        throw new Error(`Enter the customer's ${label} before generating a receipt.`)
      }
    }
  }

  function getManualPayload() {
    const items = []

    manualItems.forEach((item, index) => {
      const name = item.name.trim()
      const quantity = Number(item.quantity)
      const unitPrice = Number(item.unitPrice)
      const completelyBlank = !name && item.unitPrice === ""

      if (completelyBlank) return
      if (!name) throw new Error(`Enter a product name for manual item ${index + 1}.`)
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error(`Manual item ${index + 1} needs a whole-number quantity above zero.`)
      }
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(`Manual item ${index + 1} needs a valid non-negative unit price.`)
      }

      items.push({
        unit_id: `MNL${String(index + 1).padStart(2, "0")}`,
        name,
        quantity,
        unit_price: unitPrice,
      })
    })

    return items
  }

  async function generateReceipt() {
    setError("")
    setSuccess("")
    setPreviewUrl("")
    setBusy(true)

    try {
      validateCustomer()
      const manualPayload = getManualPayload()
      const cartPayload = cart.map((item) => ({
        unit_id: item.product_id,
        name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }))
      const items = [...cartPayload, ...manualPayload]

      if (items.length === 0) throw new Error("Add a cart or manual item before generating a receipt.")

      const parsedDownPayment = downPayment === "" ? 0 : Number(downPayment)
      if (!Number.isFinite(parsedDownPayment) || parsedDownPayment < 0) {
        throw new Error("Enter a valid non-negative down payment.")
      }

      const subtotal = items.reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
        0,
      )
      if (parsedDownPayment > subtotal) {
        throw new Error("Down payment cannot exceed the total product cost.")
      }

      const payload = {
        customer_name: `${customer.firstname.trim()} ${customer.lastname.trim()}`,
        address: customer.address.trim(),
        phone: customer.contact_number.trim(),
        down_payment: parsedDownPayment,
        company_name: companyName.trim() || null,
        items,
      }

      if (logoFile) payload.logo_data = await fileToDataUrl(logoFile)

      const blob = await generatePdf("/api/generate-receipt", payload)
      setPreviewUrl(URL.createObjectURL(blob))
      setSuccess("Receipt generated and ready to download.")
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !busy && onOpenChange(nextOpen)}>
      <DialogContent
        overlayClassName="orders-dialog-overlay"
        className="products-dialog orders-document-dialog"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocusRef?.current?.focus()
        }}
      >
        <DialogHeader className="products-dialog-header">
          <span className="products-dialog-icon" aria-hidden="true">
            <ReceiptText />
          </span>
          <div>
            <DialogTitle>Build customer receipt</DialogTitle>
            <DialogDescription>
              Combine current cart lines with optional manual items, then preview the PDF.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="orders-document-layout">
          <div className="orders-document-form">
            <section className="orders-dialog-section">
              <div className="orders-section-title">
                <span aria-hidden="true"><Banknote /></span>
                <div>
                  <h3>Receipt details</h3>
                  <p>{cart.length} cart line{cart.length === 1 ? "" : "s"} included</p>
                </div>
              </div>

              <div className="orders-dialog-grid">
                <div className="products-field">
                  <Label htmlFor="receipt-company-name">Company name</Label>
                  <Input
                    id="receipt-company-name"
                    value={companyName}
                    placeholder="Optional custom company name"
                    disabled={busy}
                    onChange={(event) => {
                      invalidatePreview()
                      setCompanyName(event.target.value)
                    }}
                  />
                </div>
                <div className="products-field">
                  <Label htmlFor="receipt-down-payment">Down payment</Label>
                  <div className="products-money-input">
                    <span>PHP</span>
                    <Input
                      id="receipt-down-payment"
                      type="number"
                      min="0"
                      step="0.01"
                      value={downPayment}
                      placeholder="0.00"
                      disabled={busy}
                      onChange={(event) => {
                        invalidatePreview()
                        setDownPayment(event.target.value)
                      }}
                    />
                  </div>
                </div>
                <div className="products-field products-field--full">
                  <Label htmlFor="receipt-logo">Company logo</Label>
                  <label className="orders-file-field" htmlFor="receipt-logo">
                    <ImagePlus aria-hidden="true" />
                    <span>{logoFile?.name || "Choose a JPEG or PNG logo"}</span>
                    <Input
                      id="receipt-logo"
                      type="file"
                      accept="image/png,image/jpeg"
                      disabled={busy}
                      onChange={(event) => {
                        invalidatePreview()
                        setLogoFile(event.target.files?.[0] || null)
                      }}
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="orders-dialog-section">
              <div className="orders-section-heading-row">
                <div className="orders-section-title">
                  <span aria-hidden="true"><ListPlus /></span>
                  <div>
                    <h3>Manual items</h3>
                    <p>Optional additions outside the current cart</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="products-button products-button--neutral"
                  disabled={busy}
                  onClick={() => setManualEnabled((current) => !current)}
                >
                  {manualEnabled ? "Hide items" : "Add manual items"}
                </Button>
              </div>

              {manualEnabled && (
                <div className="orders-manual-items">
                  {manualItems.map((item, index) => (
                    <div className="orders-manual-row" key={item.id}>
                      <div className="products-field orders-manual-name">
                        <Label htmlFor={`${item.id}-name`}>Item {index + 1}</Label>
                        <Input
                          id={`${item.id}-name`}
                          value={item.name}
                          placeholder="Product name"
                          disabled={busy}
                          aria-label={`Manual item ${index + 1} product name`}
                          onChange={(event) => updateManualItem(item.id, "name", event.target.value)}
                        />
                      </div>
                      <div className="products-field">
                        <Label htmlFor={`${item.id}-quantity`}>Quantity</Label>
                        <Input
                          id={`${item.id}-quantity`}
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          disabled={busy}
                          aria-label={`Manual item ${index + 1} quantity`}
                          onChange={(event) =>
                            updateManualItem(item.id, "quantity", event.target.value)
                          }
                        />
                      </div>
                      <div className="products-field">
                        <Label htmlFor={`${item.id}-price`}>Unit price</Label>
                        <Input
                          id={`${item.id}-price`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          placeholder="0.00"
                          disabled={busy}
                          aria-label={`Manual item ${index + 1} unit price`}
                          onChange={(event) =>
                            updateManualItem(item.id, "unitPrice", event.target.value)
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="products-button products-button--danger orders-remove-field"
                        aria-label={`Remove manual item ${index + 1}`}
                        disabled={busy || manualItems.length === 1}
                        onClick={() => {
                          invalidatePreview()
                          setManualItems((current) => current.filter((row) => row.id !== item.id))
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="products-button products-button--primary orders-add-row"
                    disabled={busy}
                    onClick={() => {
                      invalidatePreview()
                      setManualItems((current) => [...current, createManualItem()])
                    }}
                  >
                    <Plus />
                    Add another item
                  </Button>
                </div>
              )}
            </section>

            {error && (
              <Alert ref={messageRef} variant="destructive" tabIndex={-1}>
                <AlertCircle aria-hidden="true" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert ref={messageRef} variant="success" tabIndex={-1}>
                <CheckCircle2 aria-hidden="true" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </div>

          <section className="orders-preview-panel" aria-label="Receipt preview">
            <div className="orders-preview-heading">
              <div>
                <span className="products-eyebrow">Document preview</span>
                <h3>Receipt PDF</h3>
              </div>
              {previewUrl && (
                <Button asChild variant="outline" size="sm" className="products-button products-button--primary">
                  <a href={previewUrl} download="receipt.pdf">
                    <Download />
                    Download
                  </a>
                </Button>
              )}
            </div>
            {previewUrl ? (
              <iframe src={previewUrl} title="Generated receipt preview" />
            ) : (
              <div className="orders-preview-empty">
                <FileText aria-hidden="true" />
                <strong>No receipt generated</strong>
                <p>Complete the details and generate a PDF to preview it here.</p>
              </div>
            )}
          </section>
        </div>

        <DialogFooter className="products-dialog-footer orders-document-footer">
          <Button
            type="button"
            variant="outline"
            className="products-button products-button--neutral"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="outline"
            className="products-button products-button--primary"
            disabled={busy}
            onClick={generateReceipt}
          >
            {busy ? <LoaderCircle className="animate-spin" /> : <ReceiptText />}
            {busy ? "Generating..." : "Generate receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ReceiptDialog
