# TimeSeries Tag – Developer Guide

This document explains how the **TimeSeries** component in Label Studio is built, how its synchronisation with other media works (video / audio), and how the playback cursor logic is implemented.

> The goal is to give both humans and LLMs enough context to confidently extend or debug the code.

---

## 1. High-level architecture

```
TimeSeries (MST model + React container)
├── Channels (one per data column) – individual SVG plots
│   ├── Hover tracker (grey)          – shows XY under mouse
│   └── Playhead line   (customizable) – current playback position
├── MultiChannel (grouped visualization) – multiple channels in single plot
│   ├── Channel Legend               – interactive channel visibility controls
│   ├── TimeSeriesVisualizer         – unified D3 rendering component
│   └── Automatic color palette     – consistent channel colors
├── Overview (small plot at bottom)   – brush for zoom / pan
│   └── Playhead line   (customizable)
└── Region brushes                    – user labelled time ranges
```

* **Model** – `TimeSeriesModel` (MobX-state-tree). Holds data, view state and actions. Mixin order:
  `SyncableMixin → ObjectBase → PersistentStateMixin → AnnotationMixin → Model`.  
* **View**  – `HtxTimeSeriesViewRTS` (React) renders overview + channel children.
* **Channels** – legacy rendering via `ChannelD3` (being replaced by TimeSeriesVisualizer).
* **MultiChannel** – `MultiChannelModel` + `HtxMultiChannel` component that groups channels together.
* **TimeSeriesVisualizer** – unified D3 rendering component that replaces `ChannelD3` for both single and multi-channel views.
* **ChannelLegend** – interactive legend with visibility controls and hover highlighting.
* **Overview** – rendered inside the same file; supplies brush that changes `brushRange`.

### Important reactive fields
| Field                | Type                | Meaning |
|----------------------|---------------------|---------|
| `brushRange`         | `[number, number]`  | Visible time window (native units) |
| `cursorTime`         | `number \| null`   | Current playhead position (native) |
| `seekTo`             | `number \| null`   | One–shot instruction for overview to centre view |
| `scale`              | `number`            | Cached zoom factor (forces rerender) |
| `canvasWidth`        | `number`            | Cached width in px for correct math |
| `isPlaying` & co.    | …                   | Playback loop state |
| `cursorcolor`        | `string`            | Hex/colour string for playhead (default: `--color-neutral-inverted-surface`) |
| `suppressSync`       | `boolean`           | Temporarily disable sync events (during overview drag) |

Native units = *ms* when `timeformat` is a date, otherwise raw numeric indices/seconds.

---

## 2. MultiChannel functionality

The **MultiChannel** tag enables grouping multiple data channels in a single visualization with the following features:

### 2.1 Channel Legend
Interactive legend component that allows users to:
* Toggle channel visibility by clicking on legend items
* Highlight channels on hover for better visual focus
* Automatically assigns colors from a predefined palette

### 2.2 Color Palette System
* Automatic color assignment based on channel index
* Colors from design system: grape, mango, kale, persimmon, sand, kiwi, canteloupe, fig, plum, blueberry
* Optimized for contrast and accessibility
* Located in `palette.js` with `getChannelColor(index)` function

### 2.3 TimeSeriesVisualizer
Unified D3-based rendering component that **replaces the legacy `ChannelD3`** approach:
* Supports both single channel and multichannel visualizations
* Handles brush interactions for region creation
* Manages playhead cursor positioning
* Provides consistent rendering logic across MultiChannel and Channel
* Eliminates code duplication between single and multi-channel rendering

### 2.4 Usage Example
```xml
<TimeSeries name="ts" value="$timeseries" cursorColor="#ff0000">
  <MultiChannel height="300" showAxis={true}>
    <Channel column="velocity" legend="Velocity" units="m/s"/>
    <Channel column="acceleration" legend="Acceleration" units="m/s²"/>
  </MultiChannel>
</TimeSeries>
```

---

## 3. Synchronisation between object tags

The **SyncableMixin** provides a small intra-tab message bus.

