import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion"
import {
  ArrowRight,
  Boxes,
  ChartLine,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  PackageCheck,
  ShieldCheck,
  UsersRound,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const configuredApiOrigin = import.meta.env.VITE_API_ORIGIN?.replace(/\/$/, "")
const API_ORIGIN =
  configuredApiOrigin || (import.meta.env.DEV ? "http://127.0.0.1:8000" : "")

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address")
    .email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean(),
})

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address")
    .email("Enter a valid email address"),
})

const verificationSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
})

function apiUrl(path) {
  return `${API_ORIGIN}${path}`
}

async function readApiError(response, fallback) {
  try {
    const data = await response.json()
    return data.detail || data.message || fallback
  } catch {
    return fallback
  }
}

function BrandMark({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`grid shrink-0 place-items-center overflow-hidden rounded-xl border border-white/45 bg-white/90 shadow-lg shadow-slate-950/10 ${
          compact ? "h-11 w-11 p-1" : "h-14 w-14 p-1.5"
        }`}
      >
        <img
          src={apiUrl("/images/TIMESTOCK_BG.png")}
          alt="TimeStock IMS"
          className="h-full w-full object-contain"
        />
      </div>
      <div>
        <p
          className={`font-display font-semibold tracking-[-0.02em] ${
            compact ? "text-base text-slate-900" : "text-lg text-white"
          }`}
        >
          TimeStock
        </p>
        <p
          className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${
            compact ? "text-slate-500" : "text-cyan-100/75"
          }`}
        >
          Inventory management
        </p>
      </div>
    </div>
  )
}

function FeatureItem({ icon: Icon, title, description }) {
  return (
    <div className="flex gap-3.5">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/15 bg-white/10 text-cyan-100 backdrop-blur-md">
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-300">{description}</p>
      </div>
    </div>
  )
}

function LoginForm({ onForgotPassword, notice }) {
  const [showPassword, setShowPassword] = React.useState(false)
  const rememberedEmail = window.localStorage.getItem("timestock.rememberedEmail") || ""
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: rememberedEmail,
      password: "",
      remember: Boolean(rememberedEmail),
    },
  })

  async function handleLogin(values) {
    form.clearErrors("root")

    try {
      const response = await fetch(apiUrl("/login"), {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "text/html",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          email: values.email.trim(),
          password: values.password,
        }),
      })

      if (response.redirected) {
        if (values.remember) {
          window.localStorage.setItem(
            "timestock.rememberedEmail",
            values.email.trim(),
          )
        } else {
          window.localStorage.removeItem("timestock.rememberedEmail")
        }

        window.location.assign(response.url)
        return
      }

      if (!response.ok) {
        form.setError("root", {
          type: "server",
          message:
            response.status === 401
              ? "The email or password you entered is incorrect."
              : await readApiError(
                  response,
                  "We could not sign you in. Please try again.",
                ),
        })
        return
      }

      window.location.assign(apiUrl("/"))
    } catch {
      form.setError("root", {
        type: "network",
        message: "The server could not be reached. Check your connection and try again.",
      })
    }
  }

  const rootError = form.formState.errors.root?.message
  const isSubmitting = form.formState.isSubmitting

  return (
    <Form {...form}>
      <form
        noValidate
        className="space-y-5"
        onSubmit={form.handleSubmit(handleLogin)}
      >
        {notice && (
          <Alert variant="success">
            <CheckCircle2 aria-hidden="true" />
            <AlertTitle>Password reset complete</AlertTitle>
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email address</FormLabel>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="name@company.com"
                    className="pl-11 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/15"
                    {...field}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <div className="relative">
                <LockKeyhole
                  className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <FormControl>
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="pl-11 pr-12 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/15"
                    {...field}
                  />
                </FormControl>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? (
                    <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
                  ) : (
                    <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
                  )}
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between gap-4">
          <FormField
            control={form.control}
            name="remember"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="cursor-pointer text-sm font-medium text-slate-600">
                  Remember email
                </FormLabel>
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="link"
            className="h-auto px-0 text-sm font-semibold"
            onClick={onForgotPassword}
          >
            Forgot password?
          </Button>
        </div>

        {rootError && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>Sign-in unsuccessful</AlertTitle>
            <AlertDescription>{rootError}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full bg-[#126a8a] shadow-md shadow-cyan-950/15 hover:bg-[#0d5874]"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <LoaderCircle className="animate-spin" aria-hidden="true" />
              Signing in...
            </>
          ) : (
            <>
              Sign in securely
              <ArrowRight aria-hidden="true" />
            </>
          )}
        </Button>

        <div className="flex items-center justify-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          Protected account access with role-based permissions
        </div>
      </form>
    </Form>
  )
}

function ForgotPasswordForm({ onBack, onCodeSent }) {
  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  async function handleResetRequest(values) {
    form.clearErrors("root")
    const body = new FormData()
    body.append("email", values.email.trim())

    try {
      const response = await fetch(apiUrl("/api/forgot-password/send-code"), {
        method: "POST",
        credentials: "include",
        body,
      })

      if (!response.ok) {
        form.setError("root", {
          type: "server",
          message: await readApiError(
            response,
            "We could not send a verification code. Please try again.",
          ),
        })
        return
      }

      onCodeSent(values.email.trim())
    } catch {
      form.setError("root", {
        type: "network",
        message: "The server could not be reached. Check your connection and try again.",
      })
    }
  }

  const rootError = form.formState.errors.root?.message
  const isSubmitting = form.formState.isSubmitting

  return (
    <Form {...form}>
      <form
        noValidate
        className="space-y-5"
        onSubmit={form.handleSubmit(handleResetRequest)}
      >
        <div className="rounded-lg border border-cyan-100 bg-cyan-50/70 p-4">
          <div className="flex gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white text-[#126a8a] shadow-sm">
              <Mail className="h-[18px] w-[18px]" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Check your inbox</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                We will email a 6-digit code to verify your account before issuing a new password.
              </p>
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account email</FormLabel>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="name@company.com"
                    className="pl-11 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/15"
                    {...field}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {rootError && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>Code not sent</AlertTitle>
            <AlertDescription>{rootError}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full bg-[#126a8a] shadow-md shadow-cyan-950/15 hover:bg-[#0d5874]"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <LoaderCircle className="animate-spin" aria-hidden="true" />
              Sending code...
            </>
          ) : (
            <>
              Send verification code
              <ArrowRight aria-hidden="true" />
            </>
          )}
        </Button>

        <p className="text-center text-sm text-slate-500">
          Remembered your password?{" "}
          <Button
            type="button"
            variant="link"
            className="h-auto px-0 font-semibold"
            onClick={onBack}
          >
            Return to sign in
          </Button>
        </p>
      </form>
    </Form>
  )
}

function VerificationDialog({ email, open, onOpenChange, onVerified }) {
  const form = useForm({
    resolver: zodResolver(verificationSchema),
    defaultValues: { code: "" },
  })

  React.useEffect(() => {
    if (open) {
      form.reset({ code: "" })
    }
  }, [open, form])

  async function handleVerification(values) {
    form.clearErrors("root")
    const body = new FormData()
    body.append("email", email)
    body.append("code", values.code)

    try {
      const response = await fetch(apiUrl("/api/forgot-password/verify-code"), {
        method: "POST",
        credentials: "include",
        body,
      })

      if (!response.ok) {
        form.setError("root", {
          type: "server",
          message: await readApiError(
            response,
            "The code could not be verified. Please try again.",
          ),
        })
        return
      }

      const data = await response.json().catch(() => ({}))
      onVerified(data.message || "A new password has been sent to your email.")
    } catch {
      form.setError("root", {
        type: "network",
        message: "The server could not be reached. Check your connection and try again.",
      })
    }
  }

  const rootError = form.formState.errors.root?.message
  const isSubmitting = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onEscapeKeyDown={(event) => isSubmitting && event.preventDefault()}
        onInteractOutside={(event) => isSubmitting && event.preventDefault()}
      >
        <DialogHeader>
          <div className="mb-2 grid h-11 w-11 place-items-center rounded-lg bg-cyan-50 text-[#126a8a]">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </div>
          <DialogTitle>Verify your email</DialogTitle>
          <DialogDescription>
            Enter the 6-digit code sent to <span className="font-semibold text-slate-700">{email}</span>.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="verification-form"
            className="space-y-4"
            onSubmit={form.handleSubmit(handleVerification)}
          >
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification code</FormLabel>
                  <FormControl>
                    <Input
                      autoFocus
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="000000"
                      className="h-14 text-center font-display text-xl font-semibold tracking-[0.45em] aria-[invalid=true]:border-destructive"
                      {...field}
                      onChange={(event) =>
                        field.onChange(
                          event.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {rootError && (
              <Alert variant="destructive">
                <CircleAlert aria-hidden="true" />
                <AlertDescription>{rootError}</AlertDescription>
              </Alert>
            )}
          </form>
        </Form>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            form="verification-form"
            className="bg-[#126a8a] hover:bg-[#0d5874]"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="animate-spin" aria-hidden="true" />
                Verifying...
              </>
            ) : (
              "Verify code"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function App() {
  const shouldReduceMotion = useReducedMotion()
  const [activeTab, setActiveTab] = React.useState("login")
  const [verificationOpen, setVerificationOpen] = React.useState(false)
  const [resetEmail, setResetEmail] = React.useState("")
  const [notice, setNotice] = React.useState("")

  const entrance = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }

  function showForgotPassword() {
    setNotice("")
    setActiveTab("forgot")
  }

  function showLogin() {
    setActiveTab("login")
  }

  function handleCodeSent(email) {
    setResetEmail(email)
    setVerificationOpen(true)
  }

  function handleVerified(message) {
    setVerificationOpen(false)
    setNotice(message)
    setActiveTab("login")
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="auth-page min-h-dvh lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(440px,0.9fr)]">
        <section
          className="brand-panel relative hidden min-h-dvh overflow-hidden px-12 py-10 lg:flex lg:flex-col xl:px-16 xl:py-12"
          aria-labelledby="brand-heading"
        >
          <div className="blueprint-frame blueprint-frame-one" aria-hidden="true" />
          <div className="blueprint-frame blueprint-frame-two" aria-hidden="true" />

          <motion.div
            className="relative z-10 flex h-full flex-col"
            initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={entrance}
          >
            <BrandMark />

            <div className="my-auto max-w-2xl py-14">
              <div className="mb-6 inline-flex items-center rounded-full border border-cyan-200/20 bg-cyan-100/10 px-3 py-1.5 text-xs font-semibold text-cyan-50 backdrop-blur-md">
                Your operations workspace
              </div>
              <h1
                id="brand-heading"
                className="max-w-xl font-display text-4xl font-semibold leading-[1.12] tracking-[-0.035em] text-white xl:text-[3.4rem]"
              >
                Keep every material in motion.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 xl:text-lg xl:leading-8">
                One clear view of stock, demand, and daily operations for glass and aluminum manufacturing teams.
              </p>

              <div className="mt-10 grid max-w-xl gap-5 sm:grid-cols-2">
                <FeatureItem
                  icon={Boxes}
                  title="Live inventory control"
                  description="Track materials and finished products from one workspace."
                />
                <FeatureItem
                  icon={ChartLine}
                  title="Demand intelligence"
                  description="Turn sales history into practical stock decisions."
                />
                <FeatureItem
                  icon={PackageCheck}
                  title="Order visibility"
                  description="Keep quotations, orders, and movement records aligned."
                />
                <FeatureItem
                  icon={UsersRound}
                  title="Role-based teamwork"
                  description="Give each team member the access their work requires."
                />
              </div>
            </div>

            <div className="brand-glass flex max-w-xl items-center justify-between gap-5 rounded-xl border border-white/15 px-5 py-4 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-300/15 text-emerald-200">
                  <ShieldCheck className="h-[18px] w-[18px]" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Secure workspace access</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">For authorized TimeStock personnel</p>
                </div>
              </div>
              <div className="hidden items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100/70 xl:flex">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                Built around time
              </div>
            </div>
          </motion.div>
        </section>

        <section className="form-panel relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-7 sm:px-8 lg:px-10 lg:py-10">
          <motion.div
            className="relative z-10 w-full max-w-[470px]"
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...entrance, delay: shouldReduceMotion ? 0 : 0.08 }}
          >
            <div className="mb-6 flex justify-center lg:hidden">
              <BrandMark compact />
            </div>

            <Card className="border-slate-200/80 bg-white/95 shadow-auth backdrop-blur-xl">
              <CardHeader className="space-y-2 px-5 pb-5 pt-6 sm:px-8 sm:pt-8">
                <div className="mb-1 hidden h-10 w-10 place-items-center rounded-lg bg-cyan-50 text-[#126a8a] lg:grid">
                  <LockKeyhole className="h-[19px] w-[19px]" aria-hidden="true" />
                </div>
                <CardTitle className="text-[1.7rem] tracking-[-0.03em] sm:text-3xl">
                  Welcome back
                </CardTitle>
                <CardDescription className="text-sm leading-6">
                  Sign in with your company account to continue to TimeStock IMS.
                </CardDescription>
              </CardHeader>

              <CardContent className="px-5 pb-6 sm:px-8 sm:pb-8">
                <Tabs
                  value={activeTab}
                  onValueChange={(value) => {
                    setNotice("")
                    setActiveTab(value)
                  }}
                >
                  <TabsList className="mb-5 grid w-full grid-cols-2 bg-slate-100/90">
                    <TabsTrigger value="login">Sign in</TabsTrigger>
                    <TabsTrigger value="forgot">Reset password</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="mt-0">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key="login-form"
                        initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: "easeOut" }}
                      >
                        <LoginForm
                          onForgotPassword={showForgotPassword}
                          notice={notice}
                        />
                      </motion.div>
                    </AnimatePresence>
                  </TabsContent>

                  <TabsContent value="forgot" className="mt-0">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key="forgot-form"
                        initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: "easeOut" }}
                      >
                        <ForgotPasswordForm
                          onBack={showLogin}
                          onCodeSent={handleCodeSent}
                        />
                      </motion.div>
                    </AnimatePresence>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <p className="mt-5 text-center text-xs leading-5 text-slate-500">
              TimeStock IMS · Glass and aluminum inventory operations
            </p>
          </motion.div>
        </section>
      </main>

      <VerificationDialog
        email={resetEmail}
        open={verificationOpen}
        onOpenChange={setVerificationOpen}
        onVerified={handleVerified}
      />
    </MotionConfig>
  )
}

export default App
