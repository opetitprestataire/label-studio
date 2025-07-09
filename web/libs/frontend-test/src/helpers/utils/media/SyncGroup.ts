import type { MediaView } from "@humansignal/frontend-test/helpers/utils/media/types";

class SyncGroup {
  views: MediaView[];
  constructor(views: MediaView[]) {
    this.views = [];
  }
  checkSynchronization(tolerance = 0.01) {
    const times = this.views.map((view) => view.getCurrentTime());
    const pausedStates = this.views.map((view) => view.isPaused());

    cy.wrap(null).then(() => {
      // Check that all times are within tolerance
      for (let i = 1; i < times.length; i++) {
        times[0].should("be.closeTo", times[i], tolerance);
      }

      // Check that all paused states are the same
      for (let i = 1; i < pausedStates.length; i++) {
        pausedStates[0].should("equal", pausedStates[i]);
      }
    });
  }
}

export const useSyncGroup = (views: MediaView[]) => {
  return new SyncGroup(views);
};
