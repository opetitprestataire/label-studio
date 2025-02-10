import { type FC, useCallback } from "react";
import sanitizeHTML from "sanitize-html";
import { Block, Elem, cn } from "../../utils/bem";
import { Button } from "../Button/Button";
import { modal } from "../Modal/Modal";
import "./Error.scss";

const root = cn("paused-error");

interface PausedResponseMixin {
  detail: string;
  display_context: {
    reason: string;
    pause_reason?: string;
    pause_verbose_reason?: string;
  };
}

type ErrorWrapperProps = {
  title: string;
  message: string;
  backUrl?: string;
};

export const PauseError: FC<ErrorWrapperProps> = ({ title, message, backUrl = "/projects" }) => {
  const onGoBack = useCallback(() => {
    location.href = backUrl;
  }, [backUrl]);

  return (
    <Block name="error-message" mod={{ kind: "paused" }}>
      {title && <Elem name="title">{title}</Elem>}
      {message && (
        <Elem
          name="detail"
          dangerouslySetInnerHTML={{
            __html: sanitizeHTML(message),
          }}
        />
      )}
      <Elem name="actions">
        <Button onClick={onGoBack}>Go Back</Button>
      </Elem>
    </Block>
  );
};

export const showPauseError = (response: PausedResponseMixin) => {
  const body = (
    <PauseError
      title="You've been paused"
      message={response.display_context?.pause_verbose_reason ?? response.detail}
    />
  );

  modal({
    unique: "pause-error",
    allowClose: false,
    body,
    simple: true,
    bare: true,
    style: { width: 680 },
    className: String(root),
  });
};
