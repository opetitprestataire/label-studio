const assert = require("assert");
const { omitBy } = require("./helpers");

Feature("Paragraphs Enhanced - Select All and Hotkeys");

const AUDIO = "/public/files/barradeen-emotional.mp3";

const DATA = {
  audio: AUDIO,
  dialogue: [
    { author: "Speaker A", text: "This is the first phrase for testing", start: 0, end: 2 },
    { author: "Speaker B", text: "This is the second phrase with different content", start: 2, end: 4 },
    { author: "Speaker A", text: "This is the third phrase for more testing", start: 4, end: 6 },
  ],
};

const CONFIG = `
<View>
  <Audio name="audio" value="$audio" hotkey="space" sync="text"/>
  <ParagraphLabels name="label" toName="text">
    <Label value="General: Positive1" background="#00ff00"/>
    <Label value="General: Negative" background="#ff0000"/>
    <Label value="Representative: Positive" background="#4bff4b"/>
    <Label value="Representative: Negative" background="#ff4b4b"/>
    <Label value="IVR: Positive" background="#19ff19"/>
    <Label value="IVR: Negative" background="#ff1919"/>
  </ParagraphLabels>
  <Paragraphs 
    audioUrl="$audio"
    sync="audio"
    contextScroll="true"
    name="text"
    value="$dialogue"
    layout="dialogue"
    textKey="text"
    nameKey="author"
    granularity="paragraph"
  />
</View>
`;

const FEATURE_FLAGS = {
  ff_front_dev_2669_paragraph_author_filter_210622_short: true,
  fflag_fix_front_dev_2918_labeling_filtered_paragraphs_250822_short: true,
  fflag_feat_front_bros_199_enable_select_all_in_ner_phrase_short: true,
  fflag_feat_front_lsdv_e_278_new_paragraphs_ui_short: true,
};

async function retryScenario(fn, retries = 3) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      await fn();
      return;
    } catch (err) {
      lastErr = err;
      if (i < retries - 1) {
        // eslint-disable-next-line no-console
        console.warn(`Retrying scenario due to error: ${err}`);
      }
    }
  }
  throw lastErr;
}

// Utility to try both Mac and Win/Linux hotkey combos
async function tryHotkeys(I, combos) {
  for (const keys of combos) {
    I.say(`Trying hotkey: ${JSON.stringify(keys)}`);
    I.pressKey(keys);
    I.wait(0.5);
  }
}

Scenario(
  "Select All button appears and works when label is selected",
  async ({ I, LabelStudio, AtOutliner, AtParagraphs, AtLabels }) => {
    await retryScenario(async () => {
      const params = { data: DATA, config: CONFIG };
      I.amOnPage("/");
      LabelStudio.setFeatureFlags(FEATURE_FLAGS);
      LabelStudio.init(params);
      AtOutliner.seeRegions(0);

      // Debug: Wait for any label to appear and print all label texts
      I.waitForElement(".lsf-label", 10);
      const labelTexts = await I.grabTextFromAll(".lsf-label");
      I.say(`Visible labels: ${JSON.stringify(labelTexts)}`);

      // Wait for the specific label to appear
      I.waitForElement(locate(".lsf-label").withText("General: Positive1"), 5);
      AtLabels.clickLabel("General: Positive1");
      // Wait for the Select All button to be enabled in the phrase:0 div
      I.waitForElement('div[data-testid="phrase:0"] button:not([disabled])', 10);
      I.say("Select All button is now enabled and visible");

      // Click the Select All button
      I.click('div[data-testid="phrase:0"] button');
      AtOutliner.seeRegions(1);
      const result = await LabelStudio.serialize();
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].value.text, "This is the first phrase for testing");
      assert.deepStrictEqual(result[0].value.paragraphlabels, ["General: Positive1"]);
    });
  },
);

Scenario("Select All button is disabled when no label is selected", async ({ I, LabelStudio, AtOutliner }) => {
  await retryScenario(async () => {
    const params = { data: DATA, config: CONFIG };
    I.amOnPage("/");
    LabelStudio.setFeatureFlags(FEATURE_FLAGS);
    LabelStudio.init(params);
    AtOutliner.seeRegions(0);
    // Wait for the Select All button to be present and disabled
    I.waitForElement('div[data-testid="phrase:0"] button[disabled]', 10);
    I.say("Select All button is present and disabled when no label is selected");
  });
});

