import { configure } from "mobx";
import { createRoot } from "react-dom/client";
import { toCamelCase } from "strman";

import { LabelStudio as LabelStudioReact } from "./Component";
import App from "./components/App/App";
import { configureStore } from "./configureStore";
import legacyEvents from "./core/External";
import { Hotkey } from "./core/Hotkey";
import defaultOptions from "./defaultOptions";
import { destroy as destroySharedStore } from "./mixins/SharedChoiceStore/mixin";
import { EventInvoker } from "./utils/events";
import { isDefined } from "./utils/utilities";

declare global {
  interface Window {
    Htx: any;
  }
}

configure({
  isolateGlobalState: true,
});

type Callback = (...args: any[]) => any;

type LSFUser = any;
type LSFTask = any;

// @todo type LSFOptions = SnapshotIn<typeof AppStore>;
// because those options will go as initial values for AppStore
// but it's not types yet, so here is some excerpt of its params
type LSFOptions = Record<string, any> & {
  interfaces: string[];
  keymap?: any;
  user?: LSFUser;
  users?: LSFUser[];
  task?: LSFTask;
  settings?: {
    forceBottomPanel?: boolean;
  };
};

export class LabelStudio {
  static Component = LabelStudioReact;

  static instances = new Set<LabelStudio>();

  static destroyAll() {
    LabelStudio.instances.forEach((inst) => inst.destroy?.());
    LabelStudio.instances.clear();
  }

  options: Partial<LSFOptions>;
  root: Element | string;
  store: any;
  reactRoot: any;

  destroy: (() => void) | null = () => {};
  events = new EventInvoker();

  getRootElement(root: Element | string) {
    let element: Element | null = null;

    if (typeof root === "string") {
      element = document.getElementById(root);
    } else {
      element = root;
    }

    if (!element) {
      throw new Error(`Root element not found (selector: ${root})`);
    }

    return element;
  }

  constructor(root: Element | string, userOptions: Partial<LSFOptions> = {}) {
    const options = { ...defaultOptions, ...userOptions };

    if (options.keymap) {
      Hotkey.setKeymap(options.keymap);
    }

    this.root = root;
    this.options = options;

    this.supportLegacyEvents();
    this.createApp();

    LabelStudio.instances.add(this);
  }

  on(eventName: string, callback: Callback) {
    this.events.on(eventName, callback);
  }

  off(eventName: string, callback: Callback) {
    if (isDefined(callback)) {
      this.events.off(eventName, callback);
    } else {
      this.events.removeAll(eventName);
    }
  }

  async createApp() {
    const { store } = await configureStore(this.options, this.events);
    const rootElement = this.getRootElement(this.root);

    this.store = store;
    window.Htx = this.store;

    let isRendered = false;
    let renderTimeout: number | null = null;

    const renderApp = () => {
      if (isRendered) {
        clearRenderedApp();
      }
      renderTimeout = setTimeout(() => {
        // Create new root for React 18
        this.reactRoot = createRoot(rootElement);
        const AppComponent = App as any;
        this.reactRoot.render(<AppComponent store={this.store} />);
        isRendered = true;
      });
    };

    const clearRenderedApp = () => {
      if (renderTimeout) {
        clearTimeout(renderTimeout);
        renderTimeout = null;
      }
      if (this.reactRoot && isRendered) {
          this.reactRoot.unmount();
          this.reactRoot = null;
          isRendered = false;
      }
    };

    renderApp();

    store.setAppControls({
      isRendered() {
        return isRendered;
      },
      render: renderApp,
      clear: clearRenderedApp,
    });

    this.destroy = () => {
      // Clear rendered app
      clearRenderedApp();

      // Destroy shared store
      destroySharedStore();

      // Unbind all hotkeys
      Hotkey.unbindAll();

      // Clear references
      this.store = null;
      window.Htx = null;
      this.destroy = null;

      // Remove from instances set
      LabelStudio.instances.delete(this);
    };
  }

  supportLegacyEvents() {
    const keys = Object.keys(legacyEvents);

    keys.forEach((key) => {
      const callback = this.options[key];

      if (isDefined(callback)) {
        const eventName = toCamelCase(key.replace(/^on/, ""));

        this.events.on(eventName, callback);
      }
    });
  }
}
