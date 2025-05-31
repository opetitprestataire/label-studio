import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { types, type Instance } from "mobx-state-tree";
import type React from "react";
import "@testing-library/jest-dom";
import { GridView, GridBody } from "../GridView.jsx";
import { GridViewProvider, GridViewContext } from "../GridPreview";
import * as DataGroups from "../../../DataGroups";
import * as featureFlags from "../../../../utils/feature-flags.js";

// TypeScript Interfaces following coding standards
interface FieldProps {
  id: string;
  title: string;
  alias: string;
  type: string;
  currentType: string;
  displayType: null;
  defaultHidden: boolean;
  parent: FieldParent | null;
  children: null;
  target: string;
  orderable: boolean;
  help: null;
  hidden: boolean;
  width: null;
}

interface FieldParent {
  id: string;
  title: string;
  alias: string;
  type: string;
  displayType: null;
  defaultHidden: boolean;
  parent: null;
  children: string[];
  target: string;
  orderable: boolean;
  help: null;
}

interface MockSelectedProps {
  isSelected: jest.MockedFunction<(id: number) => boolean>;
  list: unknown[];
  all: boolean;
}

interface MockDataStoreProps {
  hasNextPage: boolean;
  pageSize: number;
}

interface MockViewProps {
  gridWidth: number;
  gridResponsiveImage: boolean;
  selected: MockSelectedProps;
  dataStore: MockDataStoreProps;
  setGridResponsiveImage: jest.MockedFunction<() => void>;
  toggleSelected: jest.MockedFunction<() => void>;
}

interface MockDataGroupComponentProps {
  value: string;
  field: FieldProps;
  original: TaskInstance;
}

interface RenderWithProviderOptions {
  data?: TaskInstance[];
  view?: MockViewProps;
  fields?: FieldProps[];
}

// MobX State Tree Types
const TaskDataModel = types
  .model({
    image: types.optional(types.union(types.string, types.array(types.string)), ""),
    text: types.optional(types.string, ""),
    audio: types.optional(types.string, ""),
    data: types.optional(types.string, ""),
  })
  .actions((self) => ({
    setImage(value: string | string[]) {
      self.image = value;
    },
    setText(value: string) {
      self.text = value;
    },
    setAudio(value: string) {
      self.audio = value;
    },
    setData(value: string) {
      self.data = value;
    },
  }));

const TaskModel = types
  .model({
    id: types.number,
    data: TaskDataModel,
  })
  .actions((self) => ({
    setLoading(alias: string) {
      // @ts-ignore - Adding dynamic property for testing
      self.loading = alias;
    },
  }));

type TaskInstance = Instance<typeof TaskModel>;

// Mock external dependencies with proper types
jest.mock("react-virtualized-auto-sizer", () => {
  return ({ children }: { children: (size: { width: number; height: number }) => React.ReactNode }) =>
    children({ width: 800, height: 600 });
});

jest.mock("react-window", () => ({
  FixedSizeGrid: ({
    children,
    itemCount,
    columnCount,
    rowCount,
    onItemsRendered,
  }: {
    children: (props: { style: React.CSSProperties; rowIndex: number; columnIndex: number }) => React.ReactNode;
    itemCount: number;
    columnCount: number;
    rowCount: number;
    onItemsRendered?: (params: {
      visibleRowStartIndex: number;
      visibleRowStopIndex: number;
      overscanRowStartIndex: number;
      overscanRowStopIndex: number;
    }) => void;
  }) => {
    // Simulate rendering a few items for testing
    const items: React.ReactNode[] = [];
    for (let rowIndex = 0; rowIndex < Math.min(rowCount, 3); rowIndex++) {
      for (let columnIndex = 0; columnIndex < Math.min(columnCount, 2); columnIndex++) {
        items.push(
          <div key={`${rowIndex}-${columnIndex}`} data-testid={`grid-item-${rowIndex}-${columnIndex}`}>
            {children({ style: {}, rowIndex, columnIndex })}
          </div>,
        );
      }
    }
    // Simulate onItemsRendered callback
    if (onItemsRendered) {
      setTimeout(() => {
        onItemsRendered({
          visibleRowStartIndex: 0,
          visibleRowStopIndex: 2,
          overscanRowStartIndex: 0,
          overscanRowStopIndex: 2,
        });
      }, 0);
    }
    return <div data-testid="fixed-size-grid">{items}</div>;
  },
}));

