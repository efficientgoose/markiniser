export interface MeasuredSection {
  index: number;
  startOffset: number;
  height: number;
  endOffset: number;
}

export interface SectionScrollPosition {
  sectionIdx: number;
  posInSection: number;
}

export function measureSections(elements: HTMLElement[]): MeasuredSection[] {
  return elements.map((element, index) => {
    const startOffset = element.offsetTop;
    const height = Math.max(1, element.offsetHeight);
    return {
      index,
      startOffset,
      height,
      endOffset: startOffset + height
    };
  });
}

export function getSectionScrollPosition(
  scrollTop: number,
  sections: MeasuredSection[],
  maxScrollTop = Number.POSITIVE_INFINITY
): SectionScrollPosition | null {
  if (sections.length === 0) {
    return null;
  }

  if (scrollTop >= maxScrollTop) {
    const lastSection = sections.at(-1);
    if (!lastSection) {
      return null;
    }

    return {
      sectionIdx: lastSection.index,
      posInSection: 1
    };
  }

  let target = sections[0];
  for (const section of sections) {
    if (scrollTop > section.endOffset) {
      continue;
    }
    target = section;
    break;
  }

  return {
    sectionIdx: target.index,
    posInSection: Math.max(0, Math.min(1, (scrollTop - target.startOffset) / (target.height || 1)))
  };
}

export function getScrollTopForSectionPosition(
  position: SectionScrollPosition,
  sections: MeasuredSection[],
  maxScrollTop: number
) {
  const section = sections[position.sectionIdx];
  if (!section) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      maxScrollTop,
      section.startOffset + section.height * Math.max(0, Math.min(1, position.posInSection))
    )
  );
}
