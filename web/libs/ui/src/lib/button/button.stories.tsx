import type { Meta, StoryObj } from "@storybook/react";
import { Button, buttonVariant } from "./button";
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
  },
  render: ({ children, ...props }) => {
    return (
      <Button {...props} className="w-48">
        <IconAnnotationGroundTruth />
        hello
      </Button>
    );
  },
};

export const WithTrailingIcon: Story = {
  args: {
    children: "Button with icon",
  },
  render: ({ children, ...props }) => {
    return (
      <Button {...props} className="w-48">
        hello
        <IconAnnotationGroundTruth />
      </Button>
    );
  },
};

export const WideButton: Story = {
  args: {
    children: "Wide button",
    align: "default",
  },
  render: ({ children, ...props }) => {
    return (
      <Button {...props} className="w-48">
        <IconAnnotationGroundTruth />
        {children}
        <IconAnnotationGroundTruth />
      </Button>
    );
  },
};

export const WithComplexChildren: Story = {
  args: {
    children: "Button with a",
    align: "default",
  },
  render: ({ children, ...props }) => {
    return (
      <Button {...props}>
        <IconAnnotationGroundTruth />
        {children}
        <span className="max-h-6 px-tight rounded-4 bg-primary-surface-hover">badge</span>
        <IconAnnotationGroundTruth />
      </Button>
    );
  },
};

export const IconButton: Story = {
  render: ({ children: _, ...props }) => {
    return (
      <Button {...props}>
        <IconAnnotationGroundTruth />
      </Button>
    );
  },
};

export const StyledLink: Story = {
  args: {
    children: "Link with button style",
  },
  render({ children, ...props }) {
    return (
      // biome-ignore lint: We don't need a real link here
      <a href="#" className={buttonVariant({ ...props })}>
        <span className="flex-1 px-tight">{children}</span>
      </a>
    );
  },
};
