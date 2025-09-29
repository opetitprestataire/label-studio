import { observer } from "mobx-react";
import { types, getParent } from "mobx-state-tree";

import NormalizationMixin from "../../mixins/Normalization";
import { AreaMixin } from "../../mixins/AreaMixin";
import RegionsMixin from "../../mixins/Regions";
import { guidGenerator } from "../../core/Helpers";

import { HtxTextBox } from "../../components/HtxTextBox/HtxTextBox";
import { cn } from "../../utils/bem";
import { CustomInterfaceModel } from "./Custom";
import { IconGrid } from "@humansignal/icons";

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

    getRegionElement() {
      return document.querySelector(`#CustomRegion-${self.id}`);
    },
    getOneColor() {
      return null;
    },
  }))
  .actions((self) => ({
    setValue(val) {
      if (self._value === val || !self.parent.validateText(val)) return;

      self._value = val;
      self.parent.onChange();
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
  }));

const CustomRegionModel = types.compose("CustomRegionModel", RegionsMixin, AreaMixin, NormalizationMixin, Model);

const HtxCustomRegionView = ({ item, onFocus }) => {
  const classes = [styles.mark];
  const params = { onFocus: (e) => onFocus(e, item) };
  const { parent } = item;
  const { relationMode } = item.annotation;
  const editable = parent.isEditable && !item.isReadOnly();
  const deleteable = parent.isDeleteable && !item.isReadOnly();

  if (relationMode) {
    classes.push(styles.relation);
  }

  if (item.selected) {
    classes.push(styles.selected);
  } else if (item.highlighted) {
    classes.push(styles.highlighted);
  }

  if (editable || parent.transcription) {
    params.onChange = (str) => {
      item.setValue(str);
      item.parent.updateLeadTime();
    };
    params.onInput = () => {
      item.parent.countTime();
    };
  }

  params.onDelete = item.deleteRegion;

  let divAttrs = {};

  if (!parent.perregion) {
    divAttrs = {
      onMouseOver: () => {
        if (relationMode) {
          item.setHighlight(true);
        }
      },
      onMouseOut: () => {
        if (relationMode) {
          item.setHighlight(false);
        }
      },
    };
  }

  const name = `${parent?.name ?? ""}:${item.id}`;

  return (
    <div {...divAttrs} className={cn("row").toString()} data-testid="custom-region">
      <HtxTextBox
        isEditable={editable}
        isDeleteable={deleteable}
        onlyEdit={parent.transcription}
        id={`CustomRegion-${item.id}`}
        name={name}
        className={classes.join(" ")}
        rows={parent.rows}
        text={item._value}
        {...params}
        ignoreShortcuts={true}
      />
    </div>
  );
};

const HtxCustomRegion = observer(HtxCustomRegionView);

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

export { CustomRegionModel, HtxCustomRegion };


