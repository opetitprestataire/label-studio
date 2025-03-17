const baseConfig = require("./libs/ui/src/tailwind.config");
const designTokens = require("./src/styles/design-tokens");

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
