"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { UploadCloud, FileUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadAttachments } from "@/lib/attachments/actions";
import {
  ALLOWED_EXTENSIONS,
  MAX_BYTES,
  validateFile,
  formatBytes,
} from "@/lib/attachments/types";
import { pulse } from "@/lib/motion/anime";

/*
  Drag-and-drop upload zone for the attachment vault.

  - Drop area highlights on dragover with the amber-soft border.
  - Multi-file selection supported (native input multiple + dropped files).
  - Per-file progress shown during upload.
  - Pulses the zone on successful upload (motion vocabulary: pulse).

  Server validation runs again in the action. The client-side validation
  here is for fast feedback only.
*/

type ProgressItem = {
  id: string;
  filename: string;
  bytes: number;
  status: "queued" | "uploading" | "ok" | "error";
  error?: string;
};

const ACCEPT_ATTR = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",");

export function UploadZone({ slug }: { slug: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [items, setItems] = useState<ProgressItem[]>([]);
  const [busy, setBusy] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;

      // Filter and stage progress items. Anything that fails client-side
      // validation gets a friendly error row immediately.
      const staged: ProgressItem[] = [];
      const toSend: File[] = [];
      for (const f of list) {
        const err = validateFile(f.name, f.size, f.type);
        const id = `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 7)}`;
        if (err) {
          staged.push({
            id,
            filename: f.name,
            bytes: f.size,
            status: "error",
            error: err,
          });
        } else {
          staged.push({
            id,
            filename: f.name,
            bytes: f.size,
            status: "uploading",
          });
          toSend.push(f);
        }
      }
      setItems((prev) => [...staged, ...prev]);

      if (toSend.length === 0) return;

      setBusy(true);
      try {
        const fd = new FormData();
        for (const f of toSend) fd.append("files", f);
        const { results } = await uploadAttachments(slug, fd);

        setItems((prev) => {
          const next = [...prev];
          for (const r of results) {
            const targetName = r.ok ? r.row.filename : r.filename;
            const idx = next.findIndex(
              (p) => p.filename === targetName && p.status === "uploading",
            );
            if (idx === -1) continue;
            if (r.ok) {
              next[idx] = { ...next[idx], status: "ok" };
            } else {
              next[idx] = { ...next[idx], status: "error", error: r.error };
            }
          }
          return next;
        });

        const okCount = results.filter((r) => r.ok).length;
        const errCount = results.length - okCount;
        if (okCount > 0) {
          toast.success(
            okCount === 1
              ? "1 file uploaded"
              : `${okCount} files uploaded`,
          );
          if (zoneRef.current) pulse(zoneRef.current);
          router.refresh();
        }
        if (errCount > 0) {
          toast.error(
            errCount === 1
              ? "1 file did not upload"
              : `${errCount} files did not upload`,
          );
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
        setItems((prev) =>
          prev.map((p) =>
            p.status === "uploading"
              ? { ...p, status: "error", error: "Upload failed" }
              : p,
          ),
        );
      } finally {
        setBusy(false);
      }
    },
    [router, slug],
  );

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }
  function onDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }
  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer?.files?.length) {
      handleFiles(e.dataTransfer.files);
    }
  }

  return (
    <section className="space-y-3">
      <div
        ref={zoneRef}
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "panel relative flex flex-col items-center justify-center gap-3 px-6 py-10 text-center",
          "border-dashed transition-colors",
          dragOver
            ? "border-[var(--amber-soft)] bg-[rgba(217,119,6,0.06)]"
            : "border-[rgba(245,239,225,0.12)]",
        )}
      >
        <UploadCloud
          className={cn(
            "h-7 w-7",
            dragOver ? "text-[var(--amber-soft)]" : "text-[var(--ink-dim)]",
          )}
          aria-hidden
        />
        <div className="space-y-1">
          <p className="text-sm text-[var(--ink)]">
            Drop files here, or use Choose files below.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
            PDF · IMAGES · MARKDOWN · TXT · DOCX · XLSX · UP TO {formatBytes(MAX_BYTES)}
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) {
              handleFiles(e.target.files);
              // Reset so picking the same file again still fires change.
              e.target.value = "";
            }
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm",
            "border-[rgba(217,119,6,0.45)] text-[var(--amber-soft)]",
            "hover:bg-[rgba(217,119,6,0.08)] transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed",
          )}
        >
          <FileUp className="h-3.5 w-3.5" aria-hidden />
          Choose files
        </button>
      </div>

      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((it) => (
            <li
              key={it.id}
              className={cn(
                "panel flex items-center justify-between gap-3 px-3 py-2 text-xs",
                it.status === "ok" &&
                  "border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.04)]",
                it.status === "error" &&
                  "border-[rgba(220,38,38,0.35)] bg-[rgba(220,38,38,0.04)]",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[var(--ink)]">{it.filename}</p>
                {it.error && (
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#fda4a4]">
                    <AlertTriangle className="h-2.5 w-2.5" aria-hidden />
                    {it.error}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                <span>{formatBytes(it.bytes)}</span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5",
                    it.status === "queued" && "text-[var(--ink-dim)]",
                    it.status === "uploading" && "text-[var(--amber-soft)]",
                    it.status === "ok" && "text-[#86efac]",
                    it.status === "error" && "text-[#fda4a4]",
                  )}
                >
                  {it.status === "queued" && "QUEUED"}
                  {it.status === "uploading" && "UPLOADING"}
                  {it.status === "ok" && "UPLOADED"}
                  {it.status === "error" && "FAILED"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
