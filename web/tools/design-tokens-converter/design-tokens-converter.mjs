import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Get current file directory for resolving paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine correct paths for the workspace
const findWorkspaceRoot = () => {
  // We'll start with this file's directory and go up until we find the web directory
  let currentDir = __dirname;
  while (!currentDir.endsWith("web") && currentDir !== "/") {
    currentDir = path.dirname(currentDir);
  }

  if (!currentDir.endsWith("web")) {
    throw new Error("Could not find workspace root directory");
  }

  return currentDir;
};

const workspaceRoot = findWorkspaceRoot();

// Paths
const designVariablesPath = path.join(workspaceRoot, "design-tokens.json");
const cssOutputPath = path.join(workspaceRoot, "libs/ui/src/tokens/tokens.scss");
const jsOutputPath = path.join(workspaceRoot, "libs/ui/src/tokens/tokens.js");

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
    processColorTokens(variables["@color"].$color, "", result, variables);
  }

  // Process primitives
  if (variables["@primitives"] && variables["@primitives"].$color) {
    processPrimitiveColors(variables["@primitives"].$color, result, variables);
  }

  // Post-process for Tailwind compatibility
  result.jsTokens.colors = transformColorObjectForTailwind(result.jsTokens.colors);

  return result;
}

/**
 * Process color tokens from design variables
 * @param {Object} colorObj - The color object from design variables
 * @param {String} parentPath - The parent path for nesting
 * @param {Object} result - The result object to populate
 */
function processColorTokens(colorObj, parentPath, result, variables) {
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
          const lightValue = resolveColorValue(colorObj[key].$variable_metadata.modes.light, variables);
          result.cssVariables.light.push(`${cssVarName}: ${lightValue};`);
        } else {
          const resolvedValue = resolveColorValue(value, variables);
          result.cssVariables.light.push(`${cssVarName}: ${resolvedValue};`);
        }

        // Add to CSS variables for dark mode
        if (
          colorObj[key].$variable_metadata &&
          colorObj[key].$variable_metadata.modes &&
          colorObj[key].$variable_metadata.modes.dark
        ) {
          const darkValue = resolveColorValue(colorObj[key].$variable_metadata.modes.dark, variables);
          result.cssVariables.dark.push(`${cssVarName}: ${darkValue};`);
        }

        // Add to JavaScript tokens
        addToJsTokens(result.jsTokens.colors, name.replace(/\$/g, ""), cssVarName);
      } else {
        // Recursively process nested color objects
        processColorTokens(colorObj[key], newPath, result, variables);
      }
    }
  }
}

/**
 * Process primitive colors
 * @param {Object} primitiveColors - The primitive colors object
 * @param {Object} result - The result object to populate
 * @param {Object} variables - The variables object for reference resolution
 */
function processPrimitiveColors(primitiveColors, result, variables) {
  for (const colorFamily in primitiveColors) {
    const familyName = colorFamily.replace("$", "");

    for (const shade in primitiveColors[colorFamily]) {
      try {
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
      } catch (error) {
        console.warn(`Warning: Error processing primitive color ${colorFamily}.${shade}:`, error.message);
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

  // Handle the case where we have nested properties like "surface-hover"
  // which should be transformed to obj.surface.hover
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    // Check if this is a terminal value (string) that we're trying to add properties to
    if (typeof current[part] === "string") {
      // Create a new object to replace the string value
      const oldValue = current[part];
      current[part] = {
        DEFAULT: oldValue,
      };
    } else if (!current[part]) {
      current[part] = {};
    }

    current = current[part];
  }

  const lastPart = parts[parts.length - 1];

  // If lastPart is something like "hover" and we're dealing with "surface-hover",
  // we should set it as a property of the "surface" object
  current[lastPart] = `var(${cssVarName})`;
}

/**
 * Generate CSS content
 * @param {Object} result - The processed tokens
 * @returns {String} - The CSS content
 */
function generateCssContent(result) {
  let content = "// Generated from design-tokens.json - DO NOT EDIT DIRECTLY\n\n";

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
  let content = "// Generated from design-tokens.json - DO NOT EDIT DIRECTLY\n\n";

  content += `const designTokens = ${JSON.stringify(result.jsTokens, null, 2)};\n\n`;
  // Use CommonJS export for compatibility with Tailwind config
  content += "module.exports = designTokens;\n";

  return content;
}

/**
 * Transform color object structure for better Tailwind CSS compatibility
 * @param {Object} colors - The color object to transform
 * @returns {Object} - The transformed color object
 */
function transformColorObjectForTailwind(colors) {
  const transformed = {};

  // Process each color category
  for (const category in colors) {
    transformed[category] = {};
    const colorGroup = colors[category];

    // Group variants like "surface-hover" under their base name with variants as properties
    for (const key in colorGroup) {
      const parts = key.split("-");

      // Skip if already processed
      if (parts.length === 1) {
        transformed[category][key] = colorGroup[key];
        continue;
      }

      // Handle cases like "surface-hover", "surface-active", etc.
      const baseName = parts[0];
      const variantName = parts.slice(1).join("-");

      if (!transformed[category][baseName]) {
        // Check if base color exists in original object
        if (colorGroup[baseName]) {
          transformed[category][baseName] = {
            DEFAULT: colorGroup[baseName],
          };
        } else {
          transformed[category][baseName] = {};
        }
      } else if (typeof transformed[category][baseName] === "string") {
        // Convert string value to object with DEFAULT property
        transformed[category][baseName] = {
          DEFAULT: transformed[category][baseName],
        };
      }

      // Add the variant
      transformed[category][baseName][variantName] = colorGroup[key];
    }
  }

  return transformed;
}

/**
 * Main function to run the design tokens converter
 */
const designTokensConverter = async () => {
  try {
    console.log("Reading design variables file from:", designVariablesPath);

    // Check if file exists before trying to read it
    try {
      await fs.access(designVariablesPath);
    } catch (error) {
      console.error(`Error: The design-tokens.json file does not exist at ${designVariablesPath}`);
      console.log("Please create this file by exporting your design tokens from Figma");
      return { success: false, error: "Design tokens file not found" };
    }

    const designVariablesData = await fs.readFile(designVariablesPath, "utf8");

    try {
      const variables = JSON.parse(designVariablesData);

      console.log("Processing design variables...");
      const processed = processDesignVariables(variables);

      console.log("Generating CSS...");
      const cssContent = generateCssContent(processed);

      console.log("Generating JavaScript...");
      const jsContent = generateJsContent(processed);

      // Ensure directory exists
      const cssDir = path.dirname(cssOutputPath);
      await fs.mkdir(cssDir, { recursive: true });

      // Write files
      await fs.writeFile(cssOutputPath, cssContent);
      await fs.writeFile(jsOutputPath, jsContent);

      console.log(`CSS variables written to ${cssOutputPath}`);
      console.log(`JavaScript tokens written to ${jsOutputPath}`);

      return { success: true };
    } catch (parseError) {
      console.error("Error parsing design tokens JSON:", parseError.message);
      console.log("Please ensure your design-tokens.json file contains valid JSON");
      return { success: false, error: "JSON parsing error" };
    }
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error: error.message };
  }
};

// Execute the function when this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  designTokensConverter().then((result) => {
    if (!result.success) {
      process.exit(1);
    }
    console.log("Design tokens conversion complete");
  });
}

export default designTokensConverter;
