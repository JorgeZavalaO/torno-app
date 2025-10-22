import { cn } from "@/lib/utils";

describe("cn", () => {
  it("combina clases simples", () => {
    expect(cn("a", "b", undefined, false && "c")).toBe("a b");
  });

  it("usa tailwind-merge para resolver conflictos", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("acepta objetos/arrays según clsx", () => {
    expect(cn(["a", { b: true, c: false }])).toBe("a b");
  });
});
