import { createPortal } from "react-dom";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";

/**
 * ToasterPortal Component
 * 
 * Portals the Toaster to document.body to ensure it's completely layout-neutral.
 * This prevents the toaster from interfering with flex/scroll layouts in the app.
 * 
 * CRITICAL: This component MUST be mounted at app root (main.tsx), NOT inside
 * page layouts or scroll containers. Mounting it elsewhere will cause layout regressions.
 * 
 * - Renders Toaster via React portal to document.body
 * - Guards against SSR (returns null if document is undefined)
 * - Dev-only warning if mounted inside a scroll container (layout regression check)
 * - No extra wrappers - Radix Toast already handles portal rendering internally
 */
export function ToasterPortal() {
  if (typeof document === "undefined") return null;

  // Dev-only guardrail: warn if ToasterPortal is mounted inside a scroll container
  useEffect(() => {
    if (import.meta.env.DEV) {
      const portalTarget = document.body;
      const portalElement = portalTarget.querySelector('[data-radix-toast-viewport]');
      
      if (portalElement) {
        // Check if viewport is inside a scroll container (layout regression)
        let parent = portalElement.parentElement;
        while (parent && parent !== document.body) {
          const style = window.getComputedStyle(parent);
          if (style.overflow === 'auto' || style.overflow === 'scroll' || 
              style.overflowY === 'auto' || style.overflowY === 'scroll') {
            console.warn(
              '[ToasterPortal] ⚠️ LAYOUT REGRESSION DETECTED: ' +
              'Toaster viewport is inside a scroll container. ' +
              'This will cause layout issues. Ensure ToasterPortal is mounted at app root (main.tsx), ' +
              'not inside page layouts or scroll containers.',
              { parent: parent.className, scrollContainer: parent }
            );
            break;
          }
          parent = parent.parentElement;
        }
      }
    }
  }, []);

  return createPortal(<Toaster />, document.body);
}

