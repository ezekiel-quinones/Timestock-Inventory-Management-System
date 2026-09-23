import * as React from "react"
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  ImagePlus,
  LoaderCircle,
  Plus,
  ScrollText,
  Trash2,
  UserRound,
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

let nextBulletId = 1

function createBullet() {
  return { id: `bullet-${nextBulletId++}`, value: "" }
}

const sectionDefinitions = [
  ["scope_of_work", "Scope of work", "Describe the work included in this quotation."],
  ["terms_of_payment", "Terms of payment", "State payment milestones or conditions."],
  ["warranty", "Warranty", "Add the warranty coverage and limits."],
  ["lead_time", "Lead time", "Set expected production or delivery timing."],
]

function QuotationDialog({ open, onOpenChange, cart, customer, invalidationToken, returnFocusRef }) {
  const [details, setDetails] = React.useState({
    ownerName: "",
    ownerPosition: "",
    companyName: "",
    companyAddress: "",
    companyContact: "",
  })
  const [logoFile, setLogoFile] = React.useState(null)
  const [sections, setSections] = React.useState(() =>
    Object.fromEntries(sectionDefinitions.map(([key]) => [key, [createBullet()]])),
  )
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

  function updateDetail(field, value) {
    invalidatePreview()
    setDetails((current) => ({ ...current, [field]: value }))
  }

  function updateBullet(sectionKey, id, value) {
    invalidatePreview()
    setSections((current) => ({
      ...current,
      [sectionKey]: current[sectionKey].map((bullet) =>
        bullet.id === id ? { ...bullet, value } : bullet,
      ),
    }))
  }

  function addBullet(sectionKey) {
    invalidatePreview()
    setSections((current) => ({
      ...current,
      [sectionKey]: [...current[sectionKey], createBullet()],
    }))
  }

  function removeBullet(sectionKey, id) {
    invalidatePreview()
    setSections((current) => ({
      ...current,
      [sectionKey]: current[sectionKey].filter((bullet) => bullet.id !== id),
    }))
  }

  async function generateQuotation() {
    setError("")
    setSuccess("")
    setPreviewUrl("")
    setBusy(true)

    try {
      if (cart.length === 0) throw new Error("Add at least one product before generating a quotation.")
      if (!customer.firstname.trim()) throw new Error("Enter the customer's first name.")
      if (!customer.lastname.trim()) throw new Error("Enter the customer's last name.")
      if (!customer.address.trim()) throw new Error("Enter the customer's address.")
      if (!details.ownerName.trim()) throw new Error("Enter the document owner's name.")
      if (!details.ownerPosition.trim()) throw new Error("Enter the document owner's position.")
      if (!details.companyName.trim()) throw new Error("Enter the company name.")

      const sectionPayload = {}
      sectionDefinitions.forEach(([key, label]) => {
        const values = sections[key].map((bullet) => bullet.value.trim()).filter(Boolean)
        if (values.length === 0) throw new Error(`Add at least one bullet for ${label.toLowerCase()}.`)
        sectionPayload[key] = values
      })

      const payload = {
        client_name: `${customer.firstname.trim()} ${customer.lastname.trim()}`,
        client_address: customer.address.trim(),
        items_quote: cart.map((item) => ({
          description: `${item.item_name}\nDimension: (customize as needed)`,
          quantity: item.quantity,
          unit_price: item.unit_price,
          short_label: item.item_name,
          materials: item.materials.map(
            (material) =>
              `${material.item_name}: ${material.used_quantity} ${material.unit_measurement}`,
          ),
        })),
        owner_name: details.ownerName.trim(),
        owner_position: details.ownerPosition.trim(),
        ...sectionPayload,
        company_name: details.companyName.trim(),
        company_address: details.companyAddress.trim(),
        company_contact: details.companyContact.trim(),
      }

      if (logoFile) payload.logo_data = await fileToDataUrl(logoFile)

      const blob = await generatePdf("/api/generate-quotation", payload)
      setPreviewUrl(URL.createObjectURL(blob))
      setSuccess("Quotation generated and ready to download.")
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
        className="products-dialog orders-document-dialog orders-quotation-dialog"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocusRef?.current?.focus()
        }}
      >
        <DialogHeader className="products-dialog-header">
          <span className="products-dialog-icon" aria-hidden="true">
            <ScrollText />
          </span>
          <div>
            <DialogTitle>Build customer quotation</DialogTitle>
            <DialogDescription>
              Add company details and proposal terms, then review the generated PDF.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="orders-document-layout">
          <div className="orders-document-form">
            <section className="orders-dialog-section">
              <div className="orders-section-title">
                <span aria-hidden="true"><UserRound /></span>
                <div>
                  <h3>Document owner</h3>
                  <p>The person signing the quotation</p>
                </div>
              </div>
              <div className="orders-dialog-grid">
                <div className="products-field">
                  <Label htmlFor="quotation-owner-name">Owner name</Label>
                  <Input
                    id="quotation-owner-name"
                    value={details.ownerName}
                    placeholder="e.g. Juan Dela Cruz"
                    disabled={busy}
                    aria-required="true"
                    onChange={(event) => updateDetail("ownerName", event.target.value)}
                  />
                </div>
                <div className="products-field">
                  <Label htmlFor="quotation-owner-position">Owner position</Label>
                  <Input
                    id="quotation-owner-position"
                    value={details.ownerPosition}
                    placeholder="e.g. General Manager"
                    disabled={busy}
                    aria-required="true"
                    onChange={(event) => updateDetail("ownerPosition", event.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="orders-dialog-section">
              <div className="orders-section-title">
                <span aria-hidden="true"><Building2 /></span>
                <div>
                  <h3>Company details</h3>
                  <p>Brand and contact information shown on the PDF</p>
                </div>
              </div>
              <div className="orders-dialog-grid">
                <div className="products-field products-field--full">
                  <Label htmlFor="quotation-company-name">Company name</Label>
                  <Input
                    id="quotation-company-name"
                    value={details.companyName}
                    placeholder="Times Stock Aluminum & Glass Services"
                    disabled={busy}
                    aria-required="true"
                    onChange={(event) => updateDetail("companyName", event.target.value)}
                  />
                </div>
                <div className="products-field">
                  <Label htmlFor="quotation-company-address">Company address</Label>
                  <Input
                    id="quotation-company-address"
                    value={details.companyAddress}
                    placeholder="Optional"
                    disabled={busy}
                    onChange={(event) => updateDetail("companyAddress", event.target.value)}
                  />
                </div>
                <div className="products-field">
                  <Label htmlFor="quotation-company-contact">Company contact</Label>
                  <Input
                    id="quotation-company-contact"
                    value={details.companyContact}
                    placeholder="Optional phone or email"
                    disabled={busy}
                    onChange={(event) => updateDetail("companyContact", event.target.value)}
                  />
                </div>
                <div className="products-field products-field--full">
                  <Label htmlFor="quotation-logo">Company logo</Label>
                  <label className="orders-file-field" htmlFor="quotation-logo">
                    <ImagePlus aria-hidden="true" />
                    <span>{logoFile?.name || "Choose a JPEG or PNG logo"}</span>
                    <Input
                      id="quotation-logo"
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
              <div className="orders-section-title">
                <span aria-hidden="true"><ClipboardList /></span>
                <div>
                  <h3>Proposal terms</h3>
                  <p>At least one bullet is required in every section</p>
                </div>
              </div>
              <div className="orders-bullet-sections">
                {sectionDefinitions.map(([key, label, help]) => (
                  <fieldset className="orders-bullet-section" key={key}>
                    <legend>{label}</legend>
                    <div className="orders-bullet-heading">
                      <p>{help}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="products-button products-button--primary"
                        disabled={busy}
                        onClick={() => addBullet(key)}
                      >
                        <Plus />
                        Add bullet
                      </Button>
                    </div>
                    <div className="orders-bullet-list">
                      {sections[key].map((bullet, index) => (
                        <div className="orders-bullet-row" key={bullet.id}>
                          <span aria-hidden="true">{index + 1}</span>
                          <Input
                            value={bullet.value}
                            aria-label={`${label} bullet ${index + 1}`}
                            aria-required="true"
                            placeholder="Enter bullet point"
                            disabled={busy}
                            onChange={(event) => updateBullet(key, bullet.id, event.target.value)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="products-button products-button--danger"
                            aria-label={`Remove ${label.toLowerCase()} bullet ${index + 1}`}
                            disabled={busy || sections[key].length === 1}
                            onClick={() => removeBullet(key, bullet.id)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
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

          <section className="orders-preview-panel" aria-label="Quotation preview">
            <div className="orders-preview-heading">
              <div>
                <span className="products-eyebrow">Document preview</span>
                <h3>Quotation PDF</h3>
              </div>
              {previewUrl && (
                <Button asChild variant="outline" size="sm" className="products-button products-button--primary">
                  <a href={previewUrl} download="quotation.pdf">
                    <Download />
                    Download
                  </a>
                </Button>
              )}
            </div>
            {previewUrl ? (
              <iframe src={previewUrl} title="Generated quotation preview" />
            ) : (
              <div className="orders-preview-empty">
                <FileText aria-hidden="true" />
                <strong>No quotation generated</strong>
                <p>Complete the proposal terms and generate a PDF to preview it here.</p>
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
            onClick={generateQuotation}
          >
            {busy ? <LoaderCircle className="animate-spin" /> : <ScrollText />}
            {busy ? "Generating..." : "Generate quotation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default QuotationDialog
