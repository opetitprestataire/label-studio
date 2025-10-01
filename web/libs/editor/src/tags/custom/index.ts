import { types } from "mobx-state-tree";
import Registry from "../../core/Registry";
import { CustomInterfaceModel, CustomInterfaceComponent } from "./Custom";
import { CustomRegionModel } from "./CustomRegion";

Registry.addCustomTag("CustomInterface", {
  tag: "CustomInterface",
  description: "Embed custom React UI with stateful results",
  isObject: true,
  model: CustomInterfaceModel,
  view: CustomInterfaceComponent,
  result: types.frozen(),
  resultName: "custominterface",
  detector: (sn: any) => Boolean(sn?.value?.custominterface || sn?.custominterface),
  region: CustomRegionModel as any,
});

export {};


