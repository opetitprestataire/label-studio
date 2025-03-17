const fs = require("fs");
const path = require("path");

// Paths
const designVariablesPath = path.join(__dirname, "../designvariables.json");
const cssOutputPath = path.join(__dirname, "../src/styles/design-tokens.scss");
const jsOutputPath = path.join(__dirname, "../src/styles/design-tokens.js");

// Read the design variables file
const designVariables = JSON.parse(fs.readFileSync(designVariablesPath, "utf8"));

/**
 * Process design variables and extract color tokens
 * @param {Object} variables - The design variables object
 * @returns {Object} - Object containing tokens for CSS and JavaScript
 */
function processDesignVariables(variables) {
  const result = {
    cssVariables: {
      light: [],
      dark: [],
    },
    jsTokens: {
      colors: {},
    },
  };

  // Process colors
  if (variables["@color"] && variables["@color"].$color) {
    processColorTokens(variables["@color"].$color, "", result);
  }

  // Process primitives
  if (variables["@primitives"] && variables["@primitives"].$color) {
    processPrimitiveColors(variables["@primitives"].$color, result);
  }

  return result;
}

/**
 * Process color tokens from design variables
 * @param {Object} colorObj - The color object from design variables
 * @param {String} parentPath - The parent path for nesting
 * @param {Object} result - The result object to populate
 */
function processColorTokens(colorObj, parentPath, result) {
  for (const key in colorObj) {
    if (typeof colorObj[key] === "object" && !Array.isArray(colorObj[key])) {
      const newPath = parentPath ? `${parentPath}-${key.replace("$", "")}` : key.replace("$", "");

      // If this is a color token with value and type
      if (colorObj[key].$type === "color" && colorObj[key].$value) {
        const name = parentPath ? `${parentPath}-${key.replace("$", "")}` : key.replace("$", "");
        const value = colorObj[key].$value;
        const cssVarName = `--color-${name.replace(/\$/g, "")}`;

        // Add to CSS variables for light mode
        if (
          colorObj[key].$variable_metadata &&
          colorObj[key].$variable_metadata.modes &&
          colorObj[key].$variable_metadata.modes.light
        ) {
          const lightValue = resolveColorValue(colorObj[key].$variable_metadata.modes.light, designVariables);
          result.cssVariables.light.push(`${cssVarName}: ${lightValue};`);
        } else {
          const resolvedValue = resolveColorValue(value, designVariables);
          result.cssVariables.light.push(`${cssVarName}: ${resolvedValue};`);
        }

        // Add to CSS variables for dark mode
        if (
          colorObj[key].$variable_metadata &&
          colorObj[key].$variable_metadata.modes &&
          colorObj[key].$variable_metadata.modes.dark
        ) {
          const darkValue = resolveColorValue(colorObj[key].$variable_metadata.modes.dark, designVariables);
          result.cssVariables.dark.push(`${cssVarName}: ${darkValue};`);
        }

        // Add to JavaScript tokens
        addToJsTokens(result.jsTokens.colors, name.replace(/\$/g, ""), cssVarName);
      } else {
        // Recursively process nested color objects
        processColorTokens(colorObj[key], newPath, result);
      }
    }
  }
}

/**
 * Process primitive colors
 * @param {Object} primitiveColors - The primitive colors object
 * @param {Object} result - The result object to populate
 */
function processPrimitiveColors(primitiveColors, result) {
  for (const colorFamily in primitiveColors) {
    const familyName = colorFamily.replace("$", "");

    for (const shade in primitiveColors[colorFamily]) {
      if (primitiveColors[colorFamily][shade].$type === "color" && primitiveColors[colorFamily][shade].$value) {
        const name = `${familyName}-${shade}`;
        const value = primitiveColors[colorFamily][shade].$value;
        const cssVarName = `--color-primitive-${name}`;

        // Add to CSS variables
        result.cssVariables.light.push(`${cssVarName}: ${value};`);

        // Add to JavaScript tokens
        if (!result.jsTokens.colors.primitive) {
          result.jsTokens.colors.primitive = {};
        }
        if (!result.jsTokens.colors.primitive[familyName]) {
          result.jsTokens.colors.primitive[familyName] = {};
        }
        result.jsTokens.colors.primitive[familyName][shade] = `var(${cssVarName})`;
      }
    }
  }
}

/**
 * Resolve color values, handling references to other variables
 * @param {String} value - The color value to resolve
 * @param {Object} variables - The variables object for reference resolution
 * @returns {String} - The resolved color value
 */
function resolveColorValue(value, variables) {
  if (typeof value !== "string") return value;

  // Handle references like "{@primitives.$color.$sand.100}"
  if (value.startsWith("{") && value.endsWith("}")) {
    const reference = value.substring(1, value.length - 1);
    const parts = reference.split(".");

    // Navigate through the object to find the referenced value
    let current = variables;
    for (const part of parts) {
      if (current[part]) {
        current = current[part];
      } else {
        // If we can't resolve, return the CSS variable equivalent
        return `var(--color-${reference.replace(/[@$\.]/g, "-").substring(1)})`;
      }
    }

    if (current.$value) {
      return current.$value;
    }

    return value;
  }

  return value;
}

/**
 * Add a token to the JavaScript tokens object
 * @param {Object} obj - The object to add to
 * @param {String} path - The path to add at
 * @param {String} cssVarName - The CSS variable name
 */
function addToJsTokens(obj, path, cssVarName) {
  const parts = path.split("-");
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part]) {
      current[part] = {};
    }
    current = current[part];
  }

  const lastPart = parts[parts.length - 1];
  current[lastPart] = `var(${cssVarName})`;
}

/**
 * Generate CSS content
 * @param {Object} result - The processed tokens
 * @returns {String} - The CSS content
 */
function generateCssContent(result) {
  let content = "// Generated from designvariables.json - DO NOT EDIT DIRECTLY\n\n";

  // Light mode variables (default)
  content += ":root {\n";
  result.cssVariables.light.forEach((variable) => {
    content += `  ${variable}\n`;
  });
  content += "}\n\n";

  // Dark mode variables
  content += '[data-theme="dark"] {\n';
  result.cssVariables.dark.forEach((variable) => {
    content += `  ${variable}\n`;
  });
  content += "}\n";

  return content;
}

/**
 * Generate JavaScript content
 * @param {Object} result - The processed tokens
 * @returns {String} - The JavaScript content
 */
function generateJsContent(result) {
  let content = "// Generated from designvariables.json - DO NOT EDIT DIRECTLY\n\n";

  content += `const designTokens = ${JSON.stringify(result.jsTokens, null, 2)};\n\n`;
  content += "module.exports = designTokens;\n";

  return content;
}

// Main execution
try {
  console.log("Processing design variables...");
  const processed = processDesignVariables(designVariables);

  console.log("Generating CSS...");
  const cssContent = generateCssContent(processed);

  console.log("Generating JavaScript...");
  const jsContent = generateJsContent(processed);

  // Ensure directory exists
  const cssDir = path.dirname(cssOutputPath);
  const jsDir = path.dirname(jsOutputPath);

  if (!fs.existsSync(cssDir)) {
    fs.mkdirSync(cssDir, { recursive: true });
  }

  if (!fs.existsSync(jsDir)) {
    fs.mkdirSync(jsDir, { recursive: true });
  }

  // Write files
  fs.writeFileSync(cssOutputPath, cssContent);
  fs.writeFileSync(jsOutputPath, jsContent);

  console.log(`CSS variables written to ${cssOutputPath}`);
  console.log(`JavaScript tokens written to ${jsOutputPath}`);
} catch (error) {
  console.error("Error:", error);
}
