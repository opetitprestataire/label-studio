const { I } = inject();
const Helpers = require("../tests/helpers");

module.exports = {
  _rootSelector: ".lsf-paragraphs",
  _filterSelector: "[select-trigger]",
  _phraseSelector: "[class^='phrase--']",
  _phraseDialoguetextSelector: "[class^='dialoguetext--']",

  getParagraphTextSelector(idx) {
    return `${this._rootSelector} ${this._phraseSelector}:nth-child(${idx}) ${this._phraseDialoguetextSelector}`;
  },

  selectTextByOffset(paragraphIdx, startOffset, endOffset) {
    I.executeScript(Helpers.selectText, {
      selector: this.getParagraphTextSelector(paragraphIdx),
      rangeStart: startOffset,
      rangeEnd: endOffset,
    });
  },
  setSelection(startLocator, startOffset, endLocator, endOffset) {
    I.setSelection(startLocator, startOffset, endLocator, endOffset);
  },
  locate(locator) {
    return locator ? locate(locator).inside(this.locateRoot()) : this.locateRoot();
  },
  locateRoot() {
    return locate(this._rootSelector);
  },
  locateText(text) {
    const locator = locate(
      `${this.locateRoot().toXPath()}//*[starts-with(@class,'phrase--')]//*[contains(@class,'text--')]//text()[contains(.,'${text}')]`,
    );

    return locator;
  },

  clickFilter(...authors) {
    I.click(this.locate(this._filterSelector));
    for (const author of authors) {
      I.fillField("[data-testid=select-search-field]", author);
      I.click(locate("[data-testid=select-option]").withText(author));
    }
    I.click(this.locate(this._filterSelector));
  },
};
