import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  createWarehouseEntry,
  fetchWarehouseEntries,
  fetchWarehouseEntriesPage,
} from "@/services/entries.service";
import { DEFAULT_PAGE_SIZE } from "@/utils/pagination";
import { fetchSupplierMinimals } from "@/services/suppliers.service";
import type { WarehouseEntryInsert } from "@/types";
import { getErrorMessage } from "@/utils/errors";
import { toast } from "sonner";
import { useProductMinimals } from "./use-products";

export function useWarehouseEntries() {
  return useQuery({
    queryKey: queryKeys.entries.all,
    queryFn: fetchWarehouseEntries,
  });
}

export function useWarehouseEntriesPage(page: number) {
  return useQuery({
    queryKey: queryKeys.entriesPage(page),
    queryFn: () => fetchWarehouseEntriesPage({ page, pageSize: DEFAULT_PAGE_SIZE }),
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: queryKeys.suppliers.minimal,
    queryFn: fetchSupplierMinimals,
  });
}

export function useEntryFormData() {
  const products = useProductMinimals();
  const suppliers = useSuppliers();
  return { products, suppliers };
}

export function useCreateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: WarehouseEntryInsert) => createWarehouseEntry(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["entries"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stock });
      toast.success("Ingreso registrado");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
