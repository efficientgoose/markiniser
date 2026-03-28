import "@testing-library/jest-dom/vitest";

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserver as typeof globalThis.ResizeObserver;
window.ResizeObserver = ResizeObserver as typeof window.ResizeObserver;
Element.prototype.scrollIntoView = () => {};
