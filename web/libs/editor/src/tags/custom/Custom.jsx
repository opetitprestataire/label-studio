import React from "react";

import { destroy, types, getRoot } from "mobx-state-tree";
import { observer } from "mobx-react";
import Registry from "../../core/Registry";
import ObjectBase from "../object/Base";
// import ClassificationBase from "../control/ClassificationBase";

import { AnnotationMixin } from "../../mixins/AnnotationMixin";
import { errorBuilder } from "../../core/DataValidator/ConfigValidator";
import { parseValue, tryToParseJSON } from "../../utils/data";

const TagAttrs = types.model("CustomIntrefaceAttrs", {
  toname: types.maybeNull(types.string),
  code: types.optional(types.string, ""),
  value: types.optional(types.string, ""),
  data: types.optional(types.string, ""),
  props: types.optional(types.string, "{}"),
  style: types.optional(types.string, ""),
  classname: types.optional(types.string, ""),
  css: types.optional(types.string, ""),
  errorBoundary: types.optional(types.boolean, true),
});

const Model = types
  .model({
    type: "custominterface",
    globalState: types.optional(types.frozen(), {}),
    globalMetadata: types.optional(types.array(types.frozen()), []),
  })
  .volatile(() => ({
    loadedData: null,
    dataLoaded: false,
    dataError: null,
  }))
  .views((self) => ({
    get store() {
      return getRoot(self);
    },

    // get regions() {
    //   return self.annotation?.regions?.filter((r) => r.object === self);
    // },



    get annStore() {
      return self.annotationStore;
    },
    get result() {
      return self.annotation?.results?.find((r) => r.from_name === self);
    },
    get currentValue() {
      return self.result?.value || null;
    },
    get parsedProps() {
      try {
        return JSON.parse(self.props);
      } catch (e) {
        console.warn("Invalid props JSON:", e);
        return {};
      }
    },
    get parsedStyle() {
      try {
        return self.style ? JSON.parse(self.style) : {};
      } catch (e) {
        return {};
      }
    },
    get effectiveCode() {
      if (self.value && self.value.trim()) return self.value.trim();
      if (self.code && self.code.trim()) return self.code.trim();
      return "";
    },
    selectedValues() {
      const result = {
        regions: self.regions.map((r) => r._value),
        globalState: self.globalState,
        metadata: self.globalMetadata,
      };
      return result;
    },
    get valueType() {
      return self.resultType;
    },
    get resultType() {
      return "custominterface";
    },
    get holdsState() {
      return (
        self.regions.length > 0 ||
        Object.keys(self.globalState || {}).length > 0 ||
        (self.globalMetadata && self.globalMetadata.length > 0)
      );
    },
  }))
  .actions((self) => ({
    setValue(value) {
      self.addRegion(value);
    },
    perRegionCleanup() {
      self.regions = [];
      self.updateResult();
    },
    needsUpdate() {
      self.updateFromResult(self.result?.mainValue);
    },
    updateFromResult(value) {
      self.regions = [];
      self.globalState = {};
      self.globalMetadata = [];
      if (value && typeof value === "object") {
        if (value.regions && Array.isArray(value.regions)) {
          value.regions.forEach((regionValue) => {
            self.createRegion(regionValue);
          });
        }
        if (value.globalState && typeof value.globalState === "object") {
          self.globalState = value.globalState;
        }
        if (value.metadata && Array.isArray(value.metadata)) {
          self.globalMetadata = value.metadata;
        }
      } else if (value && Array.isArray(value)) {
        value.forEach((regionValue) => {
          self.createRegion(regionValue);
        });
      }
    },
    createRegion(value, pid) {

    },
    addRegion(value) {
      const areaValue = { custominterface: value };
      const resultValue = { custominterface: value };
      const region = self.annotation.createResult(areaValue, resultValue, self, self.toname);

      return region;
    },
    remove(region) {
      // const index = self.regions.indexOf(region);
      // if (index < 0) return;
      // self.regions.splice(index, 1);
      // destroy(region);
      // self.updateResult();
    },
    deleteResult() {
      // const result = self.annotation.results.find((r) => r.from_name === self);
      // if (result) {
      //   self.annotation.deleteResult(result);
      // }
    },
    triggerEvent(eventType, data) {
      // eslint-disable-next-line no-console
      console.log(`Event ${eventType} triggered on ${self.name}:`, data);
    },
    setLoadedData(data) {
      self.loadedData = data;
      self.dataLoaded = true;
      self.dataError = null;
    },
    setDataError(error) {
      self.dataError = error;
      self.dataLoaded = false;
      self.loadedData = null;
    },
    async preloadData(store) {
      if (!self.data) {
        self.dataLoaded = true;
        return;
      }
      const dataObj = store.task.dataObj;
      let dataValue;
      if (self.data.startsWith("$")) {
        dataValue = parseValue(self.data, dataObj);
      } else {
        dataValue = self.data;
      }
      if (!dataValue) {
        self.setDataError(`Cannot resolve data from "${self.data}"`);
        return;
      }
      if (typeof dataValue === "string" && /^https?:\/\//.test(dataValue)) {
        try {
          const response = await fetch(dataValue);
          if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
          const text = await response.text();
          let parsedData;
          try {
            parsedData = tryToParseJSON(text) || text;
          } catch (e) {
            parsedData = text;
          }
          self.setLoadedData(parsedData);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("Error loading data from URL:", error);
          self.setDataError(`Failed to load data from ${dataValue}: ${error.message}`);
          store.annotationStore.addErrors([errorBuilder.loadingError(error, dataValue, self.data)]);
        }
      } else {
        self.setLoadedData(dataValue);
      }
    },
    updateGlobalState(newState) {
      self.globalState = newState;
      self.updateResult();
    },
  }));

