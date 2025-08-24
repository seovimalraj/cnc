import * as React from "react";

export function Avatar(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}
export function AvatarImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  return <img {...props} />;
}
export function AvatarFallback(props: React.HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} />;
}
