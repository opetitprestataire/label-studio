import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import LabelMixin from "../../mixins/LabelMixin";
import Registry from "../../core/Registry";
import SelectedModelMixin from "../../mixins/SelectedModel";
import Types from "../../core/Types";
import { HtxLabels, LabelsModel } from "./Labels/Labels";
import ControlBase from "./Base";
import { PixelWiseModel } from "./PixelWise";

/**
 * The `PixelWiseLabels` tag for image segmentation tasks is used in the area where you want to apply a mask or use a brush to draw a region on the image.
 *
 * Use with the following data types: image.
 * @example
 * <!--Basic image segmentation labeling configuration-->
 * <View>
 *   <PixelWiseLabels name="labels" toName="image">
 *     <Label value="Person" />
 *     <Label value="Animal" />
 *   </PixelWiseLabels>
 *   <Image name="image" value="$image" />
 * </View>
 * @name PixelWiseLabels
 * @regions PixelWiseRegion
 * @meta_title PixelWise Label Tag for Image Segmentation Labeling
 * @meta_description Customize Label Studio with brush label tags for image segmentation labeling for machine learning and data science projects.
 * @param {string} name                      - Name of the element
 * @param {string} toName                    - Name of the image to label
 * @param {single|multiple=} [choice=single] - Configure whether the data labeler can select one or multiple labels
 * @param {number} [maxUsages]               - Maximum number of times a label can be used per task
 * @param {boolean} [showInline=true]        - Show labels in the same visual line
 */

const Validation = types.model({
  controlledTags: Types.unionTag(["Image"]),
});

const ModelAttrs = types.model("PixelWiseLabelsModel", {
  type: "pixelwiseregion",
  children: Types.unionArray(["label", "header", "view", "hypertext"]),
});

const PixelWiseLabelsModel = types.compose(
  "PixelWiseLabelsModel",
  ControlBase,
  LabelsModel,
  ModelAttrs,
  PixelWiseModel,
  Validation,
  LabelMixin,
  SelectedModelMixin.props({ _child: "LabelModel" }),
);

const HtxPixelWiseLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag("brushlabels", PixelWiseLabelsModel, HtxPixelWiseLabels);

export { HtxPixelWiseLabels, PixelWiseLabelsModel };
