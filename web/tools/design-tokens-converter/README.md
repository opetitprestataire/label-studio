# Design Tokens Converter

This script converts Figma design tokens from the `design-tokens.json` format into usable CSS variables and JavaScript objects for Tailwind integration.

## Features

- Converts Figma's design tokens to CSS variables
- Supports both light and dark themes
- Creates a JavaScript module for Tailwind integration
- Resolves token references like `{@primitives.$color.$sand.100}`

## How to Use

1. Export design tokens from Figma as `design-tokens.json` and place it in the `label-studio/web/` directory (workspace root)
2. Run the conversion script using NX:

```bash
nx design-tokens ui
```

3. This will generate:
   - `libs/ui/src/tokens/tokens.scss` - Contains CSS variables for light and dark themes
   - `libs/ui/src/tokens/tokens.js` - Contains JavaScript object for Tailwind integration

## Importing the Generated Files

### CSS Variables

Import the SCSS file in your main stylesheet:

```scss
@import 'libs/ui/src/tokens/tokens.scss';
```

### Tailwind Integration

Update your Tailwind configuration to import the design tokens:

```js
// tailwind.config.js
const designTokens = require('./libs/ui/src/tokens/tokens.js');

module.exports = {
  // ...
  theme: {
    extend: {
      colors: {
        // ...your existing colors
        ...designTokens.colors,
      },
    },
  },
};
```

## Usage Examples

### Using CSS Variables

```css
.my-element {
  color: var(--color-primary-content);
  background-color: var(--color-neutral-surface);
}
```

### Using in Tailwind Classes

```html
<div class="text-primary-content bg-neutral-surface">
  Styled with design tokens
</div>
```

## Dark Mode

The CSS variables support dark mode with the `data-theme="dark"` attribute:

```html
<body data-theme="dark">
  <!-- Dark theme will be applied -->
</body>
```

## Updating Design Tokens

When you get updated design tokens from Figma:

1. Replace the `design-tokens.json` file in the workspace root
2. Run the NX command again: `nx design-tokens ui`
3. The CSS and JavaScript files will be regenerated with the updated tokens 
