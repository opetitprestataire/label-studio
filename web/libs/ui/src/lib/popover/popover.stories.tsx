import type { Meta, StoryObj } from "@storybook/react";
import { Popover } from "./popover";
import { Button } from "@humansignal/ui";

const meta = {
  title: "UI/Popover",
  component: Popover,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof Popover>;

export const Default: Story = {
  args: {
    trigger: <Button>Click me</Button>,
    children: <div className="p-base">Popover content</div>,
  },
};

export const WithForm: Story = {
  args: {
    trigger: <Button>Open Form</Button>,
    children: (
      <div className="p-base w-[20rem]">
        <h4 className="mb-base font-medium">Settings</h4>
        <div className="space-y-base">
          <div>
            <label className="text-body-small font-medium">Name</label>
            <input
              type="text"
              className="w-full mt-tighter px-base py-tight border rounded-md"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label className="text-body-small font-medium">Email</label>
            <input
              type="email"
              className="w-full mt-tighter px-base py-tight border rounded-md"
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
      <div className="p-tight w-[12rem]">
        <ul className="space-y-tighter">
          <li>
            <span className="block w-full px-tight py-tighter text-left hover:bg-accent rounded-sm cursor-pointer">
              Option 1
            </span>
          </li>
          <li>
            <span className="block w-full px-tight py-tighter text-left hover:bg-accent rounded-sm cursor-pointer">
              Option 2
            </span>
          </li>
          <li>
            <span className="block w-full px-tight py-tighter text-left hover:bg-accent rounded-sm cursor-pointer">
              Option 3
            </span>
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
      <div className="p-base">
        <p>This popover is aligned to the start and has a larger offset.</p>
      </div>
    ),
  },
};
