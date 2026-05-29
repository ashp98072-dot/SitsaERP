import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  createDispatchCompleted,
  createDispatchDraft,
  fetchDispatchById,
  fetchDispatchDashboardStats,
  fetchDispatches,
  fetchDispatchesPage,
  transitionDispatchStatus,
  updateDispatchDraft,
  type DispatchDraftPayload,
} from "@/services/dispatch";
import { fetchDispatchTimeline } from "@/services/dispatch/dispatch-history.service";
import { invalidateInventoryQueries } from "@/hooks/use-inventory";
import { DEFAULT_PAGE_SIZE } from "@/utils/pagination";
import type { DispatchLineItem, NewDispatchHeader } from "@/types";
import type { DispatchAction } from "@/types/dispatch";
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

export function useDispatch(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.dispatches.detail(id ?? ""),
    queryFn: () => fetchDispatchById(id!),
    enabled: Boolean(id),
  });
}

export function useDispatchTimeline(dispatchId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.dispatches.timeline(dispatchId ?? ""),
    queryFn: () => fetchDispatchTimeline(dispatchId!),
    enabled: Boolean(dispatchId),
  });
}

export function useDispatchDashboard() {
  return useQuery({
    queryKey: queryKeys.dispatches.dashboard,
    queryFn: fetchDispatchDashboardStats,
  });
}

export function useCreateDispatchDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DispatchDraftPayload) => createDispatchDraft(payload),
    onSuccess: (dispatch) => {
      invalidateDispatchQueries(queryClient);
      toast.success(`Borrador ${dispatch.correlative ?? ""} guardado`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateDispatchDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DispatchDraftPayload }) =>
      updateDispatchDraft(id, payload),
    onSuccess: () => {
      invalidateDispatchQueries(queryClient);
      toast.success("Borrador actualizado");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useTransitionDispatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      dispatchId,
      action,
      notes,
    }: {
      dispatchId: string;
      action: DispatchAction;
      notes?: string;
    }) => transitionDispatchStatus(dispatchId, action, notes),
    onSuccess: (dispatch, variables) => {
      invalidateDispatchQueries(queryClient);
      if (variables.action === "dispatch") {
        invalidateInventoryQueries(queryClient);
      }
      toast.success(`Estado: ${dispatch.status}`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

/** Despacho directo (flujo legacy: borrador → despachado automático). */
export function useCreateDispatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      header,
      items,
    }: {
      header: NewDispatchHeader;
      items: DispatchLineItem[];
    }) => createDispatchCompleted(header, items),
    onSuccess: () => {
      invalidateDispatchQueries(queryClient);
      invalidateInventoryQueries(queryClient);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

function invalidateDispatchQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["dispatches"] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dispatches.dashboard });
  void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.dashboard });
}
