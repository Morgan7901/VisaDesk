"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  documentId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploader({ documentId, onSuccess, onCancel }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch(`/api/documents/${documentId}/upload`, {
      method: "POST",
      body: fd,
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Upload failed.");
      setUploading(false);
      return;
    }

    setUploading(false);
    onSuccess();
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors",
          file
            ? "border-slate-300 bg-slate-50"
            : "border-slate-200 hover:border-slate-400"
        )}
        onClick={() => inputRef.current?.click()}
      >
        {file ? (
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 shrink-0 text-slate-500" />
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-slate-700">
                {file.name}
              </p>
              <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              className="shrink-0 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 py-1">
            <Upload className="h-5 w-5 text-slate-400" />
            <p className="text-sm text-slate-500">Click to select a file</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setFile(f);
              setError(null);
            }
          }}
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={uploading}
          className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || uploading}
          className="flex items-center gap-1.5 rounded-md bg-[#0f172a] px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Upload
        </button>
      </div>
    </div>
  );
}
