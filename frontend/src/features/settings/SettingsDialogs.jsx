import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  AlertCircle,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Save,
  ShieldPlus,
  UserPlus,
  UserRoundPen,
  X,
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

import EmployeePicker from "./EmployeePicker"
import {
  changeEmployeePassword,
  changeOwnPassword,
  createAdmin,
  createEmployee,
  updateProfile,
} from "./api"

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function FieldError({ children }) {
  if (!children) return null
  return <p className="settings-field-error">{children}</p>
}

function DialogFrame({ open, onOpenChange, busy, icon: Icon, title, description, children, wide = false }) {
  const reduceMotion = useReducedMotion()

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !busy && onOpenChange(nextOpen)}>
      <DialogContent
        overlayClassName="settings-dialog-overlay"
        className={`settings-dialog${wide ? " settings-dialog--wide" : ""}`}
      >
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          <DialogHeader className="settings-dialog-header">
            <span className="settings-dialog-icon" aria-hidden="true">
              <Icon />
            </span>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </DialogHeader>
          {children}
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}

function FormActions({ busy, submitLabel, busyLabel }) {
  return (
    <DialogFooter className="settings-dialog-footer">
      <DialogClose asChild>
        <Button type="button" variant="outline" className="settings-button settings-button--neutral">
          <X aria-hidden="true" />
          Cancel
        </Button>
      </DialogClose>
      <Button
        type="submit"
        variant="outline"
        className="settings-button settings-button--primary"
        disabled={busy}
      >
        {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
        {busy ? busyLabel : submitLabel}
      </Button>
    </DialogFooter>
  )
}

function CreateAdminDialog({ open, onOpenChange, onSaved }) {
  const [values, setValues] = React.useState({ firstname: "", lastname: "", email: "", password: "" })
  const [errors, setErrors] = React.useState({})
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setValues({ firstname: "", lastname: "", email: "", password: "" })
    setErrors({})
  }, [open])

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
  }

  async function submit(event) {
    event.preventDefault()
    const nextValues = {
      firstname: values.firstname.trim(),
      lastname: values.lastname.trim(),
      email: values.email.trim(),
      password: values.password,
    }
    const nextErrors = {}
    if (nextValues.firstname.length < 2 || nextValues.firstname.length > 50) {
      nextErrors.firstname = "First name must contain 2 to 50 characters."
    }
    if (nextValues.lastname.length < 2 || nextValues.lastname.length > 50) {
      nextErrors.lastname = "Last name must contain 2 to 50 characters."
    }
    if (!emailPattern.test(nextValues.email)) nextErrors.email = "Enter a valid email address."
    if (nextValues.password.length < 8 || nextValues.password.length > 128) {
      nextErrors.password = "Password must contain 8 to 128 characters."
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setBusy(true)
    try {
      await createAdmin(nextValues)
      onOpenChange(false)
      onSaved("Administrator account created.")
    } catch (error) {
      setErrors({ form: error.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <DialogFrame
      open={open}
      onOpenChange={onOpenChange}
      busy={busy}
      icon={ShieldPlus}
      title="Create administrator"
      description="Add an administrator account with full TimeStock access."
      wide
    >
      <form className="settings-form" onSubmit={submit} noValidate>
        {errors.form && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}
        <div className="settings-form-grid">
          <div className="settings-field">
            <Label htmlFor="settings-admin-firstname">First name</Label>
            <Input
              id="settings-admin-firstname"
              autoComplete="given-name"
              value={values.firstname}
              maxLength={50}
              aria-invalid={Boolean(errors.firstname)}
              onChange={(event) => update("firstname", event.target.value)}
            />
            <FieldError>{errors.firstname}</FieldError>
          </div>
          <div className="settings-field">
            <Label htmlFor="settings-admin-lastname">Last name</Label>
            <Input
              id="settings-admin-lastname"
              autoComplete="family-name"
              value={values.lastname}
              maxLength={50}
              aria-invalid={Boolean(errors.lastname)}
              onChange={(event) => update("lastname", event.target.value)}
            />
            <FieldError>{errors.lastname}</FieldError>
          </div>
          <div className="settings-field settings-field--full">
            <Label htmlFor="settings-admin-email">Email address</Label>
            <Input
              id="settings-admin-email"
              type="email"
              autoComplete="email"
              value={values.email}
              aria-invalid={Boolean(errors.email)}
              onChange={(event) => update("email", event.target.value)}
            />
            <FieldError>{errors.email}</FieldError>
          </div>
          <div className="settings-field settings-field--full">
            <Label htmlFor="settings-admin-password">Temporary password</Label>
            <Input
              id="settings-admin-password"
              type="password"
              autoComplete="new-password"
              value={values.password}
              maxLength={128}
              aria-invalid={Boolean(errors.password)}
              onChange={(event) => update("password", event.target.value)}
            />
            <FieldError>{errors.password}</FieldError>
            <small>Use at least 8 characters.</small>
          </div>
        </div>
        <FormActions busy={busy} submitLabel="Create administrator" busyLabel="Creating..." />
      </form>
    </DialogFrame>
  )
}

function CreateEmployeeDialog({ open, onOpenChange, onSaved }) {
  const [values, setValues] = React.useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    contact_number: "",
  })
  const [errors, setErrors] = React.useState({})
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setValues({ firstname: "", lastname: "", email: "", password: "", contact_number: "" })
    setErrors({})
  }, [open])

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
  }

  async function submit(event) {
    event.preventDefault()
    const payload = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, value.trim()]),
    )
    const nextErrors = {}
    if (!payload.firstname) nextErrors.firstname = "First name is required."
    if (!payload.lastname) nextErrors.lastname = "Last name is required."
    if (!emailPattern.test(payload.email)) nextErrors.email = "Enter a valid email address."
    if (!payload.password) nextErrors.password = "Password is required."
    if (!payload.contact_number) nextErrors.contact_number = "Contact number is required."
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setBusy(true)
    try {
      await createEmployee(payload)
      onOpenChange(false)
      onSaved("Employee account created.")
    } catch (error) {
      setErrors({ form: error.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <DialogFrame
      open={open}
      onOpenChange={onOpenChange}
      busy={busy}
      icon={UserPlus}
      title="Add employee"
      description="Create an employee account for daily inventory operations."
      wide
    >
      <form className="settings-form" onSubmit={submit} noValidate>
        {errors.form && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}
        <div className="settings-form-grid">
          <div className="settings-field">
            <Label htmlFor="settings-employee-firstname">First name</Label>
            <Input
              id="settings-employee-firstname"
              autoComplete="given-name"
              value={values.firstname}
              aria-invalid={Boolean(errors.firstname)}
              onChange={(event) => update("firstname", event.target.value)}
            />
            <FieldError>{errors.firstname}</FieldError>
          </div>
          <div className="settings-field">
            <Label htmlFor="settings-employee-lastname">Last name</Label>
            <Input
              id="settings-employee-lastname"
              autoComplete="family-name"
              value={values.lastname}
              aria-invalid={Boolean(errors.lastname)}
              onChange={(event) => update("lastname", event.target.value)}
            />
            <FieldError>{errors.lastname}</FieldError>
          </div>
          <div className="settings-field settings-field--full">
            <Label htmlFor="settings-employee-email">Email address</Label>
            <Input
              id="settings-employee-email"
              type="email"
              autoComplete="email"
              value={values.email}
              aria-invalid={Boolean(errors.email)}
              onChange={(event) => update("email", event.target.value)}
            />
            <FieldError>{errors.email}</FieldError>
          </div>
          <div className="settings-field">
            <Label htmlFor="settings-employee-password">Temporary password</Label>
            <Input
              id="settings-employee-password"
              type="password"
              autoComplete="new-password"
              value={values.password}
              aria-invalid={Boolean(errors.password)}
              onChange={(event) => update("password", event.target.value)}
            />
            <FieldError>{errors.password}</FieldError>
          </div>
          <div className="settings-field">
            <Label htmlFor="settings-employee-contact">Contact number</Label>
            <Input
              id="settings-employee-contact"
              type="tel"
              autoComplete="tel"
              value={values.contact_number}
              aria-invalid={Boolean(errors.contact_number)}
              onChange={(event) => update("contact_number", event.target.value)}
            />
            <FieldError>{errors.contact_number}</FieldError>
          </div>
        </div>
        <FormActions busy={busy} submitLabel="Add employee" busyLabel="Creating..." />
      </form>
    </DialogFrame>
  )
}

function EmployeePasswordDialog({ open, onOpenChange, onSaved }) {
  const [employee, setEmployee] = React.useState(null)
  const [password, setPassword] = React.useState("")
  const [errors, setErrors] = React.useState({})
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setEmployee(null)
    setPassword("")
    setErrors({})
  }, [open])

  async function submit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!employee?.id) nextErrors.employee = "Select an employee."
    if (password.trim().length < 8) nextErrors.password = "Password must contain at least 8 characters."
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setBusy(true)
    try {
      const result = await changeEmployeePassword({
        target_employee_id: employee.id,
        new_password: password.trim(),
      })
      onOpenChange(false)
      onSaved(result?.message || "Employee password changed.")
    } catch (error) {
      setErrors({ form: error.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <DialogFrame
      open={open}
      onOpenChange={onOpenChange}
      busy={busy}
      icon={KeyRound}
      title="Reset employee password"
      description="Choose an active employee and assign a new password."
    >
      <form className="settings-form" onSubmit={submit} noValidate>
        {errors.form && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}
        <div className="settings-field">
          <Label>Employee</Label>
          <EmployeePicker
            value={employee}
            disabled={busy}
            invalid={Boolean(errors.employee)}
            onChange={(nextEmployee) => {
              setEmployee(nextEmployee)
              setErrors((current) => ({ ...current, employee: undefined, form: undefined }))
            }}
          />
          <FieldError>{errors.employee}</FieldError>
        </div>
        <div className="settings-field">
          <Label htmlFor="settings-reset-password">New password</Label>
          <Input
            id="settings-reset-password"
            type="password"
            autoComplete="new-password"
            value={password}
            aria-invalid={Boolean(errors.password)}
            onChange={(event) => {
              setPassword(event.target.value)
              setErrors((current) => ({ ...current, password: undefined, form: undefined }))
            }}
          />
          <FieldError>{errors.password}</FieldError>
          <small>Use at least 8 characters.</small>
        </div>
        <FormActions busy={busy} submitLabel="Change password" busyLabel="Updating..." />
      </form>
    </DialogFrame>
  )
}

function OwnPasswordDialog({ open, onOpenChange, onSaved }) {
  const [values, setValues] = React.useState({ current: "", next: "", confirm: "" })
  const [errors, setErrors] = React.useState({})
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setValues({ current: "", next: "", confirm: "" })
    setErrors({})
  }, [open])

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
  }

  async function submit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!values.current) nextErrors.current = "Current password is required."
    if (values.next.length < 8) nextErrors.next = "New password must contain at least 8 characters."
    if (values.confirm !== values.next) nextErrors.confirm = "Passwords do not match."
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setBusy(true)
    try {
      const result = await changeOwnPassword(values.current, values.next)
      onOpenChange(false)
      onSaved(result?.message || "Password updated.")
    } catch (error) {
      setErrors({ form: error.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <DialogFrame
      open={open}
      onOpenChange={onOpenChange}
      busy={busy}
      icon={LockKeyhole}
      title="Change your password"
      description="Confirm your current password before choosing a new one."
    >
      <form className="settings-form" onSubmit={submit} noValidate>
        {errors.form && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}
        <div className="settings-field">
          <Label htmlFor="settings-current-password">Current password</Label>
          <Input
            id="settings-current-password"
            type="password"
            autoComplete="current-password"
            value={values.current}
            aria-invalid={Boolean(errors.current)}
            onChange={(event) => update("current", event.target.value)}
          />
          <FieldError>{errors.current}</FieldError>
        </div>
        <div className="settings-field">
          <Label htmlFor="settings-new-password">New password</Label>
          <Input
            id="settings-new-password"
            type="password"
            autoComplete="new-password"
            value={values.next}
            aria-invalid={Boolean(errors.next)}
            onChange={(event) => update("next", event.target.value)}
          />
          <FieldError>{errors.next}</FieldError>
        </div>
        <div className="settings-field">
          <Label htmlFor="settings-confirm-password">Confirm new password</Label>
          <Input
            id="settings-confirm-password"
            type="password"
            autoComplete="new-password"
            value={values.confirm}
            aria-invalid={Boolean(errors.confirm)}
            onChange={(event) => update("confirm", event.target.value)}
          />
          <FieldError>{errors.confirm}</FieldError>
        </div>
        <FormActions busy={busy} submitLabel="Update password" busyLabel="Updating..." />
      </form>
    </DialogFrame>
  )
}

function ProfileDialog({ open, onOpenChange, profile, user, onSaved }) {
  const [values, setValues] = React.useState({ firstname: "", lastname: "", email: "", contact_number: "" })
  const [errors, setErrors] = React.useState({})
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setValues({
      firstname: profile?.firstname || user.firstName || "",
      lastname: profile?.lastname || user.lastName || "",
      email: profile?.email || "",
      contact_number: profile?.contact_number || "",
    })
    setErrors({})
  }, [open, profile, user.firstName, user.lastName])

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
  }

  async function submit(event) {
    event.preventDefault()
    const payload = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, value.trim()]),
    )
    const nextErrors = {}
    if (!payload.firstname) nextErrors.firstname = "First name is required."
    if (!payload.lastname) nextErrors.lastname = "Last name is required."
    if (!emailPattern.test(payload.email)) nextErrors.email = "Enter a valid email address."
    if (user.role === "employee" && !payload.contact_number) {
      nextErrors.contact_number = "Contact number is required."
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setBusy(true)
    try {
      const nextProfile = await updateProfile(payload)
      onOpenChange(false)
      onSaved(nextProfile, "Profile updated.")
    } catch (error) {
      setErrors({ form: error.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <DialogFrame
      open={open}
      onOpenChange={onOpenChange}
      busy={busy}
      icon={UserRoundPen}
      title="Edit profile"
      description="Update the contact details associated with your account."
      wide
    >
      <form className="settings-form" onSubmit={submit} noValidate>
        {errors.form && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}
        <div className="settings-form-grid">
          <div className="settings-field">
            <Label htmlFor="settings-profile-firstname">First name</Label>
            <Input
              id="settings-profile-firstname"
              autoComplete="given-name"
              value={values.firstname}
              aria-invalid={Boolean(errors.firstname)}
              onChange={(event) => update("firstname", event.target.value)}
            />
            <FieldError>{errors.firstname}</FieldError>
          </div>
          <div className="settings-field">
            <Label htmlFor="settings-profile-lastname">Last name</Label>
            <Input
              id="settings-profile-lastname"
              autoComplete="family-name"
              value={values.lastname}
              aria-invalid={Boolean(errors.lastname)}
              onChange={(event) => update("lastname", event.target.value)}
            />
            <FieldError>{errors.lastname}</FieldError>
          </div>
          <div className="settings-field settings-field--full">
            <Label htmlFor="settings-profile-email">Email address</Label>
            <Input
              id="settings-profile-email"
              type="email"
              autoComplete="email"
              value={values.email}
              aria-invalid={Boolean(errors.email)}
              onChange={(event) => update("email", event.target.value)}
            />
            <FieldError>{errors.email}</FieldError>
          </div>
          {user.role === "employee" && (
            <div className="settings-field settings-field--full">
              <Label htmlFor="settings-profile-contact">Contact number</Label>
              <Input
                id="settings-profile-contact"
                type="tel"
                autoComplete="tel"
                value={values.contact_number}
                aria-invalid={Boolean(errors.contact_number)}
                onChange={(event) => update("contact_number", event.target.value)}
              />
              <FieldError>{errors.contact_number}</FieldError>
            </div>
          )}
        </div>
        <FormActions busy={busy} submitLabel="Save profile" busyLabel="Saving..." />
      </form>
    </DialogFrame>
  )
}

export {
  CreateAdminDialog,
  CreateEmployeeDialog,
  EmployeePasswordDialog,
  OwnPasswordDialog,
  ProfileDialog,
}
