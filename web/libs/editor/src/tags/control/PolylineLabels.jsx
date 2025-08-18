import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import LabelMixin from "../../mixins/LabelMixin";
import Registry from "../../core/Registry";
import SelectedModelMixin from "../../mixins/SelectedModel";
import Types from "../../core/Types";
import { HtxLabels, LabelsModel } from "./Labels/Labels";
import { PolylineModel } from "./Polyline";
import ControlBase from "./Base";

/**
 * The `PolylineLabels` tag is used to create labeled polylines. Use to apply labels to polylines in semantic segmentation tasks.
 *
 * Use with the following data types: image.
 * @example
 * <!--Basic labeling configuration for polyline semantic segmentation of images -->
 * <View>
 *   <Image name="image" value="$image" />
 *   <PolylineLabels name="labels" toName="image">
 *     <Label value="Road" />
 *     <Label value="Boundary" />
 *   </PolylineLabels>
 * </View>
 * @name PolylineLabels
 * @regions PolylineRegion
 * @meta_title Polyline Label Tag for Labeling Polylines in Images
 * @meta_description Customize Label Studio with the PolylineLabels tag and label polylines in images for semantic segmentation machine learning and data science projects.
 * @param {string} name                             - Name of tag
 * @param {string} toName                           - Name of image to label
 * @param {single|multiple=} [choice=single]        - Configure whether you can select one or multiple labels
 * @param {number} [maxUsages]                      - Maximum number of times a label can be used per task
 * @param {boolean} [showInline=true]               - Show labels in the same visual line
 * @param {number} [opacity=0.2]                    - Opacity of polyline
 * @param {string} [fillColor]                      - Polyline fill color in hexadecimal
 * @param {string} [strokeColor]                    - Stroke color in hexadecimal
 * @param {number} [strokeWidth=1]                  - Width of stroke
 * @param {small|medium|large} [pointSize=medium]   - Size of polyline handle points
 * @param {rectangle|circle} [pointStyle=rectangle] - Style of points
 * @param {pixel|none} [snap=none]                  - Snap polyline to image pixels
 */

const Validation = types.model({
  controlledTags: Types.unionTag(["Image"]),
});

const ModelAttrs = types.model("PolylineLabelsModel", {
  type: "polylinelabels",
  children: Types.unionArray(["label", "polylinelabel", "header", "view", "hypertext"]),
});

const Composition = types.compose(
  ControlBase,
  LabelsModel,
  ModelAttrs,
  PolylineModel,
  Validation,
  LabelMixin,
  SelectedModelMixin.props({ _child: "LabelModel" }),
);

const PolylineLabelsModel = types.compose("PolylineLabelsModel", Composition);

const HtxPolylineLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag("polylinelabels", PolylineLabelsModel, HtxPolylineLabels);

export { HtxPolylineLabels, PolylineLabelsModel };
