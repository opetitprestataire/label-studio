---
title: Members dashboard
short: Members dashboard
tier: enterprise
type: guide
order: 0
order_enterprise: 70
meta_title: Members dashboard
meta_description: Use the Members page to find information about annotator progress within the context of a project. 
section: "Project Management"
parent: "dashboards"
parent_enterprise: "dashboards"
date: 2024-09-20 09:42:48
---

The Members page in Label Studio Enterprise provides information about the members within a project and annotator performance within the context of the project. 

This is different than the Annotator dashboard. The Annotator dashboard focuses on an annotator's productivity and performance, while the Members dashboard provides a comparison between annotators within a project and focuses more on project stats task agreement and acceptance. 

Click **Manage Memebers** in the upper right to add and remove project members. This is similar to the **Members** page in the project settings. For more information, see [Project settings - Members](project_settings_lse#Members).


## Annotator performance

This table provides performance information about all project members. 

Click any column header to sort the information as necessary. 

<table>
<thead>
    <tr>
      <th>Field</th>
      <th>Description</th>
    </tr>
</thead>
<tr>
<td>

**Agreement**
</td>
<td>

This is the total agreement for the annotator with all other annotators.

For each task that multiple annotators have labeled, the [agreement score](stats) between each pair of annotators is computed using the selected agreement metric (e.g., exact matching, intersection over union). Then for each annotator, the average of their agreement scores with all other annotators is calculated. This involves aggregating the agreement scores from all tasks they've worked on with others and computing the mean.

</td>
</tr>
<tr>
<td>

**Finished**
</td>
<td>

The number of tasks the annotator has submitted. 

</td>
</tr>
<tr>
<td>

**Skipped**
</td>
<td>

The number of tasks the annotator has skipped. 

</td>
</tr>
<tr>
<td>

**Accepted**
</td>
<td>

The number of tasks that the annotator has completed and which have been accepted by a reviewer. 

</td>
</tr>
<tr>
<td>

**Rejected**
</td>
<td>

The number of tasks that the annotator has completed and which have been rejected by a reviewer. 

</td>
</tr>
<tr>
<td>

**Review Score**
</td>
<td>

The current accepted/rejected state of annotations.

For example, if the annotator completed 5 annotations and 4 of them have been accepted, their Review Score would be 80%. 

</td>
</tr>
<tr>
<td>

**Performance score**
</td>
<td>

x

</td>
</tr>
<tr>
<td>

**Annotation progress**
</td>
<td>

x

</td>
</tr>
<tr>
<td>

**Time**
</td>
<td>

Use the drop-down menu to select a metric:

* Mean time
* Median time
* Total time

</td>
</tr>
<tr>
<td>

**Ground truth**
</td>
<td>

Percentage of annotations that have been marked as a ground truth. 

</td>
</tr>
<tr>
<tr>
<td>

**Predictions**
</td>
<td>

Percentage of annotations that included a prediction/pre-annotation.

</td>
</tr>
<tr>
</table>


## Annotator agreement matrix