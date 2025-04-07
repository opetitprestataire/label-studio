import type { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  component: Button,
  title: "UI/Button",
  tags: ["autodocs"],
  argTypes: {
    onClick: { action: "clicked" },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: "Default Checkbox",
  },
};

export const WithChangeHandler: Story = {
  args: {
    children: "Checkbox with Change Handler",
    onChange: action("Checkbox changed"),
  },
};
