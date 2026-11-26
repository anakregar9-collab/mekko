"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

const MAX_SIDE = 1280;

async function shrink(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 800_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
    return blob ? new File([blob], "fotografija.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

/** 1..max photos with previews; files are resized in the browser and re-checked on the server. */
export function MultiPhotoInput({
  name,
  label,
  max = 5,
  error,
}: {
  name: string;
  label: string;
  max?: number;
  error?: string;
}) {
  const hidden = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<{ file: File; url: string }[]>([]);
  const [busy, setBusy] = useState(false);

  function sync(next: { file: File; url: string }[]) {
    setItems(next);
    if (hidden.current) {
      const dt = new DataTransfer();
      next.forEach((i) => dt.items.add(i.file));
      hidden.current.files = dt.files;
    }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).slice(0, max - items.length);
    e.target.value = "";
    if (picked.length === 0) return;
    setBusy(true);
    const small = await Promise.all(picked.map(shrink));
    sync([...items, ...small.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    setBusy(false);
  }

  const id = `pick-${name}`;
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold" id={`${id}-label`}>
        {label}
      </p>
      {/* The submitted files live in this hidden input (kept in sync with the previews). */}
      <input
        ref={hidden}
        type="file"
        name={name}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      {items.length > 0 && (
        <ul className="grid grid-cols-3 gap-2" data-testid="photo-previews">
          {items.map((it, i) => (
            <li key={it.url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img
                src={it.url}
                alt={`Izbrana fotografija ${i + 1}`}
                className="aspect-square w-full rounded-xl object-cover"
              />
              <button
                type="button"
                onClick={() => sync(items.filter((x) => x !== it))}
                className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-full bg-surface/95"
              >
                <X aria-hidden="true" className="size-4" />
                <span className="sr-only">Odstrani fotografijo {i + 1}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {items.length < max && (
        <label
          htmlFor={id}
          className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line bg-surface p-4 text-center text-sm font-semibold text-ink-muted hover:border-brand"
        >
          <ImagePlus aria-hidden="true" className="size-6" />
          {items.length === 0 ? `Dodaj fotografije (do ${max})` : `Dodaj še (${max - items.length})`}
          <input
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={onPick}
            className="sr-only"
            aria-describedby={error ? `${id}-error` : undefined}
          />
        </label>
      )}
      {busy && <p className="text-sm text-ink-muted">Pripravljam fotografije …</p>}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-brand-strong">
          {error}
        </p>
      )}
    </div>
  );
}
