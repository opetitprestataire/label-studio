import { observer } from "mobx-react";
import { IconRedo, IconRemove, IconUndo } from "@humansignal/icons";
import { Tooltip, Button } from "@humansignal/ui";
import { Block } from "../../utils/bem";
import "./HistoryActions.scss";

export const EditingHistory = observer(({ entity }) => {
  const { history } = entity;

  return (
    <Block name="history-buttons">
      <Tooltip title="Undo">
        <Button
          variant="neutral"
          size="small"
          aria-label="Undo"
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
          aria-label="Redo"
          className="p-0"
          disabled={!history?.canRedo}
          onClick={() => entity.redo()}
        >
          <IconRedo />
        </Button>
      </Tooltip>
      <Tooltip title="Reset">
        <Button
          variant="neutral"
          size="small"
          aria-label="Reset"
          disabled={!history?.canUndo}
          onClick={() => history?.reset()}
        >
          <IconRemove />
        </Button>
      </Tooltip>
    </Block>
  );
});
