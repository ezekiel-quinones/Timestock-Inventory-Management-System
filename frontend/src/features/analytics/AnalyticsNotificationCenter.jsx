import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import {
  AlertCircle,
  ArrowUpRight,
  Bell,
  ChevronDown,
  Clock3,
  PackageSearch,
  TrendingUp,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { getAlerts } from "./api"
import { cleanServerText } from "./data"

function getSeenAlerts() {
  try {
    const value = JSON.parse(window.localStorage.getItem("seenAlerts") || "[]")
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function getMessages(groups) {
  return Object.values(groups || {}).flatMap((alerts) =>
    Array.isArray(alerts) ? alerts.map((alert) => String(alert.message || "")) : [],
  )
}

function getMaterialId(alert) {
  const directId = alert?.material_id || alert?.materialId || alert?.item_id || alert?.mat_id
  if (directId) return String(directId)

  const message = String(alert?.message || "")
  const patterns = [
    /([A-Z]{2,}-\d{1,6})/,
    /([A-Z]{2,}\d{1,6})/,
    /([A-Z]{1,4}-[A-Z]{1,4}-\d{1,4})/,
  ]
  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match) return match[1]
  }
  return ""
}

function getCategoryIcon(category) {
  const value = String(category).toLowerCase()
  if (value.includes("reorder")) return PackageSearch
  if (value.includes("minimum")) return AlertCircle
  return TrendingUp
}

function AnalyticsNotificationCenter() {
  const [open, setOpen] = React.useState(false)
  const [groups, setGroups] = React.useState({})
  const [expanded, setExpanded] = React.useState(() => new Set())
  const [unseenCount, setUnseenCount] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const wrapperRef = React.useRef(null)
  const panelRef = React.useRef(null)
  const reduceMotion = useReducedMotion()

  React.useEffect(() => {
    const controller = new AbortController()
    let active = true
    let requestInFlight = false

    async function loadAlerts() {
      if (requestInFlight) return
      requestInFlight = true

      try {
        const data = await getAlerts(controller.signal)
        if (!active) return

        const nextGroups = data?.alerts || {}
        const messages = getMessages(nextGroups)
        setGroups(nextGroups)
        setError("")

        if (open) {
          window.localStorage.setItem("seenAlerts", JSON.stringify(messages))
          setUnseenCount(0)
        } else {
          const seen = getSeenAlerts()
          setUnseenCount(messages.filter((message) => !seen.includes(message)).length)
        }
      } catch (requestError) {
        if (requestError.name !== "AbortError" && active) {
          setError("Alerts are temporarily unavailable.")
        }
      } finally {
        if (active) {
          setLoading(false)
          requestInFlight = false
        }
      }
    }

    loadAlerts()
    const interval = open ? null : window.setInterval(loadAlerts, 1000)

    return () => {
      active = false
      controller.abort()
      if (interval) window.clearInterval(interval)
    }
  }, [open])

  React.useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false)
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    window.requestAnimationFrame(() => panelRef.current?.focus())

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  function selectAlert(alert) {
    const message = String(alert?.message || "")
    const seen = getSeenAlerts()
    if (message && !seen.includes(message)) {
      seen.push(message)
      window.localStorage.setItem("seenAlerts", JSON.stringify(seen))
    }
    setUnseenCount(getMessages(groups).filter((item) => !seen.includes(item)).length)

    const materialId = getMaterialId(alert)
    if (materialId) {
      window.location.assign(`/Materials.html?highlight=${encodeURIComponent(materialId)}`)
    }
  }

  function toggleCategory(category) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  const totalAlerts = getMessages(groups).length

  return (
    <div className="analytics-notifications" ref={wrapperRef}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="analytics-button analytics-notifications-trigger"
        aria-label={open ? "Close system alerts" : "Open system alerts"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell aria-hidden="true" />
        {unseenCount > 0 && (
          <span className="analytics-notifications-count" aria-label={`${unseenCount} new alerts`}>
            {unseenCount > 99 ? "99+" : unseenCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              className="analytics-notifications-backdrop"
              aria-label="Close system alerts"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.16 }}
              onClick={() => setOpen(false)}
            />
            <motion.section
              ref={panelRef}
              className="analytics-notifications-panel"
              role="dialog"
              aria-label="System alerts"
              tabIndex={-1}
              initial={reduceMotion ? false : { opacity: 0, y: -7, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.985 }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
            >
              <div className="analytics-notifications-heading">
                <div>
                  <span className="analytics-eyebrow">Notification center</span>
                  <h2>System alerts</h2>
                </div>
                <Badge variant="secondary">{totalAlerts} active</Badge>
              </div>

              <div className="analytics-notifications-body" aria-live="polite">
                {loading && <p className="analytics-notifications-state">Loading alerts...</p>}
                {!loading && error && <p className="analytics-notifications-state is-error">{error}</p>}
                {!loading && !error && totalAlerts === 0 && (
                  <p className="analytics-notifications-state">No current alerts.</p>
                )}

                {!loading && !error && Object.entries(groups).map(([category, alerts]) => {
                  const CategoryIcon = getCategoryIcon(category)
                  const items = Array.isArray(alerts) ? alerts : []
                  const isExpanded = expanded.has(category)

                  return (
                    <section className="analytics-alert-group" key={category}>
                      <div className="analytics-alert-group-heading">
                        <CategoryIcon aria-hidden="true" />
                        <div>
                          <h3>{cleanServerText(category)}</h3>
                          <p>{items.length} current</p>
                        </div>
                      </div>
                      {items.length === 0 && <p className="analytics-alert-empty">No current alerts</p>}
                      {items.slice(0, isExpanded ? items.length : 1).map((alert, index) => (
                        <button
                          type="button"
                          className="analytics-alert-item"
                          key={`${alert.message}-${index}`}
                          onClick={() => selectAlert(alert)}
                        >
                          <span>{cleanServerText(alert.message)}</span>
                          <small>
                            <Clock3 aria-hidden="true" />
                            {cleanServerText(alert.display_time || alert.timestamp || "Just now")}
                          </small>
                          {getMaterialId(alert) && <ArrowUpRight aria-hidden="true" />}
                        </button>
                      ))}
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="analytics-button analytics-alert-toggle"
                          aria-expanded={isExpanded}
                          onClick={() => toggleCategory(category)}
                        >
                          {isExpanded ? "View less" : `View ${items.length - 1} more`}
                          <ChevronDown className={isExpanded ? "is-expanded" : ""} />
                        </Button>
                      )}
                    </section>
                  )
                })}
              </div>
            </motion.section>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AnalyticsNotificationCenter
