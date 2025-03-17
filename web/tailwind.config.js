const baseConfig = require("./libs/ui/src/tailwind.config");
let designTokens = {};

try {
  designTokens = require("./libs/ui/src/tokens/tokens.js");
} catch (error) {
  console.warn("Design tokens not found. Run 'nx design-tokens ui' to generate them.");
  // Use empty object if tokens file doesn't exist yet
  designTokens = { colors: {} };
}

// Merge the design tokens with the base config
const mergedConfig = {
  ...baseConfig,
  theme: {
    ...baseConfig.theme,
    extend: {
      ...baseConfig.theme.extend,
      colors: {
        ...baseConfig.theme.extend.colors,
        ...designTokens.colors,
      },
    },
  },
};

module.exports = mergedConfig;
