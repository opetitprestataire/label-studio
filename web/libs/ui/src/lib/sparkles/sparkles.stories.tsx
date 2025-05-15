import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Sparkles } from "./sparkles";
import { IconAIAssistant } from "@humansignal/icons";

const meta: Meta<typeof Sparkles> = {
  title: "UI/Sparkles",
  component: Sparkles,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "`Sparkles` is a decorative animation wrapper for icons or buttons. It displays animated sparkles around its children, typically used to highlight special actions or features. The animation is accessible and does not interfere with user interaction.",
      },
    },
  },
  argTypes: {
    color: {
      control: "color",
      description: "The color of the sparkles.",
      table: { defaultValue: { summary: '"#FFFFFF"' } },
    },
    sparkleCount: {
      control: { type: "number", min: 1, max: 10 },
      description: "Number of sparkles visible at once.",
      table: { defaultValue: { summary: 2 } },
    },
    sparkleSizeMin: {
      control: { type: "number", min: 1, max: 100 },
      description: "Minimum sparkle size in px.",
      table: { defaultValue: { summary: 10 } },
    },
    sparkleSizeMax: {
      control: { type: "number", min: 1, max: 100 },
      description: "Maximum sparkle size in px.",
      table: { defaultValue: { summary: 14 } },
    },
    sparkleLifetime: {
      control: { type: "number", min: 100, max: 10000 },
      description: "Sparkle lifetime in ms.",
      table: { defaultValue: { summary: 3000 } },
    },
    sparkleBaseIntervalMin: {
      control: { type: "number", min: 0, max: 5000 },
      description: "Minimum interval between sparkles in ms.",
      table: { defaultValue: { summary: 800 } },
    },
    sparkleBaseIntervalMax: {
      control: { type: "number", min: 0, max: 5000 },
      description: "Maximum interval between sparkles in ms.",
      table: { defaultValue: { summary: 1600 } },
    },
    sparkleJitter: {
      control: { type: "number", min: 0, max: 2000 },
      description: "Jitter for sparkle interval in ms.",
      table: { defaultValue: { summary: 600 } },
    },
    sparkleRingInnerRadius: {
      control: { type: "number", min: 0, max: 100 },
      description: "Minimum distance from center in px.",
      table: { defaultValue: { summary: 12 } },
    },
    sparkleRingOuterRadius: {
      control: { type: "number", min: 0, max: 100 },
      description: "Maximum distance from center in px.",
      table: { defaultValue: { summary: 14 } },
    },
    sparkleMinDistance: {
      control: { type: "number", min: 0, max: 100 },
      description: "Minimum distance between sparkles in px.",
      table: { defaultValue: { summary: 8 } },
    },
    sparkleMinSizeDiff: {
      control: { type: "number", min: 0, max: 100 },
      description: "Minimum size difference between sparkles in px.",
      table: { defaultValue: { summary: 4 } },
    },
    buttonSize: {
      control: { type: "number", min: 1, max: 200 },
      description: "The size of the button or area in px.",
      table: { defaultValue: { summary: 28 } },
    },
    disableAnimation: {
      control: "boolean",
      description: "Disable the sparkle animation.",
      table: { defaultValue: { summary: false } },
    },
    children: {
      control: false,
      description: "Children to render inside the sparkles effect.",
    },
    className: {
      control: false,
      description: "Additional className for the root element.",
    },
    "data-testid": {
      control: false,
      description: "Test id for the root element.",
    },
  },
};
export default meta;
type Story = StoryObj<typeof Sparkles>;

export const Default: Story = {
  args: {},
  render: (args) => (
    <Sparkles {...args}>
      <IconAIAssistant style={{ width: 28, height: 28, color: "var(--color-neutral-on-dark-icon)" }} />
    </Sparkles>
  ),
};

export const CustomColor: Story = {
  args: { color: "#FFD700" },
  render: (args) => (
    <Sparkles {...args}>
      <IconAIAssistant style={{ width: 28, height: 28, color: "var(--color-neutral-on-dark-icon)" }} />
    </Sparkles>
  ),
}; 