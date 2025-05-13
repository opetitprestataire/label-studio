import { createRoot } from "react-dom/client";
import { PlaygroundApp } from "./components/PlaygroundApp";

import "@humansignal/ui/src/styles.scss";
import "@humansignal/ui/src/tailwind.css";

const root = createRoot(document.getElementById("root")!);
root.render(<PlaygroundApp />);
