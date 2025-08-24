import * as React from "react";

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
export function DropdownMenuTrigger(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}
export function DropdownMenuContent(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}
export function DropdownMenuItem(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}
export function DropdownMenuLabel(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}
export function DropdownMenuSeparator(props: React.HTMLAttributes<HTMLHRElement>) {
  return <hr {...props} />;
}

export function DropdownMenuCheckboxItem(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}
