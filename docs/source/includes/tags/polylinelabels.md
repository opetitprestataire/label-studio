### Parameters

| Param         | Type                                                            | Default                | Description                                             |
| ------------- | --------------------------------------------------------------- | ---------------------- | ------------------------------------------------------- |
| name          | <code>string</code>                                             |                        | Name of tag                                             |
| toName        | <code>string</code>                                             |                        | Name of image to label                                  |
| [choice]      | <code>single</code> \| <code>multiple</code>                    | <code>single</code>    | Configure whether you can select one or multiple labels |
| [maxUsages]   | <code>number</code>                                             |                        | Maximum number of times a label can be used per task    |
| [showInline]  | <code>boolean</code>                                            | <code>true</code>      | Show labels in the same visual line                     |
| [opacity]     | <code>number</code>                                             | <code>0.2</code>       | Opacity of polyline                                     |
| [fillColor]   | <code>string</code>                                             |                        | Polyline fill color in hexadecimal                      |
| [strokeColor] | <code>string</code>                                             |                        | Stroke color in hexadecimal                             |
| [strokeWidth] | <code>number</code>                                             | <code>1</code>         | Width of stroke                                         |
| [pointSize]   | <code>small</code> \| <code>medium</code> \| <code>large</code> | <code>medium</code>    | Size of polyline handle points                          |
| [pointStyle]  | <code>rectangle</code> \| <code>circle</code>                   | <code>rectangle</code> | Style of points                                         |
| [snap]        | <code>pixel</code> \| <code>none</code>                         | <code>none</code>      | Snap polyline to image pixels                           |
