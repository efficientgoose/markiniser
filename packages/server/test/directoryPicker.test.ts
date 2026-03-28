import { describe, expect, it, vi } from "vitest";
import { pickDirectory } from "../src/directoryPicker.js";

type ExecFile = typeof import("node:child_process").execFile;

describe("pickDirectory", () => {
  it("returns null when the macOS picker is canceled", async () => {
    const onWarning = vi.fn<(message: string) => void>();
    const execFileStub = ((...args: unknown[]) => {
      const callback = args.at(-1);
      if (typeof callback === "function") {
        callback(new Error("execution error: User canceled. (-128)"), "", "");
      }
    }) as ExecFile;

    const result = await pickDirectory({
      platform: "darwin",
      onWarning,
      execFile: execFileStub
    });

    expect(result).toBeNull();
    expect(onWarning).not.toHaveBeenCalled();
  });

  it("warns and returns null on unsupported platforms", async () => {
    const onWarning = vi.fn<(message: string) => void>();

    const result = await pickDirectory({
      platform: "linux",
      onWarning
    });

    expect(result).toBeNull();
    expect(onWarning).toHaveBeenCalledWith(
      "[warn] Native directory picking is only supported on macOS."
    );
  });
});
