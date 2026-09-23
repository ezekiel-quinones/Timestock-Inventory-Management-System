import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import {
  Activity,
  AlertCircle,
  Archive,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  FileClock,
  FileDown,
  Fingerprint,
  History,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Phone,
  RefreshCw,
  Settings2,
  ShieldCheck,
  ShieldPlus,
  Trash2,
  UserPlus,
  UsersRound,
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

import {
  CreateAdminDialog,
  CreateEmployeeDialog,
  EmployeePasswordDialog,
  OwnPasswordDialog,
  ProfileDialog,
} from "./SettingsDialogs"
import SettingsNotificationCenter from "./SettingsNotificationCenter"
import {
  deleteOldTransactions,
  getAuditLogs,
  getProfile,
  previewOldTransactions,
} from "./api"

const AUDIT_PAGE_SIZE = 10
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Not available" : dateFormatter.format(date)
}

function formatAction(value) {
  const text = String(value || "Activity").replaceAll("_", " ")
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function getCount(preview, key) {
  return Number(preview?.counts?.[key]) || 0
}

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="settings-section-heading">
      <div>
        <span className="settings-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}

function ActionCard({ icon: Icon, title, description, actionLabel, tone, onClick }) {
  return (
    <Card className="settings-action-card" data-tone={tone}>
      <CardContent className="settings-action-card-content">
        <span className="settings-action-icon" aria-hidden="true">
          <Icon />
        </span>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="settings-button settings-button--neutral"
          onClick={onClick}
        >
          <Icon aria-hidden="true" />
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  )
}

function AccountPanel({ profile, profileLoading, profileError, user, onEditProfile, onChangePassword, reduceMotion }) {
  const fullName = [profile?.firstname || user.firstName, profile?.lastname || user.lastName]
    .filter(Boolean)
    .join(" ")
  const roleLabel = user.role === "admin" ? "Administrator" : "Employee"

  return (
    <motion.div
      className="settings-panel"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.26 }}
    >
      <SectionHeading
        eyebrow="Personal settings"
        title="Account and security"
        description="Manage your profile details and sign-in password."
      />

      {profileError && (
        <Alert variant="destructive" className="settings-inline-alert">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Profile unavailable</AlertTitle>
          <AlertDescription>{profileError}</AlertDescription>
        </Alert>
      )}

      <div className="settings-account-grid">
        <Card className="settings-detail-card">
          <CardContent className="settings-detail-content">
            <div className="settings-card-heading">
              <span className="settings-card-icon" data-tone="cyan" aria-hidden="true">
                <CircleUserRound />
              </span>
              <div>
                <span className="settings-eyebrow">Profile</span>
                <h3>Personal information</h3>
              </div>
              <Badge variant="outline">{roleLabel}</Badge>
            </div>

            {profileLoading ? (
              <div className="settings-profile-skeletons">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            ) : (
              <dl className="settings-profile-list">
                <div>
                  <dt>
                    <CircleUserRound aria-hidden="true" />
                    Full name
                  </dt>
                  <dd>{fullName || "Not provided"}</dd>
                </div>
                <div>
                  <dt>
                    <Mail aria-hidden="true" />
                    Email address
                  </dt>
                  <dd>{profile?.email || "Not provided"}</dd>
                </div>
                {user.role === "employee" && (
                  <div>
                    <dt>
                      <Phone aria-hidden="true" />
                      Contact number
                    </dt>
                    <dd>{profile?.contact_number || "Not provided"}</dd>
                  </div>
                )}
              </dl>
            )}

            <Button
              type="button"
              variant="outline"
              className="settings-button settings-button--primary"
              onClick={onEditProfile}
            >
              <CircleUserRound aria-hidden="true" />
              Edit profile
            </Button>
          </CardContent>
        </Card>

        <Card className="settings-detail-card">
          <CardContent className="settings-detail-content">
            <div className="settings-card-heading">
              <span className="settings-card-icon" data-tone="blue" aria-hidden="true">
                <ShieldCheck />
              </span>
              <div>
                <span className="settings-eyebrow">Security</span>
                <h3>Password access</h3>
              </div>
              <Badge variant="outline">Protected</Badge>
            </div>
            <div className="settings-security-copy">
              <LockKeyhole aria-hidden="true" />
              <div>
                <strong>Keep your account secure</strong>
                <p>Use a password that is unique to TimeStock and has at least 8 characters.</p>
              </div>
            </div>
            <div className="settings-security-note">
              <Fingerprint aria-hidden="true" />
              Password changes apply to your current {roleLabel.toLowerCase()} account.
            </div>
            <Button
              type="button"
              variant="outline"
              className="settings-button settings-button--primary"
              onClick={onChangePassword}
            >
              <KeyRound aria-hidden="true" />
              Change password
            </Button>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}

