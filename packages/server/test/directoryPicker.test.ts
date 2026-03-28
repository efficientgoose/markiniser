import { describe, expect, it, vi } from "vitest";
import { pickDirectory } from "../src/directoryPicker.js";

describe("pickDirectory", () => {
  it("returns null when the macOS picker is canceled", async () => {
    const onWarning = vi.fn<(message: string) => void>();

    const result = await pickDirectory({
      platform: "darwin",
      onWarning,
      execFile(_file, _args, callback) {
        callback(new Error("execution error: User canceled. (-128)"), "");
      }
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
