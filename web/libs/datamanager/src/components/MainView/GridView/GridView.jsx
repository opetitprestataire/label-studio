import { observer } from "mobx-react";
import { useCallback, useContext, useMemo } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeGrid } from "react-window";
import InfiniteLoader from "react-window-infinite-loader";
import { Block, Elem } from "../../../utils/bem";
import { Checkbox } from "@humansignal/ui";
import { Space } from "../../Common/Space/Space";
import { getProperty, prepareColumns } from "../../Common/Table/utils";
import * as DataGroups from "../../DataGroups";
import { FF_GRID_PREVIEW, FF_LOPS_E_3, isFF } from "../../../utils/feature-flags";
import { SkeletonLoader } from "../../Common/SkeletonLoader";
import { GridViewContext, GridViewProvider } from "./GridPreview";
import "./GridView.scss";
import { clsx } from "clsx";
clsx;
import { groupBy } from "../../../utils/utils";

const TEXT_ONLY_CELL_HEIGHT = 150;

const GridHeader = observer(({ row, selected }) => {
  const isSelected = selected.isSelected(row.id);
  return (
    <Elem name="cell-header">
      <Space>
        <Checkbox
          checked={isSelected}
          ariaLabel={`${isSelected ? "Unselect" : "Select"} Task ${row.id}`}
          onChange={() => {}}
        />
        <span>{row.id}</span>
      </Space>
    </Elem>
  );
});

export const GridBody = observer(({ row, fields, columnCount }) => {
  const dataFields = fields.filter((f) => f.parent?.alias === "data");
  const group = groupBy(dataFields, (f) => f.currentType);
  const hasImage = dataFields.some((f) => f.currentType === "Image");

  return Object.entries(group).map(([type, fields]) => {
    return (
      <div
        key={type}
        className={clsx("h-full w-full", {
          "overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-border scrollbar-track-transparent ":
            type === "Text" || type === "Unknown",
          "overflow-y-auto": !hasImage,
        })}
      >
        {fields.map((field, index) => {
          const valuePath = field.id.split(":")[1] ?? field.id;
          const field_type = field.currentType;
          let value = getProperty(row, valuePath);

          /**
           * The value is an array...
           * In this case, we take the first element of the array
           */
          if (Array.isArray(value)) {
            value = value[0];
          }

          return (
            <GridDataGroup
              key={`${row.id}-${index}`}
              type={field_type}
              value={value}
              hasImage={hasImage}
              field={field}
              row={row}
              columnCount={columnCount}
            />
          );
        })}
      </div>
    );
  });

  return dataFields.map((field, index) => {
    const valuePath = field.id.split(":")[1] ?? field.id;
    const field_type = field.currentType;
    let value = getProperty(row, valuePath);

    /**
     * The value is an array...
     * In this case, we take the first element of the array
     */
    if (Array.isArray(value)) {
      value = value[0];
    }

    return (
      <GridDataGroup
        key={`${row.id}-${index}`}
        type={field_type}
        value={value}
        field={field}
        row={row}
        columnCount={columnCount}
      />
    );
  });
});

const GridDataGroup = observer(({ type, value, field, row, columnCount, hasImage }) => {
  const DataTypeComponent = DataGroups[type];

  return isFF(FF_LOPS_E_3) && row.loading === field.alias ? (
    <SkeletonLoader />
  ) : DataTypeComponent ? (
    <DataTypeComponent value={value} field={field} original={row} columnCount={columnCount} hasImage={hasImage} />
  ) : (
    <DataGroups.TextDataGroup value={value} field={field} original={row} hasImage={hasImage} />
  );
});

