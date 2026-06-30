"use client";

import { useRef, useState } from "react";
import { ImageIcon, Upload } from "lucide-react";
import { Button, Input } from "@/components/ui";

/**
 * Campo de imagem reutilizável: faz upload do arquivo para /api/upload e guarda
 * a URL resultante em um <input hidden name={name}>, mantendo compatibilidade
 * com os formulários existentes (que leem imageUrl/logoUrl do FormData).
 * Também aceita colar uma URL externa.
 */
export function ImageUpload({
  name,
  defaultValue = "",
}: {
  name: string;
  defaultValue?: string;
}) {
  const [url, setUrl] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error || "Falha no upload.");
      } else {
        setUrl(data.url);
      }
    } catch {
      setError("Falha no upload.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={url} />

      <div className="flex items-center gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Pré-visualização"
            className="h-16 w-16 rounded-lg border border-gray-200 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-300">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}

        <div className="flex flex-col items-start gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            loading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" /> Enviar imagem
          </Button>
          {url && (
            <button
              type="button"
              onClick={() => setUrl("")}
              className="text-xs text-gray-500 hover:text-red-600"
            >
              Remover
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFile}
      />

      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="ou cole uma URL: https://..."
        className="text-xs"
      />

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
