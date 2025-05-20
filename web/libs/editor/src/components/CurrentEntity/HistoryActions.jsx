import { IconRedo, IconRemove, IconUndo } from "@humansignal/icons";
import { Button, Tooltip } from "@humansignal/ui";
import { observer } from "mobx-react";
import { Hotkey } from "../../core/Hotkey";
import { Block, Elem } from "../../utils/bem";
import "./HistoryActions.scss";

export const HistoryActions = observer(({ annotation }) => {
  const { history } = annotation;

  return (
    <Block name="history-buttons">
      <Hotkey.Tooltip name="annotation:undo">
        <Elem
          tag={Button}
          name="action"
          look="string"
          size="small"
          aria-label="Undo"
          disabled={!history?.canUndo}
          onClick={() => annotation.undo()}
          icon={<IconUndo />}
        />
      </Hotkey.Tooltip>
      <Hotkey.Tooltip name="annotation:redo">
        <Elem
          tag={Button}
          name="action"
          look="string"
          size="small"
          aria-label="Redo"
          disabled={!history?.canRedo}
          onClick={() => annotation.redo()}
          icon={<IconRedo />}
        />
      </Hotkey.Tooltip>
      <Tooltip title="Reset">
        <Elem
          tag={Button}
          name="action"
          look="string"
          size="small"
          aria-label="Reset"
          disabled={!history?.canUndo}
          onClick={() => history?.reset()}
          icon={<IconRemove />}
        />
      </Tooltip>
    </Block>
  );
});
