import { inject, observer } from "mobx-react";
import { useEffect, useRef } from "react";
import { types } from "mobx-state-tree";

import Registry from "../../core/Registry";
import { AnnotationMixin } from "../../mixins/AnnotationMixin";
import ProcessAttrsMixin from "../../mixins/ProcessAttrs";
import Base from "./Base";
import { parseValue } from "../../utils/data";

/**
 * The `Pdf` tag is used to display a PDF document from a URL.
 * @example
 * <View>
 *   <Pdf name="pdf-1" value="$pdf_url" />
 * </View>
 * @name Pdf
 * @meta_title Pdf Tag to Display PDF Documents
 * @meta_description Customize Label Studio by displaying PDF files in tasks for machine learning and data science projects.
 * @param {string} value Data field value containing the URL to the PDF
 */
const Model = types
  .model({
    type: "pdf",
    value: types.maybeNull(types.string),
    _url: types.maybeNull(types.string),
  })
  .actions((self) => ({
    updateValue(store) {
      // @todo check that the value is a valid URL and document exists
      self._url = parseValue(self.value, store.task.dataObj);
    },
  }));

const PdfModel = types.compose("PdfModel", Base, ProcessAttrsMixin, AnnotationMixin, Model);

const HtxPdf = inject("store")(
  observer(({ item }) => {
    const containerRef = useRef(null);

    useEffect(() => {
      if (!item._url || !containerRef.current) return;

      const container = containerRef.current;
      // Clear previous render
      container.innerHTML = "";

      let isCancelled = false;
      let loadingTask = null;

      // automatically setup the worker
      import("pdfjs-dist/webpack.mjs")
        .then((pdfjsLib) => {
          loadingTask = pdfjsLib.getDocument({ url: item._url });

          return loadingTask.promise;
        })
        .then(async (pdfDoc) => {
          if (isCancelled) return;

          // Render pages sequentially
          for (let pageIndex = 1; pageIndex <= pdfDoc.numPages; pageIndex++) {
            if (isCancelled) break;
            const page = await pdfDoc.getPage(pageIndex);

            const viewport = page.getViewport({ scale: 1 });
            const containerWidth = container.clientWidth || 800;
            const scale = containerWidth / viewport.width;
            const scaledViewport = page.getViewport({ scale });

            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(scaledViewport.width);
            canvas.height = Math.ceil(scaledViewport.height);
            canvas.style.width = "100%";
            canvas.style.height = `${Math.ceil(scaledViewport.height)}px`;
            canvas.style.display = "block";

            if (pageIndex > 1) {
              canvas.style.marginTop = "8px";
            }

            if (pageIndex === 1) {
              container.style.height = canvas.style.height;
            }

            const context = canvas.getContext("2d");
            if (!context) continue;

            container.appendChild(canvas);

            await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
          }
        })
        .catch(() => {
          if (isCancelled) return;
          // Render a fallback message
          const errorElem = document.createElement("div");
          errorElem.textContent = "Failed to load PDF";
          errorElem.style.color = "#d00";
          container.appendChild(errorElem);
        });

      return () => {
        isCancelled = true;
        try {
          // @todo this seems like a correct cleanup, but most probably it's called more than once,
          // @todo destroying properly loaded pdf
          // loadingTask.destroy();
        } catch (e) {}
      };
    }, [item._url]);

    if (!item._url) return null;

    return (
      <div
        ref={containerRef}
        className="htx-pdf w-full h-[600px] border-none overflow-auto bg-neutral-background"
      />
    );
  }),
);

if (!Registry.models.pdf) {
  Registry.addTag("pdf", PdfModel, HtxPdf);
  Registry.addObjectType(PdfModel);
}

export { HtxPdf, PdfModel };
