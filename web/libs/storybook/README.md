# Storybook for HumanSignal Frontend

This directory contains the Storybook configuration for visualizing and documenting UI components across the HumanSignal frontend applications. Storybook provides an isolated environment to develop, test, and document UI components.

## What is Storybook?

Storybook is a development environment for UI components that allows you to:

- Browse components in isolation
- View different states of each component
- Develop and test components interactively
- Document components with MDX
- Generate component documentation automatically

## Getting Started

### Running Storybook

To start the Storybook development server:

```bash
# From the root of the repository
nx storybook storybook

# Or using the project name
nx run storybook:storybook
```

This will start Storybook on port 4400. Open your browser and navigate to [http://localhost:4400](http://localhost:4400).

### Building Storybook

To build Storybook for static deployment:

```bash
nx build-storybook storybook
```

This will generate static files in `dist/libs/storybook/storybook`.

## Directory Structure

```
/web/libs/storybook/
├── .storybook/             # Storybook configuration
│   ├── main.ts             # Main configuration
│   ├── preview.ts          # Preview configuration 
│   └── preview.scss        # Global styles for stories
├── addons/                 # Custom Storybook addons
│   └── theme-toggle/       # Dark/light theme toggle
└── select/                 # Selection helpers
```

## Creating Stories

You can create stories for your components in two formats:

### Component Story Format (CSF)

Create a file with the extension `.stories.tsx` or `.stories.jsx` next to your component:

```tsx
// button.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  component: Button,
  title: "UI/Button",
  tags: ["autodocs"],
  argTypes: {
    // Control the props in the Storybook UI
    disabled: { control: "boolean" },
    size: { control: "select" },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// Define your stories
export const Primary: Story = {
  args: {
    children: "Primary Button",
    variant: "primary",
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary Button",
    variant: "secondary",
  },
};
```

### MDX Format

For more complex documentation, use MDX files:

```mdx
import { Meta, Story, Canvas } from '@storybook/addon-docs';
import { Button } from './button';

<Meta title="UI/Button" component={Button} />

# Button Component

Buttons allow users to trigger actions.

<Canvas>
  <Story name="Primary">
    <Button variant="primary">Primary Button</Button>
  </Story>
</Canvas>
```

## Best Practices

1. **Story Organization**:
   - Group related components under the same title prefix (e.g., "UI/Buttons")
   - Name stories semantically based on their purpose or state

2. **Documentation**:
   - Add `tags: ["autodocs"]` to generate automatic documentation
   - Include component description, props, and usage examples

3. **Testing Variations**:
   - Create stories for different states (loading, error, disabled)
   - Include edge cases (empty data, long content)
   - Test different sizes and variants

4. **Using Controls**:
   - Define `argTypes` for interactive controls
   - Use appropriate control types (select, boolean, text, etc.)

5. **Accessibility**:
   - Ensure components are accessible in all states
   - Test with keyboard navigation

## Theme Toggle Addon

The project includes a custom theme toggle addon that allows you to switch between light and dark themes. This helps test component appearance in both themes.

## Integration with Design System

Our Storybook uses the design tokens and styles from `@humansignal/ui`, ensuring components match the design system. The Tailwind CSS configuration is loaded automatically.

## Troubleshooting

- **Components not rendering properly**: Check that all required CSS is imported in `.storybook/preview.ts`
- **Controls not working**: Verify that `argTypes` are correctly configured
- **Missing dependencies**: Make sure all peer dependencies are installed

## Learn More

- [Storybook Documentation](https://storybook.js.org/docs/react/get-started/introduction)
- [Component Story Format](https://storybook.js.org/docs/react/api/csf)
- [Writing Stories](https://storybook.js.org/docs/react/writing-stories/introduction) 