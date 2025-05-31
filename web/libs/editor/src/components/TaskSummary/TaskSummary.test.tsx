import { render, screen } from "@testing-library/react";
import type { MSTAnnotation, MSTStore } from "../../stores/types";
import TaskSummary from "./TaskSummary";

// Mock child components
jest.mock("./NumbersSummary", () => ({
  NumbersSummary: ({ values }: { values: Array<{ title: string; value: number | string; info: string }> }) => (
    <div data-testid="numbers-summary">
      {values.map((value) => (
        <div key={value.title} data-testid={`number-card-${value.title.toLowerCase()}`}>
          <span data-testid="title">{value.title}</span>
          <span data-testid="value">{value.value}</span>
          <span data-testid="info">{value.info}</span>
        </div>
      ))}
    </div>
  ),
}));

jest.mock("./LabelingSummary", () => ({
  LabelingSummary: ({ annotations, controls }: { annotations: any[]; controls: any[] }) => (
    <div data-testid="labeling-summary">
      <span data-testid="annotations-count">{annotations.length}</span>
      <span data-testid="controls-count">{controls.length}</span>
    </div>
  ),
}));

jest.mock("./DataSummary", () => ({
  DataSummary: ({ data_types, data }: { data_types: any; data: any }) => (
    <div data-testid="data-summary">
      <span data-testid="data-types-count">{Object.keys(data_types).length}</span>
      <span data-testid="data-keys-count">{Object.keys(data).length}</span>
    </div>
  ),
}));

