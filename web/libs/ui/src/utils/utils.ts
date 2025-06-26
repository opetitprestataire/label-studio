import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Smart merge class names
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// const customTwMerge = extendTailwindMerge({
//   classGroups: {
//     text: [
//       // 🧠 Explicitly split text size and text color
//       {
//         fontSize: [
//           "text-xs",
//           "text-sm",
//           "text-base",
//           "text-lg",
//           "text-xl",
//           // /^text-(title|body|display|label|headline)-/,
//           { "text-display": ["large", "medium", "small"] },
//           { "text-headline": ["large", "medium", "small"] },
//           { "text-title": ["large", "medium", "small"] },
//           { "text-label": ["medium", "small", "smaller", "smallest"] },
//           { "text-body": ["medium", "small", "smaller", "smallest"] },
//         ],
//       },
//       {
//         color: [
//           "text-black",
//           "text-white",
//           // /^text-(neutral|negative|positive|primary|secondary|accent|success|error|warning)-/,
//         ],
//       },
//     ],
//   },
// });

const customTwMerge = extendTailwindMerge({
  classGroups: {
    "font-size": [
      "text-xs",
      "text-sm",
      "text-base",
      "text-lg",
      "text-xl",
      "text-display-large",
      // /^text-(title|body|display|label|headline)-/,
      { "text-display": ["large", "medium", "small"] },
      { "text-headline": ["large", "medium", "small"] },
      { "text-title": ["large", "medium", "small"] },
      { "text-label": ["medium", "small", "smaller", "smallest"] },
      { "text-body": ["medium", "small", "smaller", "smallest"] },
    ],
  },
});

/**
 * Merge class names + merge optimize Tailwind classes
 */
export function cnm(...input: ClassValue[]) {
  return customTwMerge(cn(input));
}