* Each tag may specify `sync="groupA"`. All tags with the same name join one `SyncManager`.
* Supported events: `play`, `pause`, `seek`, `speed`.
* A 100 ms **SYNC_WINDOW** prevents infinite feedback loops – the originator is "locked" and only its events propagate during that window.
* **TimeSeries** registers handlers for `seek / play / pause` when FF `FF_TIMESERIES_SYNC` is on.
* Outgoing events are emitted via `syncSend`:
  * Overview brush drag → `emitSeekSync()` (fires on `updateTR`).
  * Manual click on main plot → handled in `handleMainAreaClick`.
  * **Note**: Overview dragging temporarily sets `suppressSync = true` to prevent cursor jumps.
* Incoming events call `_handleSeek`, `_handlePlay`, `_handlePause` which in turn
  * move cursor (`cursorTime`),
  * optionally restart playback loop,
  * update view by calling `_updateViewForTime` **only if needed**.

Audio tags honour `mute` logic so that only one sound is audible.

---

## 4. Playback cursor implementation

### 4.1 Data flow
1. **Source of truth** – `cursorTime` in the model (native units).
2. `cursorTime` is written by:
   * Playback loop (`playbackLoop`),
   * `_handleSeek` (remote seek),
   * `_updateViewForTime` (local scroll),
   * Manual click (`setCursor`) when inside current view.
3. Channels and Overview subscribe through React `useEffect`s and D3 – whenever `item.cursorTime` changes they reposition their SVG playhead line.

### 4.2 Channel playhead (`TimeSeriesVisualizer` / legacy `ChannelD3`)
```js
this.playhead = this.main.append('line')
  .attr('stroke', parent.cursorcolor)
  .attr('x1/x2', this.x(cursorTime))
```
`updatePlayhead(time)` hides the line if the time is outside current `x.domain()` or `null`.

**Note**: In modern MultiChannel components, this logic is handled by `TimeSeriesVisualizer` which provides unified cursor management across all channels.

### 4.3 Overview playhead
Identical logic but uses scaled brush coordinate.

### 4.4 Click without recentering
* If click time is **inside** `brushRange` we call `setCursor(time)` – only cursor moves.
* If outside – `_updateViewForTime` recentres view and may emit sync.

### 4.5 Overview dragging behavior
* When user starts dragging the overview brush (`brushstarted`), `suppressSync` is set to `true`.
* This prevents `emitSeekSync()` from firing during the drag, keeping cursor fixed.
* On `brushended`, `suppressSync` is reset to `false` (with 0ms delay to let range settle).
* Result: dragging overview changes viewport without moving playhead or syncing with video/audio.

---

## 5. Important actions
| Action                 | Purpose |
|------------------------|---------|
| `updateTR(range)`      | Central method to change visible window; triggers rerender + optional sync |
| `scrollToRegion(r)`    | Ensure a labelled region is visible (may expand brush) |
| `setCursorAndSeek(t)`  | Update both `cursorTime` & `seekTo` (internal only) |
| `setCursor(t)`         | Update only `cursorTime` (no brush movement) |
| `_updateViewForTime(t)`| Convert time → pixels & adjust brush + cursor |
| `setSuppressSync(flag)`| Temporarily disable sync emissions |

---

## 6. Adding new functionality
* **New attributes** – extend `TagAttrs` with MST `types.optional`, then read `item.<attr>` in views.
* **New MultiChannel features** – modify `MultiChannelModel` actions or extend `ChannelLegend` component.
* **Color customization** – extend `palette.js` or add channel-specific color attributes.
* **Styling** – prefer Tailwind utility classes or inline SVG attributes.
* **Performance** – huge datasets are thinned with `sparseValues()`; thresholds controlled by `zoomStep`.
* **Visualization** – extend `TimeSeriesVisualizer` for custom D3 rendering behaviors.

---

## 7. Glossary
| Term           | Meaning |
|---------------|---------|
| **Native units** | Raw numeric time values used in dataset (ms for dates, seconds/indices otherwise) |
| **Relative seconds** | Seconds offset from dataset start – format used in sync messages |
| **Brush** | D3 brush in Overview controlling visible window (`brushRange`) |
| **MultiChannel** | Component that groups multiple data channels in a single visualization |
| **Channel Legend** | Interactive legend component for controlling channel visibility and highlighting |
| **TimeSeriesVisualizer** | Unified D3-based rendering component that replaces legacy `ChannelD3` |
| **ChannelD3** | Legacy D3 rendering component (being replaced by TimeSeriesVisualizer) |
| **Color Palette** | Predefined set of colors automatically assigned to channels |
