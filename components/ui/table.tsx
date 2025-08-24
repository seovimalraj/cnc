import * as React from "react";

export function Table(props: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table {...props} />;
}
export function TableHeader(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />;
}
export function TableBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}
export function TableRow(props: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} />;
}
export function TableHead(props: React.HTMLAttributes<HTMLTableCellElement>) {
  return <th {...props} />;
}
export function TableCell(props: React.HTMLAttributes<HTMLTableCellElement>) {
  return <td {...props} />;
}
