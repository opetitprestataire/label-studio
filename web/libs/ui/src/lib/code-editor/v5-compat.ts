import type { Extension } from "@codemirror/state";
import { xml } from "@codemirror/lang-xml";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { keymap } from "@codemirror/view";
import { autocompletion } from "@codemirror/autocomplete";

/**
 * Legacy CodeMirror v5 options interface for backward compatibility
 */
export interface LegacyCodeMirrorOptions {
  mode?: "xml" | "python" | "javascript" | "text/plain";
  theme?: string;
  lineNumbers?: boolean;
  readOnly?: boolean;
  extraKeys?: Record<string, (cm: any) => void>;
  placeholder?: string;
  indentUnit?: number;
  tabSize?: number;
  lineWrapping?: boolean;
  autofocus?: boolean;
  autocomplete?: boolean | "show-hint";
}

/**
 * Converts legacy CodeMirror v5 options to CodeMirror v6 extensions
 */
export function convertLegacyOptions(options: LegacyCodeMirrorOptions): {
  extensions: Extension[];
  editable: boolean;
  basicSetup: any;
} {
  const extensions: Extension[] = [];

  // Language modes
  if (options.mode === "xml") {
    extensions.push(xml());
  } else if (options.mode === "python") {
    extensions.push(python());
  } else if (options.mode === "javascript") {
    extensions.push(javascript());
  }

  // Convert extraKeys to keymap
  if (options.extraKeys) {
    const keymapExtensions = Object.entries(options.extraKeys).map(([key, handler]) => ({
      key: key === "Ctrl-Space" ? "Ctrl-Space" : key,
      run: () => {
        // Legacy handler expects a CM5 editor instance
        // For now, we'll just trigger autocomplete on Ctrl-Space
        if (key === "Ctrl-Space") {
          // The actual autocomplete will be handled by the autocomplete extension
          return true;
        }
        return false;
      },
    }));
    extensions.push(keymap.of(keymapExtensions));
  }

  // Add autocomplete if requested
  if (options.autocomplete) {
    extensions.push(autocompletion());
  }

  return {
    extensions,
    editable: !options.readOnly,
    basicSetup: {
      lineNumbers: options.lineNumbers ?? true,
      foldGutter: options.lineNumbers ?? true,
      indentOnInput: true,
      bracketMatching: true,
      closeBrackets: true,
      autocompletion: !!options.autocomplete,
      highlightSelectionMatches: false,
      tabSize: options.tabSize ?? 2,
      lineWrapping: options.lineWrapping ?? true,
    },
  };
}
