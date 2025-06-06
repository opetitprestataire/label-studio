---
title: MultiChannel
type: tags
order: 310
meta_title: MultiChannel Tag for Time Series Data
meta_description: Customize Label Studio with the MultiChannel tag to group and visualize multiple channels in time series data for machine learning and data science projects.
---

The `MultiChannel` tag is used to group multiple channels together in a time series visualization. Use this tag within a `TimeSeries` tag to organize and display multiple data channels in a single view.

{% insertmd includes/tags/multichannel.md %}

### Example

Labeling configuration for time series data with multiple channels grouped together:

```html
<View>
  <TimeSeries name="ts" value="$timeseries" valuetype="json"
              timeColumn="time"
              timeFormat="%Y-%m-%d %H:%M:%S.%f"
              timeDisplayFormat="%Y-%m-%d"
              overviewChannels="velocity">
    <MultiChannel>
      <Channel column="velocity"
               units="miles/h"
               displayFormat=",.1f"
               legend="Velocity"/>

      <Channel column="acceleration"
               units="miles/h^2"
               displayFormat=",.1f"
               legend="Acceleration"/>
    </MultiChannel>
  </TimeSeries>
  <TimeSeriesLabels name="label" toName="ts">
    <Label value="Run" background="red"/>
    <Label value="Walk" background="green"/>
  </TimeSeriesLabels>
</View>
```

## Related tags

- [TimeSeries](/tags/timeseries.html)
- [Channel](/tags/timeseries.html#channel)
- [TimeSeriesLabels](/tags/timeserieslabels.html) 
