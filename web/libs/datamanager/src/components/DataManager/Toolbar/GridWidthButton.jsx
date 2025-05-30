import { inject } from "mobx-react";
import { useCallback, useState } from "react";
import { Button } from "../../Common/Button/Button";
import { Dropdown } from "../../Common/Dropdown/DropdownComponent";
import { Toggle } from "../../Common/Form";

const injector = inject(({ store }) => {
  const view = store?.currentView;

  return {
    view,
    gridWidth: view?.gridWidth,
    responsiveImage: view?.gridResponsiveImage,
  };
});

export const GridWidthButton = injector(({ view, gridWidth, responsiveImage, size }) => {
  const [width, setWidth] = useState(gridWidth);

  const setGridWidth = useCallback(
    (width) => {
      const newWidth = Math.max(3, Math.min(width, 10));

      setWidth(newWidth);
      view.setGridWidth(newWidth);
    },
    [view],
  );

  return view.type === "grid" ? (
    <Dropdown.Trigger
      content={
        <div className="p-tight min-w-wide space-y-base">
          <div className="grid grid-cols-[1fr_min-content] gap-base items-center">
            <span>Columns: {width}</span>
            <Button.Group>
              <Button onClick={() => setGridWidth(width - 1)} disabled={width === 3}>
                -
              </Button>
              <Button onClick={() => setGridWidth(width + 1)} disabled={width === 10}>
                +
              </Button>
            </Button.Group>
          </div>
          <div className="grid grid-cols-[1fr_min-content] gap-base items-center">
            <span>Fit images to width</span>
            <Toggle
              checked={!responsiveImage}
              onChange={(e) => {
                view.setGridResponsiveImage(!e.target.checked);
              }}
            />
          </div>
        </div>
      }
    >
      <Button size={size}>Grid</Button>
    </Dropdown.Trigger>
  ) : null;
});
