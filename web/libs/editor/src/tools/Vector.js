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
    let closed;

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
        if (!area) return;
        closed = false;
        disposer = observe(
          area,
          "closed",
          () => {
            if (self.getCurrentArea()?.closed && !closed) {
              self.finishDrawing();
            }
          },
          true,
        );
      },

      stopListening() {
        disposer?.();
      },

      closeCurrent() {
        self.stopListening();
        if (closed) return;
        closed = true;
        self.getCurrentArea().closePoly();
      },

      startDrawing(x, y) {
        // Use the raw canvas coordinates for snapping
        // KonvaVector will handle the coordinate conversion internally

        const image = self.obj.currentImageEntity;
        const width = image.naturalWidth;
        const height = image.naturalHeight;

        const realX = (x / 100) * width;
        const realY = (y / 100) * height;

        self.mode = "drawing";
        self.currentArea = self.createRegion(self.createRegionOptions({ x: realX, y: realY }), true);
        self.setDrawing(true);
        self.applyActiveStates(self.currentArea);

        // Start listening for path closure
        self.listenForClose();
      },

      _finishDrawing() {
        const { currentArea, control } = self;

        self.currentArea.notifyDrawingFinished();
        self.setDrawing(false);
        self.currentArea = null;
        self.mode = "viewing";
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
        const currentArea = self.getCurrentArea();
        if (currentArea && currentArea.incomplete) {
          self._finishDrawing();
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
