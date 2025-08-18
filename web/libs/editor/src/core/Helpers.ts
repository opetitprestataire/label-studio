import { guidGenerator } from "../utils/unique";

/**
 * TODO: refactor
 */
export { guidGenerator };

/**
 * Helper function to detect HTX Component
 */
export function isHtx(component: any, name: string) {
  return typeof component.type === "function" && component.type.name === `Htx${name}`;
}
