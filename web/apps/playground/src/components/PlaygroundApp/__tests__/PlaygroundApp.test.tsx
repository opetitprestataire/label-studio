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
