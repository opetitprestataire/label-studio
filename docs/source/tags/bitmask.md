---
title: Bitmask
type: tags
order: 401
meta_title: Bitmask Tag for Image Segmentation Labeling
meta_description: Customize Label Studio with bitmask pixel-wise tags for image segmentation labeling for machine learning and data science projects.
---

The `Bitmask` tag is used for pixel-wise image segmentation tasks where you want to apply a mask or use a brush to draw a region on the image.

Use with the following data types: image.

{% insertmd includes/tags/bitmask.md %}

### Example

Basic image segmentation labeling configuration:

```xml
<View>
  <Bitmask name="bitmask" toName="image" />
  <Labels name="labels" toName="image">
    <Label value="Person" />
    <Label value="Animal" />
  </Labels>
  <Image name="image" value="$image" />
</View>
```