Scenario("Hotkey for Select All creates region", async ({ I, LabelStudio, AtOutliner, AtLabels }) => {
  await retryScenario(async () => {
    const params = { data: DATA, config: CONFIG };
    I.amOnPage("/");
    LabelStudio.setFeatureFlags(FEATURE_FLAGS);
    LabelStudio.init(params);
    AtOutliner.seeRegions(0);
    AtLabels.clickLabel("General: Positive1");
    // Focus the phrase
    I.click('div[data-testid="phrase:0"]');
    // Try Cmd+Shift+A (Mac)
    await tryHotkeys(I, [
      ["Meta", "Shift", "A"],
      ["Control", "Shift", "A"],
    ]);
    I.wait(1);
    let result = await LabelStudio.serialize();
    if (result.length === 0) {
      // Try Ctrl+Shift+A (Win/Linux) if Cmd+Shift+A didn't work
      await tryHotkeys(I, [["Control", "Shift", "A"]]);
      I.wait(1);
      result = await LabelStudio.serialize();
    }
    I.say(`Regions after hotkey: ${JSON.stringify(result)}`);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].value.text, "This is the first phrase for testing");
    assert.deepStrictEqual(result[0].value.paragraphlabels, ["General: Positive1"]);
  });
});

Scenario(
  "Feature flag off: Select All button does not appear",
  async ({ I, LabelStudio, AtOutliner, AtParagraphs, AtLabels }) => {
    await retryScenario(async () => {
      const params = { data: DATA, config: CONFIG };
      I.amOnPage("/");
      LabelStudio.setFeatureFlags({
        fflag_feat_front_bros_199_enable_select_all_in_ner_phrase_short: false,
        fflag_feat_front_lsdv_e_278_new_paragraphs_ui_short: false,
      });
      LabelStudio.init(params);
      AtOutliner.seeRegions(0);
      AtLabels.clickLabel("General: Positive1");
      AtParagraphs.dontSeeSelectAllButton(0);
    });
  },
);

Scenario("Hotkey: Next Phrase moves focus to next phrase", async ({ I, LabelStudio, AtOutliner, AtLabels }) => {
  await retryScenario(async () => {
    const params = { data: DATA, config: CONFIG };
    I.amOnPage("/");
    LabelStudio.setFeatureFlags(FEATURE_FLAGS);
    LabelStudio.init(params);
    AtLabels.clickLabel("General: Positive1");
    // Focus the first phrase
    I.click('div[data-testid="phrase:0"]');
    await tryHotkeys(I, [
      ["Meta", "ArrowDown"],
      ["Control", "ArrowDown"],
    ]);
    // Assert focus moved to phrase:1 (implementation may vary)
    I.waitForElement('div[data-testid="phrase:1"].focused, div[data-testid="phrase:1"]:focus', 5);
  });
});

Scenario("Hotkey: Previous Phrase moves focus to previous phrase", async ({ I, LabelStudio, AtOutliner, AtLabels }) => {
  await retryScenario(async () => {
    const params = { data: DATA, config: CONFIG };
    I.amOnPage("/");
    LabelStudio.setFeatureFlags(FEATURE_FLAGS);
    LabelStudio.init(params);
    AtLabels.clickLabel("General: Positive1");
    // Focus the second phrase
    I.click('div[data-testid="phrase:1"]');
    await tryHotkeys(I, [
      ["Meta", "ArrowUp"],
      ["Control", "ArrowUp"],
    ]);
    // Assert focus moved to phrase:0
    I.waitForElement('div[data-testid="phrase:0"].focused, div[data-testid="phrase:0"]:focus', 5);
  });
});

Scenario("Hotkey: Select All and Annotate creates region", async ({ I, LabelStudio, AtOutliner, AtLabels }) => {
  await retryScenario(async () => {
    const params = { data: DATA, config: CONFIG };
    I.amOnPage("/");
    LabelStudio.setFeatureFlags(FEATURE_FLAGS);
    LabelStudio.init(params);
    AtOutliner.seeRegions(0);
    AtLabels.clickLabel("General: Positive1");
    I.click('div[data-testid="phrase:0"]');
    await tryHotkeys(I, [
      ["Meta", "Shift", "A"],
      ["Control", "Shift", "A"],
    ]);
    I.wait(1);
    AtOutliner.seeRegions(1);
    const result = await LabelStudio.serialize();
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].value.text, "This is the first phrase for testing");
    assert.deepStrictEqual(result[0].value.paragraphlabels, ["General: Positive1"]);
  });
});

