import { render, waitFor } from "@testing-library/react";
import { PlaygroundApp } from "../PlaygroundApp";
import { useAtom, useSetAtom } from "jotai";
import { configAtom, errorAtom, loadingAtom } from "../../../atoms/configAtoms";

// Mock CodeEditor and allow it to be spied on
jest.mock("../../EditorPanel", () => ({
  EditorPanel: () => <div>EditorPanel</div>,
}));
jest.mock("../../PreviewPanel", () => ({
  PreviewPanel: () => <div>PreviewPanel</div>,
}));
jest.mock("@humansignal/ui", () => ({
  ThemeToggle: () => <div>ThemeToggle</div>,
}));

// Mock the atoms
jest.mock("jotai", () => {
  const originalModule = jest.requireActual("jotai");
  return {
    ...originalModule,
    useAtom: jest.fn(),
    useSetAtom: jest.fn(),
  };
});

// Mock the fetch function
global.fetch = jest.fn();

function removeAllSpaceLikeCharacters(str: string): string {
  return str
    .replace(/\s+/g, "") // Replace all whitespace characters with empty string
    .replace(/·/g, ""); // Remove the special middle dot character
}

describe("PlaygroundApp", () => {
  const mockSetConfig = jest.fn();
  const mockSetError = jest.fn();
  const mockSetLoading = jest.fn();
  const mockSetInterfaces = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAtom as jest.Mock).mockImplementation((atom) => {
      if (atom === configAtom) return ["", mockSetConfig];
      if (atom === errorAtom) return ["", mockSetError];
      if (atom === loadingAtom) return [false, mockSetLoading];
      return [null, mockSetInterfaces];
    });
    (useSetAtom as jest.Mock).mockImplementation((atom) => {
      if (atom === configAtom) return (c: string) => mockSetConfig(removeAllSpaceLikeCharacters(c));
      if (atom === errorAtom) return mockSetError;
      if (atom === loadingAtom) return mockSetLoading;
      return mockSetInterfaces;
    });

    // Reset window.location
    Object.defineProperty(window, "location", {
      value: new URL("http://localhost"),
      writable: true,
      configurable: true,
    });
  });

  it("should handle config parameter in URL", async () => {
    // Mock URL with config parameter
    const mockConfig = '<View><Text name="text" value="$text"/></View>';
    const encodedConfig = encodeURIComponent(mockConfig.replace(/\n/g, "<br>"));
    Object.defineProperty(window, "location", {
      value: new URL(`http://localhost?config=${encodedConfig}`),
      writable: true,
      configurable: true,
    });

    render(<PlaygroundApp />);

    await waitFor(() => {
      expect(mockSetConfig).toHaveBeenCalledWith(removeAllSpaceLikeCharacters(mockConfig));
      expect(mockSetError).not.toHaveBeenCalled();
    });
  });

  it("should handle invalid config parameter", async () => {
    // Mock URL with invalid config parameter that will cause decodeURIComponent to fail
    Object.defineProperty(window, "location", {
      value: new URL("http://localhost?config=invalid%2"), // %2 is an incomplete percent encoding
      writable: true,
      configurable: true,
    });

    render(<PlaygroundApp />);

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith(
        "Failed to decode config. Are you sure it's a valid urlencoded string?",
      );
    });
  });

  it("should handle configUrl parameter", async () => {
    // Mock URL with configUrl parameter
    const mockConfig = '<View><Text name="text" value="$text"/></View>';
    Object.defineProperty(window, "location", {
      value: new URL("http://localhost?configUrl=http://example.com/config.xml"),
      writable: true,
      configurable: true,
    });

    // Mock successful fetch response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockConfig),
    });

    render(<PlaygroundApp />);

    await waitFor(() => {
      expect(mockSetLoading).toHaveBeenCalledWith(true);
    });

    await waitFor(() => {
      expect(mockSetConfig).toHaveBeenCalledWith(removeAllSpaceLikeCharacters(mockConfig));
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  it("should handle failed configUrl fetch", async () => {
    // Mock URL with configUrl parameter
    Object.defineProperty(window, "location", {
      value: new URL("http://localhost?configUrl=http://example.com/config.xml"),
      writable: true,
      configurable: true,
    });

    // Mock failed fetch response
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Failed to fetch"));

    render(<PlaygroundApp />);

    await waitFor(() => {
      expect(mockSetLoading).toHaveBeenCalledWith(true);
    });

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith("Failed to fetch config from URL.");
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  it("should handle non-200 configUrl response", async () => {
    // Mock URL with configUrl parameter
    Object.defineProperty(window, "location", {
      value: new URL("http://localhost?configUrl=http://example.com/config.xml"),
      writable: true,
      configurable: true,
    });

    // Mock non-200 fetch response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    render(<PlaygroundApp />);

    await waitFor(() => {
      expect(mockSetLoading).toHaveBeenCalledWith(true);
    });

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith("Failed to fetch config from URL.");
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  it("should handle interfaces parameter", async () => {
    // Mock URL with interfaces parameter
    Object.defineProperty(window, "location", {
      value: new URL("http://localhost?interfaces=skip,submit"),
      writable: true,
      configurable: true,
    });

    render(<PlaygroundApp />);

    await waitFor(() => {
      expect(mockSetInterfaces).toHaveBeenCalledWith(["skip", "submit"]);
    });
  });

  describe("PlaygroundApp: Loads configs from v1 URL", () => {
    it.each([
      {
        name: "Advanced config templates: Audio regions labeling",
        url: "http://localhost/?config=%3CView%20style%3D%22display%3A%20flex%3B%22%3E%3Cbr%3E%20%20%3CView%20style%3D%22width%3A%20100%25%3B%20margin-left%3A%201em%3B%22%3E%3Cbr%3E%20%20%20%20%3CLabels%20name%3D%22label%22%20toName%3D%22audio%22%3E%3Cbr%3E%20%20%20%20%20%20%3CLabel%20value%3D%22Speaker%201%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CLabel%20value%3D%22Speaker%202%22%20%2F%3E%3Cbr%3E%20%20%20%20%3C%2FLabels%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3CAudio%20name%3D%22audio%22%20value%3D%22%24audio%22%2F%3E%3Cbr%3E%20%20%20%20%3CView%20style%3D%22padding%3A%2010px%2020px%3B%20margin-top%3A%202em%3B%20box-shadow%3A%202px%202px%208px%20%23AAA%3B%20margin-right%3A%201em%3B%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20visibleWhen%3D%22region-selected%22%3E%3Cbr%3E%20%20%20%20%20%20%3CHeader%20value%3D%22Provide%20Transcription%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CTextArea%20name%3D%22transcription%22%20toName%3D%22audio%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20rows%3D%222%22%20editable%3D%22true%22%20perRegion%3D%22true%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20required%3D%22true%22%20%2F%3E%3Cbr%3E%20%20%20%20%3C%2FView%3E%3Cbr%3E%20%20%20%20%3CView%20style%3D%22padding%3A%2010px%2020px%3B%20margin-top%3A%202em%3B%20box-shadow%3A%202px%202px%208px%20%23AAA%3B%20margin-right%3A%201em%3B%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20visibleWhen%3D%22region-selected%22%3E%3Cbr%3E%20%20%20%20%20%20%3CHeader%20value%3D%22Select%20Gender%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CChoices%20name%3D%22gender%22%20toName%3D%22audio%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20perRegion%3D%22true%22%20required%3D%22true%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChoice%20value%3D%22Male%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChoice%20value%3D%22Female%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3C%2FChoices%3E%3Cbr%3E%20%20%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3CView%20style%3D%22width%3A%20100%25%3B%20display%3A%20block%22%3E%3Cbr%3E%20%20%20%20%20%20%3CHeader%20value%3D%22Select%20region%20after%20creation%20to%20go%20next%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3C%2FView%3E",
        expectedConfig: `<View style=\"display: flex;\">
      <View style=\"width: 100%; margin-left: 1em;\">
        <Labels name=\"label\" toName=\"audio\">
          <Label value=\"Speaker 1\" />
          <Label value=\"Speaker 2\" />
        </Labels>·
        <Audio name=\"audio\" value=\"$audio\"/>
        <View style=\"padding: 10px 20px; margin-top: 2em; box-shadow: 2px 2px 8px #AAA; margin-right: 1em;\"
              visibleWhen=\"region-selected\">
          <Header value=\"Provide Transcription\" />
          <TextArea name=\"transcription\" toName=\"audio\"
                    rows=\"2\" editable=\"true\" perRegion=\"true\"
                    required=\"true\" />
        </View>
        <View style=\"padding: 10px 20px; margin-top: 2em; box-shadow: 2px 2px 8px #AAA; margin-right: 1em;\"
              visibleWhen=\"region-selected\">
          <Header value=\"Select Gender\" />
          <Choices name=\"gender\" toName=\"audio\"
                   perRegion=\"true\" required=\"true\">
            <Choice value=\"Male\" />
            <Choice value=\"Female\" />
          </Choices>
        </View>·
        <View style=\"width: 100%; display: block\">
          <Header value=\"Select region after creation to go next\"/>
        </View>·
      </View>
    </View>`,
      },
      {
        name: "Advanced config templates: Image bboxes labeling",
        url: "http://localhost/?config=%3CView%3E%3Cbr%3E%20%20%3CImage%20name%3D%22image%22%20value%3D%22%24image%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%3CRectangleLabels%20name%3D%22label%22%20toName%3D%22image%22%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Airplane%22%20background%3D%22green%22%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Car%22%20background%3D%22blue%22%2F%3E%3Cbr%3E%20%20%3C%2FRectangleLabels%3E%3Cbr%3E%3Cbr%3E%20%20%3CView%20visibleWhen%3D%22region-selected%22%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Describe%20object%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CTextArea%20name%3D%22answer%22%20toName%3D%22image%22%20editable%3D%22true%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20perRegion%3D%22true%22%20required%3D%22true%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CChoices%20name%3D%22choices%22%20toName%3D%22image%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20perRegion%3D%22true%22%3E%3Cbr%3E%20%20%20%20%20%20%3CChoice%20value%3D%22Correct%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CChoice%20value%3D%22Broken%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FChoices%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%3CView%20style%3D%22width%3A%20100%25%3B%20display%3A%20block%22%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Select%20bbox%20after%20creation%20to%20go%20next%22%2F%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Image name=\"image\" value=\"$image\"/>·
      <RectangleLabels name=\"label\" toName=\"image\">
        <Label value=\"Airplane\" background=\"green\"/>
        <Label value=\"Car\" background=\"blue\"/>
      </RectangleLabels>·
      <View visibleWhen=\"region-selected\">
        <Header value=\"Describe object\" />
        <TextArea name=\"answer\" toName=\"image\" editable=\"true\"
                  perRegion=\"true\" required=\"true\" />
        <Choices name=\"choices\" toName=\"image\"
                 perRegion=\"true\">
          <Choice value=\"Correct\"/>
          <Choice value=\"Broken\"/>
        </Choices>
      </View>·
      <View style=\"width: 100%; display: block\">
        <Header value=\"Select bbox after creation to go next\"/>
      </View>
    </View>`,
      },
      {
        name: "Advanced config templates: Text spans labeling",
        url: "https://localhost/?config=%3CView%20style%3D%22display%3A%20flex%3B%22%3E%3Cbr%3E%20%20%3CView%20style%3D%22width%3A%20150px%3B%20padding-left%3A%202em%3B%20margin-right%3A%202em%3B%20background%3A%20%23f1f1f1%3B%20border-radius%3A%203px%22%3E%3Cbr%3E%20%20%20%20%3CLabels%20name%3D%22ner%22%20toName%3D%22text%22%3E%3Cbr%3E%20%20%20%20%20%20%3CLabel%20value%3D%22Person%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CLabel%20value%3D%22Organization%22%20%2F%3E%3Cbr%3E%20%20%20%20%3C%2FLabels%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%3CView%3E%3Cbr%3E%20%20%20%20%3CView%20style%3D%22height%3A%20200px%3B%20overflow-y%3A%20auto%22%3E%3Cbr%3E%20%20%20%20%20%20%3CText%20name%3D%22text%22%20value%3D%22%24text%22%20%2F%3E%3Cbr%3E%20%20%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3CView%3E%3Cbr%3E%20%20%20%20%20%20%3CChoices%20name%3D%22relevance%22%20toName%3D%22text%22%20perRegion%3D%22true%22%3E%3Cbr%3E%20%20%20%20%20%20%09%3CChoice%20value%3D%22Relevant%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChoice%20value%3D%22Non%20Relevant%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3C%2FChoices%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%20%20%3CView%20visibleWhen%3D%22region-selected%22%3E%3Cbr%3E%20%20%20%20%20%20%09%3CHeader%20value%3D%22Your%20confidence%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3C%2FView%3E%3Cbr%3E%20%20%20%20%20%20%3CRating%20name%3D%22confidence%22%20toName%3D%22text%22%20perRegion%3D%22true%22%20%2F%3E%3Cbr%3E%20%20%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3CView%20style%3D%22width%3A%20100%25%3B%20display%3A%20block%22%3E%3Cbr%3E%20%20%20%20%20%20%3CHeader%20value%3D%22Select%20span%20after%20creation%20to%20go%20next%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FView%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View style=\"display: flex;\">
      <View style=\"width: 150px; padding-left: 2em; margin-right: 2em; background: #f1f1f1; border-radius: 3px\">
        <Labels name=\"ner\" toName=\"text\">
          <Label value=\"Person\" />
          <Label value=\"Organization\" />
        </Labels>
      </View>·
      <View>
        <View style=\"height: 200px; overflow-y: auto\">
          <Text name=\"text\" value=\"$text\" />
        </View>·
        <View>
          <Choices name=\"relevance\" toName=\"text\" perRegion=\"true\">
                <Choice value=\"Relevant\" />
            <Choice value=\"Non Relevant\" />
          </Choices>·
          <View visibleWhen=\"region-selected\">
                <Header value=\"Your confidence\" />
          </View>
          <Rating name=\"confidence\" toName=\"text\" perRegion=\"true\" />
        </View>·
        <View style=\"width: 100%; display: block\">
          <Header value=\"Select span after creation to go next\"/>
        </View>
      </View>·
    </View>`,
      },
      {
        name: "Advanced config templates: Image & Audio & Text",
        url: "https://localhost/?config=%3CView%3E%3Cbr%3E%3Cbr%3E%20%20%3C!--%20Image%20with%20bounding%20boxes%20--%3E%3Cbr%3E%20%20%3CView%20style%3D%22padding%3A%2025px%3B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20box-shadow%3A%202px%202px%208px%20%23AAA%22%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Label%20the%20image%20with%20bounding%20boxes%22%2F%3E%3Cbr%3E%20%20%20%20%3CImage%20name%3D%22img%22%20value%3D%22%24image%22%2F%3E%3Cbr%3E%20%20%20%20%3CText%20name%3D%22text1%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20value%3D%22Select%20label%2C%20click%20and%20drag%20on%20image%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3CRectangleLabels%20name%3D%22tag%22%20toName%3D%22img%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20canRotate%3D%22false%22%3E%3Cbr%3E%20%20%20%20%20%20%3CLabel%20value%3D%22Airplane%22%20background%3D%22red%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CLabel%20value%3D%22Car%22%20background%3D%22blue%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FRectangleLabels%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%3C!--%20Audio%20with%20single%20choice%20--%3E%3Cbr%3E%20%20%3CView%20style%3D%22margin-top%3A%2020px%3B%20padding%3A%2025px%3B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20box-shadow%3A%202px%202px%208px%20%23AAA%3B%22%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Do%20you%20like%20this%20music%3F%22%2F%3E%3Cbr%3E%20%20%20%20%3CAudio%20name%3D%22audio%22%20value%3D%22%24url%22%2F%3E%3Cbr%3E%20%20%20%20%3CChoices%20name%3D%22choices1%22%20toName%3D%22audio%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20choice%3D%22single%22%3E%3Cbr%3E%20%20%20%20%20%20%3CChoice%20alias%3D%22yes%22%20value%3D%22Yes%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CChoice%20alias%3D%22no%22%20value%3D%22No%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CChoice%20alias%3D%22unknown%22%20value%3D%22Don't%20know%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FChoices%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%3C!--%20Text%20with%20multi-choices%20--%3E%3Cbr%3E%20%20%3CView%20style%3D%22margin-top%3A%2020px%3B%20padding%3A%2025px%3B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20box-shadow%3A%202px%202px%208px%20%23AAA%3B%22%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Classify%20the%20text%22%2F%3E%3Cbr%3E%20%20%20%20%3CText%20name%3D%22text2%22%20value%3D%22%24text%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3CChoices%20name%3D%22choices2%22%20toName%3D%22text2%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20choice%3D%22multiple%22%3E%3Cbr%3E%20%20%20%20%20%20%3CChoice%20alias%3D%22wisdom%22%20value%3D%22Wisdom%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CChoice%20alias%3D%22long%22%20value%3D%22Long%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FChoices%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>·
      <!-- Image with bounding boxes -->
      <View style=\"padding: 25px;
                 box-shadow: 2px 2px 8px #AAA\">
        <Header value=\"Label the image with bounding boxes\"/>
        <Image name=\"img\" value=\"$image\"/>
        <Text name=\"text1\"
              value=\"Select label, click and drag on image\"/>·
        <RectangleLabels name=\"tag\" toName=\"img\"
                         canRotate=\"false\">
          <Label value=\"Airplane\" background=\"red\"/>
          <Label value=\"Car\" background=\"blue\"/>
        </RectangleLabels>
      </View>·
      <!-- Audio with single choice -->
      <View style=\"margin-top: 20px; padding: 25px;
                 box-shadow: 2px 2px 8px #AAA;\">
        <Header value=\"Do you like this music?\"/>
        <Audio name=\"audio\" value=\"$url\"/>
        <Choices name=\"choices1\" toName=\"audio\"
                 choice=\"single\">
          <Choice alias=\"yes\" value=\"Yes\"/>
          <Choice alias=\"no\" value=\"No\"/>
          <Choice alias=\"unknown\" value=\"Don't know\"/>
        </Choices>
      </View>·
      <!-- Text with multi-choices -->
      <View style=\"margin-top: 20px; padding: 25px;
                 box-shadow: 2px 2px 8px #AAA;\">
        <Header value=\"Classify the text\"/>
        <Text name=\"text2\" value=\"$text\"/>·
        <Choices name=\"choices2\" toName=\"text2\"
                 choice=\"multiple\">
          <Choice alias=\"wisdom\" value=\"Wisdom\"/>
          <Choice alias=\"long\" value=\"Long\"/>
        </Choices>
      </View>·
    </View>`,
      },
      {
        name: "Advanced config templates: Pairwise comparison",
        url: "https://labelstud.io/playground/?config=%3CView%3E%3Cbr%3E%20%20%3CHeader%3ESelect%20one%20of%20two%20items%3C%2FHeader%3E%3Cbr%3E%20%20%3CPairwise%20name%3D%22pw%22%20toName%3D%22text1%2Ctext2%22%20%2F%3E%3Cbr%3E%20%20%3CText%20name%3D%22text1%22%20value%3D%22%24text1%22%20%2F%3E%3Cbr%3E%20%20%3CText%20name%3D%22text2%22%20value%3D%22%24text2%22%20%2F%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Header>Select one of two items</Header>
      <Pairwise name=\"pw\" toName=\"text1,text2\" />
      <Text name=\"text1\" value=\"$text1\" />
      <Text name=\"text2\" value=\"$text2\" />
    </View>`,
      },
    ])("$name", async ({ url, expectedConfig }) => {
      Object.defineProperty(window, "location", {
        value: new URL(url),
        writable: true,
        configurable: true,
      });

      render(<PlaygroundApp />);

      await waitFor(() => {
        expect(mockSetError).not.toHaveBeenCalled();
        expect(mockSetConfig).toHaveBeenCalledWith(removeAllSpaceLikeCharacters(expectedConfig));
      });
    });
  });
});
