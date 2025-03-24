import type React from "react";
import { useState, useRef, useEffect } from "react";
import LinkTo from "@storybook/addon-links/react";

import type { Meta } from "@storybook/react";
import { atom, useAtom, useSetAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
// @ts-ignore: JS module without types
import designTokens from "./tokens";

// Define types for design tokens
type DesignTokenValue = string | Record<string, any>;
type FlattenedTokens = Record<string, string>;

// Token categories and their descriptions
const categoryDescriptions: Record<string, string> = {
  colors: "Color tokens for UI elements including semantic, accent, and scale colors",
  spacing: "Spacing values for layout, padding, margins, and positioning",
  typography: "Typography tokens for font sizes, line heights, and letter spacing",
  cornerRadius: "Corner radius values for UI components with rounded edges",
};

// Color subcategories and their descriptions
const colorSubcategoryDescriptions: Record<string, string> = {
  neutral: "Neutral colors for backgrounds, text, borders, and other UI elements",
  accent: "Accent colors for highlighting and distinguishing UI elements",
  primary: "Primary brand colors for key UI elements and interactions",
  negative: "Negative/danger colors for error states and destructive actions",
  positive: "Positive/success colors for confirmations and success states",
  warning: "Warning colors for cautionary messages and states",
  primitives: "Base color scales for the design system",
};

// Component to render a token value
const TokenValue = ({ token, tokenName }: { token: string; tokenName: string }) => {
  // Determine token type
  const isColor = typeof token === "string" && token.includes("--color-");
  const isSpacing = typeof token === "string" && token.includes("--spacing-");
  const isTypography =
    typeof token === "string" &&
    (token.includes("--font-size-") || token.includes("--line-height-") || token.includes("--letter-spacing-"));
  const isCornerRadius = typeof token === "string" && token.includes("--corner-radius-");

  // Create a ref to access computed values
  const [computedValue, setComputedValue] = useState<string>("");
  const elementRef = useRef<HTMLDivElement>(null);

  // Get the computed value when the component mounts
  useEffect(() => {
    if (elementRef.current && token.includes("var(")) {
      // Extract the CSS variable name from the token string
      const varName = token.match(/var\((.*?)\)/)?.[1] || "";
      if (varName) {
        // Get the computed style for the variable
        const computedStyle = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        setComputedValue(computedStyle);
      }
    }
  }, [token]);

  const handleCopy = (e: React.MouseEvent<HTMLDivElement>) => {
    // Copy token name to clipboard
    navigator.clipboard.writeText(token);

    // Find and show the copy indicator
    const parent = e.currentTarget;
    const copyIndicator = parent.querySelector(".copy-indicator") as HTMLElement;

    if (copyIndicator) {
      copyIndicator.style.bottom = "8px";
      copyIndicator.style.opacity = "1";

      // Hide after a delay
      setTimeout(() => {
        copyIndicator.style.bottom = "-30px";
        copyIndicator.style.opacity = "0";
      }, 1500);
    }
  };

  return (
    <div
      ref={elementRef}
      className="flex flex-col p-4 border border-gray-200 rounded-lg mb-2 cursor-pointer relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-gray-300"
      onClick={handleCopy}
      title={`Click to copy: ${tokenName}`}
    >
      {/* Visual preview for different token types */}
      {isColor && (
        <div className="flex flex-col gap-2 mb-3">
          <div
            className="w-full h-16 bg-gray-100 rounded border border-gray-200 shadow-inner"
            style={{ backgroundColor: token }}
          />
        </div>
      )}

      {isSpacing && (
        <div className="mb-3 h-16 flex items-center justify-center px-4">
          <div
            className="h-2 rounded min-w-1 relative"
            style={{
              width: token,
              background: "linear-gradient(90deg, #6366F1 0%, #A855F7 100%)",
            }}
          />
        </div>
      )}

      {isTypography && (
        <div className="mb-3 h-16 flex items-center justify-center overflow-hidden">
          {token.includes("--font-size-") && (
            <div
              className="whitespace-nowrap leading-tight"
              style={{
                fontSize: token,
              }}
            >
              Aa
            </div>
          )}

          {token.includes("--line-height-") && (
            <div className="relative w-3/5 h-10">
              <div
                className="w-full flex items-center justify-center text-xs text-indigo-600 relative"
                style={{
                  height: token,
                  backgroundColor: "rgba(99, 102, 241, 0.2)",
                }}
              >
                Line Height
              </div>
            </div>
          )}

          {token.includes("--letter-spacing-") && (
            <div
              className="text-sm relative px-4"
              style={{
                letterSpacing: token,
              }}
            >
              LETTER SPACING
            </div>
          )}
        </div>
      )}

      {isCornerRadius && (
        <div className="mb-3 h-16 flex items-center justify-center relative">
          <div
            className="w-3/5 h-10 bg-indigo-100 border border-dashed border-indigo-500"
            style={{
              borderRadius: token,
            }}
          />
        </div>
      )}

      {/* Token information */}
      <div className="flex justify-between">
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <div className="text-black text-sm font-bold break-words">
                {tokenName.split(".").pop() || tokenName}
              </div>
              <div className="text-xs text-gray-400 -mt-1">
                {tokenName.split(".").slice(0, -1).join(".")}
              </div>
            </div>

            <span className="text-xs text-black text-right">
              {computedValue || "..."}
            </span>
          </div>

          <div className="text-xs font-bold text-gray-600 text-center break-all flex-shrink-0 bg-gray-100 p-0.5 rounded">
            {token.replace("var(", "").replace(")", "")}
          </div>
        </div>
      </div>

      {/* Copy indicator */}
      <div
        className="copy-indicator absolute -bottom-7 right-2 bg-black text-white px-2 py-1 rounded text-xs opacity-0 transition-all duration-300 z-10"
      >
        Copied!
      </div>
    </div>
  );
};

const searchAtom = atomWithStorage("tokensSearch", "");
const activeCategoryAtom = atomWithStorage("tokensActiveCategory", "all");
const activeColorSubcategoryAtom = atomWithStorage("tokensActiveColorSubcategory", "all");

// Component for the token catalog
const TokenCatalog = () => {
  const [searchTerm, setSearchTerm] = useAtom(searchAtom);
  const [activeCategory, setActiveCategory] = useAtom(activeCategoryAtom);
  const [activeColorSubcategory, setActiveColorSubcategory] = useAtom(activeColorSubcategoryAtom);

  // Function to flatten nested token objects into a searchable format
  const flattenTokens = (obj: Record<string, DesignTokenValue>, prefix = ""): FlattenedTokens => {
    let result: FlattenedTokens = {};

    for (const key in obj) {
      const newPrefix = prefix ? `${prefix}.${key}` : key;

      if (typeof obj[key] === "object" && obj[key] !== null) {
        Object.assign(result, flattenTokens(obj[key] as Record<string, DesignTokenValue>, newPrefix));
      } else {
        result[newPrefix] = obj[key] as string;
      }
    }

    return result;
  };

  // Get all tokens in a flat structure
  const allTokens = flattenTokens(designTokens);

  // Filter tokens based on search and category filters
  const filteredTokens = Object.entries(allTokens).filter(([name, value]) => {
    // Filter by search term
    const matchesSearch =
      searchTerm === "" ||
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(value).toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by category
    const matchesCategory = activeCategory === "all" || name.startsWith(activeCategory);

    // Filter by color subcategory if in colors category
    const matchesColorSubcategory =
      !name.startsWith("colors") ||
      activeColorSubcategory === "all" ||
      (activeColorSubcategory === "primitives"
        ? !name.startsWith("colors.neutral") &&
          !name.startsWith("colors.primary") &&
          !name.startsWith("colors.negative") &&
          !name.startsWith("colors.positive") &&
          !name.startsWith("colors.warning") &&
          !name.startsWith("colors.accent") &&
          name.startsWith("colors.")
        : name.startsWith(`colors.${activeColorSubcategory}`));

    return matchesSearch && matchesCategory && matchesColorSubcategory;
  });

  // Group filtered tokens by their top-level category
  const groupedTokens: Record<string, Array<[string, string]>> = filteredTokens.reduce(
    (acc, [name, value]) => {
      const topCategory = name.split(".")[0];

      if (!acc[topCategory]) {
        acc[topCategory] = [];
      }

      acc[topCategory].push([name, value]);
      return acc;
    },
    {} as Record<string, Array<[string, string]>>,
  );

  // Component to showcase raw color values usage
  const RawColorsUsageGuide = () => {
    // Only show for color category
    if (activeCategory !== "colors") return null;

    // Find raw color tokens
    const rawColorTokens = filteredTokens.filter(([name]) =>
      name.includes("-raw") &&
      (name.includes("outline") || name.includes("shadow") || name.includes("primary"))
    );

    if (rawColorTokens.length === 0) return null;

    return (
      <div className="mb-10 p-4 border border-gray-200 rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-2">Using Raw Color Values</h2>
        <p className="text-sm mb-4">
          Some color tokens have "-raw" variants that provide RGB values without the rgb() wrapper,
          allowing you to create translucent versions with custom opacity.
        </p>

        <div className="bg-white p-4 rounded border border-gray-200">
          <h3 className="text-base font-medium mb-2">Examples</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary surface with opacity */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Primary Surface with Opacity</h4>
              <div className="flex gap-2">
                {[25, 50, 75, 100].map((opacity) => (
                  <div
                    key={opacity}
                    className="w-10 h-10 rounded-sm flex items-center justify-center text-xs border border-gray-200"
                    style={{ backgroundColor: `rgb(var(--color-primary-surface-raw) / ${opacity}%)` }}
                  >
                    {opacity}%
                  </div>
                ))}
              </div>
              <div className="bg-gray-100 p-2 rounded text-xs font-mono">
                background-color: rgb(var(--color-primary-surface-raw) / 50%);
              </div>
            </div>

            {/* Shadows and outlines */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Shadows & Outlines</h4>
              <div className="flex gap-4">
                <div
                  className="w-16 h-10 rounded bg-white flex items-center justify-center text-xs"
                  style={{ boxShadow: "0 2px 8px rgb(var(--color-neutral-shadow-raw) / 20%)" }}
                >
                  Shadow
                </div>
                <div
                  className="w-16 h-10 rounded bg-white flex items-center justify-center text-xs"
                  style={{ border: "1px solid rgb(var(--color-neutral-outline-raw) / 40%)" }}
                >
                  Border
                </div>
              </div>
              <div className="bg-gray-100 p-2 rounded text-xs font-mono">
                box-shadow: 0 2px 8px rgb(var(--color-neutral-shadow-raw) / 20%);<br />
                border: 1px solid rgb(var(--color-neutral-outline-raw) / 40%);
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="token-catalog p-8">
      <div
        className="mb-6"
      >
        <input
          type="text"
          placeholder="Search tokens by name or value..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 rounded border border-gray-300 w-full text-sm mb-4"
        />

        <div
          className="flex gap-2 mb-4 flex-wrap"
        >
          <button
            onClick={() => {
              setActiveCategory("all")
              setActiveColorSubcategory("all")
            }}
            className={`py-1.5 px-3 rounded border border-gray-300 text-sm cursor-pointer ${
              activeCategory === "all" ? "bg-gray-200" : "bg-white"
            }`}
          >
            All Categories
          </button>
          {Object.keys(categoryDescriptions).map((category) => (
            <button
              key={category}
              onClick={() => {
                setActiveCategory(category);
                if (category !== "colors") {
                  setActiveColorSubcategory("all");
                }
              }}
              className={`py-1.5 px-3 rounded border border-gray-300 text-sm cursor-pointer ${
                activeCategory === category ? "bg-gray-200" : "bg-white"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {activeCategory === "colors" && (
          <div
            className="flex gap-2 mb-4 flex-wrap"
          >
            <button
              onClick={() => setActiveColorSubcategory("all")}
              className={`py-1.5 px-3 rounded border border-gray-300 text-sm cursor-pointer ${
                activeColorSubcategory === "all" ? "bg-gray-200" : "bg-white"
              }`}
            >
              All Colors
            </button>
            {Object.keys(colorSubcategoryDescriptions).map((subcategory) => (
              <button
                key={subcategory}
                onClick={() => {
                  setActiveColorSubcategory(subcategory)
                }}
                className={`py-1.5 px-3 rounded border border-gray-300 text-sm cursor-pointer ${
                  activeColorSubcategory === subcategory ? "bg-gray-200" : "bg-white"
                }`}
              >
                {subcategory}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Display the Raw Colors Usage Guide */}
      <RawColorsUsageGuide />

      {/* Display the tokens */}
      {Object.keys(groupedTokens).length === 0 ? (
        <div className="text-center my-10 text-gray-600">
          No tokens found matching "{searchTerm}"
        </div>
      ) : (
        Object.entries(groupedTokens).map(([category, tokens]) => (
          <div key={category} className="category-section mb-10">
            <h2
              className="text-lg m-0 mb-2 pb-2 border-b border-gray-200"
            >
              {category} ({tokens.length})
            </h2>
            <p
              className="text-sm m-0 mb-4 text-gray-600"
            >
              {categoryDescriptions[category] || "Design tokens in this category"}
            </p>

            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
            >
              {tokens.map(([name, value]) => (
                <TokenValue key={name} token={value} tokenName={name} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// Component to display design tokens organized by categories
const TokenCategorized = () => {
  const setSearchTerm = useSetAtom(searchAtom);
  const setActiveCategory = useSetAtom(activeCategoryAtom);
  const setActiveColorSubcategory = useSetAtom(activeColorSubcategoryAtom);

  // Helper function to generate a color palette for the colors category
  const generateColorPalette = () => {
    return (
      <div className="flex gap-1 mt-4">
        {["primary", "positive", "warning", "negative", "neutral"].map((color) => (
          <div
            key={color}
            className="w-10 h-10 rounded border border-gray-200"
            style={{ backgroundColor: `var(--color-${color}-surface)` }}
            title={`${color}`}
          />
        ))}
        {["grape", "blueberry", "kale", "kiwi", "mango", "persimmon"].map((color) => (
          <div
            key={color}
            className="w-10 h-10 rounded border border-gray-200"
            style={{ backgroundColor: `var(--color-${color}-500)` }}
            title={`${color}`}
          />
        ))}
      </div>
    );
  };

  // Helper function to showcase raw color values for translucent colors
  const generateRawColorsPalette = () => {
    return (
      <div className="mt-4">
        <h3 className="text-base mb-3">Translucent Color Values</h3>
        <p className="text-sm mb-4 text-gray-600">
          These color tokens have raw RGB values available for creating translucent colors with custom opacity.
        </p>

        <div className="flex flex-col gap-6">
          {/* Primitive color demonstration */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Primary Color with Different Opacities</h4>
            <div className="flex gap-4">
              {[10, 25, 50, 75, 100].map((opacity) => (
                <div key={opacity} className="flex flex-col items-center">
                  <div
                    className="w-12 h-12 rounded border border-gray-200 mb-1"
                    style={{ backgroundColor: `rgb(var(--color-primary-surface-raw) / ${opacity}%)` }}
                  />
                  <span className="text-xs">{opacity}%</span>
                </div>
              ))}
            </div>
            <div className="mt-2 bg-gray-100 p-2 rounded text-xs font-mono">
              background-color: rgb(var(--color-primary-surface-raw) / 50%);
            </div>
          </div>

          {/* Shadow/outline example */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Shadow and Outline Examples</h4>
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className="w-16 h-16 rounded flex items-center justify-center"
                  style={{ boxShadow: "0 4px 8px rgb(var(--color-neutral-shadow-raw) / 15%)" }}
                >
                  <span className="text-xs">Shadow</span>
                </div>
                <span className="text-xs mt-1">Shadow</span>
              </div>

              <div className="flex flex-col items-center">
                <div
                  className="w-16 h-16 rounded flex items-center justify-center"
                  style={{
                    border: "2px solid rgb(var(--color-neutral-outline-raw) / 30%)",
                    backgroundColor: "rgb(var(--color-neutral-surface-raw) / 5%)"
                  }}
                >
                  <span className="text-xs">Outline</span>
                </div>
                <span className="text-xs mt-1">Outline</span>
              </div>
            </div>
            <div className="mt-2 bg-gray-100 p-2 rounded text-xs font-mono">
              box-shadow: 0 4px 8px rgb(var(--color-neutral-shadow-raw) / 15%);<br />
              border: 2px solid rgb(var(--color-neutral-outline-raw) / 30%);
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Helper function to generate a spacing visualization
  const generateSpacingPreview = () => {
    return (
      <div className="flex flex-col gap-2 mt-4 items-start">
        {["100", "200", "400", "800"].map((size) => (
          <div
            key={size}
            className="flex flex-col"
          >
            <div
              className="h-5 bg-indigo-100 rounded relative"
              style={{ width: `var(--spacing-${size})` }}
              title={`spacing-${size}`}
            />
            <div
              className="text-xs"
            >
              {size}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Helper function to generate a typography preview
  const generateTypographyPreview = () => {
    return (
      <div className="flex flex-col gap-2 mt-4">
        <div style={{ fontSize: "var(--font-size-12)", lineHeight: "var(--line-height-16)" }}>Font Size 12px</div>
        <div style={{ fontSize: "var(--font-size-14)", lineHeight: "var(--line-height-20)" }}>Font Size 14px</div>
        <div style={{ fontSize: "var(--font-size-16)", lineHeight: "var(--line-height-24)" }}>Font Size 16px</div>
      </div>
    );
  };

  // Helper function to generate a corner radius preview
  const generateCornerRadiusPreview = () => {
    return (
      <div className="flex gap-4 mt-4">
        {["small", "medium", "large"].map((size) => (
          <div
            key={size}
            className="w-15 h-10 bg-indigo-100 border border-dashed border-indigo-500 flex items-center justify-center text-xs"
            style={{ borderRadius: `var(--corner-radius-${size})` }}
            title={`corner-radius-${size}`}
          >
            {size}
          </div>
        ))}
      </div>
    );
  };

  // Get the appropriate preview for each category
  const getCategoryPreview = (category: string) => {
    switch (category) {
      case "colors":
        return generateColorPalette();
      case "spacing":
        return generateSpacingPreview();
      case "typography":
        return generateTypographyPreview();
      case "cornerRadius":
        return generateCornerRadiusPreview();
      default:
        return null;
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-6">Design Tokens</h1>
      <p className="mb-6">
        Browse through our design tokens organized by category. These tokens are the foundation of our design system.
      </p>

      <div className="flex flex-col gap-8">
        {Object.entries(categoryDescriptions).map(([category, description]) => (
          <div key={category} className="category-card">
            <h2 className="text-xl mb-2">{category.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}</h2>
            <p className="mb-4 text-gray-600">{description}</p>

            {/* Preview for each category */}
            {getCategoryPreview(category)}

            {/* Add raw colors palette for the colors category */}
            {category === "colors" && generateRawColorsPalette()}

            {category === "colors" && (
              <div
                className="flex flex-wrap gap-4 mt-6"
              >
                {Object.entries(colorSubcategoryDescriptions).map(([subCategory, subDescription]) => (
                  <div
                    key={subCategory}
                    className="flex-1 basis-[300px] border border-gray-200 rounded-lg p-4 cursor-pointer relative overflow-hidden hover:shadow-md hover:border-gray-300 transition-all duration-200"
                    onClick={() => {
                      setSearchTerm("")
                      setActiveCategory("colors")
                      setActiveColorSubcategory(subCategory)
                    }}
                  >
                    {/* Color preview for each subcategory */}
                    {subCategory !== "primitives" && (
                      <div
                        className="absolute top-0 right-0 w-15 h-15 opacity-30 rounded-bl-full"
                        style={{ backgroundColor: `var(--color-${subCategory}-surface)` }}
                      />
                    )}

                    {subCategory === "primitives" && (
                      <div
                        className="absolute top-0 right-0 w-15 h-15 opacity-30 overflow-hidden"
                      >
                        <div className="flex">
                          <div className="w-5 h-5" style={{ backgroundColor: "var(--color-grape-500)" }} />
                          <div className="w-5 h-5" style={{ backgroundColor: "var(--color-blueberry-500)" }} />
                          <div className="w-5 h-5" style={{ backgroundColor: "var(--color-kale-500)" }} />
                        </div>
                        <div className="flex">
                          <div className="w-5 h-5" style={{ backgroundColor: "var(--color-kiwi-500)" }} />
                          <div className="w-5 h-5" style={{ backgroundColor: "var(--color-mango-500)" }} />
                          <div className="w-5 h-5" style={{ backgroundColor: "var(--color-persimmon-500)" }} />
                        </div>
                        <div className="flex">
                          <div className="w-5 h-5" style={{ backgroundColor: "var(--color-plum-500)" }} />
                          <div className="w-5 h-5" style={{ backgroundColor: "var(--color-fig-500)" }} />
                          <div className="w-5 h-5" style={{ backgroundColor: "var(--color-sand-500)" }} />
                        </div>
                      </div>
                    )}

                    <h3 className="text-base mb-2">{subCategory}</h3>
                    <p className="text-sm text-gray-600 relative z-10">
                      {subDescription}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {category !== "colors" && (
              <div
                className="block border border-gray-200 rounded-lg p-4 cursor-pointer mt-6 hover:shadow-md hover:border-gray-300 transition-all duration-200"
                onClick={() => {
                  setSearchTerm("")
                  setActiveCategory(category)
                }}
              >
                <p className="text-sm">View all {category} tokens &rarr;</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const meta: Meta = {
  title: "Design/Tokens",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "A catalog of all available design tokens in the system. Click on any token to copy its path.",
      },
    },
  },
};

export default meta;

export const TokensIndex = {
  render: () => <TokenCategorized />,
  name: "Index",
  parameters: {
    docs: {
      description: {
        story: "Design tokens organized by their categories for easier navigation.",
      },
    },
  },
};

export const TokensCatalog = {
  render: () => <TokenCatalog />,
  name: "Catalog",
  parameters: {
    docs: {
      description: {
        story: "All design tokens displayed in a searchable and filterable grid.",
      },
    },
  },
};

