---
title: Data Visualization with Plotly
type: plugins
category: Visualization
cat: visualization
order: 703
meta_title: Data Visualization with Plotly
meta_description: Display a Plotly chart to annotators
---

Use [Plotly](https://plotly.com/) to insert charts and graphs into your labeling interface. Charts are rendered in every annotation opened by a user. 

!!! note
    Plotly should be loaded first from CDN: https://cdn.plot.ly/plotly-2.26.0.min.js. For security reasons, it's better to use a hash for script integrity. 


![Screenshot of Plotly graph in Label Studio](/images/project/plotly.png)

## Plugin

```javascript
await LSI.import('https://cdn.plot.ly/plotly-2.26.0.min.js', 'sha384-xuh4dD2xC9BZ4qOrUrLt8psbgevXF2v+K+FrXxV4MlJHnWKgnaKoh74vd/6Ik8uF',);

let data = LSI.task.data;
if (window.Plotly && data) {
  Plotly.newPlot("plot", [data.plotly]);
}
```

**Related LSI instance methods:**

* [import(url, integrity)](/guide/scripts#import-url-integrity)


## Labeling config

You need to add `<View idAttr="plot"/>` into your config to render the Plotly chart. 

For example:

```xml
<View>
  <Text name="function" value="Is it increasing?" />
  <Choices name="slope" toName="function">
    <Choice value="Increasing" />
    <Choice value="Decreasing" />
    <Choice value="Non-monotonic" />
  </Choices>
  <View idAttr="plot"/>
</View>
```

**Related tags:**

* [View](/tags/view.html)
* [Text](/tags/text.html)
* [Choices](/tags/choices.html)
* [Choice](/tags/choice.html)

## Data

```json
[
  {
    "plotly": {
      "x": [1, 2, 3, 4],
      "y": [10, 15, 13, 17],
      "type": "scatter"
    }
  },
  {
    "plotly": {
      "x": [1, 2, 3, 4],
      "y": [16, 5, 11, 9],
      "type": "scatter"
    }
  }
]
```