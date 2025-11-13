import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { BenjaminLogo } from "@/components/common/BenjaminLogo";
import { CustomerMenuButton } from "./CustomerMenuButton";

interface CustomerHeaderBarProps {
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
}

/**
 * Persistent header row that never remounts. Background matches TopShelf.
 * Logo and menu are memoized to prevent any animations or re-renders.
 * This component is memoized to ensure it never re-renders unnecessarily.
 */
const CustomerHeaderBar = React.memo(function CustomerHeaderBar({ 
  headerLeft,
  headerRight 
}: CustomerHeaderBarProps) {
  // Memoize default header components to prevent re-renders
  const defaultHeaderLeft = useMemo(() => (
    <Link to="/customer/home" className="flex items-center gap-2">
      <BenjaminLogo variant="customer" height={28} />
    </Link>
  ), []);

  const defaultHeaderRight = useMemo(() => <CustomerMenuButton />, []);

  return (
    <div
      className="w-full bg-white sticky top-0 z-40"
      aria-label="App header"
    >
      {/* Container sets padding: horizontal AND vertical (equal) */}
      <div className="flex items-center justify-between px-5 pt-5 pb-5">
        <div className="flex items-center">{headerLeft || defaultHeaderLeft}</div>
        <div className="flex items-center">{headerRight || defaultHeaderRight}</div>
      </div>
    </div>
  );
});

export default CustomerHeaderBar;

