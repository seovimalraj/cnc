"use client";
import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

export default function PartUploadForm() {
  const supabase = createBrowserClient();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setMessage("Select a CAD file.");
    setLoading(true);
    setMessage(null);
    try {
      const path = `${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("parts").upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { data: row, error: insErr } = await supabase
        .from("parts")
        .insert({ name: name || file.name, storage_path: path })
        .select("id")
        .single();
      if (insErr) throw insErr;

      setMessage(`Uploaded. Part ID: ${row.id}`);
    } catch (err: any) {
      setMessage(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Part Name (optional)</label>
        <input className="w-full rounded-md border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">CAD File (STL/STEP/IGES)</label>
        <input
          type="file"
          accept=".stl,.step,.stp,.iges,.igs,.obj,.glb,.gltf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full rounded-md border px-3 py-2"
          required
        />
      </div>
      <button disabled={loading} className="w-full rounded-md bg-black text-white py-2 disabled:opacity-60">
        {loading ? "Uploading…" : "Upload Part"}
      </button>
      {message && <p className="text-sm mt-1">{message}</p>}
    </form>
  );
}
