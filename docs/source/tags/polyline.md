---
title: Polyline
type: tags
order: 419
meta_title: Polyline Tag for Adding Polylines to Images
meta_description: Customize Label Studio with the Polyline tag by adding polylines to images for segmentation machine learning and data science projects.
---

The `Polyline` tag is used to add polylines to an image without selecting a
label. This can be useful when you have only one label to assign to the
polyline. Use for image segmentation tasks.

Use with the following data types: image.

{% insertmd includes/tags/polyline.md %}

### Example

Basic labeling configuration for polyline image segmentation

```html
<View>
    <Polyline name="line-1" toName="img-1" />
    <Image name="img-1" value="$img" />
</View>
```
