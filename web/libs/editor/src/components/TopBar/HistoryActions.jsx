import { observer } from "mobx-react";
import { IconRedo, IconRemove, IconUndo } from "@humansignal/icons";
import { Button, Tooltip } from "@humansignal/ui";
import { Block, Elem } from "../../utils/bem";
import "./HistoryActions.scss";

export const EditingHistory = observer(({ entity }) => {
  const { history } = entity;

  return (
    <Block name="history-buttons">
      <Tooltip title="Undo">
        <Button
          variant="neutral"
          size="small"
          look="string"
          aria-label="Undo"
          disabled={!history?.canUndo}
          onClick={() => entity.undo()}
        >
          <IconUndo />
        </Button>
      </Tooltip>
      <Tooltip title="Redo">
        <Button
          name="action"
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
        <Elem
          tag={Button}
          name="action"
          look="string"
          variant="negative"
          aria-label="Reset"
          disabled={!history?.canUndo}
          onClick={() => history?.reset()}
          icon={<IconRemove />}
        />
      </Tooltip>
    </Block>
  );
});
