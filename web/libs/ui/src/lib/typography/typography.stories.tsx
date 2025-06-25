import type { Meta, StoryObj } from "@storybook/react";
import { Typography } from "./typography";

// Define a more specific type for the stories
type TypographyStory = StoryObj<{
  variant: "display" | "headline" | "title" | "label" | "body";
  size: string;
  style?: "normal" | "italic";
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  children: React.ReactNode;
}>;

const meta: Meta<typeof Typography> = {
  title: "UI/Typography",
  component: Typography,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: `
A flexible typography component that provides consistent text styling across the application.

## Features
- **Multiple variants**: display, headline, title, label, body
- **Size options**: Each variant has different size options (large, medium, small, etc.)
- **Custom elements**: Override the default HTML element with the \`as\` prop
- **Style options**: Normal and italic text styles
- **Responsive**: Built with Tailwind CSS for responsive design

## Usage
\`\`\`tsx
import { Typography } from '@humansignal/ui';

// Basic usage
<Typography variant="headline" size="large">
  This is a headline
</Typography>

// With custom element
<Typography variant="body" size="medium" as="span">
  This renders as a span
</Typography>

// With italic style
<Typography variant="label" size="small" style="italic">
  This is italic text
</Typography>
\`\`\`
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["display", "headline", "title", "label", "body"],
      description: "The typography variant to use",
    },
    size: {
      control: { type: "select" },
      description: "The size variant for the selected typography variant",
    },
    style: {
      control: { type: "select" },
      options: ["normal", "italic"],
      description: "The text style to apply",
    },
    as: {
      control: { type: "text" },
      description: "Override the default HTML element",
    },
    className: {
      control: { type: "text" },
      description: "Additional CSS classes to apply",
    },
  },
  tags: ["autodocs"],
};

export default meta;

// Base story with controls
export const Default: TypographyStory = {
  args: {
    variant: "headline",
    size: "large",
    children: "This is a sample headline",
  },
};

// Display variants
export const Display: TypographyStory = {
  args: {
    variant: "display",
    size: "large",
    children: "Display Large - The quick brown fox jumps over the lazy dog",
  },
  render: (args) => (
    <div className="space-y-4">
      <Typography variant="display" size="large">
        Display Large - The quick brown fox jumps over the lazy dog
      </Typography>
      <Typography variant="display" size="medium">
        Display Medium - The quick brown fox jumps over the lazy dog
      </Typography>
      <Typography variant="display" size="small">
        Display Small - The quick brown fox jumps over the lazy dog
      </Typography>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Display variants are the largest typography styles, typically used for hero sections and main page titles.",
      },
    },
  },
};

// Headline variants
export const Headline: TypographyStory = {
  args: {
    variant: "headline",
    size: "large",
    children: "Headline Large - The quick brown fox jumps over the lazy dog",
  },
  render: (args) => (
    <div className="space-y-4">
      <Typography variant="headline" size="large">
        Headline Large - The quick brown fox jumps over the lazy dog
      </Typography>
      <Typography variant="headline" size="medium">
        Headline Medium - The quick brown fox jumps over the lazy dog
      </Typography>
      <Typography variant="headline" size="small">
        Headline Small - The quick brown fox jumps over the lazy dog
      </Typography>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Headline variants are used for section headers and important content titles.",
      },
    },
  },
};

// Title variants
export const Title: TypographyStory = {
  args: {
    variant: "title",
    size: "large",
    children: "Title Large - The quick brown fox jumps over the lazy dog",
  },
  render: (args) => (
    <div className="space-y-4">
      <Typography variant="title" size="large">
        Title Large - The quick brown fox jumps over the lazy dog
      </Typography>
      <Typography variant="title" size="medium">
        Title Medium - The quick brown fox jumps over the lazy dog
      </Typography>
      <Typography variant="title" size="small">
        Title Small - The quick brown fox jumps over the lazy dog
      </Typography>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Title variants are used for subsection headers and content titles.",
      },
    },
  },
};

// Label variants
export const Label: TypographyStory = {
  args: {
    variant: "label",
    size: "medium",
    children: "Label Medium - The quick brown fox jumps over the lazy dog",
  },
  render: (args) => (
    <div className="space-y-4">
      <Typography variant="label" size="medium">
        Label Medium - The quick brown fox jumps over the lazy dog
      </Typography>
      <Typography variant="label" size="small">
        Label Small - The quick brown fox jumps over the lazy dog
      </Typography>
      <Typography variant="label" size="smaller">
        Label Smaller - The quick brown fox jumps over the lazy dog
      </Typography>
      <Typography variant="label" size="smallest">
        Label Smallest - The quick brown fox jumps over the lazy dog
      </Typography>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Label variants are used for form labels, buttons, and other UI elements that need emphasis.",
      },
    },
  },
};

// Body variants
export const Body: TypographyStory = {
  args: {
    variant: "body",
    size: "medium",
    children:
      "Body Medium - The quick brown fox jumps over the lazy dog. This is the standard body text size used for most content.",
  },
  render: (args) => (
    <div className="space-y-4">
      <Typography variant="body" size="medium">
        Body Medium - The quick brown fox jumps over the lazy dog. This is the standard body text size used for most
        content.
      </Typography>
      <Typography variant="body" size="small">
        Body Small - The quick brown fox jumps over the lazy dog. This is used for secondary content and captions.
      </Typography>
      <Typography variant="body" size="smaller">
        Body Smaller - The quick brown fox jumps over the lazy dog. This is used for fine print and less important text.
      </Typography>
      <Typography variant="body" size="smallest">
        Body Smallest - The quick brown fox jumps over the lazy dog. This is the smallest readable text size.
      </Typography>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Body variants are used for main content text, paragraphs, and general reading material.",
      },
    },
  },
};

// All variants comparison
export const AllVariants: TypographyStory = {
  args: {
    variant: "display",
    size: "large",
    children: "Display Large",
  },
  render: (args) => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Display Variants</h3>
        <div className="space-y-2">
          <Typography variant="display" size="large">
            Display Large
          </Typography>
          <Typography variant="display" size="medium">
            Display Medium
          </Typography>
          <Typography variant="display" size="small">
            Display Small
          </Typography>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Headline Variants</h3>
        <div className="space-y-2">
          <Typography variant="headline" size="large">
            Headline Large
          </Typography>
          <Typography variant="headline" size="medium">
            Headline Medium
          </Typography>
          <Typography variant="headline" size="small">
            Headline Small
          </Typography>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Title Variants</h3>
        <div className="space-y-2">
          <Typography variant="title" size="large">
            Title Large
          </Typography>
          <Typography variant="title" size="medium">
            Title Medium
          </Typography>
          <Typography variant="title" size="small">
            Title Small
          </Typography>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Label Variants</h3>
        <div className="space-y-2">
          <Typography variant="label" size="medium">
            Label Medium
          </Typography>
          <Typography variant="label" size="small">
            Label Small
          </Typography>
          <Typography variant="label" size="smaller">
            Label Smaller
          </Typography>
          <Typography variant="label" size="smallest">
            Label Smallest
          </Typography>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Body Variants</h3>
        <div className="space-y-2">
          <Typography variant="body" size="medium">
            Body Medium
          </Typography>
          <Typography variant="body" size="small">
            Body Small
          </Typography>
          <Typography variant="body" size="smaller">
            Body Smaller
          </Typography>
          <Typography variant="body" size="smallest">
            Body Smallest
          </Typography>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "A comprehensive view of all typography variants and their sizes for easy comparison.",
      },
    },
  },
};

// Style variations
export const Styles: TypographyStory = {
  args: {
    variant: "headline",
    size: "large",
    style: "normal",
    children: "Normal Style - The quick brown fox jumps over the lazy dog",
  },
  render: (args) => (
    <div className="space-y-4">
      <Typography variant="headline" size="large" style="normal">
        Normal Style - The quick brown fox jumps over the lazy dog
      </Typography>
      <Typography variant="headline" size="large" style="italic">
        Italic Style - The quick brown fox jumps over the lazy dog
      </Typography>
      <Typography variant="body" size="medium" style="normal">
        Normal body text - The quick brown fox jumps over the lazy dog
      </Typography>
      <Typography variant="body" size="medium" style="italic">
        Italic body text - The quick brown fox jumps over the lazy dog
      </Typography>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Typography component supports both normal and italic text styles.",
      },
    },
  },
};

// Custom elements
export const CustomElements: TypographyStory = {
  args: {
    variant: "headline",
    size: "large",
    as: "h1",
    children: "This renders as an H1 element",
  },
  render: (args) => (
    <div className="space-y-4">
      <Typography variant="headline" size="large" as="h1">
        This renders as an H1 element
      </Typography>
      <Typography variant="title" size="medium" as="h2">
        This renders as an H2 element
      </Typography>
      <Typography variant="body" size="medium" as="span">
        This renders as a span element
      </Typography>
      <Typography variant="label" size="small" as="label">
        This renders as a label element
      </Typography>
      <Typography variant="body" size="small" as="div">
        This renders as a div element
      </Typography>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Use the `as` prop to override the default HTML element while maintaining the typography styles.",
      },
    },
  },
};

// Interactive example
export const Interactive: TypographyStory = {
  args: {
    variant: "headline",
    size: "medium",
    children: "Interactive Typography Example",
  },
  render: (args) => (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg">
        <Typography variant="headline" size="medium" className="mb-2">
          Interactive Typography Example
        </Typography>
        <Typography variant="body" size="medium" className="mb-4">
          This example shows how typography components can be used in interactive contexts. You can customize the
          variant, size, and style using the controls below.
        </Typography>
        <Typography variant="label" size="small" style="italic">
          Use the Storybook controls to experiment with different typography options.
        </Typography>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "An interactive example showing how typography components work together in a real-world context.",
      },
    },
  },
};
