import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import { IconAnnotationGroundTruth } from "@humansignal/icons";

const meta: Meta<typeof Button> = {
  component: Button,
  title: "UI/Button",
  tags: ["autodocs"],
  argTypes: {
    disabled: { control: "boolean" },
    waiting: { control: "boolean" },
    look: { control: "select" },
    size: { control: "select" },
    leading: { control: { type: false } },
    trailing: { control: { type: false } },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: "Default Button",
  },
};

export const WithDisabledState: Story = {
  args: {
    children: "Disabled Button",
    disabled: true,
  },
};

export const WithWaitingState: Story = {
  args: {
    children: "Waiting Button",
    waiting: true,
  },
};

export const WithLeadingIcon: Story = {
  args: {
    children: "Button with icon",
    leading: <IconAnnotationGroundTruth />,
  },
};

export const WithTrailingIcon: Story = {
  args: {
    children: "Button with icon",
    trailing: <IconAnnotationGroundTruth />,
  },
};

export const IconButton: Story = {
  render: () => {
    return (
      <Button>
        <IconAnnotationGroundTruth />
      </Button>
    );
  },
};
