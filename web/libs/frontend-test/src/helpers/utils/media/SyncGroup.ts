import type { MediaView, ViewWithMedia } from "@humansignal/frontend-test/helpers/utils/media/types";
import { TWO_FRAMES_TIMEOUT } from "../../../../../editor/tests/integration/e2e/utils/constants";

type SyncableView = MediaView & ViewWithMedia;

class SyncGroup {
  views: SyncableView[];
  constructor(views: SyncableView[]) {
    this.views = views;
  }
  checkSynchronization(tolerance = 0.01, attempt = 1, maxAttempts = 3) {
    const mediaChains = this.views.map((view) => view.mediaElement);

    mediaChains[0].then((baseMedia) => {
      mediaChains.slice(1).forEach((mediaChain, idx) => {
        mediaChain.then((media) => {
          const baseMediaElement = baseMedia[0] as HTMLMediaElement;
          const mediaElement = media[0] as HTMLMediaElement;

          try {
            expect(baseMediaElement.currentTime).closeTo(mediaElement.currentTime, tolerance);
            expect(baseMediaElement.paused).to.equal(mediaElement.paused);
          } catch (error) {
            if (attempt < maxAttempts) {
              cy.wait(TWO_FRAMES_TIMEOUT);
              return this.checkSynchronization(tolerance, attempt + 1);
            }
            throw error;
          }
        });
      });
    });
  }
}

export const useSyncGroup = (views: SyncableView[]) => {
  return new SyncGroup(views);
};
