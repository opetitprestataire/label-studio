import { getSnapshot, getType, type IStateTreeNode } from "mobx-state-tree";
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

/**
 * Clone node
 * @param {*} node
 * @param {boolean} uniqueId - if true, will generate a new id for the cloned node
 */
export function cloneNode(node: IStateTreeNode, uniqueId: boolean) {
  const snapshot = getSnapshot(node);
  const snapshotRandomId = getType(node).create({
    ...snapshot,
    ...(uniqueId
      ? {
          // cloneNode is usually used for creating a copy of some labeling control to keep it state on creating a region (as creating a region causes unselecting everything)
          // so by this id `from_name`in the region will look for the reference to the original node, and unique id is not acceptable in that case
          // that's the reason why we usually do not use guidGenerator() here, but keep the same id
          // if you need a clone with a new id, well, hey, I'm pretty impressed, but you can pass `uniqueId: true` to this function
          id: guidGenerator(),
        }
      : {}),
  });

  snapshotRandomId.afterClone?.(node);

  return snapshotRandomId;
}
