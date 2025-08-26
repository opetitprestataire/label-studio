import { types } from "mobx-state-tree";

import Registry from "../../core/Registry";
import { Hotkey } from "../../core/Hotkey";
import ControlBase from "./Base";
import { customTypes } from "../../core/CustomTypes";
import Types from "../../core/Types";
import { AnnotationMixin } from "../../mixins/AnnotationMixin";
import SeparatedControlMixin from "../../mixins/SeparatedControlMixin";
import { ToolManagerMixin } from "../../mixins/ToolManagerMixin";

const hotkeys = Hotkey("Vectors");

/**
 * The `Vector` tag is used to add vectors to an image without selecting a label. This can be useful when you have only one label to assign to the vector. Use for image segmentation tasks.
 *
 * Use with the following data types: image.
 * @example
 * <!--Basic labeling configuration for vector image segmentation -->
 * <View>
 *   <Vector name="line-1" toName="img-1" />
 *   <Image name="img-1" value="$img" />
 * </View>
 * @name Vector
 * @meta_title Vector Tag for Adding Vectors to Images
 * @meta_description Customize Label Studio with the Vector tag by adding vectors to images for segmentation machine learning and data science projects.
 * @param {string} name                           - Name of tag
 * @param {string} toname                         - Name of image to label
 * @param {number} [opacity=0.6]                  - Opacity of vector
 * @param {string} [fillColor=transparent]        - Vector fill color in hexadecimal or HTML color name
 * @param {string} [strokeColor=#f48a42]          - Stroke color in hexadecimal
 * @param {number} [strokeWidth=3]                - Width of stroke
 * @param {small|medium|large} [pointSize=small]  - Size of vector handle points
 * @param {rectangle|circle} [pointStyle=circle]  - Style of points
 * @param {boolean} [smart]                       - Show smart tool for interactive pre-annotations
 * @param {boolean} [smartOnly]                   - Only show smart tool for interactive pre-annotations
 * @param {pixel|none} [snap=none]                - Snap vector to image pixels
 */
const TagAttrs = types.model({
  toname: types.maybeNull(types.string),

  opacity: types.optional(customTypes.range(), "0.2"),
  fillcolor: types.optional(customTypes.color, "#f48a42"),

  strokewidth: types.optional(types.string, "2"),
  strokecolor: types.optional(customTypes.color, "#f48a42"),

  snap: types.optional(types.string, "none"),

  pointsize: types.optional(types.string, "small"),
  pointstyle: types.optional(types.string, "circle"),
});

const Validation = types.model({
  controlledTags: Types.unionTag(["Image"]),
});

const Model = types
  .model({
    type: "vector",

    // regions: types.array(RectRegionModel),
    _value: types.optional(types.string, ""),
  })
  .volatile(() => ({
    toolNames: ["Vector"],
  }))
  .actions((self) => {
    return {
      initializeHotkeys() {
        hotkeys.addNamed("vector:undo", () => {
          if (self.annotation?.selected && self.annotation.isDrawing) self.annotation.undo();
        });
        hotkeys.addNamed("vector:redo", () => {
          if (self.annotation?.selected && self.annotation.isDrawing) self.annotation.redo();
        });
      },

      disposeHotkeys() {
        hotkeys.removeNamed("vector:undo");
        hotkeys.removeNamed("vector:redo");
      },

      afterCreate() {
        self.initializeHotkeys();
      },

      beforeDestroy() {
        self.disposeHotkeys();
      },
    };
  });

const VectorModel = types.compose(
  "VectorModel",
  ControlBase,
  AnnotationMixin,
  SeparatedControlMixin,
  TagAttrs,
  Validation,
  ToolManagerMixin,
  Model,
);

const HtxView = () => null;

Registry.addTag("vector", VectorModel, HtxView);

export { HtxView, VectorModel };
