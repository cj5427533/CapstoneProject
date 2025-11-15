import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border bg-card text-card-foreground shadow", className)} {...props} />;
}
export function CardHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div className="space-y-1.5 p-6" {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />;
}
export function CardContent(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div className="p-6 pt-0" {...props} />;
}
export function CardFooter(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div className="flex items-center p-6 pt-0" {...props} />;
}