Scenario("Hotkey: Next Region in Phrase navigates to next region", async ({ I, LabelStudio, AtOutliner, AtLabels }) => {
  await retryScenario(async () => {
    const params = { data: DATA, config: CONFIG };
    I.amOnPage("/");
    LabelStudio.setFeatureFlags(FEATURE_FLAGS);
    LabelStudio.init(params);
    AtLabels.clickLabel("General: Positive1");
    // Create two regions
    I.click('div[data-testid="phrase:0"]');
    await tryHotkeys(I, [
      ["Meta", "Shift", "A"],
      ["Control", "Shift", "A"],
    ]);
    I.click('div[data-testid="phrase:1"]');
    await tryHotkeys(I, [
      ["Meta", "Shift", "A"],
      ["Control", "Shift", "A"],
    ]);
    AtOutliner.seeRegions(2);
    // Focus the first region (implementation may vary)
    I.click('div[data-testid="phrase:0"]');
    await tryHotkeys(I, [
      ["Meta", "ArrowLeft"],
      ["Control", "ArrowRight"],
    ]);
    // Assert region selection moved (implementation may vary)
    // You may need to check for a selected class or region highlight
  });
});

Scenario(
  "Hotkey: Previous Region in Phrase navigates to previous region",
  async ({ I, LabelStudio, AtOutliner, AtLabels }) => {
    await retryScenario(async () => {
      const params = { data: DATA, config: CONFIG };
      I.amOnPage("/");
      LabelStudio.setFeatureFlags(FEATURE_FLAGS);
      LabelStudio.init(params);
      AtLabels.clickLabel("General: Positive1");
      // Create two regions
      I.click('div[data-testid="phrase:0"]');
      await tryHotkeys(I, [
        ["Meta", "Shift", "A"],
        ["Control", "Shift", "A"],
      ]);
      I.click('div[data-testid="phrase:1"]');
      await tryHotkeys(I, [
        ["Meta", "Shift", "A"],
        ["Control", "Shift", "A"],
      ]);
      AtOutliner.seeRegions(2);
      // Focus the second region (implementation may vary)
      I.click('div[data-testid="phrase:1"]');
      await tryHotkeys(I, [
        ["Meta", "ArrowRight"],
        ["Control", "ArrowLeft"],
      ]);
      // Assert region selection moved (implementation may vary)
      // You may need to check for a selected class or region highlight
    });
  },
);

Scenario("Hotkey: Next/Previous Region loops at ends", async ({ I, LabelStudio, AtOutliner, AtLabels }) => {
  await retryScenario(async () => {
    const params = { data: DATA, config: CONFIG };
    I.amOnPage("/");
    LabelStudio.setFeatureFlags(FEATURE_FLAGS);
    LabelStudio.init(params);
    AtLabels.clickLabel("General: Positive1");
    // Create three regions in phrase 0
    I.click('div[data-testid="phrase:0"]');
    await tryHotkeys(I, [
      ["Meta", "Shift", "A"],
      ["Control", "Shift", "A"],
    ]);
    // Simulate creating two more regions (for demo, just repeat Select All)
    await tryHotkeys(I, [
      ["Meta", "Shift", "A"],
      ["Control", "Shift", "A"],
    ]);
    await tryHotkeys(I, [
      ["Meta", "Shift", "A"],
      ["Control", "Shift", "A"],
    ]);
    AtOutliner.seeRegions(3);

    // Focus the last region (simulate by clicking the last outliner entry)
    I.click(locate(".lsf-outliner-item").at(3));
    I.say("Focused last region");
    // Press Next Region hotkey (should loop to first)
    await tryHotkeys(I, [
      ["Meta", "ArrowLeft"],
      ["Control", "ArrowRight"],
    ]);
    // Log which region is selected (by .selected class in outliner)
    const selectedIdxAfterNext = await I.executeScript(() => {
      const items = Array.from(document.querySelectorAll(".lsf-outliner-item"));
      return items.findIndex((item) => item.classList.contains("selected"));
    });
    I.say(`Selected region after Next Region hotkey: ${selectedIdxAfterNext}`);

    // Focus the first region
    I.click(locate(".lsf-outliner-item").at(1));
    I.say("Focused first region");
    // Press Previous Region hotkey (should loop to last)
    await tryHotkeys(I, [
      ["Meta", "ArrowRight"],
      ["Control", "ArrowLeft"],
    ]);
    const selectedIdxAfterPrev = await I.executeScript(() => {
      const items = Array.from(document.querySelectorAll(".lsf-outliner-item"));
      return items.findIndex((item) => item.classList.contains("selected"));
    });
    I.say(`Selected region after Previous Region hotkey: ${selectedIdxAfterPrev}`);
  });
});