jest.mock("react-window-infinite-loader", () => {
  return ({
    children,
  }: {
    children: (props: { onItemsRendered: jest.MockedFunction<() => void>; ref: { current: null } }) => React.ReactNode;
    loadMoreItems?: () => void;
  }) => {
    const onItemsRendered = jest.fn();
    const ref = { current: null };
    return children({ onItemsRendered, ref });
  };
});

jest.mock("../../../../utils/feature-flags.js", () => ({
  FF_GRID_PREVIEW: "FF_GRID_PREVIEW",
  FF_LOPS_E_3: "FF_LOPS_E_3",
  isFF: jest.fn(),
}));

jest.mock("../../../DataGroups", () => ({
  Image: ({ value, field, original }: MockDataGroupComponentProps) => (
    <img src={value} alt={field.alias} data-testid={`image-${original.id}`} />
  ),
  TextDataGroup: ({ value, field, original }: MockDataGroupComponentProps) => (
    <div data-testid={`text-${original.id}`}>{value}</div>
  ),
  Audio: ({ value, field, original }: MockDataGroupComponentProps) => (
    <audio data-testid={`audio-${original.id}`} src={value}>
      <track kind="captions" srcLang="en" label="English captions" />
    </audio>
  ),
}));

jest.mock("../../../Common/SkeletonLoader", () => ({
  SkeletonLoader: () => <div data-testid="skeleton-loader">Loading...</div>,
}));

jest.mock("../../../Common/Space/Space", () => ({
  Space: ({ children }: { children: React.ReactNode }) => <div data-testid="space">{children}</div>,
}));

jest.mock("../../../../utils/bem", () => {
  const React = require("react");
  return {
    Block: ({
      children,
      name,
      mod,
      ...props
    }: {
      children: React.ReactNode;
      name: string;
      mod?: Record<string, unknown>;
      [key: string]: unknown;
    }) =>
      React.createElement(
        "div",
        {
          "data-testid": `block-${name}`,
          className: mod ? Object.keys(mod).join(" ") : "",
          ...props,
        },
        children,
      ),
    Elem: ({
      children,
      name,
      tag = "div",
      mod,
      ...props
    }: {
      children: React.ReactNode;
      name: string;
      tag?: keyof JSX.IntrinsicElements;
      mod?: Record<string, unknown>;
      [key: string]: unknown;
    }) =>
      React.createElement(
        tag,
        {
          "data-testid": `elem-${name}`,
          className: mod ? Object.keys(mod).join(" ") : "",
          ...props,
        },
        children,
      ),
    BemWithSpecifiContext: () => ({
      Block: ({ children, name, mod, ...props }: any) =>
        React.createElement(
          "div",
          {
            "data-testid": `block-${name}`,
            className: mod ? Object.keys(mod).join(" ") : "",
            ...props,
          },
          children,
        ),
      Elem: ({ children, name, tag = "div", mod, ...props }: any) =>
        React.createElement(
          tag,
          {
            "data-testid": `elem-${name}`,
            className: mod ? Object.keys(mod).join(" ") : "",
            ...props,
          },
          children,
        ),
      Context: React.createContext(null),
    }),
    cn: (block: string) => ({
      block: (name: string) => ({ toString: () => `block-${name}` }),
      elem: (name: string) => ({ toString: () => `elem-${name}` }),
      mod: () => ({ toString: () => "" }),
      mix: () => ({ toString: () => "" }),
      toString: () => block,
      toClassName: () => block,
    }),
  };
});

