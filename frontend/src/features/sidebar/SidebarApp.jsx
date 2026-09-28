import * as React from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import {
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
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
  const layout = host.closest(".ts-app-shell")

  React.useEffect(() => {
    host.dataset.mobileOpen = String(mobileOpen)
    host.inert = window.innerWidth <= 768 && !mobileOpen
    document.body.classList.toggle("ts-sidebar-open", mobileOpen)

    if (mobileOpen) {
      openedOnce.current = true
      window.requestAnimationFrame(() => firstLinkRef.current?.focus())
    } else if (openedOnce.current && window.innerWidth <= 768) {
      triggerRef.current?.focus()
    }

    return () => {
      host.inert = false
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
      host.inert = window.innerWidth <= 768 && !mobileOpen
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
  }, [host, mobileOpen])

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
              <img src="/images/TIMESTOCK_BACK.png" alt="" />
            </span>
            <span className="ts-sidebar-copy ts-brand-copy">
              <strong>TimeStock</strong>
              <small>Inventory management</small>
            </span>
          </a>
        </header>

        <div className="ts-sidebar-divider" />

        <nav className="ts-sidebar-nav" aria-label="Primary navigation">
          {navigation.map((group) => (
            <section className="ts-nav-group" aria-labelledby={`ts-nav-${group.id}`} key={group.id}>
              <h2 className="ts-sidebar-copy ts-nav-label" id={`ts-nav-${group.id}`}>
                {group.label}
              </h2>
              <ul>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = isCurrentRoute(item, currentPath)

                  return (
                    <li key={item.href}>
                      <a
                        ref={item.href === "/Home.html" ? firstLinkRef : undefined}
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
                      </a>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
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

      {layout && createPortal(
        <div className="ts-mobile-nav-bar">
          <span className="ts-mobile-nav-title">TimeStock <span>Navigation</span></span>
          <button
            ref={triggerRef}
            type="button"
            className="ts-sidebar-trigger"
            aria-label={mobileOpen ? "Close navigation panel" : "Open navigation panel"}
            aria-controls={host.id}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <PanelLeftClose aria-hidden="true" /> : <PanelLeftOpen aria-hidden="true" />}
            <span>{mobileOpen ? "Close panel" : "Open panel"}</span>
          </button>
        </div>,
        layout,
      )}

      {createPortal(
        <>
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
