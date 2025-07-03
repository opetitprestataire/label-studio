import { Labels, LabelStudio, Sidebar, VideoView } from "@humansignal/frontend-test/helpers/LSF/index";
import { simpleVideoConfig, simpleVideoData, simpleVideoResult } from "../../data/video_segmentation/regions";

describe("Video segmentation", () => {
  it("Should be able to draw a simple rectangle", () => {
    LabelStudio.params().config(simpleVideoConfig).data(simpleVideoData).withResult([]).init();

    LabelStudio.waitForObjectsReady();
    Sidebar.hasNoRegions();

    Labels.select("Label 1");

    VideoView.drawRectRelative(0.2, 0.2, 0.6, 0.6);

    Sidebar.hasRegions(1);
  });

  it("Should have changes in canvas", () => {
    LabelStudio.params().config(simpleVideoConfig).data(simpleVideoData).withResult([]).init();
    LabelStudio.waitForObjectsReady();
    Sidebar.hasNoRegions();

    // Wait for video to be fully loaded and stable
    cy.wait(1000);
    VideoView.captureCanvas("canvas");

    Labels.select("Label 2");
    VideoView.drawRectRelative(0.2, 0.2, 0.6, 0.6);
    Sidebar.hasRegions(1);

    // Ensure drawing operations are complete before comparison
    cy.wait(1000);
    VideoView.canvasShouldChange("canvas", 0);
  });

  describe("Rectangle", () => {
    it("Should be invisible out of the lifespan", () => {
      LabelStudio.params().config(simpleVideoConfig).data(simpleVideoData).withResult(simpleVideoResult).init();
      LabelStudio.waitForObjectsReady();
      Sidebar.hasRegions(1);

      // Wait for video and regions to be fully loaded
      cy.wait(1000);
      VideoView.captureCanvas("canvas");

      VideoView.clickAtFrame(4);
      // Wait for frame change to be fully rendered
      cy.wait(1000);
      VideoView.canvasShouldChange("canvas", 0);
    });
  });

  describe("Transformer", () => {
    it("Should be invisible out of the lifespan", () => {
      LabelStudio.params().config(simpleVideoConfig).data(simpleVideoData).withResult(simpleVideoResult).init();
      LabelStudio.waitForObjectsReady();
      Sidebar.hasRegions(1);

      cy.log("Remember an empty canvas state");
      VideoView.clickAtFrame(4);
      // Wait for frame change to be fully processed
      cy.wait(1000);
      VideoView.captureCanvas("canvas");

      VideoView.clickAtFrame(3);
      cy.log("Select region");
      VideoView.clickAtRelative(0.5, 0.5);

      // Add retry logic for element selection in CI
      cy.get("body").then(($body) => {
        // Retry selection if not found initially
        if ($body.find(".lsf-tree-node-selected").length === 0) {
          cy.wait(500);
          VideoView.clickAtRelative(0.5, 0.5);
        }
      });

      Sidebar.hasSelectedRegions(1);
      VideoView.clickAtFrame(4);
      Sidebar.hasSelectedRegions(1);

      // Wait longer for transformer state changes in CI
      cy.wait(1500);
      VideoView.canvasShouldNotChange("canvas", 0);
    });
  });
});
