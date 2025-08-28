### Parameters

| Param               | Type                                                            | Default                | Description                                             |
| ------------------- | --------------------------------------------------------------- | ---------------------- | ------------------------------------------------------- |
| name                | <code>string</code>                                             |                        | Name of tag                                             |
| toName              | <code>string</code>                                             |                        | Name of image to label                                  |
| [choice]            | <code>single</code> \| <code>multiple</code>                    | <code>single</code>    | Configure whether you can select one or multiple labels |
| [maxUsages]         | <code>number</code>                                             |                        | Maximum number of times a label can be used per task    |
| [showInline]        | <code>boolean</code>                                            | <code>true</code>      | Show labels in the same visual line                     |
| [opacity]           | <code>number</code>                                             | <code>0.2</code>       | Opacity of vector                                       |
| [fillColor]         | <code>string</code>                                             |                        | Vector fill color in hexadecimal                        |
| [strokeColor]       | <code>string</code>                                             |                        | Stroke color in hexadecimal                             |
| [strokeWidth]       | <code>number</code>                                             | <code>1</code>         | Width of stroke                                         |
| [pointSize]         | <code>small</code> \| <code>medium</code> \| <code>large</code> | <code>medium</code>    | Size of vector handle points                            |
| [pointStyle]        | <code>rectangle</code> \| <code>circle</code>                   | <code>rectangle</code> | Style of points                                         |
| [snap]              | <code>pixel</code> \| <code>none</code>                         | <code>none</code>      | Snap vector to image pixels                             |
| [closable]          | <code>boolean</code>                                            | <code>false</code>     | Allow closed shapes                                     |
| [curves]            | <code>boolean</code>                                            | <code>false</code>     | Allow Bezier curves                                     |
| [skeleton]          | <code>boolean</code>                                            | <code>false</code>     | Enables skeleton mode to allow branch paths             |
| [minPoints]         | <code>number</code> \| <code>none</code>                        | <code>none</code>      | Minimum allowed number of points                        |
| [maxPoints]         | <code>number</code> \| <code>none</code>                        | <code>none</code>      | Maximum allowed number of points                        |
| [constrainToBounds] | <code>boolean</code>                                            | <code>false</code>     | Whether to keep shapes inside image bounds              |
| [pointSizeEnabled]  | <code>number</code>                                             | <code>5</code>         | Size of a point in pixels when shape is selected        |
| [pointSizeDisabled] | <code>number</code>                                             | <code>3</code>         | Size of a point in pixels when shape is not selected    |

### Result parameters

| Name            | Type                                            | Description                                                                      |
| --------------- | ----------------------------------------------- | -------------------------------------------------------------------------------- |
| original_width  | <code>number</code>                             | width of the original image (px)                                                 |
| original_height | <code>number</code>                             | height of the original image (px)                                                |
| image_rotation  | <code>number</code>                             | rotation degree of the image (deg)                                               |
| value           | <code>Object</code>                             |                                                                                  |
| value.points    | <code>Array.&lt;Array.&lt;number&gt;&gt;</code> | list of (x, y) coordinates of the vector by percentage of the image size (0-100) |
| value.closed    | <code>boolean</code>                            | whether the vector is closed (polygon) or open (polyline)                        |
| value.curves    | <code>Array.&lt;Object&gt;</code>               | bezier curve control points (if curves are enabled)                              |

### Example JSON

```json
{
    "original_width": 1920,
    "original_height": 1280,
    "image_rotation": 0,
    "value": {
        "points": [[2, 2], [3.5, 8.1], [3.5, 12.6]],
        "closed": false,
        "curves": [],
        "vectorlabels": ["Road"]
    }
}
```
