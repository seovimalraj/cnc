"use client";

type Activity = {
  id: string;
  type: "quote" | "part" | "message" | "status";
  title: string;
  timestamp: string; // ISO
  meta?: Record<string, any>;
};

export default function RecentActivityFeed({ items }: { items: Activity[] }) {
  if (!items?.length) return <p className="text-sm text-muted-foreground">No recent activity.</p>;
  return (
    <ul className="space-y-3">
      {items.map((a) => (
        <li key={a.id} className="rounded-xl border p-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">{a.title}</div>
            <div className="text-xs text-muted-foreground">{new Date(a.timestamp).toLocaleString()}</div>
          </div>
          {a.meta ? (
            <pre className="bg-muted/40 mt-2 p-2 rounded text-[11px] overflow-x-auto">{JSON.stringify(a.meta, null, 2)}</pre>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