function TeamPanel({ onCreateAdmin, onCreateEmployee, onResetPassword, reduceMotion }) {
  return (
    <motion.div
      className="settings-panel"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.26 }}
    >
      <SectionHeading
        eyebrow="Administrator controls"
        title="Team access"
        description="Create accounts and help active employees regain access."
      />
      <div className="settings-action-grid">
        <ActionCard
          icon={ShieldPlus}
          title="Administrator access"
          description="Create an account with access to administrative TimeStock features."
          actionLabel="Add administrator"
          tone="cyan"
          onClick={onCreateAdmin}
        />
        <ActionCard
          icon={UserPlus}
          title="Employee access"
          description="Add a team member for routine inventory and transaction work."
          actionLabel="Add employee"
          tone="blue"
          onClick={onCreateEmployee}
        />
        <ActionCard
          icon={KeyRound}
          title="Credential support"
          description="Assign a new password to an active employee account."
          actionLabel="Reset password"
          tone="violet"
          onClick={onResetPassword}
        />
      </div>
      <div className="settings-permission-note">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>Administrator only</strong>
          <p>These actions use the existing account endpoints and write directly to connected records.</p>
        </div>
      </div>
    </motion.div>
  )
}

function MaintenancePanel({ onAuditRefresh, onNotify, reduceMotion }) {
  const [years, setYears] = React.useState("5")
  const [preview, setPreview] = React.useState(null)
  const [previewError, setPreviewError] = React.useState("")
  const [previewLoading, setPreviewLoading] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [deleteBusy, setDeleteBusy] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState("")

  const total = preview
    ? getCount(preview, "orders") +
      getCount(preview, "orderItems") +
      getCount(preview, "stocks") +
      getCount(preview, "stockItems")
    : 0

  async function runPreview() {
    const retentionYears = Number(years)
    if (!Number.isInteger(retentionYears) || retentionYears < 5) {
      setPreview(null)
      setPreviewError("Enter a whole number of at least 5 years.")
      return
    }

    setPreviewLoading(true)
    setPreviewError("")
    try {
      const data = await previewOldTransactions(retentionYears)
      setPreview({
        years: retentionYears,
        cutoffDate: data?.cutoff_date || "",
        message: data?.message || "",
        counts: {
          orders: Number(data?.old_orders) || 0,
          orderItems: Number(data?.old_order_items) || 0,
          stocks: Number(data?.old_stocks) || 0,
          stockItems: Number(data?.old_stock_items) || 0,
        },
      })
    } catch (error) {
      setPreview(null)
      setPreviewError(error.message)
    } finally {
      setPreviewLoading(false)
    }
  }

  async function confirmDelete(event) {
    event.preventDefault()
    if (!preview || total === 0) return

    setDeleteBusy(true)
    setDeleteError("")
    try {
      const archive = await deleteOldTransactions(preview.years)
      const url = window.URL.createObjectURL(archive.blob)
      const link = document.createElement("a")
      link.href = url
      link.download = archive.filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000)

      setConfirmOpen(false)
      setPreview(null)
      onNotify("Old transactions were deleted and the CSV archive was downloaded.")
      onAuditRefresh()
    } catch (error) {
      setDeleteError(error.message)
    } finally {
      setDeleteBusy(false)
    }
  }

  const summaryItems = [
    { key: "orders", label: "Order rows", icon: FileClock },
    { key: "orderItems", label: "Order item rows", icon: Archive },
    { key: "stocks", label: "Stock transactions", icon: Activity },
    { key: "stockItems", label: "Stock item rows", icon: History },
  ]

  return (
    <motion.div
      className="settings-panel"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.26 }}
    >
      <SectionHeading
        eyebrow="Data lifecycle"
        title="Transaction retention"
        description="Preview historical rows before permanently deleting them and downloading the CSV archive."
      />

      <Card className="settings-maintenance-card">
        <CardContent className="settings-maintenance-content">
          <div className="settings-retention-control">
            <span className="settings-card-icon" data-tone="gold" aria-hidden="true">
              <CalendarClock />
            </span>
            <div className="settings-retention-copy">
              <h3>Retention period</h3>
              <p>Only records older than the selected number of years are included.</p>
            </div>
            <div className="settings-years-field">
              <Label htmlFor="settings-retention-years">Years to keep</Label>
              <Input
                id="settings-retention-years"
                type="number"
                min="5"
                step="1"
                value={years}
                aria-invalid={Boolean(previewError)}
                onChange={(event) => {
                  setYears(event.target.value)
                  setPreview(null)
                  setPreviewError("")
                  setDeleteError("")
                }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="settings-button settings-button--primary"
              disabled={previewLoading}
              onClick={runPreview}
            >
              {previewLoading ? <LoaderCircle className="animate-spin" /> : <FileClock />}
              {previewLoading ? "Checking..." : "Preview records"}
            </Button>
          </div>

          {previewError && (
            <Alert variant="destructive" className="settings-inline-alert">
              <AlertCircle aria-hidden="true" />
              <AlertTitle>Preview unavailable</AlertTitle>
              <AlertDescription>{previewError}</AlertDescription>
            </Alert>
          )}

          {preview && (
            <motion.div
              className="settings-preview"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.22 }}
              aria-live="polite"
            >
              <div className="settings-preview-heading">
                <div>
                  <span className="settings-eyebrow">Preview result</span>
                  <h3>{total > 0 ? `${total} rows can be archived` : "No eligible records"}</h3>
                  <p>{preview.message || `Cutoff date: ${formatDate(preview.cutoffDate)}`}</p>
                </div>
                <Badge variant="outline">{preview.years} years</Badge>
              </div>
              <div className="settings-preview-grid">
                {summaryItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <div className="settings-preview-stat" key={item.key}>
                      <Icon aria-hidden="true" />
                      <span>{item.label}</span>
                      <strong>{getCount(preview, item.key).toLocaleString("en-PH")}</strong>
                    </div>
                  )
                })}
              </div>
              <div className="settings-preview-actions">
                <div>
                  <FileDown aria-hidden="true" />
                  A CSV archive downloads automatically after deletion.
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="settings-button settings-button--danger"
                  disabled={total === 0}
                  onClick={() => {
                    setDeleteError("")
                    setConfirmOpen(true)
                  }}
                >
                  <Trash2 aria-hidden="true" />
                  Delete eligible records
                </Button>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      <div className="settings-danger-note">
        <AlertCircle aria-hidden="true" />
        <div>
          <strong>Permanent database action</strong>
          <p>Preview is required first. Deletion cannot be undone after the CSV archive is generated.</p>
        </div>
      </div>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(nextOpen) => {
          if (!deleteBusy) setConfirmOpen(nextOpen)
        }}
      >
        <AlertDialogContent className="settings-confirm-dialog">
          <AlertDialogHeader>
            <span className="settings-confirm-icon" aria-hidden="true">
              <Trash2 />
            </span>
            <AlertDialogTitle>Delete {total.toLocaleString("en-PH")} historical rows?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes transaction records older than {preview?.years || years} years.
              A CSV archive will download when the operation succeeds.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="settings-button settings-button--neutral" disabled={deleteBusy}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="settings-button settings-button--danger"
              disabled={deleteBusy}
              onClick={confirmDelete}
            >
              {deleteBusy ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              {deleteBusy ? "Deleting..." : "Delete and download CSV"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

function AuditPagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (number) => number === 1 || number === totalPages || Math.abs(number - page) <= 1,
  )
  const items = []
  pages.forEach((number, index) => {
    if (index > 0 && number - pages[index - 1] > 1) items.push(`gap-${number}`)
    items.push(number)
  })

  return (
    <nav className="settings-pagination" aria-label="Audit log pages">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="settings-button settings-button--neutral"
        aria-label="Previous audit page"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft />
        Previous
      </Button>
      <div className="settings-pagination-pages">
        {items.map((item) =>
          typeof item === "string" ? (
            <span key={item} aria-hidden="true">...</span>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={`settings-button settings-page-button${item === page ? " is-active" : ""}`}
              aria-label={`Audit page ${item}`}
              aria-current={item === page ? "page" : undefined}
              key={item}
              onClick={() => onChange(item)}
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
        className="settings-button settings-button--neutral"
        aria-label="Next audit page"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
        <ChevronRight />
      </Button>
    </nav>
  )
}

function AuditPanel({ logs, loading, error, page, onPageChange, onRefresh, reduceMotion }) {
  const sortedLogs = [...(logs || [])].sort(
    (left, right) => new Date(right.action_time || 0) - new Date(left.action_time || 0),
  )
  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / AUDIT_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleLogs = sortedLogs.slice(
    (currentPage - 1) * AUDIT_PAGE_SIZE,
    currentPage * AUDIT_PAGE_SIZE,
  )

  return (
    <motion.div
      className="settings-panel"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.26 }}
    >
      <SectionHeading
        eyebrow="Administrative history"
        title="Audit activity"
        description="Review account, maintenance, and inventory changes recorded by TimeStock."
        action={
          <Button
            type="button"
            variant="outline"
            className="settings-button settings-button--neutral"
            disabled={loading}
            onClick={onRefresh}
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive" className="settings-inline-alert">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Audit logs unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="settings-audit-card">
        <div className="settings-audit-summary">
          <div>
            <span className="settings-card-icon" data-tone="violet" aria-hidden="true">
              <History />
            </span>
            <div>
              <strong>{loading ? "Loading activity" : `${sortedLogs.length.toLocaleString("en-PH")} records`}</strong>
              <span>Up to 1,000 recent audit entries</span>
            </div>
          </div>
          {!loading && sortedLogs.length > 0 && (
            <Badge variant="outline">Page {currentPage} of {totalPages}</Badge>
          )}
        </div>

        <div className="settings-audit-table-wrap">
          <Table className="settings-audit-table" aria-busy={loading}>
            <caption className="sr-only">TimeStock audit activity</caption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">ID</TableHead>
                <TableHead scope="col">Entity</TableHead>
                <TableHead scope="col">Entity ID</TableHead>
                <TableHead scope="col">Action</TableHead>
                <TableHead scope="col">Details</TableHead>
                <TableHead scope="col">User</TableHead>
                <TableHead scope="col">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody aria-live="polite">
              {loading &&
                Array.from({ length: 5 }).map((_, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {Array.from({ length: 7 }).map((__, cellIndex) => (
                      <TableCell key={cellIndex}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))}
              {!loading && !error && visibleLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="settings-table-message">
                    <History aria-hidden="true" />
                    No audit activity is available.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                visibleLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="settings-id-cell" title={log.id}>{log.id || "Unknown"}</TableCell>
                    <TableCell><Badge variant="outline">{log.entity || "Unknown"}</Badge></TableCell>
                    <TableCell className="settings-id-cell" title={log.entity_id}>{log.entity_id || "Unknown"}</TableCell>
                    <TableCell><span className="settings-action-label">{formatAction(log.action)}</span></TableCell>
                    <TableCell className="settings-details-cell" title={log.details || ""}>{log.details || "No details"}</TableCell>
                    <TableCell className="settings-id-cell">{log.admin_id || log.employee_id || "System"}</TableCell>
                    <TableCell className="settings-time-cell">{formatDate(log.action_time)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        <div className="settings-audit-mobile" aria-live="polite">
          {loading && Array.from({ length: 3 }).map((_, index) => <Skeleton className="h-44 w-full" key={index} />)}
          {!loading && !error && visibleLogs.length === 0 && (
            <div className="settings-table-message"><History />No audit activity is available.</div>
          )}
          {!loading &&
            visibleLogs.map((log) => (
              <article className="settings-audit-mobile-card" key={log.id}>
                <div>
                  <Badge variant="outline">{log.entity || "Unknown"}</Badge>
                  <span className="settings-action-label">{formatAction(log.action)}</span>
                </div>
                <p>{log.details || "No details"}</p>
                <dl>
                  <div><dt>Record</dt><dd>{log.entity_id || "Unknown"}</dd></div>
                  <div><dt>User</dt><dd>{log.admin_id || log.employee_id || "System"}</dd></div>
                  <div><dt>Time</dt><dd>{formatDate(log.action_time)}</dd></div>
                </dl>
              </article>
            ))}
        </div>

        {!loading && !error && sortedLogs.length > 0 && (
          <div className="settings-audit-footer">
            <p>
              Showing {(currentPage - 1) * AUDIT_PAGE_SIZE + 1}-
              {Math.min(currentPage * AUDIT_PAGE_SIZE, sortedLogs.length)} of {sortedLogs.length}
            </p>
            <AuditPagination page={currentPage} totalPages={totalPages} onChange={onPageChange} />
          </div>
        )}
      </Card>
    </motion.div>
  )
}

function SettingsApp({ user }) {
  const [profile, setProfile] = React.useState(null)
  const [profileLoading, setProfileLoading] = React.useState(true)
  const [profileError, setProfileError] = React.useState("")
  const [auditLogs, setAuditLogs] = React.useState([])
  const [auditLoading, setAuditLoading] = React.useState(user.role === "admin")
  const [auditError, setAuditError] = React.useState("")
  const [auditPage, setAuditPage] = React.useState(1)
  const [feedback, setFeedback] = React.useState(null)
  const [dialogs, setDialogs] = React.useState({
    profile: false,
    ownPassword: false,
    admin: false,
    employee: false,
    employeePassword: false,
  })
  const reduceMotion = useReducedMotion()
  const isAdmin = user.role === "admin"

  React.useEffect(() => {
    const controller = new AbortController()
    setProfileLoading(true)
    getProfile(controller.signal)
      .then((data) => {
        setProfile(data)
        setProfileError("")
      })
      .catch((error) => {
        if (error.name !== "AbortError") setProfileError(error.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setProfileLoading(false)
      })
    return () => controller.abort()
  }, [])

  React.useEffect(() => {
    if (!isAdmin) return undefined
    const controller = new AbortController()
    setAuditLoading(true)
    getAuditLogs(controller.signal)
      .then((data) => {
        setAuditLogs(data)
        setAuditError("")
      })
      .catch((error) => {
        if (error.name !== "AbortError") setAuditError(error.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setAuditLoading(false)
      })
    return () => controller.abort()
  }, [isAdmin])

  React.useEffect(() => {
    if (!feedback) return undefined
    const timeout = window.setTimeout(() => setFeedback(null), 4500)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  function setDialog(name, open) {
    setDialogs((current) => ({ ...current, [name]: open }))
  }

  function notify(message, type = "success") {
    setFeedback({ message, type })
  }

  async function refreshAudit() {
    if (!isAdmin) return
    setAuditLoading(true)
    setAuditError("")
    try {
      setAuditLogs(await getAuditLogs())
      setAuditPage(1)
    } catch (error) {
      setAuditError(error.message)
    } finally {
      setAuditLoading(false)
    }
  }

  const displayName = [profile?.firstname || user.firstName, profile?.lastname || user.lastName]
    .filter(Boolean)
    .join(" ") || "TimeStock user"
  const roleLabel = isAdmin ? "Administrator" : "Employee"

  return (
    <div className="settings-app">
      <motion.header
        className="settings-header"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.3 }}
      >
        <div className="settings-header-identity">
          <span className="settings-eyebrow">Workspace controls</span>
          <h1>Settings</h1>
          <p>Manage profile, access, security, and retained data.</p>
        </div>
        <div className="settings-header-actions">
          <div className="settings-header-notifications">
            <SettingsNotificationCenter />
          </div>
          <div className="settings-profile" aria-label={`${displayName}, ${roleLabel}`}>
            <div>
              <span>Welcome back</span>
              <strong>{displayName}</strong>
              <small>{roleLabel}</small>
            </div>
            <span className="settings-profile-avatar" aria-hidden="true">{isAdmin ? "A" : "E"}</span>
          </div>
        </div>
      </motion.header>

      <div className="settings-content">
        <section className="settings-page-intro">
          <div>
            <span className="settings-eyebrow">Configuration</span>
            <h2>Workspace settings</h2>
            <p>Keep account access and operational records organized from one place.</p>
          </div>
          <Badge variant="outline" className="settings-role-badge">
            <ShieldCheck aria-hidden="true" />
            {roleLabel} access
          </Badge>
        </section>

        <AnimatePresence>
          {feedback && (
            <motion.div
              className="settings-feedback"
              initial={reduceMotion ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
            >
              <Alert variant={feedback.type === "success" ? "success" : "destructive"}>
                {feedback.type === "success" ? <CheckCircle2 /> : <AlertCircle />}
                <AlertTitle>{feedback.type === "success" ? "Saved" : "Action failed"}</AlertTitle>
                <AlertDescription>{feedback.message}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {isAdmin ? (
          <Tabs defaultValue="account" className="settings-tabs">
            <div className="settings-tabs-bar">
              <TabsList className="settings-tabs-list" aria-label="Settings sections">
                <TabsTrigger value="account"><CircleUserRound />Account</TabsTrigger>
                <TabsTrigger value="team"><UsersRound />Team access</TabsTrigger>
                <TabsTrigger value="maintenance"><Archive />Data retention</TabsTrigger>
                <TabsTrigger value="audit"><FileClock />Audit activity</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="account" className="settings-tab-content">
              <AccountPanel
                profile={profile}
                profileLoading={profileLoading}
                profileError={profileError}
                user={user}
                reduceMotion={reduceMotion}
                onEditProfile={() => setDialog("profile", true)}
                onChangePassword={() => setDialog("ownPassword", true)}
              />
            </TabsContent>
            <TabsContent value="team" className="settings-tab-content">
              <TeamPanel
                reduceMotion={reduceMotion}
                onCreateAdmin={() => setDialog("admin", true)}
                onCreateEmployee={() => setDialog("employee", true)}
                onResetPassword={() => setDialog("employeePassword", true)}
              />
            </TabsContent>
            <TabsContent value="maintenance" className="settings-tab-content">
              <MaintenancePanel
                reduceMotion={reduceMotion}
                onNotify={notify}
                onAuditRefresh={refreshAudit}
              />
            </TabsContent>
            <TabsContent value="audit" className="settings-tab-content">
              <AuditPanel
                logs={auditLogs}
                loading={auditLoading}
                error={auditError}
                page={auditPage}
                reduceMotion={reduceMotion}
                onPageChange={setAuditPage}
                onRefresh={refreshAudit}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <AccountPanel
            profile={profile}
            profileLoading={profileLoading}
            profileError={profileError}
            user={user}
            reduceMotion={reduceMotion}
            onEditProfile={() => setDialog("profile", true)}
            onChangePassword={() => setDialog("ownPassword", true)}
          />
        )}
      </div>

      <ProfileDialog
        open={dialogs.profile}
        onOpenChange={(open) => setDialog("profile", open)}
        profile={profile}
        user={user}
        onSaved={(nextProfile, message) => {
          setProfile(nextProfile)
          notify(message)
        }}
      />
      <OwnPasswordDialog
        open={dialogs.ownPassword}
        onOpenChange={(open) => setDialog("ownPassword", open)}
        onSaved={notify}
      />

      {isAdmin && (
        <>
          <CreateAdminDialog
            open={dialogs.admin}
            onOpenChange={(open) => setDialog("admin", open)}
            onSaved={notify}
          />
          <CreateEmployeeDialog
            open={dialogs.employee}
            onOpenChange={(open) => setDialog("employee", open)}
            onSaved={(message) => {
              notify(message)
              refreshAudit()
            }}
          />
          <EmployeePasswordDialog
            open={dialogs.employeePassword}
            onOpenChange={(open) => setDialog("employeePassword", open)}
            onSaved={(message) => {
              notify(message)
              refreshAudit()
            }}
          />
        </>
      )}
    </div>
  )
}

export default SettingsApp
