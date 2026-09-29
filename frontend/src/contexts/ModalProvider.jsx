import { useState, useCallback, useMemo } from "react";
import { ModalContext } from "./ModalContext";

/** Holds which media item is currently expanded in the details modal. */
export const ModalProvider = ({ children }) => {
  const [selectedMovie, setSelectedMovie] = useState(null);

  const openMedia = useCallback((item) => setSelectedMovie(item), []);
  const closeMedia = useCallback(() => setSelectedMovie(null), []);

  const value = useMemo(
    () => ({ selectedMovie, openMedia, closeMedia }),
    [selectedMovie, openMedia, closeMedia]
  );

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
};
