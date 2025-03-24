import type React from "react";
import { useState, useRef, useEffect } from "react";
import type { Meta } from "@storybook/react";
import { atom, useAtom, useSetAtom } from "jotai";
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
  primary: "Primary brand colors for key UI elements and interactions",
  negative: "Negative/danger colors for error states and destructive actions",
  positive: "Positive/success colors for confirmations and success states",
  warning: "Warning colors for cautionary messages and states",
  accent: "Accent colors for highlighting and distinguishing UI elements",
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
      className="token-item"
      onClick={handleCopy}
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "16px",
        border: "1px solid #eee",
        borderRadius: "8px",
        margin: "8px 0",
        cursor: "pointer",
        transition: "all 0.2s",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
        e.currentTarget.style.borderColor = "#ddd";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "#eee";
      }}
      title={`Click to copy: ${tokenName}`}
    >
      {/* Visual preview for different token types */}
      {isColor && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
          <div
            className="color-preview"
            style={{
              width: "100%",
              height: "64px",
              backgroundColor: token,
              borderRadius: "4px",
              border: "1px solid #eee",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05)",
            }}
          />
        </div>
      )}

      {isSpacing && (
        <div
          className="spacing-preview"
          style={{
            marginBottom: "12px",
            height: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 16px",
          }}
        >
          <div
            style={{
              width: token,
              height: "8px",
              background: "linear-gradient(90deg, #6366F1 0%, #A855F7 100%)",
              borderRadius: "4px",
              minWidth: "4px",
              position: "relative",
            }}
          />
        </div>
      )}

      {isTypography && (
        <div
          className="typography-preview"
          style={{
            marginBottom: "12px",
            height: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {token.includes("--font-size-") && (
            <div
              style={{
                fontSize: token,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              Aa
            </div>
          )}

          {token.includes("--line-height-") && (
            <div
              style={{
                position: "relative",
                width: "60%",
                height: "40px",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: token,
                  backgroundColor: "rgba(99, 102, 241, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  color: "#6366F1",
                  position: "relative",
                }}
              >
                Line Height
              </div>
            </div>
          )}

          {token.includes("--letter-spacing-") && (
            <div
              style={{
                letterSpacing: token,
                fontSize: "14px",
                position: "relative",
                padding: "0 16px",
              }}
            >
              LETTER SPACING
            </div>
          )}
        </div>
      )}

      {isCornerRadius && (
        <div
          className="corner-radius-preview"
          style={{
            marginBottom: "12px",
            height: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              width: "60%",
              height: "40px",
              backgroundColor: "rgba(99, 102, 241, 0.2)",
              borderRadius: token,
              border: "1px dashed #6366F1",
            }}
          />
        </div>
      )}

      {/* Token information */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                className="token-name"
                style={{
                  color: "#000",
                  fontSize: "14px",
                  fontWeight: "bold",
                  wordBreak: "break-word",
                }}
              >
                {tokenName.split(".").pop() || tokenName}
              </div>
              <div
                className="token-path"
                style={{
                  fontSize: "10px",
                  color: "#aaa",
                  marginTop: "-4px",
                }}
              >
                {tokenName.split(".").slice(0, -1).join(".")}
              </div>
            </div>

            <span
              style={{
                fontSize: "10px",
                color: "#000",
                textAlign: "right",
              }}
            >
              {computedValue || "..."}
            </span>
          </div>

          <div
            className="token-value"
            style={{
              fontSize: "12px",
              fontWeight: "bold",
              color: "#555",
              textAlign: "center",
              wordBreak: "break-all",
              flexShrink: 0,
              backgroundColor: "rgb(247 246 246)",
              padding: "1px 2px",
              borderRadius: "4px",
            }}
          >
            {token.replace("var(", "").replace(")", "")}
          </div>
        </div>
      </div>

      {/* Copy indicator */}
      <div
        className="copy-indicator"
        style={{
          position: "absolute",
          bottom: "-30px",
          right: "8px",
          backgroundColor: "#000",
          color: "#fff",
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "12px",
          opacity: "0",
          transition: "all 0.3s",
          zIndex: "10",
        }}
      >
        Copied!
      </div>
    </div>
  );
};

const searchAtom = atom("");
const activeCategoryAtom = atom("all");
const activeColorSubcategoryAtom = atom("all");

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

  return (
    <div className="token-catalog p-8">
      <div
        className="search-container"
        style={{
          marginBottom: "24px",
        }}
      >
        <input
          type="text"
          placeholder="Search tokens by name or value..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            width: "100%",
            fontSize: "14px",
            marginBottom: "16px",
          }}
        />

        <div
          className="category-filters"
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => {
              setActiveCategory("all")
              setActiveColorSubcategory("all")
            }}
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              backgroundColor: activeCategory === "all" ? "#eee" : "white",
              cursor: "pointer",
              fontSize: "14px",
            }}
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
              style={{
                padding: "6px 12px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                backgroundColor: activeCategory === category ? "#eee" : "white",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              {category}
            </button>
          ))}
        </div>

        {activeCategory === "colors" && (
          <div
            className="color-subcategory-filters"
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "16px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => setActiveColorSubcategory("all")}
              style={{
                padding: "6px 12px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                backgroundColor: activeColorSubcategory === "all" ? "#eee" : "white",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              All Colors
            </button>
            {Object.keys(colorSubcategoryDescriptions).map((subcategory) => (
              <button
                key={subcategory}
                onClick={() => {
                  setActiveColorSubcategory(subcategory)
                }}
                style={{
                  padding: "6px 12px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  backgroundColor: activeColorSubcategory === subcategory ? "#eee" : "white",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                {subcategory}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Display the tokens */}
      {Object.keys(groupedTokens).length === 0 ? (
        <div style={{ textAlign: "center", margin: "40px 0", color: "#666" }}>
          No tokens found matching "{searchTerm}"
        </div>
      ) : (
        Object.entries(groupedTokens).map(([category, tokens]) => (
          <div key={category} className="category-section" style={{ marginBottom: "40px" }}>
            <h2
              style={{
                fontSize: "18px",
                margin: "0 0 8px 0",
                padding: "0 0 8px 0",
                borderBottom: "1px solid #eee",
              }}
            >
              {category} ({tokens.length})
            </h2>
            <p
              style={{
                fontSize: "14px",
                margin: "0 0 16px 0",
                color: "#666",
              }}
            >
              {categoryDescriptions[category] || "Design tokens in this category"}
            </p>

            <div
              className="tokens-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "16px",
              }}
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
      <div style={{ display: "flex", gap: "4px", marginTop: "16px" }}>
        {["primary", "positive", "warning", "negative", "neutral"].map((color) => (
          <div
            key={color}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "4px",
              backgroundColor: `var(--color-${color}-surface)`,
              border: "1px solid #eee",
            }}
            title={`${color}`}
          />
        ))}
        {["grape", "blueberry", "kale", "kiwi", "mango", "persimmon"].map((color) => (
          <div
            key={color}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "4px",
              backgroundColor: `var(--color-${color}-500)`,
              border: "1px solid #eee",
            }}
            title={`${color}`}
          />
        ))}
      </div>
    );
  };

  // Helper function to generate a spacing visualization
  const generateSpacingPreview = () => {
    return (
      <div style={{ display: "flex", gap: "8px", marginTop: "16px", alignItems: "flex-end" }}>
        {["100", "200", "400", "800"].map((size) => (
          <div
            key={size}
            style={{
              width: `var(--spacing-${size})`,
              height: "20px",
              backgroundColor: "rgba(99, 102, 241, 0.2)",
              borderRadius: "4px",
              position: "relative",
            }}
            title={`spacing-${size}`}
          >
            <div
              style={{
                position: "absolute",
                bottom: "-16px",
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: "10px",
              }}
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
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px" }}>
        <div style={{ fontSize: "var(--font-size-12)", lineHeight: "var(--line-height-16)" }}>Font Size 12px</div>
        <div style={{ fontSize: "var(--font-size-14)", lineHeight: "var(--line-height-20)" }}>Font Size 14px</div>
        <div style={{ fontSize: "var(--font-size-16)", lineHeight: "var(--line-height-24)" }}>Font Size 16px</div>
      </div>
    );
  };

  // Helper function to generate a corner radius preview
  const generateCornerRadiusPreview = () => {
    return (
      <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
        {["small", "medium", "large"].map((size) => (
          <div
            key={size}
            style={{
              width: "60px",
              height: "40px",
              borderRadius: `var(--corner-radius-${size})`,
              backgroundColor: "rgba(99, 102, 241, 0.2)",
              border: "1px dashed #6366F1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
            }}
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
    <div className="token-categorized p-8">
      <h1 style={{ fontSize: "24px", marginBottom: "24px" }}>Design Tokens</h1>
      <p style={{ marginBottom: "24px" }}>
        Browse through our design tokens organized by category. These tokens are the foundation of our design system.
      </p>

      <div className="categories" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        {Object.entries(categoryDescriptions).map(([category, description]) => (
          <div key={category} className="category-card">
            <h2 style={{ fontSize: "20px", marginBottom: "8px" }}>{category}</h2>
            <p style={{ marginBottom: "16px", color: "#666" }}>{description}</p>

            {/* Preview for each category */}
            {getCategoryPreview(category)}

            {category === "colors" && (
              <div
                className="color-subcategories"
                style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "24px" }}
              >
                {Object.entries(colorSubcategoryDescriptions).map(([subCategory, subDescription]) => (
                  <div
                    key={subCategory}
                    className="subcategory-card"
                    style={{
                      flex: "1 0 300px",
                      border: "1px solid #eee",
                      borderRadius: "8px",
                      padding: "16px",
                      cursor: "pointer",
                      position: "relative",
                      overflow: "hidden",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                      e.currentTarget.style.borderColor = "#ddd";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor = "#eee";
                    }}
                    onClick={() => {
                      setSearchTerm("")
                      setActiveCategory("colors")
                      setActiveColorSubcategory(subCategory)
                    }}
                  >
                    {/* Color preview for each subcategory */}
                    {subCategory !== "primitives" && (
                      <div
                        style={{
                          position: "absolute",
                          top: "0",
                          right: "0",
                          width: "60px",
                          height: "60px",
                          backgroundColor: `var(--color-${subCategory}-surface)`,
                          opacity: 0.3,
                          borderBottomLeftRadius: "100%",
                        }}
                      />
                    )}

                    {subCategory === "primitives" && (
                      <div
                        style={{
                          position: "absolute",
                          top: "0",
                          right: "0",
                          width: "60px",
                          height: "60px",
                          opacity: 0.3,
                          overflow: "hidden",
                        }}
                      >
                        <div style={{ display: "flex" }}>
                          <div style={{ width: "20px", height: "20px", backgroundColor: "var(--color-grape-500)" }} />
                          <div
                            style={{ width: "20px", height: "20px", backgroundColor: "var(--color-blueberry-500)" }}
                          />
                          <div style={{ width: "20px", height: "20px", backgroundColor: "var(--color-kale-500)" }} />
                        </div>
                        <div style={{ display: "flex" }}>
                          <div style={{ width: "20px", height: "20px", backgroundColor: "var(--color-kiwi-500)" }} />
                          <div style={{ width: "20px", height: "20px", backgroundColor: "var(--color-mango-500)" }} />
                          <div
                            style={{ width: "20px", height: "20px", backgroundColor: "var(--color-persimmon-500)" }}
                          />
                        </div>
                        <div style={{ display: "flex" }}>
                          <div style={{ width: "20px", height: "20px", backgroundColor: "var(--color-plum-500)" }} />
                          <div style={{ width: "20px", height: "20px", backgroundColor: "var(--color-fig-500)" }} />
                          <div style={{ width: "20px", height: "20px", backgroundColor: "var(--color-sand-500)" }} />
                        </div>
                      </div>
                    )}

                    <h3 style={{ fontSize: "16px", marginBottom: "8px" }}>{subCategory}</h3>
                    <p style={{ fontSize: "14px", color: "#666", position: "relative", zIndex: "1" }}>
                      {subDescription}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {category !== "colors" && (
              <div
                className="category-preview"
                style={{
                  border: "1px solid #eee",
                  borderRadius: "8px",
                  padding: "16px",
                  cursor: "pointer",
                  marginTop: "24px",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                  e.currentTarget.style.borderColor = "#ddd";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = "#eee";
                }}
                onClick={() => {
                  setSearchTerm("")
                  setActiveCategory(category)
                }}
              >
                <p style={{ fontSize: "14px" }}>View all {category} tokens &rarr;</p>
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