const CustomInterfaceModel = types.compose(
  "CustomInterfaceModel",
  ObjectBase,
  // ClassificationBase,
  TagAttrs,
  AnnotationMixin,
  Model,
);

class CustomInterfaceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-console
    console.group("CustomInterface Error Details");
    // eslint-disable-next-line no-console
    console.error("Error:", error);
    // eslint-disable-next-line no-console
    console.error("Error Info:", errorInfo);
    // eslint-disable-next-line no-console
    console.groupEnd();
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return <div>Custom component error</div>;
    }
    return this.props.children;
  }
}

const CustomInterfaceComponent = observer(({ item }) => {
  const [DynamicComponent, setDynamicComponent] = React.useState(null);

  React.useEffect(() => {
    if (item.annotation?.store && !item.dataLoaded && !item.dataError) {
      item.preloadData(item.annotation.store);
    }
  }, [item.annotation?.store]);

  React.useEffect(() => {
    if (!item.dataLoaded) return;
    if (item.dataError) {
      setDynamicComponent(() => () => <div>Data Loading Error: {item.dataError}</div>);
      return;
    }
    if (!item.effectiveCode.trim()) {
      setDynamicComponent(() => () => <div>No function code provided.</div>);
      return;
    }
    try {
      const context = {
        React,
        useState: React.useState,
        useEffect: React.useEffect,
        useCallback: React.useCallback,
        useMemo: React.useMemo,
        useRef: React.useRef,
        useReducer: React.useReducer,
        useContext: React.useContext,
        data: item.loadedData,
        regions: item.regs,
        addRegion: item.addRegion?.bind(item),
        deleteRegion: item.remove?.bind(item),
        clearAllRegions: item.perRegionCleanup?.bind(item),
        state: item.globalState,
        saveState: item.updateGlobalState?.bind(item),
        saveData: item.updateGlobalState?.bind(item),
        metadata: item.globalMetadata,
        saveMetadata: item.addMetadata?.bind(item),
        deleteMetadata: item.removeMetadata?.bind(item),
        clearAllMetadata: item.clearAllMetadata?.bind(item),
        tags: () => {
          return Array.from(item.annotation.names.values())
            .filter((tag) => tag.type === "choices")
            .map((tag) => {
              const options = (tag.children || []).map((choice) => choice.value ?? choice._value);
              return { name: tag.name, type: tag.type, options };
            });
        },
        getTagValue: (tagName) => {
          const tag = item.annotation.names.get(tagName);
          if (!tag) return null;
          const result = item.annotation.results.find((r) => r.from_name === tag);
          return result ? result.value : null;
        },
        setTagValue: ((tagName, value) => {
          const tag = item.annotation.names.get(tagName);
          if (!tag) return;
          if (tag.type !== "choices") return;
          let formattedValue = value;
          if (tag.type === "choices") {
            formattedValue = Array.isArray(value) ? value : [value];
          }
          const existingResult = item.annotation.results.find((r) => r.from_name === tag);
          if (existingResult) {
            if (existingResult.setValue) existingResult.setValue(formattedValue);
            else existingResult.value = formattedValue;
          } else {
            item.annotation.createResult({}, { [tag.valueType]: formattedValue }, tag, tag.toname);
          }
          if (typeof item.updateResult === "function") {
            item.updateResult();
          }
        }).bind(item),
        item,
        annotation: item.annotation,
        store: item.annotation?.store || null,
        task: item.annotation?.task || null,
        getAllResults: () => item.annotation.results,
        deleteResult: item.deleteResult?.bind(item),
        getValue: () => {
          const result = item.annotation?.results.find((r) => r.from_name === item);
          return result ? result.value : null;
        },
        setValue: item.setValue?.bind(item),
        updateResult: item.updateResult?.bind(item),
        tagName: item.name,
        toName: item.toname,
        props: item.parsedProps,
      };

      function decodeHtmlEntities(text) {
        const textArea = document.createElement("textarea");
        textArea.innerHTML = text;
        return textArea.value;
      }

      const transformedCode = decodeHtmlEntities(item.effectiveCode).replace(/^\s*<!\[CDATA\[|]]>\s*$/g, "");

      const UserComponent = () => {
        const code = `
          "use strict";
          try {
            const { React, useState, regions, addRegion, deleteRegion, clearAllRegions,
              state, saveState, metadata, saveMetadata, deleteMetadata, clearAllMetadata,
              tags, getTagValue, setTagValue, item, annotation, store, task,
              getValue, setValue, tagName, toName, props } = arguments[0];
            const userFunction = (${transformedCode});
            return userFunction(arguments[0]);
          } catch (error) {
            throw error;
          }
        `;
        const componentFunction = new Function(code);
        return componentFunction(context);
      };

      setDynamicComponent(observer(UserComponent));
    } catch (err) {
      setDynamicComponent(() => <div>Component Compilation Error</div>);
    }
  }, [item.effectiveCode, item.dataLoaded, item.dataError, item.regs]);

  if (!item.dataLoaded) {
    return <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>Loading data...</div>;
  }

  const wrapperStyle = { ...item.parsedStyle };
  const content = DynamicComponent ? <DynamicComponent /> : <div>Loading...</div>;

  return (
    <div className={`custom-tag-wrapper ${item.classname}`} style={wrapperStyle}>
      {item.css && <style dangerouslySetInnerHTML={{ __html: item.css }} />}
      {item.errorBoundary ? (
        <CustomInterfaceErrorBoundary code={item.effectiveCode} item={item}>
          {content}
        </CustomInterfaceErrorBoundary>
      ) : (
        content
      )}
    </div>
  );
});

export { CustomInterfaceModel, CustomInterfaceComponent };


