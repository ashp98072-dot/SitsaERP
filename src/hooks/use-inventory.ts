import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchInventoryAdjustments,
  fetchInventoryDashboardStats,
  fetchInventoryStockEnriched,
  fetchProductKardex,
  registerInventoryAdjustment,
  type InventoryAdjustmentInput,
} from "@/services/inventory.service";
import { getErrorMessage } from "@/utils/errors";
import { toast } from "sonner";

export function useInventoryStockEnriched(search = "") {
  return useQuery({
    queryKey: queryKeys.inventory.enriched,
    queryFn: fetchInventoryStockEnriched,
    select: (rows) =>
      rows.filter((row) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return row.code.toLowerCase().includes(q) || row.name.toLowerCase().includes(q);
      }),
  });
}

/** @deprecated Use useInventoryStockEnriched */
export function useInventoryStock() {
  return useInventoryStockEnriched();
}

/** @deprecated Use useInventoryStockEnriched */
export function useInventoryRows(search: string) {
  const query = useInventoryStockEnriched(search);
  return {
    rows: query.data ?? [],
    isLoading: query.isLoading,
  };
}

export function useInventoryDashboard() {
  return useQuery({
    queryKey: queryKeys.inventory.dashboard,
    queryFn: fetchInventoryDashboardStats,
  });
}

export function useProductKardex(productId: string | null) {
  return useQuery({
    queryKey: queryKeys.inventory.kardex(productId ?? ""),
    queryFn: () => fetchProductKardex(productId!),
    enabled: Boolean(productId),
  });
}

export function useInventoryAdjustments() {
  return useQuery({
    queryKey: queryKeys.inventory.adjustments,
    queryFn: () => fetchInventoryAdjustments(),
  });
}

export function useRegisterInventoryAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: InventoryAdjustmentInput) => registerInventoryAdjustment(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.enriched });
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.snapshot });
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.dashboard });
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.adjustments });
      void queryClient.invalidateQueries({ queryKey: ["inventory", "kardex"] });
      toast.success("Ajuste de inventario registrado");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function invalidateInventoryQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.enriched });
  void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.snapshot });
  void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.dashboard });
  void queryClient.invalidateQueries({ queryKey: ["inventory", "kardex"] });
}
