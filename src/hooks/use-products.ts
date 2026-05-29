import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  createProduct,
  deleteProduct,
  fetchProductMinimals,
  fetchProducts,
  fetchProductsPage,
  fetchProductsForChart,
  updateProduct,
} from "@/services/products.service";
import type { Product, ProductInsert, ProductUpdate } from "@/types";
import { getErrorMessage } from "@/utils/errors";
import { toast } from "sonner";

export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products.all,
    queryFn: fetchProducts,
  });
}

export function useProductsPage(page: number) {
  return useQuery({
    queryKey: queryKeys.productsPage(page),
    queryFn: () => fetchProductsPage({ page, pageSize: DEFAULT_PAGE_SIZE }),
  });
}

export function useProductMinimals() {
  return useQuery({
    queryKey: queryKeys.products.minimal,
    queryFn: fetchProductMinimals,
  });
}

export function useProductsForChart() {
  return useQuery({
    queryKey: queryKeys.products.chart,
    queryFn: fetchProductsForChart,
  });
}

export function useProductMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const save = useMutation({
    mutationFn: async ({
      editingId,
      payload,
    }: {
      editingId?: string;
      payload: ProductInsert | ProductUpdate;
    }) => {
      if (editingId) {
        await updateProduct(editingId, payload as ProductUpdate);
      } else {
        await createProduct(payload as ProductInsert);
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Guardado");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      invalidate();
      toast.success("Eliminado");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return { save, remove };
}

export type { Product };
