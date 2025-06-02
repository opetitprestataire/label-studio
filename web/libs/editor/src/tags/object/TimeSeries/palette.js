// Color tokens from Figma
const colorTokens = {
  grape: {
    400: "var(--color-grape-400)",
    hex: "#6D87F1",
  },
  blueberry: {
    400: "var(--color-blueberry-400)",
    hex: "#5B8AF4",
  },
  kale: {
    400: "var(--color-kale-400)",
    hex: "#36B37E",
  },
  kiwi: {
    400: "var(--color-kiwi-400)",
    hex: "#79F2C0",
  },
  mango: {
    400: "var(--color-mango-400)",
    hex: "#FFAB00",
  },
  canteloupe: {
    400: "var(--color-canteloupe-400)",
    hex: "#FF8B00",
  },
  persimmon: {
    400: "var(--color-persimmon-400)",
    hex: "#FF5630",
  },
  plum: {
    400: "var(--color-plum-400)",
    hex: "#8777D9",
  },
  fig: {
    400: "var(--color-fig-400)",
    hex: "#6554C0",
  },
  sand: {
    700: "var(--color-sand-700)",
    hex: "#505F79",
  },
};

// Order of colors for optimal contrast
const colorOrder = ["grape", "mango", "kale", "persimmon", "sand", "kiwi", "canteloupe", "fig", "plum", "blueberry"];

/**
 * Get a color for a channel based on its index
 * @param {number} index - Index of the channel
 * @returns {string} - CSS variable for the color
 */
export const getChannelColor = (index) => {
  const colorName = colorOrder[index % colorOrder.length];
  return colorTokens[colorName][colorName === "sand" ? "700" : "400"];
};
