import { configure } from "mobx";
import { applyAction } from "mobx-state-tree";
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

    const isRendered = false;

    const renderApp = () => {
      if (isRendered) {
        clearRenderedApp();
      }
      // Create new root for React 18
      this.reactRoot = createRoot(rootElement);
      const AppComponent = App as any;
      this.reactRoot.render(<AppComponent store={this.store} />);
    };

    const clearRenderedApp = () => {
      if (this.reactRoot) {
        this.reactRoot.unmount();
        this.reactRoot = null;
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
      // Clear any pending timeouts/intervals
      if (this.store?.timeouts) {
        Object.values(this.store.timeouts).forEach((timeoutId: unknown) => {
          if (typeof timeoutId === "number") {
            clearTimeout(timeoutId);
          }
        });
      }
      if (this.store?.intervals) {
        Object.values(this.store.intervals).forEach((intervalId: unknown) => {
          if (typeof intervalId === "number") {
            clearInterval(intervalId);
          }
        });
      }

      // Remove all event listeners
      Object.keys(this.events.events).forEach((eventName) => {
        this.events.removeAll(eventName);
      });

      // Clear rendered app
      clearRenderedApp();

      // Destroy shared store
      destroySharedStore();

      // Destroy store and its children using actions
      if (this.store) {
        try {
          // First destroy children to prevent circular references
          if (this.store.annotationStore) {
            applyAction(this.store, {
              name: "destroyAnnotationStore",
              path: "/annotationStore",
              args: [],
            });
          }
          if (this.store.relationStore) {
            applyAction(this.store, {
              name: "destroyRelationStore",
              path: "/relationStore",
              args: [],
            });
          }
          if (this.store.settings) {
            applyAction(this.store, {
              name: "destroySettings",
              path: "/settings",
              args: [],
            });
          }

          // Then destroy the main store
          applyAction(this.store, {
            name: "destroy",
            path: "",
            args: [],
          });
        } catch (e) {
          console.error("Error destroying store:", e);
        }
      }

      // Unbind all hotkeys
      Hotkey.unbindAll();

      // Clear references
      this.store = null;
      this.destroy = null;
      window.Htx = null;

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
