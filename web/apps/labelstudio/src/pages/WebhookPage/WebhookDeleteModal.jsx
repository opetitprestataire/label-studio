import { Button } from "@humansignal/ui";
import { modal } from "../../components/Modal/Modal";
import { useModalControls } from "../../components/Modal/ModalPopup";
import { Space } from "../../components/Space/Space";
import { cn } from "../../utils/bem";

export const WebhookDeleteModal = ({ onDelete }) => {
  return modal({
    title: "Delete",
    body: () => {
      const ctrl = useModalControls();
      const rootClass = cn("webhook-delete-modal");
      return (
        <div className={rootClass}>
          <div className={rootClass.elem("modal-text")}>
            Are you sure you want to delete the webhook? This action cannot be undone.
          </div>
        </div>
      );
    },
    footer: () => {
      const ctrl = useModalControls();
      const rootClass = cn("webhook-delete-modal");
      return (
        <Space align="end">
          <Button
            className="w-44"
            look="outlined"
            onClick={() => {
              ctrl.hide();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="negative"
            className="w-44"
            onClick={async () => {
              await onDelete();
              ctrl.hide();
            }}
          >
            Delete
          </Button>
        </Space>
      );
    },
    style: { width: 512 },
  });
};
