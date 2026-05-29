import { supabase } from "@/integrations/supabase/client";
import type {
  Product,
  ProductChartRow,
  ProductInsert,
  ProductMinimal,
  ProductUpdate,
} from "@/types";
import { throwIfError } from "./base";
import { buildPaginatedResult, pageRange, type PageParams, type PaginatedResult } from "@/utils/pagination";

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from("products").select("*").order("name");
  throwIfError(error);
  return data ?? [];
}

export async function fetchProductsPage(params: PageParams): Promise<PaginatedResult<Product>> {
  const { from, to } = pageRange(params);
  const { data, error, count } = await supabase
    .from("products")
    .select("*", { count: "exact" })
    .order("name")
    .range(from, to);
  throwIfError(error);
  return buildPaginatedResult(data ?? [], count ?? 0, params);
}

export async function fetchProductMinimals(): Promise<ProductMinimal[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, code, name, unit")
    .order("name");
  throwIfError(error);
  return data ?? [];
}

export async function fetchProductsForChart(): Promise<ProductChartRow[]> {
  const { data, error } = await supabase.from("products").select("id, name, unit");
  throwIfError(error);
  return data ?? [];
}

export async function fetchProductCodes(): Promise<Pick<Product, "id" | "code" | "name">[]> {
  const { data, error } = await supabase.from("products").select("id, code, name");
  throwIfError(error);
  return data ?? [];
}

export async function createProduct(payload: ProductInsert): Promise<void> {
  const { error } = await supabase.from("products").insert(payload);
  throwIfError(error);
}

export async function updateProduct(id: string, payload: ProductUpdate): Promise<void> {
  const { error } = await supabase.from("products").update(payload).eq("id", id);
  throwIfError(error);
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  throwIfError(error);
}

export async function countProducts(): Promise<number> {
  const { count, error } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });
  throwIfError(error);
  return count ?? 0;
}
