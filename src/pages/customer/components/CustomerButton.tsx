import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const customerButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary: "bg-black text-white hover:bg-black/90 focus-visible:ring-black/20",
        secondary: "bg-white text-black border border-gray-300 hover:bg-gray-50 focus-visible:ring-gray-200",
        ghost: "bg-transparent text-black hover:bg-gray-100 focus-visible:ring-gray-200",
      },
      size: {
        lg: "h-14 min-h-[56px] px-6 text-[17px]",
        md: "h-12 min-h-[48px] px-5 text-base",
        sm: "h-10 min-h-[40px] px-4 text-sm",
      },
      shape: {
        default: "rounded-xl", // 12px rounded
        pill: "rounded-full", // For buttons that should be fully rounded
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "lg",
      shape: "default", // Default to 12px rounded
    },
  }
);

export interface CustomerButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof customerButtonVariants> {
  asChild?: boolean;
}

const CustomerButton = React.forwardRef<HTMLButtonElement, CustomerButtonProps>(
  ({ className, variant, size, shape, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(customerButtonVariants({ variant, size, shape, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

CustomerButton.displayName = "CustomerButton";

export { CustomerButton, customerButtonVariants };
