import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchInventoryStock } from "@/services/inventory.service";
import { useProducts } from "./use-products";

export function useInventoryStock() {
  return useQuery({
    queryKey: queryKeys.stock,
    queryFn: fetchInventoryStock,
  });
}

export function useInventoryRows(search: string) {
  const productsQuery = useProducts();
  const stockQuery = useInventoryStock();

  const rows = (productsQuery.data ?? []).map((product) => ({
    ...product,
    qty: stockQuery.data?.get(product.id)?.qty ?? 0,
    weight: stockQuery.data?.get(product.id)?.weight ?? 0,
  }));

  const filtered = rows.filter((row) =>
    [row.name, row.code].some((value) => value?.toLowerCase().includes(search.toLowerCase())),
  );

  return {
    rows: filtered,
    isLoading: productsQuery.isLoading || stockQuery.isLoading,
  };
}
