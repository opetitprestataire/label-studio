import { observer } from "mobx-react";
import { types, getParent } from "mobx-state-tree";
import { IconGrid } from "@humansignal/icons";

import { AreaMixin } from "../../mixins/AreaMixin";
import NormalizationMixin from "../../mixins/Normalization";
import RegionsMixin from "../../mixins/Regions";
import { CustomInterfaceModel } from "./Custom";

import { cn } from "../../utils/bem";

const Model = types
  .model("CustomRegionModel", {
    type: "custominterface",
    object: types.late(() => types.reference(CustomInterfaceModel)),

    // Main payload for this region; matches result type name
    custominterface: types.frozen(),

    _value: types.frozen(),
    // states: types.array(types.union(ChoicesModel)),
  })
  .views((self) => ({
    get parent() {
      return getParent(self);
    },

    get noLabelView() {
      return "Custom region";
    },

    get value() {
      return self.custominterface;
    },

    getRegionElement() {
      return document.querySelector(`#CustomRegion-${self.id}`);
    },
    getOneColor() {
      return null;
    },
  }))
  .actions((self) => ({
    setValue(val) {
      if (self._value === val) return;

      self._value = val;
      self.parent.onChange();
    },

    update(value) {
      self.custominterface = value;
    },

    updateValue(newValue) {
      self._value = newValue;
      self.custominterface = newValue;
      const customResult = self.results.find((r) => r.type === "custominterface");
      if (customResult && customResult.setValue) {
        customResult.setValue(self.custominterface);
      }
      if (self.parent.updateResult) self.parent.updateResult();
    },

    deleteRegion() {
      self.parent.remove(self);
    },

    serialize() {
      return {
        value: {
          custominterface: self.custominterface,
        },
      };
    },
  }));

const CustomRegionModel = types.compose("CustomRegionModel", RegionsMixin, AreaMixin, NormalizationMixin, Model);

// required for NodeViews
CustomRegionModel.nodeView = {
  name: "CustomRegion",
  icon: IconGrid,
  fullContent: (node) => (
    <span style={{ color: "#5a5a5a" }}>
      {JSON.stringify(node.custominterface)}
    </span>
  ),
};

export { CustomRegionModel };


