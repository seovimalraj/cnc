import * as React from "react";

export function Dialog({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
export function DialogTrigger(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}
export function DialogContent(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}
export function DialogHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}
export function DialogFooter(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}
export function DialogTitle(props: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 {...props} />;
}
export function DialogDescription(props: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} />;
}
