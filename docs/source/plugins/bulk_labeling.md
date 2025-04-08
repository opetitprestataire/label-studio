---
title: Bulk Labeling for Text Spans
type: plugins
category: Workflow
cat: workflow
order: 703
meta_title: Bulk Labeling for Text Spans
meta_description: Assigns labels to all occurrences of the selected text at once
---

This plugin automatically applies the same label to all matching text spans. For example, if you apply the `PER` label to the text span `Smith`, this plugin will automatically find all instances of `Smith` in the text and apply the `PER` label to them. 

![Screenshot of bulk text labeling](/images/project/autolabeling.gif)

## Plugin

```javascript
/**
 * Automatically creates all the text regions containing all instances of the selected text.
 */

// It will be triggered when a text selection happens
LSI.on('entityCreate', region => {
  if (window.BULK_REGIONS) return;
  window.BULK_REGIONS = true;

  const regionTextLength = region.text.length;
  const regex = new RegExp(region.text, "gi");
  const matches = Array.from(region.object._value.matchAll(regex));

  setTimeout(() => window.BULK_REGIONS = false, 1000);

  if (matches.length > 1) {
    const results = matches.reduce((acc, m) => {
      if (m.index !== region.startOffset) {
        acc.push({
          id: String(Htx.annotationStore.selected.results.length + acc.length + 1),
          from_name: region.labeling.from_name.name,
          to_name: region.object.name,
          type: "labels",
          value: {
            text: region.text,
            start: "/span[1]/text()[1]",
            startOffset: m.index,
            end: "/span[1]/text()[1]",
            endOffset: m.index + regionTextLength,
            labels: [...region.labeling.value.labels], 
          },
          origin: "manual",
        
        });
      }
      return acc;
    }, []);

    if (results.length > 0) {
      Htx.annotationStore.selected.deserializeResults(results);
      Htx.annotationStore.selected.updateObjects();
    }
  }
});
```

**Related LSI instance methods:**

* [on(eventName, handler)](/guide/scripts#on-eventName-handler)

**Related frontend events:**

* [entityCreate](/guide/frontend_reference#entityCreate)

## Labeling config

This is a basic NER labeling config. 

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

## Data

```json
[
   {
      "data": {
         "text": "Opossums are nocturnal animals that are often seen scavenging for food at night. They have a prehensile tail that helps them climb trees and navigate their environment."
      }
   },
   {
      "data": {
         "text": "Opossums are known for their ability to play dead when threatened, a behavior known as 'playing possum'. This act can deter predators and give the opossum a chance to escape."
      }
   },
   {
      "data": {
         "text": "Opossums are marsupials, meaning they carry and nurse their young in a pouch. Baby opossums, called joeys, stay in the pouch for about two months after birth."
      }
   }
]
```