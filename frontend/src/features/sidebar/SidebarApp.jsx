import * as React from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import {
  LogOut,
  Menu,
  PanelLeftClose,
  ShieldCheck,
  X,
} from "lucide-react"

import { getNavigationForRole, isCurrentRoute } from "./navigation"

function SidebarApp({ host, role }) {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const triggerRef = React.useRef(null)
  const firstLinkRef = React.useRef(null)
  const openedOnce = React.useRef(false)
  const shouldReduceMotion = useReducedMotion()
  const navigation = getNavigationForRole(role)
  const roleLabel = role === "admin" ? "Administrator" : "Team member"
  const currentPath = window.location.pathname

  React.useEffect(() => {
    const layout = host.closest(".container")
    const pageMain = layout?.querySelector("main") || document.querySelector("main")

    layout?.classList.add("ts-sidebar-layout")
    if (pageMain && !pageMain.id) {
      pageMain.id = "main-content"
    }

    return () => {
      layout?.classList.remove("ts-sidebar-layout")
    }
  }, [host])

  React.useEffect(() => {
    host.dataset.mobileOpen = String(mobileOpen)
    document.body.classList.toggle("ts-sidebar-open", mobileOpen)

    if (mobileOpen) {
      openedOnce.current = true
      window.requestAnimationFrame(() => firstLinkRef.current?.focus())
    } else if (openedOnce.current) {
      triggerRef.current?.focus()
    }

    return () => {
      document.body.classList.remove("ts-sidebar-open")
    }
  }, [host, mobileOpen])

  React.useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && mobileOpen) {
        setMobileOpen(false)
      }
    }

    function handleResize() {
      if (window.innerWidth > 768) {
        setMobileOpen(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    window.addEventListener("resize", handleResize)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("resize", handleResize)
    }
  }, [mobileOpen])

  return (
    <>
      <a className="ts-skip-link" href="#main-content">
        Skip to main content
      </a>

      <motion.div
        className="ts-sidebar-surface"
        initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: "easeOut" }}
      >
        <header className="ts-sidebar-header">
          <a className="ts-brand" href="/" aria-label="TimeStock overview">
            <span className="ts-brand-mark">
              <img src="/images/TIMESTOCK_BG.png" alt="" />
            </span>
            <span className="ts-sidebar-copy ts-brand-copy">
              <strong>TimeStock</strong>
              <small>Inventory management</small>
            </span>
          </a>
          <PanelLeftClose className="ts-collapse-hint" aria-hidden="true" />
        </header>

        <div className="ts-sidebar-divider" />

        <nav className="ts-sidebar-nav" aria-label="Primary navigation">
          <p className="ts-sidebar-copy ts-nav-label">Workspace</p>
          <ul>
            {navigation.map((item, index) => {
              const Icon = item.icon
              const active = isCurrentRoute(item, currentPath)

              return (
                <li key={item.href}>
                  <a
                    ref={index === 0 ? firstLinkRef : undefined}
                    className={`ts-nav-link${active ? " is-active" : ""}`}
                    href={item.href}
                    title={item.label}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="ts-nav-icon">
                      <Icon aria-hidden="true" />
                    </span>
                    <span className="ts-sidebar-copy ts-nav-text">{item.label}</span>
                    {active && <span className="ts-active-dot" aria-hidden="true" />}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        <footer className="ts-sidebar-footer">
          <div className="ts-role-card" title={`${roleLabel} workspace`}>
            <span className="ts-role-icon">
              <ShieldCheck aria-hidden="true" />
            </span>
            <span className="ts-sidebar-copy ts-role-copy">
              <strong>{roleLabel}</strong>
              <small>Secure workspace</small>
            </span>
          </div>
          <a className="ts-signout" href="/logout" title="Sign out">
            <span className="ts-nav-icon">
              <LogOut aria-hidden="true" />
            </span>
            <span className="ts-sidebar-copy ts-nav-text">Sign out</span>
          </a>
        </footer>
      </motion.div>

      {createPortal(
        <>
          <button
            ref={triggerRef}
            type="button"
            className="ts-sidebar-trigger"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-controls={host.id}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>

          <AnimatePresence>
            {mobileOpen && (
              <motion.button
                type="button"
                className="ts-sidebar-overlay"
                aria-label="Close navigation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                onClick={() => setMobileOpen(false)}
              />
            )}
          </AnimatePresence>
        </>,
        document.body,
      )}
    </>
  )
}

export default SidebarApp
