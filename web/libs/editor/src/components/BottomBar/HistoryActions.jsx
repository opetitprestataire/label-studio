import { observer } from "mobx-react";
import { IconRedo, IconRemove, IconUndo } from "@humansignal/icons";
import { Tooltip, Button, Space } from "@humansignal/ui";
import "./HistoryActions.scss";

export const EditingHistory = observer(({ entity }) => {
  const { history } = entity;

  return (
    <Space size="small">
      <Tooltip title="Undo">
        <Button
          variant="neutral"
          size="small"
          aria-label="Undo"
          look="string"
          disabled={!history?.canUndo}
          onClick={() => entity.undo()}
        >
          <IconUndo />
        </Button>
      </Tooltip>
      <Tooltip title="Redo">
        <Button
          variant="neutral"
          size="small"
          look="string"
          aria-label="Redo"
          disabled={!history?.canRedo}
          onClick={() => entity.redo()}
        >
          <IconRedo />
        </Button>
      </Tooltip>
      <Tooltip title="Reset">
        <Button
          variant="negative"
          look="string"
          size="small"
          aria-label="Reset"
          disabled={!history?.canUndo}
          onClick={() => history?.reset()}
        >
          <IconRemove />
        </Button>
      </Tooltip>
    </Space>
  );
});
