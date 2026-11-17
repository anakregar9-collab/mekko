"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

const MAX_SIDE = 1600;

/** Downscale in the browser so phone photos upload fast (and stay under the server limit). */
async function shrink(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], "fotografija.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

/** Optional photo field: preview, remove, client-side resize. The server re-checks type and size. */
export function PhotoInput({ name, label, error }: { name: string; label: string; error?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const original = e.target.files?.[0];
    if (!original) return setPreview(null);
    setBusy(true);
    const small = await shrink(original);
    if (small !== original && ref.current) {
      const dt = new DataTransfer();
      dt.items.add(small);
      ref.current.files = dt.files;
    }
    setPreview(URL.createObjectURL(small));
    setBusy(false);
  }

  function clear() {
    if (ref.current) ref.current.value = "";
    setPreview(null);
  }

  const id = `photo-${name}`;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      {preview ? (
        <div className="relative overflow-hidden rounded-2xl ring-1 ring-line">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
          <img src={preview} alt="Predogled izbrane fotografije" className="h-48 w-full object-cover" />
          <button
            type="button"
            onClick={clear}
            className="absolute top-2 right-2 inline-flex min-h-10 items-center gap-1 rounded-full bg-surface/95 px-3 text-sm font-semibold"
          >
            <X aria-hidden="true" className="size-4" /> Odstrani
          </button>
        </div>
      ) : (
        <p className="text-xs text-ink-muted">JPG, PNG ali WebP. Velike fotografije samodejno pomanjšamo.</p>
      )}
      <input
        ref={ref}
        id={id}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onChange}
        className={
          preview
            ? "sr-only"
            : "block w-full text-sm file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-brand-soft file:px-4 file:font-semibold file:text-brand-strong"
        }
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {preview && (
        <label htmlFor={id} className={buttonClasses("ghost", "sm")}>
          <ImagePlus aria-hidden="true" className="size-4" /> Zamenjaj fotografijo
        </label>
      )}
      {busy && <p className="text-sm text-ink-muted">Pripravljam fotografijo …</p>}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-brand-strong">
          {error}
        </p>
      )}
    </div>
  );
}
