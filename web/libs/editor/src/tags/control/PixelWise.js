import { types } from "mobx-state-tree";

import Registry from "../../core/Registry";
import ControlBase from "./Base";
import { AnnotationMixin } from "../../mixins/AnnotationMixin";
import SeparatedControlMixin from "../../mixins/SeparatedControlMixin";
import { ToolManagerMixin } from "../../mixins/ToolManagerMixin";

/**
 * The `PixelWise` tag is used for image segmentation tasks where you want to apply a mask or use a brush to draw a region on the image.
 *
 * Use with the following data types: image.
 * @example
 * <!--Basic image segmentation labeling configuration:-->
 * <View>
 *   <PixelWise name="labels" toName="image">
 *     <Label value="Person" />
 *     <Label value="Animal" />
 *   </PixelWise>
 *   <Image name="image" value="$image" />
 * </View>
 * @name PixelWise
 * @regions PixelWiseRegion
 * @meta_title PixelWise Tag for Image Segmentation Labeling
 * @meta_description Customize Label Studio with brush tags for image segmentation labeling for machine learning and data science projects.
 * @param {string} name                      - Name of the element
 * @param {string} toName                    - Name of the image to label
 * @param {single|multiple=} [choice=single] - Configure whether the data labeler can select one or multiple labels
 * @param {number} [maxUsages]               - Maximum number of times a label can be used per task
 * @param {boolean} [showInline=true]        - Show labels in the same visual line
 * @param {boolean} [smart]                  - Show smart tool for interactive pre-annotations
 * @param {boolean} [smartOnly]              - Only show smart tool for interactive pre-annotations
 */

const TagAttrs = types.model({
  toname: types.maybeNull(types.string),
  strokewidth: types.optional(types.string, "15"),
});

const Model = types
  .model({
    type: "brush",
    removeDuplicatesNamed: "Erase",
  })
  .views((self) => ({
    get hasStates() {
      const states = self.states();

      return states && states.length > 0;
    },
  }))
  .volatile(() => ({
    toolNames: ["PixelWise", "Erase"],
  }));

const PixelWiseModel = types.compose(
  "PixelWiseModel",
  ControlBase,
  AnnotationMixin,
  SeparatedControlMixin,
  TagAttrs,
  Model,
  ToolManagerMixin,
);

const HtxView = () => {
  return null;
};

Registry.addTag("pixelwise", PixelWiseModel, HtxView);

export { HtxView, PixelWiseModel };
