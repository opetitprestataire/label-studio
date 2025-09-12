import type { Meta, StoryObj } from "@storybook/react";
import { ScatterView } from "./ScatterView";
import type { TaskPoint } from "./utils/types";
// Import the actual component props type
import type { ScatterViewProps } from "./ScatterView";

// Use the imported props type, making onChange optional for stories
type StoryProps = Omit<ScatterViewProps, "onChange"> & {
  onChange?: ScatterViewProps["onChange"];
};

/**
 * ScatterView is a component that displays tasks as points on a 2D scatter plot.
 * Each task must have x and y coordinates in its data object.
 */
const meta: Meta<typeof ScatterView> = {
  component: ScatterView,
  title: "DataManager/Views/ScatterView (Deck.gl)",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  argTypes: {
    data: { control: "object" },
    onChange: { action: "pointSelected" },
  },
} as Meta<StoryProps>; // Use the derived story props type

export default meta;
type Story = StoryObj<StoryProps>; // Use the derived story props type

// Mock data
const generateMockData = (count: number, categories = 4): TaskPoint[] => {
  const result = [];
  const categoryLabels = ["animal", "vehicle", "landscape", "interior"];

  for (let c = 0; c < categories; c++) {
    // Create a cluster for each category
    const centerX = Math.random() * 0.6 + 0.2; // between 0.2 and 0.8
    const centerY = Math.random() * 0.6 + 0.2; // between 0.2 and 0.8

    const pointsPerCategory = Math.floor(count / categories);

    for (let i = 0; i < pointsPerCategory; i++) {
      // Add some randomness within the cluster
      const x = centerX + (Math.random() - 0.5) * 0.2;
      const y = centerY + (Math.random() - 0.5) * 0.2;

      result.push({
        id: `${c}-${i}`,
        data: {
          text: `Sample task ${c}-${i}`,
          image: `https://picsum.photos/id/${c * 10 + i}/200/300`,
          x: Math.max(0, Math.min(1, x)), // ensure between 0 and 1
          y: Math.max(0, Math.min(1, y)), // ensure between 0 and 1
          category: categoryLabels[c % categoryLabels.length],
        },
      });
    }
  }

  return result;
};

// Mock view object with minimal implementation needed
const mockView = {
  toggleSelected: (id: string) => console.log("Toggled selection for:", id),
  selected: {
    isSelected: (id: string) => false,
  },
};

/**
 * Default story showing a Deck.gl scatter plot with clustered data points.
 * Wrap in a div with size for DeckGL.
 */
export const Default: Story = {
  args: {
    data: generateMockData(40),
    view: mockView,
  },
  render: (args) => (
    <div style={{ height: "600px", width: "100%", position: "relative" }}>
      <ScatterView {...args} />
    </div>
  ),
};

/**
 * Shows how the plot appears with only a few data points
 */
export const FewPoints: Story = {
  args: {
    data: generateMockData(8, 2),
    view: mockView,
  },
  render: (args) => (
    <div style={{ height: "600px", width: "100%", position: "relative" }}>
      <ScatterView {...args} />
    </div>
  ),
};

/**
 * Shows how the plot handles a large number of data points
 */
export const ManyPoints: Story = {
  args: {
    data: generateMockData(200),
    view: mockView,
  },
  render: (args) => (
    <div style={{ height: "600px", width: "100%", position: "relative" }}>
      <ScatterView {...args} />
    </div>
  ),
};

/**
 * Shows how the plot appears with no data
 */
export const NoData: Story = {
  args: {
    data: [],
    view: mockView,
  },
  render: (args) => (
    <div style={{ height: "600px", width: "100%", position: "relative" }}>
      <ScatterView {...args} />
    </div>
  ),
};

/**
 * Shows how the plot appears when data is missing coordinates
 */
export const MissingCoordinates: Story = {
  args: {
    data: [
      { id: "1", data: { text: "Missing coordinates" } },
      { id: "2", data: { text: "Has x only", x: 0.5 } },
      { id: "3", data: { text: "Has y only", y: 0.5 } },
    ],
    view: mockView,
  },
  render: (args) => (
    <div style={{ height: "600px", width: "100%", position: "relative" }}>
      <ScatterView {...args} />
    </div>
  ),
};

/**
 * Shows how selection works
 */
export const WithSelection: Story = {
  args: {
    data: generateMockData(40),
    view: {
      ...mockView,
      selected: {
        isSelected: (id: string) => id.includes("-0"), // select all first items in each category
      },
    },
  },
  render: (args) => (
    <div style={{ height: "600px", width: "100%", position: "relative" }}>
      <ScatterView {...args} />
    </div>
  ),
};
