import { useCallback, useEffect, useState } from "react";
import { isFF, FF_DM_FILTER_MEMBERS } from "../../../utils/feature-flags";

// Extend Window interface to include DataManager properties
declare global {
  interface Window {
    DM?: {
      store?: {
        apiCall: (method: string, params: any) => Promise<any>;
      };
      apiCall?: (method: string, params: any) => Promise<any>;
    };
  }
}

interface APIUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

// DataManager-style user fetching with pagination
export const useDataManagerUsers = (projectId: string, pageSize = 20, isDeleted = false) => {
  if (!isFF(FF_DM_FILTER_MEMBERS)) return null;
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<APIUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback(
    async (pageNumber = 1, append = false) => {
      if (!projectId) return;

      setIsLoading(true);

      try {
        // Use the correct DataManager API pattern - window.DM is the AppStore
        const store = window?.DM?.store || window?.DM;

        if (!store) {
          console.error("DataManager store not available");
          return;
        }

        const response = await store.apiCall?.("users", {
          page: pageNumber,
          page_size: pageSize,
          project: projectId,

          is_deleted: isDeleted,
        });

        if (response) {
          const newUsers = response?.results ?? response;
          const totalCount = response.count || 0;

          if (append) {
            setUsers((prev) => {
              const updated = [...prev, ...newUsers];
              return updated;
            });
          } else {
            setUsers(newUsers);
          }

          setTotal(totalCount);
          setHasMore(pageNumber * pageSize < totalCount);
          setPage(pageNumber);
        } else {
          console.log("No users found in response or response is invalid");
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, pageSize],
  );

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchUsers(page + 1, true);
    }
  }, [fetchUsers, page, isLoading, hasMore]);

  useEffect(() => {
    fetchUsers(1, false);
  }, [fetchUsers]);

  return {
    users,
    isLoading,
    hasMore,
    total,
    loadMore,
    refetch: () => fetchUsers(1, false),
  };
};
