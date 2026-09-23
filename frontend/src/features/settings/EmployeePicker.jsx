import * as React from "react"
import { Check, ChevronsUpDown, LoaderCircle, Search, UserRoundSearch } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { getEmployees } from "./api"

function EmployeePicker({ value, onChange, disabled = false, invalid = false }) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [employees, setEmployees] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState("")
  const [activeIndex, setActiveIndex] = React.useState(-1)
  const deferredQuery = React.useDeferredValue(query.trim())

  React.useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setLoadError("")
      try {
        const data = await getEmployees(
          deferredQuery.length >= 2 ? deferredQuery : "",
          deferredQuery.length >= 2 ? 50 : 25,
          controller.signal,
        )
        setEmployees(Array.isArray(data) ? data : [])
        setActiveIndex(-1)
      } catch (error) {
        if (error.name !== "AbortError") {
          setEmployees([])
          setLoadError("Employees could not be loaded.")
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, deferredQuery ? 250 : 0)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [deferredQuery])

  function selectEmployee(employee) {
    onChange(employee)
    setQuery("")
    setOpen(false)
  }

  function handleKeyDown(event) {
    if (employees.length === 0) return

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % employees.length)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((current) => (current <= 0 ? employees.length - 1 : current - 1))
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault()
      selectEmployee(employees[activeIndex])
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="settings-employee-trigger"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          disabled={disabled}
        >
          <span>
            <UserRoundSearch aria-hidden="true" />
            {value?.display_name || "Select an active employee"}
          </span>
          <ChevronsUpDown aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="settings-employee-popover"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="settings-employee-search">
          <Search aria-hidden="true" />
          <Input
            autoFocus
            value={query}
            placeholder="Search employee name..."
            aria-label="Search employees"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="settings-employee-options" role="listbox" aria-label="Active employees">
          {loading && (
            <div className="settings-picker-state">
              <LoaderCircle className="animate-spin" aria-hidden="true" />
              Loading employees...
            </div>
          )}
          {!loading && loadError && <div className="settings-picker-state is-error">{loadError}</div>}
          {!loading && !loadError && employees.length === 0 && (
            <div className="settings-picker-state">No employees found.</div>
          )}
          {!loading &&
            !loadError &&
            employees.map((employee, index) => (
              <button
                type="button"
                role="option"
                aria-selected={value?.id === employee.id}
                className={`settings-employee-option${index === activeIndex ? " is-active" : ""}`}
                key={employee.id}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectEmployee(employee)}
              >
                <span>{employee.display_name}</span>
                {value?.id === employee.id && <Check aria-hidden="true" />}
              </button>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default EmployeePicker
