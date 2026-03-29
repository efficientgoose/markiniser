import { describe, expect, it } from "vitest";
import { formatStartupBox } from "../src/cliUi.js";

describe("formatStartupBox", () => {
  it("renders a clean boxed startup summary", () => {
    expect(
      formatStartupBox({
        version: "1.0.0",
        indexedFiles: 847,
        directoryCount: 3,
        roots: ["/Users/macbook/Desktop"],
        url: "http://localhost:4000"
      })
    ).toBe(`┌────────────────────────────────────────┐
│ Markiniser v1.0.0                      │
│ Indexed 847 files from 3 directories   │
│ Scanned /Users/macbook/Desktop         │
│ Running at http://localhost:4000       │
│ Press Ctrl+C to stop                   │
└────────────────────────────────────────┘`);
  });
});
