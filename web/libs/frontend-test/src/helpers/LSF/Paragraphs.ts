import { withMedia } from "../utils/media/MediaMixin";
import type { ViewWithMedia } from "../utils/media/types";

class ParagraphsHelper extends withMedia(
  class implements ViewWithMedia {
    get _baseRootSelector() {
      return ".lsf-paragraphs";
    }

    _rootSelector: string;

    constructor(rootSelector: string) {
      this._rootSelector = rootSelector.replace(/^\&/, this._baseRootSelector);
    }

    get root() {
      return cy.get(this._rootSelector);
    }

    get mediaElement() {
      return this.root.get("audio[controls]");
    }
  },
) {}

const Paragraphs = new ParagraphsHelper("&:eq(0)");
const useParagraphs = (rootSelector: string) => {
  return new ParagraphsHelper(rootSelector);
};

export { Paragraphs, useParagraphs };
