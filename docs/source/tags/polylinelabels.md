---
title: PolylineLabels
type: tags
order: 420
meta_title: Polyline Label Tag for Labeling Polylines in Images
meta_description: Customize Label Studio with the PolylineLabels tag and label polylines in images for semantic segmentation machine learning and data science projects.
---

The `PolylineLabels` tag is used to create labeled polylines. Use to apply
labels to polylines in semantic segmentation tasks.

Use with the following data types: image.

{% insertmd includes/tags/polylinelabels.md %}

### Example

Basic labeling configuration for polyline semantic segmentation of images

```html
<View>
    <Image name="image" value="$image" />
    <PolylineLabels name="labels" toName="image">
        <label value="Road" /> <label value="Boundary" />
    </PolylineLabels>
</View>
```
