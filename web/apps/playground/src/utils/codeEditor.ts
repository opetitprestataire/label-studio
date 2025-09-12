// CodeMirror v6 configuration for playground
import tags from "@humansignal/core/lib/utils/schema/tags.json";

// Legacy functions - no longer needed with v6 but kept for backward compatibility
export function completeAfter() {
  // No-op for v6 compatibility
  return true;
}

export function completeIfInTag() {
  // No-op for v6 compatibility
  return true;
}

// Updated for CodeMirror v6 compatibility
export const editorExtensions = []; // Extensions are now handled internally by the CodeEditor component
export const editorOptions = {
  mode: "xml",
  lineNumbers: true,
  autocomplete: true,
  extraKeys: {
    "Ctrl-Space": "autocomplete",
  },
};

// Export the schema for use with the new CodeEditor component
export const xmlSchema = tags;
