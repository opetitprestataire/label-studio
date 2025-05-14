import type { Meta, StoryObj } from "@storybook/react";
import { Popover } from "./popover";
import { Button } from "@humansignal/ui";

const meta = {
  title: "UI/Popover",
  component: Popover,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof Popover>;

export const Default: Story = {
  args: {
    trigger: <Button>Click me</Button>,
    children: (
      <div className="p-4">
        <h4 className="mb-2 font-medium">Popover Title</h4>
        <p className="text-sm text-muted-foreground">
          This is a basic popover with some content.
        </p>
      </div>
    ),
  },
};

export const WithForm: Story = {
  args: {
    trigger: <Button>Open Form</Button>,
    children: (
      <div className="p-4 w-80">
        <h4 className="mb-4 font-medium">Settings</h4>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <input
              type="text"
              className="w-full mt-1 px-3 py-2 border rounded-md"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              className="w-full mt-1 px-3 py-2 border rounded-md"
              placeholder="Enter your email"
            />
          </div>
          <Button className="w-full">Save</Button>
        </div>
      </div>
    ),
  },
};

export const WithList: Story = {
  args: {
    trigger: <Button>View Options</Button>,
    children: (
      <div className="p-2 w-48">
        <ul className="space-y-1">
          <li>
            <button className="w-full px-2 py-1.5 text-left hover:bg-accent rounded-sm">
              Option 1
            </button>
          </li>
          <li>
            <button className="w-full px-2 py-1.5 text-left hover:bg-accent rounded-sm">
              Option 2
            </button>
          </li>
          <li>
            <button className="w-full px-2 py-1.5 text-left hover:bg-accent rounded-sm">
              Option 3
            </button>
          </li>
        </ul>
      </div>
    ),
  },
};

export const WithCustomAlignment: Story = {
  args: {
    trigger: <Button>Custom Alignment</Button>,
    align: "start",
    sideOffset: 8,
    children: (
      <div className="p-4">
        <p>This popover is aligned to the start and has a larger offset.</p>
      </div>
    ),
  },
}; 