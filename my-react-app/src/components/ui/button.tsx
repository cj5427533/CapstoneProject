import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonSize = "default" | "sm" | "lg" | "icon" | null | undefined; 
export type ButtonVariant = "default" | "destructive" | "outline" | "ghost" | "link" | null | undefined; 

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => { 
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:opacity-90",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";