import { UnControlled as CodeMirror, type IUnControlledCodeMirror } from "react-codemirror2";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/xml/xml";
import "codemirror/addon/hint/show-hint";
import "./config-hint";

import "codemirror/lib/codemirror.css";
import "codemirror/addon/hint/show-hint.css";
import styles from "./code-editor.module.scss";
import { cn } from "@humansignal/shad/utils";
import { forwardRef } from "react";

/* eslint-disable-next-line */
export interface CodeEditorProps extends IUnControlledCodeMirror {
  border?: boolean; // Add border to the editor
  ref?: React.Ref<CodeMirror>;
}

export const CodeEditor = forwardRef(({ border = false, ...props }: CodeEditorProps, ref) => {
  return (
    <div
      className={cn(styles.codeEditor, {
        [styles.border]: border,
      })}
    >
      <CodeMirror ref={ref as React.RefObject<CodeMirror>} {...(props as IUnControlledCodeMirror)} />
    </div>
  );
});

export default CodeEditor;
