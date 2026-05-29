export const queryKeys = {
  clients: {
    all: ["clients"] as const,
    summary: ["clients", "summary"] as const,
  },
  products: {
    all: ["products"] as const,
    minimal: ["products", "minimal"] as const,
    chart: ["products", "chart"] as const,
  },
  suppliers: {
    minimal: ["suppliers", "minimal"] as const,
  },
  dispatches: {
    all: ["dispatches"] as const,
  },
  entries: {
    all: ["entries"] as const,
  },
  /** @deprecated Prefer queryKeys.inventory.enriched */
  stock: ["inventory", "stock-enriched"] as const,
  inventory: {
    enriched: ["inventory", "stock-enriched"] as const,
    snapshot: ["inventory", "stock-snapshot"] as const,
    dashboard: ["inventory", "dashboard"] as const,
    adjustments: ["inventory", "adjustments"] as const,
    kardex: (productId: string) => ["inventory", "kardex", productId] as const,
  },
  counts: {
    clients: ["count", "clients"] as const,
    products: ["count", "products"] as const,
    dispatches: ["count", "dispatches"] as const,
    entries: ["count", "entries"] as const,
  },
  admin: {
    users: ["app-users"] as const,
    domains: ["allowed-domains"] as const,
    emails: ["allowed-emails"] as const,
    audit: ["audit-logs"] as const,
  },
  dispatchesPage: (page: number) => ["dispatches", "page", page] as const,
  clientsPage: (page: number) => ["clients", "page", page] as const,
  productsPage: (page: number) => ["products", "page", page] as const,
  entriesPage: (page: number) => ["entries", "page", page] as const,
} as const;
