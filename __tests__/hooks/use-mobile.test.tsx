/**
 * @jest-environment jsdom
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { useIsMobile } from "../../src/hooks/use-mobile";

type Mql = {
  matches: boolean;
  media: string;
  addEventListener: (type: string, cb: () => void) => void;
  removeEventListener: (type: string, cb: () => void) => void;
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null;
  dispatch: () => void;
};

function mockMatchMedia(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, value: width });
  const listeners: Array<() => void> = [];
  let current: Mql;
  (window as unknown as { matchMedia: jest.Mock }).matchMedia = jest
    .fn()
    .mockImplementation((query: string): Mql => {
      current = {
        matches: width < 768,
        media: query,
        addEventListener: (_: string, cb: () => void) => listeners.push(cb),
        removeEventListener: (_: string, cb: () => void) => {
          const idx = listeners.indexOf(cb);
          if (idx >= 0) listeners.splice(idx, 1);
        },
        onchange: null,
        dispatch: () => listeners.forEach((cb) => cb()),
      };
      return current;
    });
  return {
    trigger: (newWidth: number) => {
      Object.defineProperty(window, "innerWidth", { writable: true, value: newWidth });
      current.dispatch();
    },
  };
}

function Test() {
  const isMobile = useIsMobile();
  return <div data-testid="val">{String(isMobile)}</div>;
}

describe("useIsMobile", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    container.remove();
  });

  it("retorna true si width < 768 y se actualiza en cambios", async () => {
    const mm = mockMatchMedia(500);
    await act(async () => root.render(<Test />));
    const el = () => container.querySelector("[data-testid=val]") as HTMLDivElement;
    expect(el().textContent).toBe("true");

    await act(async () => mm.trigger(1024));
    expect(el().textContent).toBe("false");
  });
});
