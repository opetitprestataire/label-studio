### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [height] | <code>string</code> | <code>"200"</code> | Height of the multi-channel visualization |
| [showAxis] | <code>boolean</code> | <code>true</code> | Whether to show both axes |
| [showYAxis] | <code>boolean</code> | <code>true</code> | Whether to show the y-axis |
| [fixedScale] | <code>boolean</code> | | Whether to use a fixed scale for all channels. If not set, inherits from parent TimeSeries tag |

### Children

The MultiChannel tag can contain one or more [Channel](/tags/timeseries.html#channel) tags, each representing a data channel to be displayed in the visualization. 