describe("TaskSummary", () => {
  const createMockAnnotation = (overrides: Partial<MSTAnnotation> = {}): MSTAnnotation => ({
    id: "1",
    pk: 1,
    type: "annotation",
    user: { id: 1, displayName: "John Doe" },
    createdBy: "John Doe",
    versions: {
      result: [{ from_name: "label", to_name: "text", type: "choices", value: { choices: ["positive"] } }],
    },
    results: [],
    ...overrides,
  }) as MSTAnnotation;

  const createMockControlTag = (name: string, type: string = "choices") => [
    name,
    {
      isControlTag: true,
      type,
      toname: "text",
      perregion: false,
      children: [
        { value: "positive", background: "#ff0000" },
        { value: "negative", background: "#00ff00" },
      ],
    },
  ];

  const createMockObjectTag = (name: string, type: string = "text") => [
    name,
    {
      isObjectTag: true,
      type,
      value: "$text",
      _value: "Sample text content",
    },
  ];

  const createMockStore = (overrides: any = {}): MSTStore["annotationStore"] => ({
    store: {
      task: {
        dataObj: { text: "Sample text", id: 1 },
        agreement: 85.5,
        ...overrides.task,
      },
      project: {
        review_settings: {
          show_agreement_to_reviewers: true,
        },
        ...overrides.project,
      },
      ...overrides.store,
    },
    names: new Map([
      createMockControlTag("label"),
      createMockObjectTag("text"),
      ...overrides.names || [],
    ]),
    ...overrides,
  }) as MSTStore["annotationStore"];

  it("renders the review summary heading", () => {
    const annotations = [createMockAnnotation()];
    const store = createMockStore();

    render(<TaskSummary annotations={annotations} store={store} />);

    expect(screen.getByText("Review Summary")).toBeInTheDocument();
  });

  it("renders the task data heading", () => {
    const annotations = [createMockAnnotation()];
    const store = createMockStore();

    render(<TaskSummary annotations={annotations} store={store} />);

    expect(screen.getByText("Task Data")).toBeInTheDocument();
  });

  it("displays agreement when show_agreement_to_reviewers is true", () => {
    const annotations = [createMockAnnotation()];
    const store = createMockStore({
      store: {
        project: {
          review_settings: {
            show_agreement_to_reviewers: true,
          },
        },
      },
    });

    render(<TaskSummary annotations={annotations} store={store} />);

    expect(screen.getByTestId("number-card-agreement")).toBeInTheDocument();
    expect(screen.getByText("85.50%")).toBeInTheDocument();
  });

  it("hides agreement when show_agreement_to_reviewers is false", () => {
    const annotations = [createMockAnnotation()];
    const store = createMockStore({
      store: {
        project: {
          review_settings: {
            show_agreement_to_reviewers: false,
          },
        },
      },
    });

    render(<TaskSummary annotations={annotations} store={store} />);

    expect(screen.queryByTestId("number-card-agreement")).not.toBeInTheDocument();
  });

  it("hides agreement when project settings are not available", () => {
    const annotations = [createMockAnnotation()];
    const store = createMockStore({
      store: {
        project: null,
      },
    });

    render(<TaskSummary annotations={annotations} store={store} />);

    expect(screen.queryByTestId("number-card-agreement")).not.toBeInTheDocument();
  });

  it("counts submitted annotations correctly", () => {
    const annotations = [
      createMockAnnotation({ pk: 1, type: "annotation" }),
      createMockAnnotation({ pk: 2, type: "annotation" }),
      createMockAnnotation({ pk: 0, type: "annotation" }), // draft (pk: 0)
    ];
    const store = createMockStore();

    render(<TaskSummary annotations={annotations} store={store} />);

    expect(screen.getByTestId("number-card-annotations")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // Only submitted annotations
  });

  it("excludes annotations without results from count", () => {
    const annotations = [
      createMockAnnotation({ pk: 1, type: "annotation" }),
      createMockAnnotation({ pk: 2, type: "annotation", versions: { result: [] } }), // no results
      createMockAnnotation({ pk: 3, type: "annotation", versions: { result: undefined } }), // undefined results
    ];
    const store = createMockStore();

    render(<TaskSummary annotations={annotations} store={store} />);

    expect(screen.getByText("1")).toBeInTheDocument(); // Only annotation with results
  });

  it("counts predictions correctly", () => {
    const annotations = [
      createMockAnnotation({ pk: 1, type: "annotation" }),
      createMockAnnotation({ pk: 2, type: "prediction" }),
      createMockAnnotation({ pk: 3, type: "prediction" }),
    ];
    const store = createMockStore();

    render(<TaskSummary annotations={annotations} store={store} />);

    expect(screen.getByTestId("number-card-predictions")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // Only predictions
  });

  it("filters out annotations without pk (drafts)", () => {
    const annotations = [
      createMockAnnotation({ pk: 1 }),
      createMockAnnotation({ pk: 0 }), // draft
      createMockAnnotation({ pk: undefined }), // draft
    ];
    const store = createMockStore();

    render(<TaskSummary annotations={annotations} store={store} />);

    // Should pass only the annotation with pk to LabelingSummary
    expect(screen.getByTestId("annotations-count")).toHaveTextContent("1");
  });

  it("processes control tags correctly", () => {
    const annotations = [createMockAnnotation()];
    const store = createMockStore({
      names: new Map([
        createMockControlTag("label1", "choices"),
        createMockControlTag("label2", "textarea"),
        createMockObjectTag("text"), // should be filtered out
      ]),
    });

    render(<TaskSummary annotations={annotations} store={store} />);

    // Should pass 2 control tags to LabelingSummary
    expect(screen.getByTestId("controls-count")).toHaveTextContent("2");
  });

  it("processes object tags for data types correctly", () => {
    const annotations = [createMockAnnotation()];
    const store = createMockStore({
      names: new Map([
        createMockControlTag("label"),
        createMockObjectTag("text", "text"),
        createMockObjectTag("image", "image"),
      ]),
    });

    render(<TaskSummary annotations={annotations} store={store} />);

    // Should pass 2 object tags to DataSummary
    expect(screen.getByTestId("data-types-count")).toHaveTextContent("2");
  });

  it("handles control tags with per_region setting", () => {
    const annotations = [createMockAnnotation()];
    const controlWithPerRegion = createMockControlTag("regionLabel");
    controlWithPerRegion[1].perregion = true;
    
    const store = createMockStore({
      names: new Map([controlWithPerRegion]),
    });

    render(<TaskSummary annotations={annotations} store={store} />);

    expect(screen.getByTestId("controls-count")).toHaveTextContent("1");
  });

  it("handles control tags without children", () => {
    const annotations = [createMockAnnotation()];
    const controlWithoutChildren = createMockControlTag("simpleLabel");
    controlWithoutChildren[1].children = undefined;
    
    const store = createMockStore({
      names: new Map([controlWithoutChildren]),
    });

    render(<TaskSummary annotations={annotations} store={store} />);

    expect(screen.getByTestId("controls-count")).toHaveTextContent("1");
  });

  it("handles object tags with parsedValue", () => {
    const annotations = [createMockAnnotation()];
    const objectWithParsedValue = createMockObjectTag("image", "image");
    objectWithParsedValue[1].parsedValue = "parsed-image-url.jpg";
    
    const store = createMockStore({
      names: new Map([objectWithParsedValue]),
    });

    render(<TaskSummary annotations={annotations} store={store} />);

    expect(screen.getByTestId("data-types-count")).toHaveTextContent("1");
  });

  it("handles empty annotations array", () => {
    const annotations: MSTAnnotation[] = [];
    const store = createMockStore();

    render(<TaskSummary annotations={annotations} store={store} />);

    expect(screen.getByText("0")).toBeInTheDocument(); // annotations count
    expect(screen.getByTestId("annotations-count")).toHaveTextContent("0");
  });

  it("handles missing task agreement", () => {
    const annotations = [createMockAnnotation()];
    const store = createMockStore({
      store: {
        task: {
          agreement: undefined,
        },
        project: {
          review_settings: {
            show_agreement_to_reviewers: true,
          },
        },
      },
    });

    render(<TaskSummary annotations={annotations} store={store} />);

    // Should not display agreement when it's undefined
    expect(screen.queryByTestId("number-card-agreement")).not.toBeInTheDocument();
  });

  it("passes correct data to DataSummary", () => {
    const annotations = [createMockAnnotation()];
    const taskData = { text: "Sample text", image: "image.jpg", id: 123 };
    const store = createMockStore({
      store: {
        task: {
          dataObj: taskData,
        },
      },
      names: new Map([
        createMockObjectTag("text"),
        createMockObjectTag("image"),
      ]),
    });

    render(<TaskSummary annotations={annotations} store={store} />);

    expect(screen.getByTestId("data-keys-count")).toHaveTextContent("3");
  });

  it("displays correct info messages for numbers summary", () => {
    const annotations = [
      createMockAnnotation({ type: "annotation" }),
      createMockAnnotation({ type: "prediction" }),
    ];
    const store = createMockStore();

    render(<TaskSummary annotations={annotations} store={store} />);

    expect(screen.getByText("Number of submitted annotations")).toBeInTheDocument();
    expect(screen.getByText("Number of predictions")).toBeInTheDocument();
  });
}); 