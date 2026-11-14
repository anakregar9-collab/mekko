"use client";

import { useParams, useRouter } from "next/navigation";

export function SpaceSwitcher({ spaces }: { spaces: { slug: string; name: string }[] }) {
  const router = useRouter();
  const { space } = useParams<{ space: string }>();
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-muted">Prostor</span>
      <select
        className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm font-semibold"
        value={space}
        onChange={(e) =>
          router.push(
            e.target.value === "__new" ? "/organizator/nov-prostor" : `/organizator/${e.target.value}`,
          )
        }
      >
        {spaces.map((s) => (
          <option key={s.slug} value={s.slug}>
            {s.name}
          </option>
        ))}
        <option value="__new">+ Nov prostor</option>
      </select>
    </label>
  );
}
