---
title: BitmaskLabels
type: tags
order: 402
meta_title: Bitmask Label Tag for Pixel-Wise Image Segmentation Labeling
meta_description: Customize Label Studio with bitmask pixel-wise label tags for image segmentation labeling for machine learning and data science projects.
---

The `BitmaskLabels` tag for pixel-wise image segmentation tasks is used in the area where you want to apply a mask or use a brush to draw a region on the image.

Use with the following data types: image.

{% insertmd includes/tags/bitmasklabels.md %}

### Example

Basic image segmentation labeling configuration

```html
<View>
  <BitmaskLabels name="labels" toName="image">
    <Label value="Person" />
    <Label value="Animal" />
  </BitmaskLabels>
  <Image name="image" value="$image" />
</View>
```
