import * as React from "react";

export function Progress(props: React.ProgressHTMLAttributes<HTMLProgressElement>) {
  return <progress {...props} />;
}
