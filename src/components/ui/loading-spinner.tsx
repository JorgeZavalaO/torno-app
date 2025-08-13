"use client";

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  text?: string;
}

export function LoadingSpinner({ size = "md", text, className, ...props }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  };

  return (
    <div className={cn("flex items-center justify-center gap-2", className)} {...props}>
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-muted-foreground border-t-transparent",
          sizeClasses[size]
        )}
      />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

export function LoadingButton({ 
  children, 
  isLoading, 
  loadingText = "Cargando...", 
  ...props 
}: React.ComponentProps<"button"> & { 
  isLoading?: boolean; 
  loadingText?: string; 
}) {
  return (
    <button {...props} disabled={isLoading || props.disabled}>
      {isLoading ? (
        <div className="flex items-center gap-2">
          <LoadingSpinner size="sm" />
          {loadingText}
        </div>
      ) : (
        children
      )}
    </button>
  );
}
