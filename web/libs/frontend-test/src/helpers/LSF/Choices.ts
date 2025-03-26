class ChoicesHelper {
  private get _baseRootSelector() {
    return ".lsf-choices";
  }
  private getСhoiceSelector() {
    return ".lsf-choice__item .ant-checkbox + span, .lsf-choice__item .ant-radio + span";
  }

  private getCheckedСhoiceSelector() {
    return ".lsf-choice__item .ant-checkbox-checked + span, .lsf-choice__item .ant-radio-checked + span";
  }

  private _rootSelector: string;
  constructor(rootSelector) {
    this._rootSelector = rootSelector.replace(/^\&/, this._baseRootSelector);
  }

  get root() {
    return cy.get(this._rootSelector);
  }

  get select() {
    return this.root.find("[data-testid=select-trigger]");
  }

  findChoice(text: string) {
    return this.root.contains(this.getСhoiceSelector(), text);
  }

  findCheckedChoice(text: string) {
    return this.root.contains(this.getCheckedСhoiceSelector(), text);
  }

  hasCheckedChoice(text: string) {
    this.findCheckedChoice(text).scrollIntoView().should("be.visible");
  }

  toggleSelect() {
    this.select.click("right");
  }

  findOption(text: string) {
    return cy
      .get("[data-testid=select-popup]")
      .find("[data-testid=select-option-label]")
      .contains(text)
      .parents("[data-testid=select-option]");
  }
}

const Choices = new ChoicesHelper("&:eq(0)");
const useChoices = (rootSelector: string) => {
  return new ChoicesHelper(rootSelector);
};

export { Choices, useChoices };
