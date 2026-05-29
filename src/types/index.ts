export type {
  AppRole,
  UnitType,
  MovementType,
  Client,
  ClientInsert,
  ClientUpdate,
  ClientSummary,
  Product,
  ProductInsert,
  ProductUpdate,
  ProductMinimal,
  ProductChartRow,
  Supplier,
  SupplierMinimal,
  Dispatch,
  DispatchInsert,
  DispatchItem,
  DispatchItemInsert,
  WarehouseEntry,
  WarehouseEntryInsert,
  InventoryMovement,
  StockSnapshot,
  DispatchLineItem,
  NewDispatchHeader,
  Warehouse,
  AuditLog,
} from "./domain";

export type {
  StockAlertLevel,
  InventoryStockRow,
  KardexRow,
  InventoryAdjustment,
  InventoryDashboardStats,
} from "./inventory";
export { KARDEX_KIND_LABELS } from "./inventory";

export type {
  DispatchStatus,
  DispatchAction,
  DispatchTimelineEntry,
  DispatchDashboardStats,
} from "./dispatch";
export {
  DISPATCH_STATUS_LABELS,
  DISPATCH_ACTION_LABELS,
} from "./dispatch";
