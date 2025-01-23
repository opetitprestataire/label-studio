function isMac(win) {
  return win.navigator.platform.toLowerCase().indexOf("mac") >= 0;
}

function pressHotkey(hotkey: string, macHotkey?: string) {
  let key = hotkey;
  cy.window().then((win) => {
    console.log("!> isMac(win)", isMac(win));
    if (macHotkey && isMac(win)) {
      key = macHotkey;
    }
    console.log("!> key", key);
    cy.get("body").type(key);
  });
}

export const Hotkeys = {
  undo() {
    pressHotkey("{ctrl}z", "{command}z");
  },
  redo() {
    pressHotkey("{ctrl}{shift}z", "{command}{shift}z");
  },
  deleteRegion() {
    pressHotkey("{backspace}");
  },
};