const GridCell = observer(({ view, selected, row, fields, onClick, columnCount, ...props }) => {
  const { setCurrentTaskId, imageField } = useContext(GridViewContext);

  const handleBodyClick = useCallback(
    (e) => {
      if (!isFF(FF_GRID_PREVIEW) || !imageField) return;
      e.stopPropagation();
      setCurrentTaskId(row.id);
    },
    [imageField, row.id],
  );

  return (
    <Elem {...props} name="cell" onClick={onClick} mod={{ selected: selected.isSelected(row.id) }}>
      <Elem name="cell-content">
        <GridHeader view={view} row={row} fields={fields} selected={view.selected} />
        <Elem name="cell-body" onClick={handleBodyClick} mod={{ responsive: view.gridResponsiveImage }}>
          <GridBody view={view} row={row} fields={fields} columnCount={columnCount} />
        </Elem>
      </Elem>
    </Elem>
  );
});

export const GridView = observer(({ data, view, loadMore, fields, onChange, hiddenFields }) => {
  const columnCount = view.gridWidth ?? 4;

  const getCellIndex = (row, column) => columnCount * row + column;

  const fieldsData = useMemo(() => {
    return prepareColumns(fields, hiddenFields);
  }, [fields, hiddenFields]);
  const hasImage = fieldsData.some((f) => f.currentType === "Image");

  const rowHeight = fieldsData
    .filter((f) => f.parent?.alias === "data")
    .reduce((res, f) => {
      const height = !hasImage ? TEXT_ONLY_CELL_HEIGHT : (DataGroups[f.currentType] ?? DataGroups.TextDataGroup).height;

      return res + height;
    }, 16);
  const finalRowHeight = (rowHeight + 32) * (hasImage ? Math.max(1, (7 - columnCount) * 0.5) : 1);

  const renderItem = useCallback(
    ({ style, rowIndex, columnIndex }) => {
      const index = getCellIndex(rowIndex, columnIndex);
      if (!data || !(index in data)) return null;
      const row = data[index];

      const props = {
        style: {
          ...style,
          marginLeft: "1em",
        },
      };

      return (
        <GridCell
          {...props}
          view={view}
          row={row}
          fields={fieldsData}
          columnCount={columnCount}
          selected={view.selected}
          onClick={() => onChange?.(row.id)}
        />
      );
    },
    [data, columnCount, fieldsData, view.selected, view, view.selected.list, view.selected.all, getCellIndex],
  );

  const onItemsRenderedWrap =
    (cb) =>
    ({ visibleRowStartIndex, visibleRowStopIndex, overscanRowStopIndex, overscanRowStartIndex }) => {
      cb({
        overscanStartIndex: overscanRowStartIndex,
        overscanStopIndex: overscanRowStopIndex,
        visibleStartIndex: visibleRowStartIndex,
        visibleStopIndex: visibleRowStopIndex,
      });
    };

  const itemCount = Math.ceil(data.length / columnCount);

  const isItemLoaded = useCallback(
    (index) => {
      const rowIndex = index * columnCount;
      const rowFullfilled = data.slice(rowIndex, columnCount).length === columnCount;

      return !view.dataStore.hasNextPage || rowFullfilled;
    },
    [columnCount, data, view.dataStore.hasNextPage],
  );

  return (
    <GridViewProvider data={data} view={view} fields={fieldsData}>
      <Block name="grid-view" mod={{ columnCount }}>
        <Elem tag={AutoSizer} name="resize">
          {({ width, height }) => (
            <InfiniteLoader
              itemCount={itemCount}
              isItemLoaded={isItemLoaded}
              loadMoreItems={loadMore}
              threshold={Math.floor(view.dataStore.pageSize / 2)}
              minimumBatchSize={view.dataStore.pageSize}
            >
              {({ onItemsRendered, ref }) => (
                <Elem
                  tag={FixedSizeGrid}
                  ref={ref}
                  width={width}
                  height={height}
                  name="list"
                  rowHeight={finalRowHeight}
                  overscanRowCount={view.dataStore.pageSize}
                  columnCount={columnCount}
                  columnWidth={width / columnCount - 9.5}
                  rowCount={itemCount}
                  onItemsRendered={onItemsRenderedWrap(onItemsRendered)}
                  style={{ overflowX: "hidden" }}
                >
                  {renderItem}
                </Elem>
              )}
            </InfiniteLoader>
          )}
        </Elem>
      </Block>
    </GridViewProvider>
  );
});
