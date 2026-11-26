import { describe, expect, it } from "vitest";
import { coverUrl, sniffImageType } from "./media";

describe("sniffImageType", () => {
  it("recognises JPEG, PNG and WebP by signature", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe("jpg");
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe("png");
    const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
    expect(sniffImageType(webp)).toBe("webp");
  });
  it("rejects everything else, including renamed files", () => {
    expect(sniffImageType(new TextEncoder().encode("<svg xmlns="))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("%PDF-1.7"))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("GIF89a"))).toBeNull();
    expect(sniffImageType(new Uint8Array([]))).toBeNull();
  });
});

describe("coverUrl", () => {
  it("builds the public storage URL", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co/";
    expect(coverUrl("abc/def.jpg")).toBe(
      "https://example.supabase.co/storage/v1/object/public/covers/abc/def.jpg",
    );
    expect(coverUrl(null)).toBeNull();
  });
});
