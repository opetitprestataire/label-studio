import { inject } from "mobx-react";
import { useCallback, useState } from "react";
import { IconMinus, IconPlus } from "@humansignal/icons";
import { Button, ButtonGroup } from "@humansignal/ui";
import { Icon } from "../../Common/Icon/Icon";
import { Space } from "../../Common/Space/Space";

const injector = inject(({ store }) => {
  const view = store?.currentView;

  return {
    view,
    gridWidth: view?.gridWidth,
  };
});

export const GridWidthButton = injector(({ view, gridWidth, size }) => {
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
    <Space style={{ fontSize: 12 }}>
      Columns: {width}
      <ButtonGroup>
        <Button size={size} onClick={() => setGridWidth(width - 1)} disabled={width === 3}>
          <Icon icon={IconMinus} size="12" color="#595959" />
        </Button>
        <Button size={size} onClick={() => setGridWidth(width + 1)} disabled={width === 10}>
          <Icon icon={IconPlus} size="12" color="#595959" />
        </Button>
      </ButtonGroup>
    </Space>
  ) : null;
});
