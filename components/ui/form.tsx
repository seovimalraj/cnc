import * as React from "react";

export function Form(props: React.FormHTMLAttributes<HTMLFormElement>) {
  return <form {...props} />;
}
export function FormItem(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}
export function FormLabel(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} />;
}
export function FormControl(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}
export function FormMessage(props: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} />;
}
export function FormField({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
