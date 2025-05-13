import { memo, useEffect, useRef } from "react";
import { unmountComponentAtNode } from "react-dom";
import type { FC } from "react";
import { generateSampleTaskFromConfig } from "../utils/generateSampleTask";
import { useAtom, useAtomValue } from "jotai";
import { configAtom, errorAtom, loadingAtom, showPreviewAtom, interfacesAtom } from "../atoms/configAtoms";

type PlaygroundPreviewProps = {
  onAnnotationUpdate?: (annotation: any) => void;
};

export const PlaygroundPreview: FC<PlaygroundPreviewProps> = memo(
  ({ onAnnotationUpdate }) => {
    const config = useAtomValue(configAtom);
    const loading = useAtomValue(loadingAtom);
    const error = useAtomValue(errorAtom);
    const interfaces = useAtomValue(interfacesAtom);
    const [showPreview, setShowPreview] = useAtom(showPreviewAtom);

    const rootRef = useRef<HTMLDivElement>(null);
    const lsfInstance = useRef<any>(null);
    const rafId = useRef<number | null>(null);

    useEffect(() => {
      let LabelStudio: any;
      let dependencies: any;

      function cleanup() {
        if (typeof window !== "undefined" && (window as any).LabelStudio) {
          delete (window as any).LabelStudio;
        }
        setShowPreview(false);
        if (lsfInstance.current) {
          lsfInstance.current.destroy();
          lsfInstance.current = null;
        }
        if (rafId.current !== null) {
          cancelAnimationFrame(rafId.current);
          rafId.current = null;
        }
      }

      async function loadLSF() {
        dependencies = await import("@humansignal/editor");
        LabelStudio = dependencies.LabelStudio;
        if (!LabelStudio) return;
        cleanup();
        setShowPreview(true);
        const sampleTask = generateSampleTaskFromConfig(config);
        const annotations = sampleTask.annotation
          ? [{ id: 1, result: [sampleTask.annotation] }]
          : [{ id: 1, result: [] }];

        setTimeout(() => {
          lsfInstance.current = new LabelStudio(rootRef.current, {
            config,
            task: {
              id: 1,
              data: sampleTask.data,
              annotations,
              predictions: [],
            },
            interfaces,
            settings: {
              forceBottomPanel: true,
              collapsibleBottomPanel: true,
              defaultCollapsedBottomPanel: true,
            },
            onLabelStudioLoad: () => {
              // lsfInstance.current.on("updateAnnotation", (annotation: any) => {
              //   console.log("updateAnnotation", annotation.serializeAnnotation());
              //   // onAnnotationUpdate?.(annotation.serializeAnnotation());
              // });
            },
          });
        });
      }

      if (!loading && !error && config) {
        rafId.current = requestAnimationFrame(() => {
          loadLSF();
        });
      }

      return () => {
        cleanup();
      };
      // eslint-disable-next-line
    }, [config, loading, error, interfaces, onAnnotationUpdate]);

    return (
      <div className="h-full flex flex-col items-center justify-center">
        {error ? (
          <div className="text-danger-foreground text-body-medium">{error}</div>
        ) : loading ? (
          <div className="text-secondary-foreground text-body-medium">Loading config...</div>
        ) : showPreview ? (
          <div ref={rootRef} className="w-full h-full" />
        ): null}
      </div>
    );
  },
  () => true,
);
