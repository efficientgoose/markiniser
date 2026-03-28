import { describe, expect, it, vi } from "vitest";
import { getBrowserOpenCommand, openBrowser } from "../src/browser.js";

describe("getBrowserOpenCommand", () => {
  it("uses the macOS open command on darwin", () => {
    expect(getBrowserOpenCommand("http://127.0.0.1:4000", "darwin")).toEqual({
      command: "open",
      args: ["http://127.0.0.1:4000"]
    });
  });

  it("uses xdg-open on linux", () => {
    expect(getBrowserOpenCommand("http://127.0.0.1:4000", "linux")).toEqual({
      command: "xdg-open",
      args: ["http://127.0.0.1:4000"]
    });
  });

  it("uses cmd /c start on windows", () => {
    expect(getBrowserOpenCommand("http://127.0.0.1:4000", "win32")).toEqual({
      command: "cmd",
      args: ["/c", "start", "", "http://127.0.0.1:4000"]
    });
  });
});

describe("openBrowser", () => {
  it("warns when the opener process emits an error", async () => {
    const onWarning = vi.fn<(message: string) => void>();
    const onErrorHandlers: Array<(error: Error) => void> = [];

    openBrowser("http://127.0.0.1:4000", {
      platform: "darwin",
      onWarning,
      spawn(command, args) {
        expect(command).toBe("open");
        expect(args).toEqual(["http://127.0.0.1:4000"]);
        return {
          on(event, handler) {
            if (event === "error") {
              onErrorHandlers.push(handler as (error: Error) => void);
            }
            return this;
          },
          unref() {}
        };
      }
    });

    onErrorHandlers[0]?.(new Error("launch failed"));

    expect(onWarning).toHaveBeenCalledWith(
      "[warn] Could not open browser automatically: launch failed"
    );
  });
});
