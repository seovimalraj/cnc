import * as React from "react";

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} />;
}
export function SelectTrigger(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}
export function SelectContent(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}
export function SelectItem(props: React.LiHTMLAttributes<HTMLLIElement>) {
  return <li {...props} />;
}
export function SelectValue(props: React.HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} />;
}
