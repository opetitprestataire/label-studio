import { AudioView, LabelStudio, Rating, Taxonomy, ToolBar } from "@humansignal/frontend-test/helpers/LSF";
import {
  audioConfig,
  audioData,
  audioResult,
  ratingConfig,
  ratingResult,
  taxonomyConfig,
  taxonomyResult,
  textData,
} from "../../data/view_all/readonly";

describe("View all - Raadonly", () => {
  it("Should not allow user to edit an annotation - Rating", () => {
    LabelStudio.params().config(ratingConfig).data(textData).withResult(ratingResult).init();
    ToolBar.viewAllBtn.click();
    Rating.setValue(5);
    Rating.hasValue(3);
  });
  it("Should not allow user to edit an annotation - Taxonomy", () => {
    LabelStudio.params().config(taxonomyConfig).data(textData).withResult(taxonomyResult).init();
    ToolBar.viewAllBtn.click();
    Taxonomy.open();
    Taxonomy.input.filter(Taxonomy.selectors.open).should("not.exist");
  });
  it("Should not allow user to edit an annotation - Audio region", () => {
    LabelStudio.params().config(audioConfig).data(audioData).withResult(audioResult).init();
    AudioView.isReady();
    ToolBar.viewAllBtn.click();
    AudioView.isReady();
    AudioView.drawRectRelative(0.07, 0.6, 0.5, 0);
    LabelStudio.serialize().then((result) => {
      expect(result[0].value.start).to.eq(3);
      expect(result[0].value.end).to.eq(10);
    });
  });
});
