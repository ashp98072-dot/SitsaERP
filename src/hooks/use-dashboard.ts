import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { countClients } from "@/services/clients.service";
import { countProducts, fetchProductsForChart } from "@/services/products.service";
import { countDispatches } from "@/services/dispatches.service";
import { countWarehouseEntries } from "@/services/entries.service";
import { fetchInventoryStock } from "@/services/inventory.service";

export function useDashboardStats() {
  const clients = useQuery({
    queryKey: queryKeys.counts.clients,
    queryFn: countClients,
  });
  const products = useQuery({
    queryKey: queryKeys.counts.products,
    queryFn: countProducts,
  });
  const dispatches = useQuery({
    queryKey: queryKeys.counts.dispatches,
    queryFn: countDispatches,
  });
  const entries = useQuery({
    queryKey: queryKeys.counts.entries,
    queryFn: countWarehouseEntries,
  });

  return {
    clientCount: clients.data ?? 0,
    productCount: products.data ?? 0,
    dispatchCount: dispatches.data ?? 0,
    entryCount: entries.data ?? 0,
    isLoading: clients.isLoading || products.isLoading || dispatches.isLoading || entries.isLoading,
  };
}

export function useStockChartData() {
  const stock = useQuery({
    queryKey: queryKeys.inventory.snapshot,
    queryFn: fetchInventoryStock,
  });
  const products = useQuery({
    queryKey: queryKeys.products.chart,
    queryFn: fetchProductsForChart,
  });

  const chartData = (products.data ?? [])
    .map((product) => ({
      name: product.name.length > 12 ? `${product.name.slice(0, 12)}…` : product.name,
      weight: Number((stock.data?.get(product.id)?.weight ?? 0).toFixed(2)),
    }))
    .slice(0, 10);

  return { chartData, isLoading: stock.isLoading || products.isLoading };
}
