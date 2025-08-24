import * as React from "react";

export function RadioGroup(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}
export function RadioGroupItem(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="radio" {...props} />;
}
