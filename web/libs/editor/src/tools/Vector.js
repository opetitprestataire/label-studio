import { isAlive, types } from "mobx-state-tree";

import BaseTool, { DEFAULT_DIMENSIONS } from "./Base";
import ToolMixin from "../mixins/Tool";
import { MultipleClicksDrawingTool } from "../mixins/DrawingTool";
import { NodeViews } from "../components/Node/Node";
import { observe } from "mobx";
import { nanoid } from "nanoid";

const _Tool = types
  .model("VectorTool", {
    group: "segmentation",
    shortcut: "tool:vector",
  })
  .views((self) => {
    const Super = {
      createRegionOptions: self.createRegionOptions,
      isIncorrectControl: self.isIncorrectControl,
      isIncorrectLabel: self.isIncorrectLabel,
    };

    return {
      get getActiveVector() {
        const poly = self.currentArea;

        if (poly && !isAlive(poly)) return null;
        if (poly && poly.closed) return null;
        if (poly === undefined) return null;
        if (poly && poly.type !== "vectorregion") return null;

        return poly;
      },

      get tagTypes() {
        return {
          stateTypes: "vectorlabels",
          controlTagTypes: ["vectorlabels", "vector"],
        };
      },

      get viewTooltip() {
        return "Vector region";
      },

      get iconComponent() {
        return self.dynamic ? NodeViews.VectorRegionModel.altIcon : NodeViews.VectorRegionModel.icon;
      },

      get defaultDimensions() {
        return DEFAULT_DIMENSIONS.vector;
      },

      createRegionOptions({ x, y }) {
        return Super.createRegionOptions({
          shape: [
            {
              id: nanoid(),
              x,
              y,
              controlPoints: [],
            },
          ],
          // shape: [],
          closed: false,
        });
      },

      isIncorrectControl() {
        return Super.isIncorrectControl() && self.current() === null;
      },
      isIncorrectLabel() {
        return !self.current() && Super.isIncorrectLabel();
      },
      canStart() {
        return self.current() === null;
      },

      current() {
        return self.getActiveVector;
      },
    };
  })
  .actions((self) => {
    const Super = {
      startDrawing: self.startDrawing,
      _finishDrawing: self._finishDrawing,
      deleteRegion: self.deleteRegion,
    };

    let disposer;
    const clickBlocker = false;

    return {
      handleToolSwitch(tool) {
        self.stopListening();
        if (self.getCurrentArea()?.isDrawing && tool.toolName !== "ZoomPanTool") {
          const shape = self.getCurrentArea()?.toJSON();

          if (shape?.shape?.length > 2) self.finishDrawing();
          else self.cleanupUncloseableShape();
        }
      },

      listenForClose() {
        const area = self.getCurrentArea();
        if (!area || !area.closable) return;

        disposer = observe(
          area,
          "closed",
          ({ newValue }) => {
            if (newValue.storedValue) self.finishDrawing();
          },
          true,
        );
      },

      stopListening() {
        disposer?.();
      },

      closeCurrent() {
        const area = self.getCurrentArea();
        self.stopListening();
        if (area.closed) return;
        area.closePoly();
      },

      clickEv(e, [x, y]) {
        if (clickBlocker) {
          // skip one click to prevent start drawing on polygon close
          clickBlocker = false;
          return;
        }
        if (self.mode === "drawing") {
          return;
        }
        self.startDrawing(x, y);
      },

      startDrawing(x, y) {
        // Use the raw canvas coordinates for snapping
        // KonvaVector will handle the coordinate conversion internally

        const image = self.obj.currentImageEntity;
        const width = image.naturalWidth;
        const height = image.naturalHeight;

        const realX = (x / 100) * width;
        const realY = (y / 100) * height;

        self.currentArea = self.createRegion(self.createRegionOptions({ x: realX, y: realY }), true);

        self.mode = "drawing";
        self.setDrawing(true);

        self.applyActiveStates(self.currentArea);

        // Start listening for path closure
        self.listenForClose();
      },

      _finishDrawing() {
        const { currentArea, control } = self;

        self.currentArea.notifyDrawingFinished();
        self.setDrawing(false);
        self.mode = "viewing";
        self.currentArea = null;
        self.stopListening();
        self.annotation.afterCreateResult(currentArea, control);
      },

      setDrawing(drawing) {
        self.currentArea?.setDrawing(drawing);
        self.annotation.setIsDrawing(drawing);
      },

      deleteRegion() {
        const { currentArea } = self;

        self.setDrawing(false);
        self.currentArea = null;
        self.stopListening();
        if (currentArea) {
          currentArea.deleteRegion();
        }
      },

      // Add point to current vector
      addPoint(x, y) {
        // KonvaVector handles point addition itself
      },

      // Finish drawing the current vector
      finishDrawing() {
        const { currentArea } = self;
        console.log(currentArea.incomplete);
        if (currentArea && !currentArea.incomplete) {
          self._finishDrawing();
          clickBlocker = true;
        }
      },

      // Clean up uncloseable shape
      cleanupUncloseableShape() {
        const currentArea = self.getCurrentArea();
        if (currentArea && currentArea.incomplete) {
          self.deleteRegion();
        }
      },
    };
  });

const Vector = types.compose(_Tool.name, ToolMixin, BaseTool, MultipleClicksDrawingTool, _Tool);

export { Vector };
