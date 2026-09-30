import { SearchContext } from "./SearchContext";
import { useSearch } from "../hooks/useSearch";

/** Supplies search query state and results to the routed pages. */
export const SearchProvider = ({ children }) => {
  const value = useSearch();
  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
};
