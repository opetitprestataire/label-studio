---
title: Bulk Labeling for Text Spans
type: plugins
category: Workflow
cat: workflow
order: 703
meta_title: Bulk Labeling for Text Spans
meta_description: Assigns labels to all occurrences of the selected text at once
---

This script automatically applies the same label to all matching text spans. For example, if you apply the `PER` label to the text span `Smith`, this script will automatically find all instances of `Smith` in the text and apply the `PER` label to them. 

![Screenshot of bulk text labeling](/images/project/autolabeling.gif)

## Script

```javascript
/**
 * Automatically creates all the text regions containing all instances of the selected text.
 */

// It will be triggered when a text selection happens
LSI.on('entityCreate', region => {
  if (window.BULK_REGIONS) return;

  window.BULK_REGIONS = true;
  setTimeout(() => window.BULK_REGIONS = false, 1000);

  setTimeout(() => {
    // Find all the text regions matching the selection
    region.object._value.matchAll(new RegExp(region.text, "gi")).forEach(m => {
      if (m.index === region.startOffset) return;

      // Include them in the results as new selections
      Htx.annotationStore.selected.createResult(
        { text: region.text, start: "/span[1]/text()[1]", startOffset: m.index, end: "/span[1]/text()[1]", endOffset: m.index + region.text.length },
        { labels: [...region.labeling.value.labels] },
        region.labeling.from_name,
        region.object,
      )
    })
    Htx.annotationStore.selected.updateObjects()
  }, 100);
});
```

**Related LSI instance methods:**

* [on(eventName, handler)](/guide/scripts#on-eventName-handler)

**Related frontend events:**

* [entityCreate](/guide/frontend_reference#entityCreate)

## Labeling config

```xml
<View>
  <Labels name="label" toName="text">
    <Label value="PER" background="red"/>
    <Label value="ORG" background="darkorange"/>
    <Label value="LOC" background="orange"/>
    <Label value="MISC" background="green"/>
  </Labels>

  <Text name="text" value="$text"/>
</View>
```

**Related tags:**

* [View](/tags/view.html)
* [Text](/tags/text.html)
* [Labels](/tags/labels.html)