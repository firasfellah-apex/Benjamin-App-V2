import { createPortal } from "react-dom";
import { Toaster } from "@/components/ui/toaster";

/**
 * ToasterPortal Component
 * 
 * Portals the Toaster to document.body to ensure it's completely layout-neutral.
 * This prevents the toaster from interfering with flex/scroll layouts in the app.
 * 
 * - Renders Toaster via React portal to document.body
 * - Guards against SSR (returns null if document is undefined)
 * - No extra wrappers - Radix Toast already handles portal rendering internally
 */
export function ToasterPortal() {
  if (typeof document === "undefined") return null;
  return createPortal(<Toaster />, document.body);
}

