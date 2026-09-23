import {
  ArrowLeftRight,
  Boxes,
  ChartNoAxesCombined,
  ClipboardPenLine,
  Factory,
  FileChartColumn,
  Hammer,
  LayoutDashboard,
  Settings,
} from "lucide-react"

const navigationItems = [
  {
    label: "Overview",
    href: "/Home.html",
    icon: LayoutDashboard,
    roles: ["admin", "employee"],
    aliases: ["/"],
  },
  {
    label: "Products",
    href: "/product.html",
    icon: Boxes,
    roles: ["admin", "employee"],
  },
  {
    label: "Materials",
    href: "/Materials.html",
    icon: Hammer,
    roles: ["admin", "employee"],
  },
  {
    label: "Analytics",
    href: "/Analytics.html",
    icon: ChartNoAxesCombined,
    roles: ["admin"],
  },
  {
    label: "Reports",
    href: "/Reports.html",
    icon: FileChartColumn,
    roles: ["admin"],
  },
  {
    label: "Transactions",
    href: "/Transactions.html",
    icon: ArrowLeftRight,
    roles: ["admin", "employee"],
  },
  {
    label: "Suppliers",
    href: "/Supplier.html",
    icon: Factory,
    roles: ["admin", "employee"],
  },
  {
    label: "Orders & quotes",
    href: "/Order_and_Quotation.html",
    icon: ClipboardPenLine,
    roles: ["admin"],
  },
  {
    label: "Settings",
    href: "/Settings.html",
    icon: Settings,
    roles: ["admin", "employee"],
  },
]

export function getNavigationForRole(role) {
  return navigationItems.filter((item) => item.roles.includes(role))
}

export function isCurrentRoute(item, pathname) {
  const normalizedPath = pathname.toLowerCase().replace(/\/$/, "") || "/"
  const routes = [item.href, ...(item.aliases || [])]

  return routes.some((route) => route.toLowerCase() === normalizedPath)
}
