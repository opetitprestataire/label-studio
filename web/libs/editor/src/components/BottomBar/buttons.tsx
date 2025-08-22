import React, { memo } from "react";
import { observer } from "mobx-react";
import { Button } from "../Button";
import type { MSTStore } from "../../types";

// @todo we need this for types compatibility, but better to fix CustomButtonType
const defaultButtonProps = {
  disabled: false,
};

type SkipButtonProps = {
  disabled: boolean;
  store: MSTStore;
  /**
   * Handler wrapper for skip with required comment,
   * conditions are checked in wrapper and if all good the `action` is called.
   **/
  onSkipWithComment: (event: React.MouseEvent, action: () => any) => void;
};

export const SkipButton = memo(
  observer(({ disabled, store, onSkipWithComment }: SkipButtonProps) => {
    return (
      <Button
        key="skip"
        aria-label="skip-task"
        disabled={disabled}
        look="outlined"
        tooltip="Cancel (skip) task [ Ctrl+Space ]"
        onClick={async (e) => {
          const action = () => store.skipTask({});
          const selected = store.annotationStore?.selected;

          if (store.hasInterface("comments:skip") ?? true) {
            onSkipWithComment(e, action);
          } else {
            selected?.submissionInProgress();
            await store.commentStore.commentFormSubmit();
            store.skipTask({});
          }
        }}
      >
        Skip
      </Button>
    );
  }),
);

export const UnskipButton = memo(
  observer(({ disabled, store }: { disabled: boolean; store: MSTStore }) => {
    return (
      <Button
        key="cancel-skip"
        tooltip="Cancel skip: []"
        aria-label="cancel-skip"
        look="outlined"
        disabled={disabled}
        onClick={async () => {
          const selected = store.annotationStore?.selected;

          selected?.submissionInProgress();
          await store.commentStore.commentFormSubmit();
          store.unskipTask();
        }}
      >
        Cancel skip
      </Button>
    );
  }),
);

type AcceptButtonProps = {
  disabled: boolean;
  history: any;
  store: MSTStore;
};

export const AcceptButton = memo(
  observer(({ disabled, history, store }: AcceptButtonProps) => {
    const annotation = store.annotationStore.selected;
    // changes in current sessions or saved draft
    const hasChanges = history.canUndo || annotation.versions.draft;

    return (
      <Button
        key="accept"
        tooltip="Accept annotation: [ Ctrl+Enter ]"
        aria-label="accept-annotation"
        disabled={disabled}
        onClick={async () => {
          annotation.submissionInProgress();
          await store.commentStore.commentFormSubmit();
          store.acceptAnnotation();
        }}
      >
        {hasChanges ? "Fix + Accept" : "Accept"}
      </Button>
    );
  }),
);

export const RejectButtonDefinition = {
  id: "reject",
  name: "reject",
  title: "Reject",
  variant: "negative",
  look: "outlined",
  ariaLabel: "reject-annotation",
  tooltip: "Reject annotation: [ Ctrl+Space ]",
  // Additional properties would be here
};