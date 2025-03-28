import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAPI } from "./ApiProvider";

const CurrentUserContext = createContext();

export const CurrentUserProvider = ({ children }) => {
  const api = useAPI();
  const [user, setUser] = useState();
  const [isInProgress, setIsInProgress] = useState(false);

  const fetchCurrentUser = useCallback(() => {
    setIsInProgress(true);
    api
      .callApi("me")
      .then((user) => setUser(user))
      .finally(() => setIsInProgress(false));
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return (
    <CurrentUserContext.Provider value={{ user, fetch: fetchCurrentUser, isInProgress }}>
      {children}
    </CurrentUserContext.Provider>
  );
};

export const useCurrentUser = () => useContext(CurrentUserContext) ?? {};