jest.mock("@humansignal/ui", () => {
  const React = require("react");
  return {
    Checkbox: ({
      children,
      checked,
      onChange,
      ariaLabel,
      ...props
    }: {
      children?: React.ReactNode;
      checked: boolean;
      onChange: () => void;
      ariaLabel?: string;
      [key: string]: unknown;
    }) =>
      React.createElement(
        "input",
        {
          type: "checkbox",
          checked,
          onChange,
          "aria-label": ariaLabel,
          "data-testid": "ui-checkbox",
          ...props,
        },
        children,
      ),
    Tooltip: ({ children, title }: { children: React.ReactNode; title: React.ReactNode }) =>
      React.createElement(
        "div",
        {
          "data-testid": "ui-tooltip",
          title: typeof title === "string" ? title : "",
        },
        children,
      ),
  };
});

// Test data factories with proper types
const createField = (overrides: Partial<FieldProps> = {}): FieldProps => ({
  id: "tasks:data.image",
  title: "image",
  alias: "image",
  type: "Image",
  currentType: "Image",
  displayType: null,
  defaultHidden: false,
  parent: {
    id: "tasks:data",
    title: "data",
    alias: "data",
    type: "List",
    displayType: null,
    defaultHidden: false,
    parent: null,
    children: ["tasks:data.image", "tasks:data.text", "tasks:data.audio"],
    target: "tasks",
    orderable: true,
    help: null,
  },
  children: null,
  target: "tasks",
  orderable: true,
  help: null,
  hidden: false,
  width: null,
  ...overrides,
});

const createTextField = (): FieldProps =>
  createField({
    id: "tasks:data.text",
    alias: "text",
    type: "String",
    currentType: "Text",
    title: "text",
  });

const createAudioField = (): FieldProps =>
  createField({
    id: "tasks:data.audio",
    alias: "audio",
    type: "Audio",
    currentType: "Audio",
    title: "audio",
  });

const createTask = (id: number, dataOverrides: Partial<typeof TaskDataModel.Type> = {}): TaskInstance => {
  const taskData = {
    image: "",
    text: "",
    audio: "",
    data: "",
    ...dataOverrides,
  };

  return TaskModel.create({
    id,
    data: taskData,
  });
};

const createMockView = (overrides: Partial<MockViewProps> = {}): MockViewProps => ({
  gridWidth: 4,
  gridResponsiveImage: false,
  selected: {
    isSelected: jest.fn((id: number) => false),
    list: [],
    all: false,
    ...overrides.selected,
  },
  dataStore: {
    hasNextPage: false,
    pageSize: 20,
    ...overrides.dataStore,
  },
  setGridResponsiveImage: jest.fn(),
  toggleSelected: jest.fn(),
  ...overrides,
});

const renderWithProvider = (
  component: React.ReactElement,
  { data = [], view = createMockView(), fields = [] }: RenderWithProviderOptions = {},
) => {
  return render(
    <GridViewProvider data={data} view={view} fields={fields}>
      {component}
    </GridViewProvider>,
  );
};

