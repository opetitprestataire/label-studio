// Utility to generate a sample task from a Label Studio XML config
export function generateSampleTaskFromConfig(config: string): {
  id: number;
  data: Record<string, any>;
  annotation?: any;
} {
  const parser = new DOMParser();
  let xml: Document;
  try {
    xml = parser.parseFromString(config, "text/xml");
  } catch (e) {
    return { id: 1, data: {} };
  }

  // Try to find a root-level comment with a JSON object
  let userData: Record<string, any> | undefined = undefined;
  let userAnnotation: any = undefined;
  const root = xml.documentElement;
  if (root) {
    for (let i = 0; i < root.childNodes.length; i++) {
      const node = root.childNodes[i];
      if (node.nodeType === Node.COMMENT_NODE) {
        try {
          const json = JSON.parse(node.nodeValue || "");
          if (typeof json === "object" && json !== null) {
            if (typeof json.data === "object" && json.data !== null) {
              userData = json.data;
            }
            if (typeof json.annotation === "object" && json.annotation !== null) {
              userAnnotation = json.annotation;
            }
            if (!userData && !userAnnotation) {
              userData = json;
            }
            if (userData || userAnnotation) {
              break;
            }
          }
        } catch (e) {
          // Ignore invalid JSON in comments
        }
      }
    }
  }

  // Wikimedia Commons public domain sample URLs
  const SAMPLE_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png";
  const SAMPLE_IMAGE2 = "https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg";
  const SAMPLE_AUDIO =
    "https://upload.wikimedia.org/wikipedia/commons/9/9d/Bach_-_Cello_Suite_no._1_in_G_major,_BWV_1007_-_I._Pr%C3%A9lude.ogg";
  const SAMPLE_VIDEO =
    "https://upload.wikimedia.org/wikipedia/commons/transcoded/8/88/Big_Buck_Bunny_alt.webm/Big_Buck_Bunny_alt.webm.360p.vp9.webm";
  const SAMPLE_PDF = "https://upload.wikimedia.org/wikipedia/commons/3/3f/Fronalpstock_big.pdf";
  const SAMPLE_WEBSITE = "https://www.wikipedia.org/";
  const SAMPLE_CSV = "https://people.sc.fsu.edu/~jburkardt/data/csv/airtravel.csv";
  const SAMPLE_OCR_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png";

  // Find all elements with a value or valueList attribute that starts with $
  const data: Record<string, any> = userData ? { ...userData } : {};
  const valueNodes = Array.from(xml.querySelectorAll("[value], [valueList]"));

  valueNodes.forEach((node) => {
    const valueAttr = node.getAttribute("value") || node.getAttribute("valueList");
    if (!valueAttr || !valueAttr.startsWith("$") || valueAttr.length < 2) return;
    const key = valueAttr.slice(1);
    if (data[key] !== undefined) return; // already set

    // Detect valueType="url" or valueList
    const valueType = node.getAttribute("valueType") || node.getAttribute("valuetype");
    const onlyUrls = valueType === "url";
    const isValueList = node.hasAttribute("valueList");
    const tag = node.tagName.toLowerCase();

    // Special handling for Paragraphs
    if (tag === "paragraphs") {
      const nameKey = node.getAttribute("nameKey") || node.getAttribute("namekey") || "author";
      const textKey = node.getAttribute("textKey") || node.getAttribute("textkey") || "text";
      data[key] = [
        { [nameKey]: "Alice", [textKey]: "Sample: Text #1" },
        { [nameKey]: "Bob", [textKey]: "Sample: Text #2" },
        { [nameKey]: "Alice", [textKey]: "Sample: Text #3" },
        { [nameKey]: "Bob", [textKey]: "Sample: Text #4" },
        { [nameKey]: "Alice", [textKey]: "Sample: Text #5" },
      ];
      return;
    }

    // Special handling for TimeSeries
    if (tag === "timeseries") {
      data[key] = [
        { time: 0, value: 1 },
        { time: 1, value: 2 },
      ];
      return;
    }

    // Special handling for List
    if (tag === "list") {
      data[key] = [
        {
          id: 1,
          title: "Sample: The Amazing World of Opossums",
          body: "Opossums are fascinating marsupials native to North America. They have prehensile tails, which help them to climb trees and navigate their surroundings with ease. Additionally, they are known for their unique defense mechanism, called 'playing possum,' where they mimic the appearance and smell of a dead animal to deter predators.",
        },
        {
          id: 2,
          title: "Sample: Opossums: Nature's Pest Control",
          body: "Opossums play a crucial role in controlling insect and rodent populations, as they consume a variety of pests like cockroaches, beetles, and mice. This makes them valuable allies for gardeners and homeowners, as they help to maintain a balanced ecosystem and reduce the need for chemical pest control methods.",
        },
        {
          id: 3,
          title: "Sample: Fun Fact: Opossums Are Immune to Snake Venom",
          body: "One surprising characteristic of opossums is their natural immunity to snake venom. They have a unique protein in their blood called 'Lethal Toxin-Neutralizing Factor' (LTNF), which neutralizes venom from a variety of snake species, including rattlesnakes and cottonmouths. This allows opossums to prey on snakes without fear of harm, further highlighting their important role in the ecosystem.",
        },
      ];
      return;
    }

    // Special handling for Table
    if (tag === "table") {
      data[key] = [{ "Card number": 18799210, "First name": "Sample", "Last name": "Text" }];
      return;
    }

    // Special handling for PDF
    if (tag === "pdf") {
      data[key] = SAMPLE_PDF;
      return;
    }

    // Special handling for Website/IFrame
    if (tag === "website" || tag === "iframe") {
      data[key] = SAMPLE_WEBSITE;
      return;
    }

    // Special handling for CSV
    if (tag === "csv") {
      data[key] = SAMPLE_CSV;
      return;
    }

    // Special handling for OCR
    if (tag === "ocr") {
      data[key] = SAMPLE_OCR_IMAGE;
      return;
    }

    // Special handling for longText, corefText, captioning, etc.
    if (tag === "longtext") {
      data[key] =
        "Sample: This is a sample text for long text task. It can be used for text classification, named entity recognition, etc.";
      return;
    }
    if (tag === "coreftext") {
      data[key] = "Sample: This is a sample text for coreference resolution and entity linking task.";
      return;
    }
    if (tag === "captioning") {
      data[key] = SAMPLE_IMAGE2;
      return;
    }

    // Special handling for pairText1, pairText2
    if (tag === "pairtext1") {
      data[key] = "Sample: Text #1";
      return;
    }
    if (tag === "pairtext2") {
      data[key] = "Sample: Text #2";
      return;
    }

    // Special handling for humanMachineDialogue
    if (tag === "humanmachinedialogue") {
      data[key] = [
        { author: "Human", text: "Sample: Hi, Robot!" },
        { author: "Robot", text: "Sample: Nice to meet you, human! Tell me what you want." },
        { author: "Human", text: "Sample: Order me a pizza from Golden Boy at Green Street " },
        { author: "Robot", text: "Sample: Done. When do you want to get the order?" },
        { author: "Human", text: "Sample: At 3am in the morning, please" },
      ];
      return;
    }

    // Main tag-based logic
    if (tag === "image" || tag === "hyperimage") {
      if (isValueList) {
        data[key] = [SAMPLE_IMAGE, SAMPLE_IMAGE2];
      } else {
        data[key] = SAMPLE_IMAGE;
      }
    } else if (tag === "audio" || tag === "audioplus") {
      data[key] = SAMPLE_AUDIO;
    } else if (tag === "video") {
      data[key] = SAMPLE_VIDEO;
    } else if (tag === "text" || tag === "hypertext") {
      data[key] = "Sample: Your text will go here.";
    } else if (tag === "choices" || tag.endsWith("labels")) {
      data[key] = ["DynamicChoice1", "DynamicChoice2", "DynamicChoice3"];
    } else if (tag === "taxonomy") {
      data[key] = [
        {
          value: "Category 1",
          children: [{ value: "Subcategory 1.1" }, { value: "Subcategory 1.2" }],
        },
        { value: "Category 2" },
      ];
    } else if (tag === "html") {
      data[key] = "<b>Sample HTML content</b>";
    } else if (tag === "rating") {
      data[key] = 4;
    } else if (tag === "number") {
      data[key] = 42;
    } else if (tag === "date" || tag === "datetime") {
      data[key] = new Date().toISOString();
    } else if (tag === "textarea") {
      data[key] = "Sample multiline text.";
    } else if (tag === "pairwise") {
      data[key] = [
        { id: 1, text: "Option A" },
        { id: 2, text: "Option B" },
      ];
    } else if (tag === "ranker") {
      data[key] = [
        { id: 1, text: "Ranked 1" },
        { id: 2, text: "Ranked 2" },
      ];
    } else if (tag === "repeater") {
      data[key] = [{ text: "Repeat 1" }, { text: "Repeat 2" }];
    } else {
      // Patch for valueType="url"
      if (onlyUrls) {
        if (tag === "text" || tag === "hypertext") {
          data[key] = SAMPLE_WEBSITE;
        } else if (tag === "image" || tag === "hyperimage") {
          data[key] = SAMPLE_IMAGE;
        } else if (tag === "audio") {
          data[key] = SAMPLE_AUDIO;
        } else if (tag === "video") {
          data[key] = SAMPLE_VIDEO;
        } else {
          data[key] = SAMPLE_WEBSITE;
        }
      } else {
        data[key] = `Sample value for ${key}`;
      }
    }
  });

  // Also handle dynamic label lists (e.g., <Labels value="$brands">)
  const dynamicLabelNodes = Array.from(
    xml.querySelectorAll(
      "labels, brushlabels, polygonlabels, keypointlabels, ellipselabels, rectanglelabels, paragraphlabels, hypertextlabels, timeserieslabels",
    ),
  );
  dynamicLabelNodes.forEach((node) => {
    const valueAttr = node.getAttribute("value");
    if (!valueAttr || !valueAttr.startsWith("$") || valueAttr.length < 2) return;
    const key = valueAttr.slice(1);
    if (data[key] === undefined) {
      data[key] = [
        { value: "DynamicLabel1", background: "#ff0000" },
        { value: "DynamicLabel2", background: "#0000ff" },
      ];
    }
  });

  // Return annotation if provided, else undefined
  return { id: 1, data, annotation: userAnnotation };
}
