# Design Tokens Converter

This script converts Figma design tokens from the `designvariables.json` format into usable CSS variables and JavaScript objects for Tailwind integration.

## Features

- Converts Figma's design tokens to CSS variables
- Supports both light and dark themes
- Creates a JavaScript module for Tailwind integration
- Resolves token references like `{@primitives.$color.$sand.100}`

## How to Use

1. Export design tokens from Figma as `designvariables.json` and place it in the `label-studio/web/` directory
2. Run the conversion script:

```bash
node scripts/design-tokens-converter.js
```

3. This will generate:
   - `src/styles/design-tokens.scss` - Contains CSS variables for light and dark themes
   - `src/styles/design-tokens.js` - Contains JavaScript object for Tailwind integration

## Importing the Generated Files

### CSS Variables

Import the SCSS file in your main stylesheet:

```scss
@import 'src/styles/design-tokens.scss';
```

### Tailwind Integration

The `tailwind.config.js` file is already set up to import the design tokens. The tokens will be available in your Tailwind classes.

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

1. Replace the `designvariables.json` file
2. Run the conversion script again
3. The CSS and JavaScript files will be regenerated with the updated tokens 
