import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  createDispatchWithItems,
  fetchDispatches,
  fetchDispatchesPage,
} from "@/services/dispatches.service";
import { DEFAULT_PAGE_SIZE } from "@/utils/pagination";
import type { DispatchLineItem, NewDispatchHeader } from "@/types";
import { getErrorMessage } from "@/utils/errors";
import { toast } from "sonner";

export function useDispatches() {
  return useQuery({
    queryKey: queryKeys.dispatches.all,
    queryFn: fetchDispatches,
  });
}

export function useDispatchesPage(page: number) {
  return useQuery({
    queryKey: queryKeys.dispatchesPage(page),
    queryFn: () => fetchDispatchesPage({ page, pageSize: DEFAULT_PAGE_SIZE }),
  });
}

export function useCreateDispatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      header,
      items,
    }: {
      header: NewDispatchHeader;
      items: DispatchLineItem[];
    }) => createDispatchWithItems(header, items),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dispatches"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stock });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
