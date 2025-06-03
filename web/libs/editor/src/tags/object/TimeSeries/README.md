# TimeSeries Tag – Developer Guide

This document explains how the **TimeSeries** component in Label Studio is built, how its synchronisation with other media works (video / audio), and how the playback cursor logic is implemented.

> The goal is to give both humans and LLMs enough context to confidently extend or debug the code.

---

## 1. High-level architecture

```
TimeSeries (MST model + React container)
├── Channels (one per data column) – individual SVG plots
│   ├── Hover tracker (grey)          – shows XY under mouse
│   └── Playhead line   (blue)        – current playback position
├── Overview (small plot at bottom)   – brush for zoom / pan
│   └── Playhead line   (blue)
└── Region brushes                    – user labelled time ranges
```

* **Model** – `TimeSeriesModel` (MobX-state-tree). Holds data, view state and actions. Mixin order:
  `SyncableMixin → ObjectBase → PersistentStateMixin → AnnotationMixin → Model`.  
* **View**  – `HtxTimeSeriesViewRTS` (React) renders overview + channel children.
* **Channels** – rendered by `ChannelD3`. Each channel draws its own line + tracker + brushes.
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
| `cursorcolor`        | `string`            | Hex/colour string for playhead |

Native units = *ms* when `timeformat` is a date, otherwise raw numeric indices/seconds.

---

## 2. Synchronisation between widgets

The **SyncableMixin** provides a small intra-tab message bus.

* Each tag may specify `sync="groupA"`. All tags with the same name join one `SyncManager`.
* Supported events: `play`, `pause`, `seek`, `speed`.
* A 100 ms **SYNC_WINDOW** prevents infinite feedback loops – the originator is "locked" and only its events propagate during that window.
* **TimeSeries** registers handlers for `seek / play / pause` when FF `FF_TIMESERIES_SYNC` is on.
* Outgoing events are emitted via `syncSend`:
  * Overview brush drag → `emitSeekSync()` (fires on `updateTR`).
  * Manual click on main plot → handled in `handleMainAreaClick`.
* Incoming events call `_handleSeek`, `_handlePlay`, `_handlePause` which in turn
  * move cursor (`cursorTime`),
  * optionally restart playback loop,
  * update view by calling `_updateViewForTime` **only if needed**.

Audio tags honour `mute` logic so that only one sound is audible.

---

## 3. Playback cursor implementation

### 3.1 Data flow
1. **Source of truth** – `cursorTime` in the model (native units).
2. `cursorTime` is written by:
   * Playback loop (`playbackLoop`),
   * `_handleSeek` (remote seek),
   * `_updateViewForTime` (local scroll),
   * Manual click (`setCursor`) when inside current view.
3. Channels and Overview subscribe through React `useEffect`s and D3 – whenever `item.cursorTime` changes they reposition their SVG playhead line.

### 3.2 Channel playhead (`ChannelD3`)
```js
this.playhead = this.main.append('line')
  .attr('stroke', parent.cursorcolor)
  .attr('x1/x2', this.x(cursorTime))
```
`updatePlayhead(time)` hides the line if the time is outside current `x.domain()` or `null`.

### 3.3 Overview playhead
Identical logic but uses scaled brush coordinate.

### 3.4 Click without recentering
* If click time is **inside** `brushRange` we call `setCursor(time)` – only cursor moves.
* If outside – `_updateViewForTime` recentres view and may emit sync.

---

## 4. Important actions
| Action                 | Purpose |
|------------------------|---------|
| `updateTR(range)`      | Central method to change visible window; triggers rerender + optional sync |
| `scrollToRegion(r)`    | Ensure a labelled region is visible (may expand brush) |
| `setCursorAndSeek(t)`  | Update both `cursorTime` & `seekTo` (internal only) |
| `setCursor(t)`         | Update only `cursorTime` (no brush movement) |
| `_updateViewForTime(t)`| Convert time → pixels & adjust brush + cursor |

---

## 5. Adding new functionality
* **New attributes** – extend `TagAttrs` with MST `types.optional`, then read `item.<attr>` in views.
* **Styling** – prefer Tailwind utility classes or inline SVG attributes.
* **Sync events** – add to `SyncEvent` union and provide handlers.
* **Performance** – huge datasets are thinned with `sparseValues()`; thresholds controlled by `zoomStep`.

---

## 7. Glossary
| Term           | Meaning |
|---------------|---------|
| **Native units** | Raw numeric time values used in dataset (ms for dates, seconds/indices otherwise) |
| **Relative seconds** | Seconds offset from dataset start – format used in sync messages |
| **Brush** | D3 brush in Overview controlling visible window (`brushRange`) |
