/**
 * @jest-environment jsdom
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { useDebouncedValue } from "../../src/hooks/use-debounced";

function Test({ value, delay }: { value: string; delay: number }) {
  const v = useDebouncedValue(value, delay);
  return <div data-testid="val">{v}</div>;
}

describe("useDebouncedValue", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    jest.useRealTimers();
    root.unmount();
    container.remove();
  });

  it("actualiza valor tras el delay", async () => {
    await act(async () => {
      root.render(<Test value="A" delay={200} />);
    });
    const el = () => container.querySelector("[data-testid=val]") as HTMLDivElement;
    expect(el().textContent).toBe("A");

    await act(async () => {
      root.render(<Test value="B" delay={200} />);
    });

    // Antes del timeout, sigue el valor antiguo
    expect(el().textContent).toBe("A");

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(el().textContent).toBe("B");
  });
});
