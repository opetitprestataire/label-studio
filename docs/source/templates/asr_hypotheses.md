---
title: ASR Hypotheses Selection
type: templates
category: Ranking and Scoring
cat: ranking-and-scoring
order: 551
meta_title: Choose the most accurate Automatic Speech Recognition (ASR) hypotheses
meta_description: 
---

When you work with automatic speech transcribers, you are provided with several transcription hypotheses. Now, you can select one of the variations from the list of transcription hypotheses.
<br/>

<img src="/images/templates/asr-hypotheses.png" alt="ASR Hypotheses Selection example" class="gif-border" width="552px" height="408px" />

## Labeling Configuration

```xml
<View>
  <Audio name="audio" value="$audio"/>
  <Choices name="transcriptions" toName="audio" value="$transcriptions" selection="highlight"/>
</View>
```

## Example data

```json
{
  "data": {
    "audio": "https://htx-pub.s3.amazonaws.com/datasets/audio/f2btrop6.0.wav",
    "transcriptions": [{
      "style": "padding-left: 5px;",
      "value": "potrostith points out that if school based clinics were established parental permission would be required for students to receive each service offered"
    }, {
      "style": "padding-left: 5px;",
      "value": "potrostith points out that if school-based clinics were established parental permission would be required for students to receive each service offered"
    }, {
      "style": "padding-left: 5px;",
      "value": "purporting points out that if school based clinics were established parental permission would be required for students to receive each service offered"
    }, {
      "style": "padding-left: 5px;",
      "value": "pork roasted points out that if school based clinics were establish parental permission would be required for students to receive each service offered"
    }, {
      "style": "padding-left: 5px;",
      "value": "purpose it points out that if school based clinics war establish parental permission would be required for students to receive each service offered"
    }]
  }
}
```
