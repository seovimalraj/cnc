import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

interface Props { params: { id: string } }

export default async function QuoteDetailPage({ params }: Props) {
  const supabase = createClient();
  const { data: quote, error } = await supabase
    .from("quotes")
    .select("id,status,total,created_at,items,customer_notes,pricing_breakdown")
    .eq("id", params.id)
    .single();

  if (error || !quote) {
    return (
      <div className="p-8">
        <p className="text-red-600">Quote not found.</p>
        <Link href="/(customer)/quotes" className="underline">Back</Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Quote #{quote.id}</h1>
        <p className="text-sm text-muted-foreground">Status: {quote.status}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border p-4">
          <h2 className="font-medium mb-2">Items</h2>
          <pre className="bg-muted/40 p-3 rounded text-xs overflow-x-auto">{JSON.stringify(quote.items ?? [], null, 2)}</pre>
        </div>
        <div className="rounded-xl border p-4 space-y-3">
          <div>
            <h2 className="font-medium mb-2">Pricing</h2>
            <pre className="bg-muted/40 p-3 rounded text-xs overflow-x-auto">{JSON.stringify(quote.pricing_breakdown ?? {}, null, 2)}</pre>
          </div>
          <div>
            <h2 className="font-medium mb-2">Notes</h2>
            <p className="text-sm whitespace-pre-wrap">{quote.customer_notes ?? "—"}</p>
          </div>
          <div className="text-lg font-semibold">Total: {quote.total ?? 0}</div>
        </div>
      </div>
    </div>
  );
}
