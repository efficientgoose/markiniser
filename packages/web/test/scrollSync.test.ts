import { describe, expect, it } from "vitest";
import {
  getScrollTopForSectionPosition,
  getSectionScrollPosition,
  measureSections
} from "../src/lib/scrollSync";

describe("scrollSync helpers", () => {
  it("measures section dimensions from DOM elements", () => {
    const elements = [
      { offsetTop: 0, offsetHeight: 120 },
      { offsetTop: 120, offsetHeight: 80 }
    ] as HTMLElement[];

    expect(measureSections(elements)).toEqual([
      { index: 0, startOffset: 0, height: 120, endOffset: 120 },
      { index: 1, startOffset: 120, height: 80, endOffset: 200 }
    ]);
  });

  it("derives relative position inside the active section", () => {
    const sections = [
      { index: 0, startOffset: 0, height: 100, endOffset: 100 },
      { index: 1, startOffset: 100, height: 200, endOffset: 300 }
    ];

    expect(getSectionScrollPosition(0, sections)).toEqual({ sectionIdx: 0, posInSection: 0 });
    expect(getSectionScrollPosition(50, sections)).toEqual({ sectionIdx: 0, posInSection: 0.5 });
    expect(getSectionScrollPosition(200, sections)).toEqual({ sectionIdx: 1, posInSection: 0.5 });
  });

  it("uses the top visible edge as the sync anchor", () => {
    const sections = [
      { index: 0, startOffset: 0, height: 140, endOffset: 140 },
      { index: 1, startOffset: 140, height: 260, endOffset: 400 }
    ];

    expect(getSectionScrollPosition(0, sections, 300, 100)).toEqual({
      sectionIdx: 0,
      posInSection: 0
    });
  });

  it("treats the maximum scroll position as the end of the last section", () => {
    const sections = [
      { index: 0, startOffset: 0, height: 100, endOffset: 100 },
      { index: 1, startOffset: 100, height: 200, endOffset: 300 }
    ];

    expect(getSectionScrollPosition(220, sections, 220)).toEqual({
      sectionIdx: 1,
      posInSection: 1
    });
  });

  it("computes scroll top from a section-relative position", () => {
    const sections = [
      { index: 0, startOffset: 0, height: 100, endOffset: 100 },
      { index: 1, startOffset: 100, height: 200, endOffset: 300 }
    ];

    expect(getScrollTopForSectionPosition({ sectionIdx: 0, posInSection: 0.5 }, sections, 400)).toBe(50);
    expect(getScrollTopForSectionPosition({ sectionIdx: 1, posInSection: 0.5 }, sections, 400)).toBe(200);
  });

  it("round-trips a viewport-anchored position without drifting", () => {
    const sections = [
      { index: 0, startOffset: 0, height: 140, endOffset: 140 },
      { index: 1, startOffset: 140, height: 260, endOffset: 400 }
    ];

    const position = getSectionScrollPosition(120, sections, 300, 100);

    expect(position).toEqual({ sectionIdx: 0, posInSection: 120 / 140 });
    expect(
      getScrollTopForSectionPosition(position!, sections, 300, 100)
    ).toBeCloseTo(120, 6);
  });
});
