import { observer } from "mobx-react";

import "./Entities.scss";
import { RegionTree } from "./RegionTree";
import { LabelList } from "./LabelList";
import { SortMenu, SortMenuIcon } from "./SortMenu";
import { Oneof } from "../../common/Oneof/Oneof";
import { Space } from "../../common/Space/Space";
import { Block, Elem } from "../../utils/bem";
import { RadioGroup } from "../../common/RadioGroup/RadioGroup";
import "./Entities.scss";
import { confirm } from "../../common/Modal/Modal";
import { IconInvisible, IconTrash, IconVisible } from "@humansignal/icons";
import { Button, Tooltip } from "@humansignal/ui";
import { Dropdown } from "../../common/Dropdown/Dropdown";
import { cn } from "@humansignal/ui";

export default observer(({ regionStore, annotation }) => {
  const { classifications, regions, view } = regionStore;
  const count = regions.length + (view === "regions" ? classifications.length : 0);
  const toggleVisibility = (e) => {
    e.preventDefault();
    e.stopPropagation();
    regionStore.toggleVisibility();
  };

  return (
    <Block name="entities">
      <Elem name="source">
        <Space spread>
          <RadioGroup
            size="small"
            value={view}
            style={{ width: 240 }}
            onChange={(e) => {
              regionStore.setView(e.target.value);
            }}
          >
            <RadioGroup.Button value="regions">
              Regions{count ? <Elem name="counter">&nbsp;{count}</Elem> : null}
            </RadioGroup.Button>
            <RadioGroup.Button value="labels">Labels</RadioGroup.Button>
          </RadioGroup>

          {annotation.isReadOnly() && (
            <Tooltip title="Delete All Regions">
              <Button
                variant="negative"
                look="string"
                aria-label="Delete All Regions"
                className="w-8 h-8 p-0"
                onClick={() => {
                  confirm({
                    title: "Removing all regions",
                    body: "Do you want to delete all annotated regions?",
                    buttonLook: "destructive",
                    onOk: () => annotation.deleteAllRegions(),
                  });
                }}
              >
                <IconTrash />
              </Button>
            </Tooltip>
          )}
        </Space>
      </Elem>

      {count ? (
        <Elem name="header">
          <Space spread align={view === "regions" ? null : "end"}>
            {view === "regions" && (
              <Dropdown.Trigger content={<SortMenu regionStore={regionStore} />} placement="bottomLeft">
                <Elem name="sort" onClick={(e) => e.preventDefault()}>
                  <Elem name="sort-icon">
                    <SortMenuIcon sortKey={regionStore.sort} />
                  </Elem>{" "}
                  {`Sorted by ${regionStore.sort[0].toUpperCase()}${regionStore.sort.slice(1)}`}
                </Elem>
              </Dropdown.Trigger>
            )}

            <Space size="small" align="end">
              {regions.length > 0 ? (
                <Button
                  size="small"
                  look="string"
                  className={cn({ hidden: regionStore.isAllHidden })}
                  onClick={toggleVisibility}
                >
                  {regionStore.isAllHidden ? <IconInvisible /> : <IconVisible />}
                </Button>
              ) : null}
            </Space>
          </Space>
        </Elem>
      ) : null}

      <Oneof value={view}>
        <Elem name="regions" case="regions">
          {count ? <RegionTree regionStore={regionStore} /> : <Elem name="empty">No Regions created yet</Elem>}
        </Elem>
        <Elem name="labels" case="labels">
          {count ? <LabelList regionStore={regionStore} /> : <Elem name="empty">No Labeled Regions created yet</Elem>}
        </Elem>
      </Oneof>
    </Block>
  );
});
