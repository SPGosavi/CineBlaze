"use client";

import React, { createContext, useContext } from "react";

const WellContext = createContext<boolean>(false);

export interface WellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Well: React.FC<WellProps> = ({
  className = "",
  children,
  ...props
}) => {
  const isInsideWell = useContext(WellContext);

  if (process.env.NODE_ENV !== "production" && isInsideWell) {
    console.error(
      "Gate 4 violation: Well cannot be nested inside another Well. Keep containment to a single layer."
    );
  }

  return (
    <WellContext.Provider value={true}>
      <div
        className={`bg-paper-2 border border-rule rounded-well p-4 sm:p-5 ${className}`}
        {...props}
      >
        {children}
      </div>
    </WellContext.Provider>
  );
};

export default Well;
