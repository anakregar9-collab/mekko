import { describe, expect, it } from "vitest";
import { activeVisitorTab, visitorTabs } from "./navigation";

describe("visitor navigation", () => {
  it("has exactly the four confirmed tabs in order (PRODUCT_SPEC §2)", () => {
    expect(visitorTabs.map((t) => t.label)).toEqual([
      "Odkrivanje",
      "Moje aktivnosti",
      "Ustvari",
      "Moj Mekko",
    ]);
  });

  it("resolves the active tab, including nested detail routes", () => {
    expect(activeVisitorTab("/prototip/odkrivanje")).toBe("odkrivanje");
    expect(activeVisitorTab("/prototip/dogodki/keramika-za-zacetnike")).toBe("odkrivanje");
    expect(activeVisitorTab("/prototip/ustvari/dogodek")).toBe("ustvari");
    expect(activeVisitorTab("/prototip/moj-mekko")).toBe("moj-mekko");
  });

  it("does not match on mere string prefixes", () => {
    expect(activeVisitorTab("/prototip/ustvarjalci")).toBeNull();
    expect(activeVisitorTab("/prototip/sporocila")).toBeNull();
  });
});
