import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Movement, type Page, type Vehicle } from "../../shared/lib/api";

/** One place that names every cache entry, so invalidation stays predictable as the app grows. */
export const keys = {
  vehicles: ["vehicles"] as const,
  list: (qs: string) => ["vehicles", "list", qs] as const,
  all: ["vehicles", "all"] as const,
  movements: (id: string, page: number) => ["movements", id, page] as const,
};

export const useVehicleList = (qs: string) =>
  useQuery({ queryKey: keys.list(qs), queryFn: () => api<Page<Vehicle>>(`/vehicles/search?${qs}`), placeholderData: keepPreviousData });

async function fetchAll() {
  const all: Vehicle[] = [];
  for (let page = 1; ; page++) {
    const res = await api<Page<Vehicle>>(`/vehicles?page=${page}&pageSize=100&sortBy=make&sortOrder=asc`);
    all.push(...res.data);
    if (page >= res.pagination.totalPages) return all;
  }
}

/** Every active vehicle: real totals, the command palette and the vehicle sheet all read this one cache entry. */
export const useAllVehicles = () => useQuery({ queryKey: keys.all, queryFn: fetchAll });

export const useMovements = (id: string, page: number) =>
  useQuery({ queryKey: keys.movements(id, page), queryFn: () => api<Page<Movement>>(`/vehicles/${id}/movements?page=${page}&pageSize=10`), placeholderData: keepPreviousData });

/** Runs a write, then refreshes everything that may have changed. */
function useWrite<V>(write: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: keys.vehicles }), qc.invalidateQueries({ queryKey: ["movements"] })]),
  });
}

export const useSaveVehicle = () =>
  useWrite(({ id, body }: { id?: string; body: object }) => (id ? api(`/vehicles/${id}`, "PUT", body) : api("/vehicles", "POST", body)));

export const useRestock = () =>
  useWrite(({ id, quantity, reason }: { id: string; quantity: number; reason?: string }) =>
    api(`/vehicles/${id}/restock`, "POST", { quantity, ...(reason?.trim() ? { reason } : {}) }));

export const useDeleteVehicle = () => useWrite((id: string) => api(`/vehicles/${id}`, "DELETE"));

/** Optimistic: stock drops on screen instantly and rolls back if the server refuses (e.g. someone bought the last unit). */
export function usePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) => api(`/vehicles/${id}/purchase`, "POST", { quantity }),
    onMutate: async ({ id, quantity }) => {
      await qc.cancelQueries({ queryKey: keys.vehicles });
      const snapshot = qc.getQueriesData({ queryKey: keys.vehicles });
      const take = (v: Vehicle) => (v.id === id ? { ...v, quantity: Math.max(0, v.quantity - quantity) } : v);
      qc.setQueriesData<Page<Vehicle> | Vehicle[]>({ queryKey: keys.vehicles }, (old) =>
        Array.isArray(old) ? old.map(take) : old && { ...old, data: old.data.map(take) });
      return { snapshot };
    },
    onError: (_error, _vars, context) => context?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data)),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.vehicles }),
  });
}
