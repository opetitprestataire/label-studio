import chroma from "chroma-js";

export const accessibleColor = (bgColor: string, fgColor: string): string => {
  // Handle css variables
  if (bgColor.startsWith("var(")) {
    bgColor = getComputedStyle(document.documentElement).getPropertyValue(bgColor);
  }
  if (fgColor.startsWith("var(")) {
    fgColor = getComputedStyle(document.documentElement).getPropertyValue(fgColor);
  }

  // Check if the contrast ratio is sufficient
  const bg = chroma(bgColor);
  const fg = chroma(fgColor);

  // Dark foreground on light background
  const shouldDarken = bg.luminance() > fg.luminance();
  let lastFg = null;

  while (chroma.contrast(bg, fg) < 4.5) {
    if (shouldDarken) {
      fg.darken(0.1);
    } else {
      fg.brighten(0.1);
    }
    const currentFg = fg.css();
    // Prevent infinite loop if color cannot be adjusted further
    if (lastFg && currentFg === lastFg) {
      break;
    }
    lastFg = currentFg;
  }

  // Return the adjusted foreground color
  return lastFg ?? fg.css();
};
