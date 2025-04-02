import { useQuery } from "@tanstack/react-query";
import { useAPI } from "apps/labelstudio/src/providers/ApiProvider";
import { useCallback } from "react";

export function useStorageCard(target: "import" | "export", projectId?: number) {
  const api = useAPI();
  const storageTypesQueryKey = ["storage-types", target];
  const storagesQueryKey = ["storages", target, projectId];

  const {
    data: storageTypes,
    isLoading: storageTypesLoading,
    isSuccess: storageTypesLoaded,
    refetch: reloadStorageTypes,
  } = useQuery({
    queryKey: storageTypesQueryKey,
    async queryFn() {
      const result = await api.callApi("storageTypes", {
        params: {
          target,
        },
        errorFilter() {
          return true;
        },
      });

      if (!result?.$meta.ok) return [];

      return result;
    },
  });

  const {
    data: storages,
    isLoading: storagesLoading,
    isSuccess: storagesLoaded,
    refetch: reloadStoragesList,
  } = useQuery({
    queryKey: storagesQueryKey,
    async queryFn() {
      const result = await api.callApi("listStorages", {
        params: {
          project: projectId,
          target,
        },
        errorFilter() {
          return true;
        },
      });

      if (!result?.$meta.ok) return [];

      return result;
    },
  });

  const fetchStorages = useCallback(async () => {
    reloadStoragesList({ queryKey: storagesQueryKey });
    reloadStorageTypes({ queryKey: storageTypesQueryKey });
  }, [storagesQueryKey, storageTypesQueryKey]);

  return {
    storageTypes,
    storageTypesLoading,
    storageTypesLoaded,
    reloadStorageTypes,

    storages,
    storagesLoading,
    storagesLoaded,
    reloadStoragesList,
    fetchStorages,
  };
}
