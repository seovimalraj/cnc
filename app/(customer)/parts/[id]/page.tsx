import { createServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import PartViewer from "@/components/parts/PartViewer";

interface Props { params: { id: string } }

export default async function PartDetailPage({ params }: Props) {
  const supabase = createServerSupabase();
  const { data: part, error } = await supabase
    .from("parts")
    .select("id,name,storage_path,material,finish,meta")
    .eq("id", params.id)
    .single();

  if (error || !part) {
    return (
      <div className="p-8">
        <p className="text-red-600">Part not found.</p>
        <Link href="/(customer)/parts" className="underline">Back</Link>
      </div>
    );
  }

  const fileUrl = part.storage_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/parts/${part.storage_path}` : undefined;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{part.name}</h1>
        <p className="text-sm text-muted-foreground">ID: {part.id}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border p-4">
          <PartViewer src={fileUrl} />
        </div>
        <div className="rounded-xl border p-4 space-y-2">
          <div><span className="font-medium">Material:</span> {part.material ?? "—"}</div>
          <div><span className="font-medium">Finish:</span> {part.finish ?? "—"}</div>
          <pre className="bg-muted/40 p-3 rounded text-xs overflow-x-auto">{JSON.stringify(part.meta ?? {}, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
