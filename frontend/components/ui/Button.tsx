import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary cursor-pointer text-primary-foreground hover:bg-primary/90",
        white:
          "flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-full hover:border-brand-indigo-300 hover:bg-brand-indigo-50 transition-colors",
        destructive:
          "bg-destructive cursor-pointer text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input cursor-pointer bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "px-5 py-3 bg-[#fd751f] hover:bg-[#e06211] text-white rounded-xl text-sm font-medium transition-colors",
        ghost: "hover:bg-accent hover:text-accent-foreground cursor-pointer",
        link: "text-primary underline-offset-4 hover:underline cursor-pointer",
        brand:
          "bg-brand-indigo text-white hover:bg-brand-indigo-600 shadow-sm cursor-pointer",
        "brand-outline":
          "border border-brand-indigo text-brand-indigo hover:bg-brand-indigo-50 cursor-pointer",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 rounded-2xl px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
