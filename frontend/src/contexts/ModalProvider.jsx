import { useState } from "react";
import { ModalContext } from "./ModalContext";

/** Holds which media item is currently expanded in the details modal. */
export const ModalProvider = ({ children }) => {
  const [selectedMovie, setSelectedMovie] = useState(null);

  const openMedia = (item) => setSelectedMovie(item);
  const closeMedia = () => setSelectedMovie(null);

  return (
    <ModalContext.Provider value={{ selectedMovie, openMedia, closeMedia }}>
      {children}
    </ModalContext.Provider>
  );
};
