import { UnControlled as CodeMirror, type IUnControlledCodeMirror } from "react-codemirror2";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/xml/xml";
import "codemirror/addon/hint/show-hint";
import "./config-hint";

import "codemirror/lib/codemirror.css";
import "codemirror/addon/hint/show-hint.css";
import styles from "./code-editor.module.scss";

/* eslint-disable-next-line */
export interface CodeEditorProps extends IUnControlledCodeMirror {}

export function CodeEditor(props: CodeEditorProps) {
  return (
    <div className={styles.codeEditor}>
      <CodeMirror {...props} />
    </div>
  );
}

export default CodeEditor;
