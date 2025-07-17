import { AudioView, LabelStudio, Paragraphs } from "@humansignal/frontend-test/helpers/LSF";
import { Network } from "@humansignal/frontend-test/helpers/utils";
import { fullOpossumSnowData, videoAudioParagraphsConfig } from "../../../data/sync/video-audio-paragraphs";

describe("Sync buffering playback", () => {
  beforeEach(() => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      fflag_fix_front_fit_31_synced_media_buffering: true,
      fflag_feat_front_lsdv_e_278_contextual_scrolling_short: true,
    });
    Network.disableBrowserCache();
    cy.reload(true);
    cy.on("uncaught:exception", () => false);
  });

  afterEach(() => {
    Network.clearAllThrottles();
    Network.enableBrowserCache();
  });

  it("should go though all paragraphs during playback with buffering", () => {
    let attempts = 3;
    const testScenario = () => {
      LabelStudio.params().config(videoAudioParagraphsConfig).data(fullOpossumSnowData).withResult([]).init();

      LabelStudio.waitForObjectsReady();
      AudioView.isReady();
      Paragraphs.mediaElement.should("exist");

      cy.window().then((win) => {
        win._wasBuffered = false;
        AudioView.root.then(($audioRoot) => {
          let observer: MutationObserver | null = null;
          const checkBuffering = () => {
            const bufferingIndicators = win.document.querySelectorAll(AudioView._bufferingIndicatorSelector);
            const isBuffering = bufferingIndicators.length > 0;
            if (isBuffering) {
              win._wasBuffered = true;
              observer?.disconnect();
            }
          };
          const config = { childList: true, subtree: true };
          observer = new MutationObserver(checkBuffering);

          observer.observe($audioRoot[0], config);
        });
      });

      // Set playback speed to 2x to save some time
      AudioView.setPlaybackSpeedInput(2);

      // Slow down the network
      Network.throttleNetwork("/public/files/opossum_snow.mp4", 75, "throttled_mp4");

      AudioView.playButton.click();

      for (let i = 0; i < fullOpossumSnowData.text.length - 1; i++) {
        Paragraphs.hasPhrasePlaying(i, 40000);
      }
    };
    testScenario();
    cy.window().then((win) => {
      if (!win._wasBuffered && attempts-- > 1) {
        testScenario();
      }
    });
  });
});
