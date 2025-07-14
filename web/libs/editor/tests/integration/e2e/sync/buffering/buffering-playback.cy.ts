import { AudioView, LabelStudio, Paragraphs, VideoView } from "@humansignal/frontend-test/helpers/LSF";
import { Network } from "@humansignal/frontend-test/helpers/utils";
import { useSyncGroup } from "@humansignal/frontend-test/helpers/utils/media/SyncGroup";
import { fullOpossumSnowData, videoAudioParagraphsConfig } from "../../../data/sync/video-audio-paragraphs";

const suiteConfig = {
  retries: 2,
};

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

  const SyncGroup = useSyncGroup([AudioView, VideoView, Paragraphs]);

  it("should keep media elements synced during playback with buffering", suiteConfig, () => {
    cy.wrap(false).as("wasBuffered");
    LabelStudio.params().config(videoAudioParagraphsConfig).data(fullOpossumSnowData).withResult([]).init();

    LabelStudio.waitForObjectsReady();
    AudioView.isReady();
    Paragraphs.mediaElement.should("exist");

    // Set playback speed to 2x to save some time
    AudioView.setPlaybackSpeedInput(2);

    // Slow down the network
    Network.throttleNetwork("/public/files/opossum_snow.mp4", 75, "throttled_mp4");
    AudioView.playButton.click();

    cy.wrap(false).as("playbackEnded");
    const runCheckSynced = () => {
      // If there is buffering, then the test tested what it was supposed to test
      cy.window().then((win) => {
        const bufferingIndicators = win.document.querySelectorAll(AudioView._bufferingIndicatorSelector);
        const isBuffering = bufferingIndicators.length > 0;
        if (isBuffering) {
          cy.wrap(true).as("wasBuffered");
        }
        const delay = isBuffering ? 5000 : 1000;

        // Each moment of time all media elements should be synchronized
        // @TODO: Decrease the tolerance (which is 1.5s right now) when the sync starts working more stable.
        SyncGroup.checkSynchronization(1.5);

        // If video playback has ended, there is nothing to check in current loop
        AudioView.root.then(($audioRoot) => {
          const playButton = $audioRoot.find(AudioView._playButtonSelector);
          if (playButton.length !== 0) {
            // If play button is visible, it means playback has ended
            cy.wrap(true).as("playbackEnded");
          }
        });

        cy.get("@playbackEnded").then((playbackEnded) => {
          if (playbackEnded) {
            // If playback has ended, we can stop checking
            return;
          }

          // Give some time for the media to play before checking again
          cy.wait(delay).then(runCheckSynced);
        });
      });
    };
    runCheckSynced();
    cy.get("@wasBuffered").then((wasBuffered) => {
      if (!wasBuffered) {
        // try again if no buffering was detected
        expect.fail("Playback ended without any buffering");
      }
    });
  });

  it("should go though all paragraphs during playback with buffering", suiteConfig, () => {
    cy.wrap(false).as("wasBuffered");
    LabelStudio.params().config(videoAudioParagraphsConfig).data(fullOpossumSnowData).withResult([]).init();

    LabelStudio.waitForObjectsReady();
    AudioView.isReady();
    Paragraphs.mediaElement.should("exist");

    // Set playback speed to 2x to save some time
    AudioView.setPlaybackSpeedInput(2);

    // Slow down the network
    Network.throttleNetwork("/public/files/opossum_snow.mp4", 75, "throttled_mp4");
    AudioView.playButton.click();

    const runCheckPhrase = (i: number) => {
      cy.log(`Checking phrase ${i}`);
      Paragraphs.root
        .find(`${Paragraphs._bufferingIndicatorSelector}:visible, button[aria-label="pause"]`, { timeout: 10000 })
        .then(($elements) => {
          const $indicator = $elements.filter(Paragraphs._bufferingIndicatorSelector);
          const $button = $elements.filter("button").parents("[data-testid^='phrase:']");
          if ($indicator.length > 0) {
            cy.wrap(true).as("wasBuffered");
            Paragraphs.root.find(Paragraphs._bufferingIndicatorSelector, { timeout: 10000 }).should("not.exist");
          } else if ($button.length === 1) {
            cy.wrap($button[0]).should("have.data", "testid", `phrase:${i}`);
            Paragraphs.hasNoPhrasePlaying(i);
            if (i < fullOpossumSnowData.text.length - 1) {
              i = i + 1;
            } else {
              return;
            }
          } else {
            expect.fail("No buffering indicator or pause button found");
          }
          runCheckPhrase(i);
        });
    };
    runCheckPhrase(0);

    cy.get("@wasBuffered").then((wasBuffered) => {
      if (!wasBuffered) {
        expect.fail("Playback ended without any buffering");
      }
    });
  });
});
