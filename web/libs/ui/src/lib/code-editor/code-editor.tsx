import type { Extension } from "@codemirror/state";
import type { ViewUpdate } from "@codemirror/view";
import { useCodeMirror } from "@uiw/react-codemirror";
import { autocompletion } from "@codemirror/autocomplete";

import { forwardRef, useCallback, useMemo, useRef } from "react";
import { convertLegacyOptions, type LegacyCodeMirrorOptions } from "./v5-compat";
import { createXMLTagCompletion, createVariableCompletion, type XMLSchema } from "./xml-autocomplete-v6";

import styles from "./code-editor.module.scss";
import { cn } from "@humansignal/shad/utils";

export interface CodeEditorProps {
  // Legacy v5 compatibility props
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBeforeChange?: (editor: any, data: any, value: string) => void; // Legacy compat
  controlled?: boolean;
  border?: boolean;

  // v6 specific props
  extensions?: Extension[];
  mode?: "xml" | "python" | "javascript" | "text/plain";

  // Legacy options (for backward compatibility)
  options?: LegacyCodeMirrorOptions;

  // Autocomplete schema (for XML mode)
  xmlSchema?: XMLSchema;
  variables?: string[]; // For variable completion
}

export const CodeEditor = forwardRef((props: CodeEditorProps, _ref) => {
  const {
    border = false,
    controlled = false,
    value,
    defaultValue,
    onChange,
    onBeforeChange,
    extensions: additionalExtensions = [],
    mode,
    options,
    xmlSchema,
    variables,
  } = props;

  const editorRef = useRef<HTMLDivElement>(null);

  // Build extensions array
  const extensions = useMemo(() => {
    const ext: Extension[] = [];

    // If legacy options provided, convert them
    if (options) {
      const { extensions: legacyExt } = convertLegacyOptions(options);
      ext.push(...legacyExt);
    }

    // Add mode-specific language extensions
    if (mode && !options?.mode) {
      const { extensions: modeExt } = convertLegacyOptions({ mode });
      ext.push(...modeExt);
    }

    // Add autocomplete for XML with schema
    if ((mode === "xml" || options?.mode === "xml") && xmlSchema) {
      ext.push(
        autocompletion({
          override: [createXMLTagCompletion(xmlSchema)],
        }),
      );
    }

    // Add variable completion
    if (variables && variables.length > 0) {
      ext.push(
        autocompletion({
          override: [createVariableCompletion(variables)],
        }),
      );
    }

    // Add any additional extensions
    ext.push(...additionalExtensions);

    return ext;
  }, [options, mode, xmlSchema, variables, additionalExtensions]);

  // Get basic setup configuration
  const basicSetupConfig = useMemo(() => {
    if (options) {
      const { basicSetup: config } = convertLegacyOptions(options);
      return config;
    }
    return {
      lineNumbers: true,
      foldGutter: true,
      bracketMatching: true,
      closeBrackets: true,
      autocompletion: true,
      lineWrapping: true,
    };
  }, [options]);

  // Legacy onBeforeChange compatibility
  const handleChange = useCallback(
    (value: string, _viewUpdate: ViewUpdate) => {
      if (onBeforeChange) {
        onBeforeChange(null, null, value); // Legacy API compatibility
      }
      onChange?.(value);
    },
    [onChange, onBeforeChange],
  );

  // Get editable state
  const editable = useMemo(() => {
    if (options) {
      const { editable: isEditable } = convertLegacyOptions(options);
      return isEditable;
    }
    return true;
  }, [options]);

  useCodeMirror({
    container: editorRef.current,
    value: controlled ? value : undefined,
    defaultValue: !controlled ? value || defaultValue : undefined,
    onChange: handleChange,
    extensions,
    editable,
    basicSetup: basicSetupConfig,
    placeholder: options?.placeholder,
  });

  return (
    <div
      className={cn(styles.codeEditor, {
        [styles.border]: border,
      })}
      ref={editorRef}
    />
  );
});

export default CodeEditor;

// Re-export types for backward compatibility
export type { XMLSchema, XMLSchemaItem, XMLSchemaItemAttr } from "./xml-autocomplete-v6";
export type { LegacyCodeMirrorOptions } from "./v5-compat";