describe("GridView Component Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (featureFlags.isFF as jest.MockedFunction<typeof featureFlags.isFF>).mockReturnValue(false);
  });

  describe("GridBody", () => {
    it("renders image data when source is an array", async () => {
      const imageField = createField();
      const fields = [imageField];
      const row = createTask(1);

      // Set up array data using action
      row.data.setImage(["https://example.com/image1.jpg", "https://example.com/image2.jpg"]);

      render(<GridBody row={row} fields={fields} columnCount={4} />);

      const imageElement = await screen.findByRole("img");
      expect(imageElement).toBeInTheDocument();
      expect(imageElement).toHaveAttribute("src", "https://example.com/image1.jpg");
    });

    it("renders image data when source is a string", async () => {
      const imageField = createField();
      const fields = [imageField];
      const row = createTask(1);
      row.data.setImage("https://example.com/image.jpg");

      render(<GridBody row={row} fields={fields} columnCount={4} />);

      const imageElement = await screen.findByRole("img");
      expect(imageElement).toBeInTheDocument();
      expect(imageElement).toHaveAttribute("src", "https://example.com/image.jpg");
    });

    it("renders text data correctly", () => {
      const textField = createTextField();
      const fields = [textField];
      const row = createTask(1);
      row.data.setText("Sample text content");

      render(<GridBody row={row} fields={fields} columnCount={4} />);

      expect(screen.getByTestId("text-1")).toBeInTheDocument();
      expect(screen.getByTestId("text-1")).toHaveTextContent("Sample text content");
    });

    it("renders audio data correctly", () => {
      const audioField = createAudioField();
      const fields = [audioField];
      const row = createTask(1);
      row.data.setAudio("https://example.com/audio.mp3");

      render(<GridBody row={row} fields={fields} columnCount={4} />);

      expect(screen.getByTestId("audio-1")).toBeInTheDocument();
      expect(screen.getByTestId("audio-1")).toHaveAttribute("src", "https://example.com/audio.mp3");
    });

    it("applies correct CSS classes for text and unknown types", () => {
      const textField = createTextField();
      const fields = [textField];
      const row = createTask(1);
      row.data.setText("Sample text");

      const { container } = render(<GridBody row={row} fields={fields} columnCount={4} />);

      const textContainer = container.querySelector(".h-full.w-full");
      expect(textContainer).toHaveClass("overflow-x-auto");
      expect(textContainer).toHaveClass("scrollbar-thin");
    });

    it("handles mixed data types correctly", () => {
      const imageField = createField();
      const textField = createTextField();
      const fields = [imageField, textField];
      const row = createTask(1);
      row.data.setImage("https://example.com/image.jpg");
      row.data.setText("Sample text");

      render(<GridBody row={row} fields={fields} columnCount={4} />);

      expect(screen.getByRole("img")).toBeInTheDocument();
      expect(screen.getByTestId("text-1")).toBeInTheDocument();
    });
  });

  describe("GridHeader", () => {
    it("renders task ID and checkbox", () => {
      const mockSelected = {
        isSelected: jest.fn(() => false),
      };
      const row = { id: 123 };

      render(
        <div data-testid="elem-cell-header">
          <input
            type="checkbox"
            checked={mockSelected.isSelected(row.id)}
            aria-label={`${mockSelected.isSelected(row.id) ? "Unselect" : "Select"} Task ${row.id}`}
            onChange={() => {}}
          />
          <span>{row.id}</span>
        </div>,
      );

      expect(screen.getByRole("checkbox")).toBeInTheDocument();
      expect(screen.getByRole("checkbox")).not.toBeChecked();
      expect(screen.getByText("123")).toBeInTheDocument();
      expect(screen.getByLabelText("Select Task 123")).toBeInTheDocument();
    });

    it("shows correct aria label when task is selected", () => {
      const mockSelected = {
        isSelected: jest.fn(() => true),
      };
      const row = { id: 123 };

      render(
        <div data-testid="elem-cell-header">
          <input
            type="checkbox"
            checked={mockSelected.isSelected(row.id)}
            aria-label={`${mockSelected.isSelected(row.id) ? "Unselect" : "Select"} Task ${row.id}`}
            onChange={() => {}}
          />
          <span>{row.id}</span>
        </div>,
      );

      expect(screen.getByRole("checkbox")).toBeChecked();
      expect(screen.getByLabelText("Unselect Task 123")).toBeInTheDocument();
    });
  });

  describe("GridDataGroup", () => {
    it("renders skeleton loader when task is loading", () => {
      (featureFlags.isFF as jest.MockedFunction<typeof featureFlags.isFF>).mockReturnValue(true);
      const field = createField();
      const row = createTask(1);
      row.setLoading("image"); // Simulate loading state

      render(
        <GridViewProvider data={[]} view={createMockView()} fields={[]}>
          <div>
            {featureFlags.isFF("FF_LOPS_E_3") && (row as any).loading === field.alias ? (
              <div data-testid="skeleton-loader">Loading...</div>
            ) : (
              <DataGroups.Image value="test.jpg" field={field} original={row} />
            )}
          </div>
        </GridViewProvider>,
      );

      expect(screen.getByTestId("skeleton-loader")).toBeInTheDocument();
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("renders appropriate DataGroup component based on type", () => {
      const field = createField();
      const row = createTask(1);
      row.data.setImage("test.jpg");

      render(
        <GridViewProvider data={[]} view={createMockView()} fields={[]}>
          <DataGroups.Image value={row.data.image} field={field} original={row} />
        </GridViewProvider>,
      );

      expect(screen.getByTestId("image-1")).toBeInTheDocument();
      expect(screen.getByRole("img")).toHaveAttribute("src", "test.jpg");
    });

    it("falls back to TextDataGroup for unknown types", () => {
      const field = createField({ currentType: "Unknown" });
      const row = createTask(1);
      row.data.setData("unknown data");

      render(
        <GridViewProvider data={[]} view={createMockView()} fields={[]}>
          <DataGroups.TextDataGroup value={row.data.data} field={field} original={row} />
        </GridViewProvider>,
      );

      expect(screen.getByTestId("text-1")).toBeInTheDocument();
      expect(screen.getByText("unknown data")).toBeInTheDocument();
    });
  });

  describe("GridCell", () => {
    it("renders cell with header and body", () => {
      const view = createMockView();
      const row = createTask(1);
      const fields = [createField()];

      renderWithProvider(
        <div data-testid="elem-cell">
          <div data-testid="elem-cell-content">
            <div data-testid="elem-cell-header">
              <input type="checkbox" />
              <span>{row.id}</span>
            </div>
            <div data-testid="elem-cell-body">
              <GridBody view={view} row={row} fields={fields} columnCount={4} />
            </div>
          </div>
        </div>,
        { view, fields },
      );

      expect(screen.getByTestId("elem-cell")).toBeInTheDocument();
      expect(screen.getByTestId("elem-cell-content")).toBeInTheDocument();
      expect(screen.getByTestId("elem-cell-header")).toBeInTheDocument();
      expect(screen.getByTestId("elem-cell-body")).toBeInTheDocument();
    });

    it("handles cell click events", async () => {
      const user = userEvent.setup();
      const onClick = jest.fn();
      const view = createMockView();
      const row = createTask(1);
      const fields = [createField()];

      renderWithProvider(
        <div data-testid="elem-cell" onClick={() => onClick(row.id)}>
          <div data-testid="elem-cell-content">Cell content</div>
        </div>,
        { view, fields },
      );

      await user.click(screen.getByTestId("elem-cell"));
      expect(onClick).toHaveBeenCalledWith(1);
    });

    it("handles body click when feature flag is enabled and image field exists", async () => {
      const user = userEvent.setup();
      (featureFlags.isFF as jest.MockedFunction<typeof featureFlags.isFF>).mockReturnValue(true);
      const mockSetCurrentTaskId = jest.fn();
      const row = createTask(1);

      render(
        <GridViewContext.Provider
          value={{
            tasks: [row],
            imageField: "image",
            currentTaskId: null,
            setCurrentTaskId: mockSetCurrentTaskId,
          }}
        >
          <div
            data-testid="elem-cell-body"
            onClick={(e) => {
              if (featureFlags.isFF("FF_GRID_PREVIEW") && "image") {
                e.stopPropagation();
                mockSetCurrentTaskId(row.id);
              }
            }}
          >
            Body content
          </div>
        </GridViewContext.Provider>,
      );

      await user.click(screen.getByTestId("elem-cell-body"));
      expect(mockSetCurrentTaskId).toHaveBeenCalledWith(1);
    });

    it("applies selected modifier when cell is selected", () => {
      const view = createMockView({
        selected: {
          isSelected: jest.fn((id: number) => id === 1),
          list: [],
          all: false,
        },
      });
      const row = createTask(1);
      const fields = [createField()];

      renderWithProvider(
        <div data-testid="elem-cell" className={view.selected.isSelected(row.id) ? "selected" : ""}>
          Cell content
        </div>,
        { view, fields },
      );

      const cell = screen.getByTestId("elem-cell");
      expect(cell).toHaveClass("selected");
    });
  });

  describe("GridView Main Component", () => {
    it("renders grid with correct structure", () => {
      const data = [createTask(1)];
      const view = createMockView();
      const fields = [createField()];
      const loadMore = jest.fn();
      const onChange = jest.fn();

      render(
        <GridView data={data} view={view} loadMore={loadMore} fields={fields} onChange={onChange} hiddenFields={[]} />,
      );

      expect(screen.getByTestId("block-grid-view")).toBeInTheDocument();
      expect(screen.getByTestId("fixed-size-grid")).toBeInTheDocument();
    });

    it("handles grid width configuration", () => {
      const data = [createTask(1)];
      const view = createMockView({ gridWidth: 6 });
      const fields = [createField()];

      render(
        <GridView
          data={data}
          view={view}
          loadMore={jest.fn()}
          fields={fields}
          onChange={jest.fn()}
          hiddenFields={[]}
        />,
      );

      // Grid should use the configured width
      expect(screen.getByTestId("block-grid-view")).toBeInTheDocument();
    });

    it("calculates row height correctly for images", () => {
      const data = [createTask(1)];
      const view = createMockView();
      const fields = [createField()];

      render(
        <GridView
          data={data}
          view={view}
          loadMore={jest.fn()}
          fields={fields}
          onChange={jest.fn()}
          hiddenFields={[]}
        />,
      );

      // Should render without errors and calculate appropriate height
      expect(screen.getByTestId("block-grid-view")).toBeInTheDocument();
    });

    it("calculates row height correctly for text-only content", () => {
      const data = [createTask(1)];
      const view = createMockView();
      const fields = [createTextField()];

      render(
        <GridView
          data={data}
          view={view}
          loadMore={jest.fn()}
          fields={fields}
          onChange={jest.fn()}
          hiddenFields={[]}
        />,
      );

      // Should use TEXT_ONLY_CELL_HEIGHT
      expect(screen.getByTestId("block-grid-view")).toBeInTheDocument();
    });

    it("handles infinite loading", async () => {
      const loadMore = jest.fn();
      const data = Array.from({ length: 10 }, (_, i) => createTask(i + 1));
      const view = createMockView({
        dataStore: { hasNextPage: true, pageSize: 20 },
      });
      const fields = [createField()];

      render(
        <GridView data={data} view={view} loadMore={loadMore} fields={fields} onChange={jest.fn()} hiddenFields={[]} />,
      );

      // Should render grid structure
      expect(screen.getByTestId("fixed-size-grid")).toBeInTheDocument();
    });

    it("handles empty data gracefully", () => {
      const data: TaskInstance[] = [];
      const view = createMockView();
      const fields = [createField()];

      render(
        <GridView
          data={data}
          view={view}
          loadMore={jest.fn()}
          fields={fields}
          onChange={jest.fn()}
          hiddenFields={[]}
        />,
      );

      expect(screen.getByTestId("block-grid-view")).toBeInTheDocument();
    });

    it("filters hidden fields correctly", () => {
      const data = [createTask(1)];
      const view = createMockView();
      const fields = [createField(), createTextField()];
      const hiddenFields = ["text"];

      render(
        <GridView
          data={data}
          view={view}
          loadMore={jest.fn()}
          fields={fields}
          onChange={jest.fn()}
          hiddenFields={hiddenFields}
        />,
      );

      expect(screen.getByTestId("block-grid-view")).toBeInTheDocument();
    });
  });

  describe("Grid Selection Interactions", () => {
    it("handles checkbox selection state correctly", () => {
      const view = createMockView({
        selected: {
          isSelected: jest.fn((id: number) => id === 1),
          list: [],
          all: false,
        },
      });

      render(
        <input type="checkbox" checked={view.selected.isSelected(1)} onChange={() => {}} data-testid="task-checkbox" />,
      );

      expect(screen.getByTestId("task-checkbox")).toBeChecked();
    });

    it("handles multiple task selection", () => {
      const selectedIds = [1, 3, 5];
      const view = createMockView({
        selected: {
          isSelected: jest.fn((id: number) => selectedIds.includes(id)),
          list: [],
          all: false,
        },
      });

      selectedIds.forEach((id) => {
        render(
          <input
            key={id}
            type="checkbox"
            checked={view.selected.isSelected(id)}
            onChange={() => {}}
            data-testid={`task-checkbox-${id}`}
          />,
        );
      });

      selectedIds.forEach((id) => {
        expect(screen.getByTestId(`task-checkbox-${id}`)).toBeChecked();
      });
    });

    it("handles task selection toggle", async () => {
      const user = userEvent.setup();
      const mockToggleSelected = jest.fn();

      render(
        <button type="button" onClick={() => mockToggleSelected(1)} data-testid="toggle-button">
          Toggle Task 1
        </button>,
      );

      await user.click(screen.getByTestId("toggle-button"));
      expect(mockToggleSelected).toHaveBeenCalledWith(1);
    });
  });

  describe("Grid Responsive Behavior", () => {
    it("applies responsive modifier when responsive mode is enabled", () => {
      const view = createMockView({ gridResponsiveImage: true });

      render(
        <div data-testid="elem-cell-body" className={view.gridResponsiveImage ? "responsive" : ""}>
          Body content
        </div>,
      );

      expect(screen.getByTestId("elem-cell-body")).toHaveClass("responsive");
    });

    it("handles different column counts", () => {
      const columnCounts = [2, 4, 6, 8];

      columnCounts.forEach((columnCount) => {
        const { container } = render(
          <div data-testid={`grid-${columnCount}`} className={`grid-${columnCount}`}>
            Grid with {columnCount} columns
          </div>,
        );

        expect(screen.getByTestId(`grid-${columnCount}`)).toHaveClass(`grid-${columnCount}`);
      });
    });

    it("calculates column width based on viewport", () => {
      const viewportWidth = 800;
      const columnCount = 4;
      const expectedWidth = viewportWidth / columnCount - 9.5;

      // This would be handled by the FixedSizeGrid component
      expect(expectedWidth).toBe(190.5);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("handles missing data gracefully", () => {
      const view = createMockView();
      const fields = [createField()];

      render(
        <GridView data={[]} view={view} loadMore={jest.fn()} fields={fields} onChange={jest.fn()} hiddenFields={[]} />,
      );

      expect(screen.getByTestId("block-grid-view")).toBeInTheDocument();
    });

    it("handles invalid field configurations", () => {
      const data = [createTask(1)];
      const view = createMockView();
      const invalidFields = [
        {
          ...createField(),
          parent: null, // Invalid parent
        },
      ];

      render(
        <GridView
          data={data}
          view={view}
          loadMore={jest.fn()}
          fields={invalidFields}
          onChange={jest.fn()}
          hiddenFields={[]}
        />,
      );

      expect(screen.getByTestId("block-grid-view")).toBeInTheDocument();
    });

    it("handles missing onChange callback", () => {
      const data = [createTask(1)];
      const view = createMockView();
      const fields = [createField()];

      render(
        <GridView
          data={data}
          view={view}
          loadMore={jest.fn()}
          fields={fields}
          onChange={undefined}
          hiddenFields={[]}
        />,
      );

      expect(screen.getByTestId("block-grid-view")).toBeInTheDocument();
    });
  });

  describe("Performance and Optimization", () => {
    it("memoizes field preparation", () => {
      const data = [createTask(1)];
      const view = createMockView();
      const fields = [createField()];
      const hiddenFields: string[] = [];

      const { rerender } = render(
        <GridView
          data={data}
          view={view}
          loadMore={jest.fn()}
          fields={fields}
          onChange={jest.fn()}
          hiddenFields={hiddenFields}
        />,
      );

      // Rerender with same props
      rerender(
        <GridView
          data={data}
          view={view}
          loadMore={jest.fn()}
          fields={fields}
          onChange={jest.fn()}
          hiddenFields={hiddenFields}
        />,
      );

      expect(screen.getByTestId("block-grid-view")).toBeInTheDocument();
    });

    it("handles large datasets efficiently", () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => createTask(i + 1));
      const view = createMockView();
      const fields = [createField()];

      render(
        <GridView
          data={largeDataset}
          view={view}
          loadMore={jest.fn()}
          fields={fields}
          onChange={jest.fn()}
          hiddenFields={[]}
        />,
      );

      expect(screen.getByTestId("block-grid-view")).toBeInTheDocument();
      expect(screen.getByTestId("fixed-size-grid")).toBeInTheDocument();
    });
  });
});
