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
| value.points    | <code>Array.&lt;Object&gt;</code> | list of point objects with coordinates, bezier curve information, and point relationships |
| value.closed    | <code>boolean</code>                            | whether the vector is closed (polygon) or open (polyline)                        |

### Example JSON

```json
{
    "original_width": 1920,
    "original_height": 1280,
    "image_rotation": 0,
    "value": {
        "points": [
            {
                "id": "point-1",
                "x": 2,
                "y": 2,
                "prevPointId": null,
                "isBezier": false
            },
            {
                "id": "point-2", 
                "x": 3.5,
                "y": 8.1,
                "prevPointId": "point-1",
                "isBezier": true,
                "controlPoint1": {"x": 2.5, "y": 5.0},
                "controlPoint2": {"x": 3.0, "y": 6.5}
            },
            {
                "id": "point-3",
                "x": 3.5,
                "y": 12.6,
                "prevPointId": "point-2",
                "isBezier": false
            }
        ],
        "closed": false,
        "vectorlabels": ["Road"]
    }
}
```
