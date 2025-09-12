<img width="2880" height="417" alt="Label Studio Readme Header" src="https://github.com/user-attachments/assets/d0f316fe-c219-4bd2-bcb7-3e91b7155a2b" /><br>

![GitHub](https://img.shields.io/github/license/heartexlabs/label-studio?logo=heartex) ![label-studio:build](https://github.com/HumanSignal/label-studio/workflows/label-studio:build/badge.svg) ![GitHub release](https://img.shields.io/github/v/release/heartexlabs/label-studio?include_prereleases)

[Quick Start](https://labelstud.io/guide/quick_start) • [Docs](https://labelstud.io/guide/) • [Forums](https://community.labelstud.io/) • [Join Slack Community <img src="https://app.heartex.ai/docs/images/slack-mini.png" width="18px"/>](https://slack.labelstud.io/?source=github-1)

Label Studio is a highly-flexible, open-source platform you can use to evaluate AI models, generate ground truth data, and manage human-in-the-loop workflows. Label for any data type—audio, video, images, text, time series, and multi-domain. Export in formats for any model with the API or SDK.

Get started today by deploying Label Studio locally or [sign up for a free Starter Cloud trial](https://app.humansignal.com/user/cloud-trial?offer=d9a5).

Visit the [Label Studio playground](https://labelstud.io/playground/) to preview how it works. Find a more complete platform overview on the [labelstud.io](http://labelstud.io) website.

<img width="2400" height="1214" alt="Label Studio Product" src="https://github.com/user-attachments/assets/7397ac4b-524e-4a16-8617-7b9411231ec0" />

## Quick Start

If you have the Python package installer (pip), you can run these commands in your terminal to start Label Studio locally:

`pip install label-studio`

`label-studio start` 

Open Label Studio at: http://localhost:8080

Use your email address and create a password to sign in. Follow the prompts to create and name your project, import data, and configure your labeling setup. 

[Read the full Quick Start guide](https://labelstud.io/guide/quick_start) in the docs.

## Install & Hosting Options

You can install Label Studio locally and host it on-premises or in the cloud. Install Label Studio in a clean Python environment. In addition to pip, you can use any of the following install options:

➤ Install with docker

➤ Install on Ubuntu

➤ Install from source (git clone)

➤ Install with Anaconda

### Hosting
For advanced features and workflows, you can host Label Studio on these plans:
- Starter Cloud: Quality review workflows and automations for small teams and projects
- Enterprise: Advanced workflows, automation, and annotator performance dashboards for teams that need the highest levels of security and scalability

[Compare plans](https://humansignal.com/pricing/)

## Features and Templates

When you use Label Studio, you can:
- Fine-tune and evaluate LLMs
- Generate pre-labels with AI
- Label any data type: audio, video, image, text, timeseries, and multi-domain
- Import from files or from cloud storage in Amazon AWS S3, Google Cloud Storage, or JSON, CSV, TSV, RAR, and ZIP archives
- Integrate with machine learning models so that you can visualize and compare predictions from different models and perform pre-labeling.
- Embed it in your data pipeline REST API makes it easy to make it a part of your pipeline
- Manage labeling workflows for multiple users where each annotation is tied to an account
- Configure custom labeling interfaces and labeling formats

Label Studio includes templates for the following:

<details>
<summary>Computer Vision</summary>
 <ul>
  <li>Semantic Segmentation with Polygons</li>
  <li>Semantic Segmentation with Masks</li>
  <li>Object Detection with Bounding Boxes</li>
  <li>Keypoint Labeling</li>
  <li>Image Captioning</li>
  <li>Optical Character Recognition (OCR)</li>
  <li>Image Classification</li>
  <li>Visual Question Answering</li>
  <li>Object Detection with Ellipses</li>
  <li>Multi-Image Classification</li>
  <li>Inventory Tracking</li>
  <li>Visual Genome</li>
 </ul>
</details>

<details>
<summary>Natural Language Processing</summary>
 <ul>
  <li>Question Answering</li>
  <li>Sentiment Analysis Text Classification</li>
  <li>Named Entity Recognition</li>
  <li>Taxonomy</li>
  <li>Relation Extraction</li>
  <li>Text Summarization</li>
  <li>Machine Translation</li>
 </ul>
</details>

<details>
<summary>Audio/Speech Processing</summary>
<ul>
  <li>Automatic Speech Recognition</li>
  <li>Sound Event Detection</li>
  <li>Automatic Speech Recognition using Segments</li>
  <li>Signal Quality Detection</li>
  <li>Speaker Diarization</li>
  <li>Intent Classification</li>
  <li>Audio Classification</li>
 <li>Contextual Scrolling</li>
 <li>Audio Classification with Segments</li>
 <li>Voice Activity Detection</li>
 </ul>
</details>

<details>
<summary>Conversational AI</summary>
<ul>
  <li>Response Generation</li>
  <li>Response Selection</li>
  <li>Coreference Resolution and Entity Linking</li>
  <li>Slot Filling and Intent Classification</li>
 </ul>
</details>

<details>
<summary>Ranking & Scoring</summary>
<ul>
  <li>Pairwise Regression</li>
  <li>Document Retrieval</li>
  <li>Pairwise Classification</li>
  <li>Content-based Image Retrieval</li>
 <li>Website Rating</li>
 <li>ASR Hypotheses Selection</li>
 <li>Text-to-Image Generation</li>
 <li>Search Page Ranking</li>
 <li>Visual Ranker</li>
 </ul>
</details>

<details>
<summary>Structured Data Parsing</summary>
<ul>
  <li>Freeform Metadata</li>
  <li>PDF Classification</li>
  <li>Tabular Data</li>
  <li>HTML Entity Recognition</li>
 <li>HTML Classification</li>
 </ul>
</details>

<details>
<summary>Time Series Analysis</summary>
<ul>
  <li>Time Series Forecasting</li>
  <li>Change Point Detection</li>
  <li>Activity Recognition</li>
  <li>Signal Quality</li>
 <li>Outliers and Anomaly Detection</li>
 <li>Time Series Classification</li>
 <li>Time Series Labeling</li>
 </ul>
</details>

<details>
<summary>Videos</summary>
<ul>
  <li>Video Classification</li>
  <li>Video Timeline Segmentation</li>
  <li>Video Object Detection and Tracking</li>
 </ul>
</details>

<details>
<summary>LLM Fine-tuning</summary>
<ul>
  <li>Supervised LLM Fine-Tuning</li>
  <li>Human Preferences collection for RLHF</li>
  <li>RAG Retrieval</li>
 </ul>
</details>

<details>
<summary>LLM Evaluations</summary>
<ul>
  <li>LLM Response Moderation</li>
  <li>LLM Response Grading</li>
  <li>Side-by-Side LLM Output Comparison</li>
 <li>Evaluate RAG with Human Feedback</li>
 <li>Evaluate RAG with Ragas</li>
 </ul>
</details>

[Visit the Template Gallery](https://labelstud.io/templates) for a complete list.

## Integrations

Label Studio fits into your machine learning workflow and integrates with the latest AI models.

| Feature | Integrations |
| :-------- | :------- |
| LLM Models (Starter Cloud and Enterprise) | OpenAI, Azure OpenAI, Google Gemini, Anthropic, and custom LLM endpoints |
| Machine Learning Backend | Baal, EasyOCR, Flair, GLiNER, Grounding Dino, Hugging Face, Langchain, Mistral AI, Nvidia NeMo, OpenMMLab, PyTorch, Scikit Learn, Segment Anything Model (SAM and SAM 2), SpaCy, TensorFlow, Tesseract, watsonX, Ultralytics Yolo <br> [Full list and more details](https://github.com/HumanSignal/label-studio-ml-backend) |
| Infrastructure    | Docker, Kubernetes, Terraform |
| Platform    | Amazon Sagemaker, Galileo, Lightly.ai, Modzy, Unstructured.io, ZenML |
| Storage    | Azure Blob Storage, Google Cloud, S3, Pachyderm |
| Databases    | Redis, PostGres, SQLite |

Visit the [Integrations Directory](https://labelstud.io/integrations/) to learn more.

## Python Version Support

Label Studio supports Python 3.9 through 3.13. Using an incompatible Python version can lead to installation errors.

## Contributions

Label Studio 🩷 Open Source and we welcome community contributions! Please read through the [Contribution Guide](https://github.com/HumanSignal/label-studio/blob/develop/CONTRIBUTING.md) and reference [GitHub issues](https://github.com/HumanSignal/label-studio/issues) for bugs and feature requests.

## Community

[Join the community on Slack](https://slack.labelstud.io/?source=github-1) to interact with the core engineers and 7,000+ data science pros who use Label Studio! [Subscribe to the weekly community newsletter](https://labelstud.io/community/) to stay in the loop with news, best practices articles, and new feature announcements.

## Citation

Include a citation for Label Studio in the **References** section of your articles:

```tex
@misc{Label Studio,
  title={{Label Studio}: Data labeling software},
  url={https://github.com/HumanSignal/label-studio},
  note={Open source software available from https://github.com/HumanSignal/label-studio},
  author={
    Maxim Tkachenko and
    Mikhail Malyuk and
    Andrey Holmanyuk and
    Nikolai Liubimov},
  year={2020-2025},
}
```

## License

This software is licensed under the [Apache 2.0 LICENSE](/LICENSE) © [Heartex](https://www.heartex.com/). 2020-2025

<img alt="heidi" src="https://github.com/user-attachments/assets/9c85e627-9c7e-4ac1-9c82-f799dcd9a44e" title="Hey everyone!" width="250" />
