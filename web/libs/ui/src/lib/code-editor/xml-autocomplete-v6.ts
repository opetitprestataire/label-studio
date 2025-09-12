import type { CompletionContext, CompletionResult, CompletionSource } from "@codemirror/autocomplete";
// import { syntaxTree } from "@codemirror/language"; // For future use

/**
 * Schema item for XML autocomplete
 */
export interface XMLSchemaItem {
  name: string;
  description?: string;
  attrs?: Record<string, XMLSchemaItemAttr>;
  children?: string[];
}

export interface XMLSchemaItemAttr {
  name: string;
  description: string;
  type: string | string[];
  required: boolean;
  default?: any;
}

/**
 * Schema for XML tags (typically Label Studio tags)
 */
export type XMLSchema = Record<string, XMLSchemaItem>;

/**
 * Creates an XML tag completion source for CodeMirror 6
 * Based on the legacy config-hint.ts functionality
 */
export function createXMLTagCompletion(tagSchema: XMLSchema): CompletionSource {
  return (context: CompletionContext): CompletionResult | null => {
    const word = context.matchBefore(/\w*/);
    const beforeCursor = context.state.doc.sliceString(Math.max(0, context.pos - 10), context.pos);

    // Check if we're in a tag opening context
    const isInTag = beforeCursor.includes("<") && !beforeCursor.includes(">");
    const isClosingTag = beforeCursor.includes("</");

    if (!isInTag && !word) return null;

    // const tree = syntaxTree(context.state);
    // For now, we'll use a simpler approach without syntax tree analysis

    // Handle tag name completion
    if (isInTag && !isClosingTag) {
      const options = Object.entries(tagSchema)
        .filter(([name]) => !word || name.toLowerCase().startsWith(word.text.toLowerCase()))
        .map(([name, schema]) => ({
          label: name,
          type: "tag",
          info: schema.description || `Label Studio ${name} tag`,
          apply: `${name}>`,
          detail: "Label Studio Tag",
          boost: schema.name === "View" ? 99 : 0, // Boost commonly used tags
        }));

      if (options.length === 0) return null;

      return {
        from: word ? word.from : context.pos,
        options,
        validFor: /^\w*$/,
      };
    }

    // Handle attribute completion (simplified version)
    if (isInTag && !isClosingTag && word) {
      // Find the current tag name
      const tagMatch = beforeCursor.match(/<(\w+)/);
      const currentTag = tagMatch?.[1];

      if (currentTag && tagSchema[currentTag]?.attrs) {
        const attrs = tagSchema[currentTag].attrs;
        const options = Object.entries(attrs)
          .filter(([attrName]) => attrName.toLowerCase().startsWith(word.text.toLowerCase()))
          .map(([attrName, attr]) => ({
            label: attrName,
            type: "attribute",
            info: attr.description,
            apply: `${attrName}="${attr.default || ""}"`,
            detail: Array.isArray(attr.type) ? attr.type.join(" | ") : attr.type,
          }));

        if (options.length > 0) {
          return {
            from: word.from,
            options,
            validFor: /^\w*$/,
          };
        }
      }
    }

    return null;
  };
}

/**
 * Creates a variable completion source for prompt editors
 */
export function createVariableCompletion(variables: string[]): CompletionSource {
  return (context: CompletionContext): CompletionResult | null => {
    const word = context.matchBefore(/\{\w*/);

    if (!word) return null;

    const options = variables.map((variable) => ({
      label: `{${variable}}`,
      type: "variable",
      info: `Insert variable: ${variable}`,
      apply: `{${variable}}`,
      detail: "Variable",
    }));

    return {
      from: word.from,
      options,
      validFor: /^\{\w*$/,
    };
  };
}
