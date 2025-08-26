import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import LabelMixin from "../../mixins/LabelMixin";
import Registry from "../../core/Registry";
import SelectedModelMixin from "../../mixins/SelectedModel";
import Types from "../../core/Types";
import { HtxLabels, LabelsModel } from "./Labels/Labels";
import { VectorModel } from "./Vector";
import ControlBase from "./Base";

/**
 * The `VectorLabels` tag is used to create labeled vectors. Use to apply labels to vectors in semantic segmentation tasks.
 *
 * Use with the following data types: image.
 * @example
 * <!--Basic labeling configuration for vector semantic segmentation of images -->
 * <View>
 *   <Image name="image" value="$image" />
 *   <VectorLabels name="labels" toName="image">
 *     <Label value="Road" />
 *     <Label value="Boundary" />
 *   </VectorLabels>
 * </View>
 * @name VectorLabels
 * @regions VectorRegion
 * @meta_title Vector Label Tag for Labeling Vectors in Images
 * @meta_description Customize Label Studio with the VectorLabels tag and label vectors in images for semantic segmentation machine learning and data science projects.
 * @param {string} name                             - Name of tag
 * @param {string} toName                           - Name of image to label
 * @param {single|multiple=} [choice=single]        - Configure whether you can select one or multiple labels
 * @param {number} [maxUsages]                      - Maximum number of times a label can be used per task
 * @param {boolean} [showInline=true]               - Show labels in the same visual line
 * @param {number} [opacity=0.2]                    - Opacity of vector
 * @param {string} [fillColor]                      - Vector fill color in hexadecimal
 * @param {string} [strokeColor]                    - Stroke color in hexadecimal
 * @param {number} [strokeWidth=1]                  - Width of stroke
 * @param {small|medium|large} [pointSize=medium]   - Size of vector handle points
 * @param {rectangle|circle} [pointStyle=rectangle] - Style of points
 * @param {pixel|none} [snap=none]                  - Snap vector to image pixels
 */

const Validation = types.model({
  controlledTags: Types.unionTag(["Image"]),
});

const ModelAttrs = types.model("VectorLabelsModel", {
  type: "vectorlabels",
  children: Types.unionArray(["label", "vectorlabel", "header", "view", "hypertext"]),
});

const Composition = types.compose(
  ControlBase,
  LabelsModel,
  ModelAttrs,
  VectorModel,
  Validation,
  LabelMixin,
  SelectedModelMixin.props({ _child: "LabelModel" }),
);

const VectorLabelsModel = types.compose("VectorLabelsModel", Composition);

const HtxVectorLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag("vectorlabels", VectorLabelsModel, HtxVectorLabels);

export { HtxVectorLabels, VectorLabelsModel };
