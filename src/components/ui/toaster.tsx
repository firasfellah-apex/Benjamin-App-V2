import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

/**
 * Toaster Component
 * 
 * Layout-neutral toast notification system for foreground push notifications.
 * - Uses Radix UI Toast with automatic portal rendering (renders to document.body)
 * - ToastViewport uses fixed positioning and high z-index (z-[9999])
 * - Mounted outside all layout containers in main.tsx
 * - Never participates in flex layout calculations
 */
export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      {/* ToastViewport is portaled to document.body with fixed positioning - layout-neutral */}
      <ToastViewport />
    </ToastProvider>
  );
}
