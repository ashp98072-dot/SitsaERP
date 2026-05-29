import { supabase } from "@/integrations/supabase/client";
import type {
  ClientSummary,
  Dispatch,
  DispatchItem,
  DispatchLineItem,
  NewDispatchHeader,
  ProductMinimal,
} from "@/types";
import type { DispatchPdfData } from "@/pdf/types";
import { throwIfError } from "./base";
import { createDispatchWithItemsRpc } from "./operations.service";
import { buildPaginatedResult, pageRange, type PageParams, type PaginatedResult } from "@/utils/pagination";

export async function fetchDispatches(): Promise<Dispatch[]> {
  const { data, error } = await supabase
    .from("dispatches")
    .select("*")
    .order("created_at", { ascending: false });
  throwIfError(error);
  return data ?? [];
}

export async function fetchDispatchesPage(
  params: PageParams,
): Promise<PaginatedResult<Dispatch>> {
  const { from, to } = pageRange(params);
  const { data, error, count } = await supabase
    .from("dispatches")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  throwIfError(error);
  return buildPaginatedResult(data ?? [], count ?? 0, params);
}

export async function fetchDispatchItems(dispatchId: string): Promise<DispatchItem[]> {
  const { data, error } = await supabase
    .from("dispatch_items")
    .select("*")
    .eq("dispatch_id", dispatchId);
  throwIfError(error);
  return data ?? [];
}

export async function createDispatchWithItems(
  header: NewDispatchHeader,
  items: DispatchLineItem[],
): Promise<Dispatch> {
  return createDispatchWithItemsRpc(header, items);
}

export async function countDispatches(): Promise<number> {
  const { count, error } = await supabase
    .from("dispatches")
    .select("*", { count: "exact", head: true });
  throwIfError(error);
  return count ?? 0;
}

export function buildDispatchPdfPayload(
  dispatch: Pick<Dispatch, "folio" | "dispatch_date" | "driver" | "vehicle" | "notes" | "client_id">,
  client: ClientSummary | undefined,
  items: DispatchLineItem[],
  products: ProductMinimal[],
  issuedBy?: string | null,
): DispatchPdfData {
  const productsById = new Map(products.map((product) => [product.id, product]));

  return {
    folio: dispatch.folio,
    date: dispatch.dispatch_date,
    client: client ?? { company: "—" },
    driver: dispatch.driver,
    vehicle: dispatch.vehicle,
    notes: dispatch.notes,
    issuedBy,
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
  };
}

export async function buildDispatchPdfFromRecord(
  dispatch: Dispatch,
  clients: ClientSummary[],
  products: ProductMinimal[],
): Promise<DispatchPdfData> {
  const items = await fetchDispatchItems(dispatch.id);
  const client = clients.find((row) => row.id === dispatch.client_id);
  const lineItems: DispatchLineItem[] = items.map((item) => ({
    product_id: item.product_id,
    quantity: item.quantity,
    weight: item.weight,
    unit: item.unit,
    notes: item.notes ?? undefined,
  }));
  return buildDispatchPdfPayload(dispatch, client, lineItems, products);
}
