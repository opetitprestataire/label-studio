import * as d3 from "d3";
import Utils from "../../../utils";
import { defaultStyle } from "../../../core/Constants";
import { FF_TIMESERIES_SYNC, isFF } from "../../../utils/feature-flags";
import { isAlive } from "mobx-state-tree";

export const line = (x, y) =>
  d3
    .line()
    .x((d) => x(d[0]))
    .y((d) => y(d[1]));

export const idFromValue = (value) => value.substr(1);

export const getOptimalWidth = () => ((window.screen && window.screen.width) || 1440) * (window.devicePixelRatio || 2);

export const sparseValues = (values, max = 1e6) => {
  if (values.length <= max) return values;
  let next = 0;
  const step = (values.length - 1) / (max - 1);
  // return values.filter((_, i) => i > next && (next += step))

  return values.filter((_, i) => {
    if (i < next) return false;
    next += step;
    return true;
  });
};

export const getRegionColor = (region, alpha = 1) => {
  const color = (region.style || defaultStyle).fillcolor;

  return Utils.Colors.convertToRGBA(color, alpha);
};

// clear d3 sourceEvent via async call to prevent infinite loops
export const clearD3Event = (f) => setTimeout(f, 0);

// check if we are in recursive event loop, caused by `event`
export const checkD3EventLoop = (event) => {
  if (!d3.event.sourceEvent) return true;
  if (event) return d3.event.sourceEvent.type === event;
  return ["start", "brush", "end"].includes(d3.event.sourceEvent.type);
};

const formatDateDiff = (start, end) => {
  const dates = [start.toLocaleDateString(), end.toLocaleDateString()];

  if (dates[1] !== dates[0]) return dates;
  return [start.toLocaleTimeString(), end.toLocaleTimeString()];
};

export const formatRegion = (node) => {
  let ranges = [];

  if (node.parent.format === "date") {
    ranges = formatDateDiff(new Date(node.start), new Date(node.end));
  } else {
    ranges = [node.start, node.end];
  }
  return node.instant ? ranges[0] : ranges.join("–");
};

export const formatTrackerTime = (time) => new Date(time).toUTCString();

/**
 * Shared click handling logic for TimeSeries and TimeSeriesVisualizer components
 * @param {Event} event - The click event
 * @param {Object} timeSeriesItem - The TimeSeries model instance
 * @param {HTMLElement} mainDisplayElement - The main display element reference
 */
export function handleTimeSeriesMainAreaClick(event, timeSeriesItem, mainDisplayElement) {
  if (!isAlive(timeSeriesItem) || !isFF(FF_TIMESERIES_SYNC) || event.target.closest(".htx-timeseries-overview")) {
    return;
  }

  if (
    !mainDisplayElement ||
    !timeSeriesItem.brushRange ||
    timeSeriesItem.brushRange.length !== 2 ||
    !timeSeriesItem.canvasWidth ||
    !timeSeriesItem.keysRange ||
    timeSeriesItem.keysRange.length !== 2
  ) {
    console.warn("TimeSeries: Click handling skipped, essential data missing or component not ready.", {
      hasRef: !!mainDisplayElement,
      brushRange: timeSeriesItem.brushRange,
      canvasWidth: timeSeriesItem.canvasWidth,
      keysRange: timeSeriesItem.keysRange,
    });
    return;
  }

  // Use the TimeSeries margin for coordinate calculation
  const { left: marginLeft = 0, right: marginRight = 0 } = timeSeriesItem.margin || {};
  const plottingAreaWidth = timeSeriesItem.canvasWidth - marginLeft - marginRight;

  if (plottingAreaWidth <= 0) {
    console.warn(`TimeSeries: Plotting area width (${plottingAreaWidth}) is not positive.`);
    return;
  }

  const rect = mainDisplayElement.getBoundingClientRect();

  let clickX = event.clientX - rect.left - marginLeft;
  clickX = Math.max(0, Math.min(clickX, plottingAreaWidth));

  const [brushTimeStartNative, brushTimeEndNative] = timeSeriesItem.brushRange;
  const brushDurationNative = brushTimeEndNative - brushTimeStartNative;

  if (brushDurationNative <= 0) {
    console.warn(`TimeSeries: Brush duration (${brushDurationNative}) is not positive.`);
    return;
  }

  const timeClicked = brushTimeStartNative + (clickX / plottingAreaWidth) * brushDurationNative;
  const [minKey, maxKey] = timeSeriesItem.keysRange;
  const finalTime = Math.max(minKey, Math.min(timeClicked, maxKey));

  const insideView = timeSeriesItem.brushRange && finalTime >= timeSeriesItem.brushRange[0] && finalTime <= timeSeriesItem.brushRange[1];

  if (insideView) {
    // Just move cursor without changing brush range
    timeSeriesItem.setCursor(finalTime);
  } else if (typeof timeSeriesItem._updateViewForTime === "function") {
    // Re-center only when outside current view
    timeSeriesItem._updateViewForTime(finalTime);
  }

  // If we're currently playing, update the playback state to restart from the clicked position
  if (timeSeriesItem.isPlaying) {
    timeSeriesItem.restartPlaybackFromTime(finalTime);
  }

  if (isFF(FF_TIMESERIES_SYNC)) {
    const referenceTime = insideView ? finalTime : (timeSeriesItem.centerTime ?? finalTime);
    let relativeTime;
    if (timeSeriesItem.isDate) {
      relativeTime = (referenceTime - minKey) / 1000;
    } else {
      relativeTime = referenceTime - minKey;
    }
    // Include current playing state to prevent other media from pausing during seek
    timeSeriesItem.syncSend({ time: relativeTime, playing: timeSeriesItem.isPlaying }, "seek");
  }
}
