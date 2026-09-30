import { createContext, useContext } from "react";

export const ModalContext = createContext(null);

/**
 * Controls the media details modal.
 *
 * Needed because the pages become route children once the router lands, so
 * an `onExpand` callback can no longer be drilled down from the layout.
 */
export const useModalContext = () => {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error("useModalContext must be used within a ModalProvider");
  }
  return ctx;
};
