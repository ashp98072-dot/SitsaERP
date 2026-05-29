import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  createClient,
  deleteClient,
  fetchClients,
  fetchClientsPage,
  fetchClientSummaries,
  updateClient,
} from "@/services/clients.service";
import type { Client, ClientInsert, ClientUpdate } from "@/types";
import { getErrorMessage } from "@/utils/errors";
import { DEFAULT_PAGE_SIZE } from "@/utils/pagination";
import { toast } from "sonner";

export function useClients() {
  return useQuery({
    queryKey: queryKeys.clients.all,
    queryFn: fetchClients,
  });
}

export function useClientsPage(page: number) {
  return useQuery({
    queryKey: queryKeys.clientsPage(page),
    queryFn: () => fetchClientsPage({ page, pageSize: DEFAULT_PAGE_SIZE }),
  });
}

export function useClientSummaries() {
  return useQuery({
    queryKey: queryKeys.clients.summary,
    queryFn: fetchClientSummaries,
  });
}

export function useClientMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["clients"] });
  };

  const save = useMutation({
    mutationFn: async ({
      editingId,
      payload,
    }: {
      editingId?: string;
      payload: ClientInsert | ClientUpdate;
    }) => {
      if (editingId) {
        await updateClient(editingId, payload as ClientUpdate);
      } else {
        await createClient(payload as ClientInsert);
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Guardado");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      invalidate();
      toast.success("Eliminado");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return { save, remove };
}

export type { Client };
