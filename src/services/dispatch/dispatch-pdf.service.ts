import { supabase } from "@/integrations/supabase/client";
import type { DispatchPdfData } from "@/pdf/types";
import type {
  ClientSummary,
  Dispatch,
  DispatchLineItem,
  ProductMinimal,
} from "@/types";
import type { DispatchStatus } from "@/types/dispatch";
import { fetchClientSummaries } from "../clients.service";
import { fetchProductMinimals } from "../products.service";
import { fetchDispatchItems } from "./dispatch.service";

const STATUS_LABELS: Record<DispatchStatus, string> = {
  borrador: "BORRADOR",
  pendiente: "PENDIENTE",
  aprobado: "APROBADO",
  despachado: "DESPACHADO",
  cancelado: "CANCELADO",
};

export function formatDispatchCorrelative(dispatch: Pick<Dispatch, "correlative" | "folio">): string {
  if (dispatch.correlative) return dispatch.correlative;
  return `DM-${String(dispatch.folio).padStart(6, "0")}`;
}

export function buildDispatchPdfPayload(
  dispatch: Pick<
    Dispatch,
    | "id"
    | "folio"
    | "correlative"
    | "dispatch_date"
    | "driver"
    | "vehicle"
    | "destination"
    | "notes"
    | "logistics_notes"
    | "client_id"
    | "status"
    | "created_at"
  >,
  client: ClientSummary | undefined,
  items: DispatchLineItem[],
  products: ProductMinimal[],
  options?: {
    issuedBy?: string | null;
    warehouseName?: string | null;
    generatedAt?: string;
  },
): DispatchPdfData {
  const productsById = new Map(products.map((product) => [product.id, product]));
  const correlative = formatDispatchCorrelative(dispatch);
  const generatedAt = options?.generatedAt ?? new Date().toISOString();

  return {
    dispatchId: dispatch.id,
    correlative,
    folio: dispatch.folio,
    date: dispatch.dispatch_date,
    generatedAt,
    status: dispatch.status as DispatchStatus,
    statusLabel: STATUS_LABELS[dispatch.status as DispatchStatus] ?? String(dispatch.status).toUpperCase(),
    client: {
      company: client?.company ?? "—",
      nit: client?.nit,
      address: client?.address,
      contact_name: client?.contact_name,
      phone: client?.phone ?? null,
    },
    driver: dispatch.driver,
    vehicle: dispatch.vehicle,
    destination: dispatch.destination,
    notes: dispatch.notes,
    logisticsNotes: dispatch.logistics_notes,
    warehouseName: options?.warehouseName ?? null,
    issuedBy: options?.issuedBy ?? null,
    items: items.map((item) => {
      const product = productsById.get(item.product_id);
      return {
        code: product?.code ?? "",
        name: product?.name ?? "",
        quantity: item.quantity,
        weight: item.weight,
        unit: item.unit,
        notes: item.notes,
      };
    }),
    qrPayload: JSON.stringify({
      id: dispatch.id,
      correlative,
      date: dispatch.dispatch_date,
      v: 1,
    }),
  };
}

export async function buildDispatchPdfFromRecord(
  dispatch: Dispatch,
  options?: { issuedBy?: string | null; warehouseName?: string | null },
): Promise<DispatchPdfData> {
  const [clients, products, items] = await Promise.all([
    fetchClientSummaries(),
    fetchProductMinimals(),
    fetchDispatchItems(dispatch.id),
  ]);
  const client = clients.find((row) => row.id === dispatch.client_id);
  const lineItems: DispatchLineItem[] = items.map((item) => ({
    product_id: item.product_id,
    quantity: item.quantity,
    weight: item.weight,
    unit: item.unit,
    notes: item.notes ?? undefined,
  }));

  let warehouseName = options?.warehouseName ?? null;
  if (dispatch.warehouse_id && !warehouseName) {
    const { data } = await supabase
      .from("warehouses")
      .select("name, branch_name")
      .eq("id", dispatch.warehouse_id)
      .maybeSingle();
    if (data) {
      warehouseName = data.branch_name ? `${data.name} · ${data.branch_name}` : data.name;
    }
  }

  let issuedBy = options?.issuedBy ?? null;
  if (!issuedBy && dispatch.created_by) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", dispatch.created_by)
      .maybeSingle();
    issuedBy = profile?.full_name ?? profile?.email ?? null;
  }

  return buildDispatchPdfPayload(dispatch, client, lineItems, products, {
    issuedBy,
    warehouseName,
  });
}
