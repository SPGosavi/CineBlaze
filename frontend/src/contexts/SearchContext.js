import { createContext, useContext } from "react";

export const SearchContext = createContext(null);

/** Reads search state. Must be called beneath a SearchProvider. */
export const useSearchContext = () => {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("useSearchContext must be used within a SearchProvider");
  }
  return ctx;
};
