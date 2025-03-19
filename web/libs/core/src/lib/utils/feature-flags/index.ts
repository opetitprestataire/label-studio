export const isFlagEnabled = (id: string, flagList: Record<string, boolean>, defaultValue = false) => {
  if (id in flagList) {
    return flagList[id] ?? defaultValue;
  }
  return defaultValue;
};

const FEATURE_FLAGS = window.APP_SETTINGS?.feature_flags || {};

/**
 * Checks if the Feature Flag is active or not.
 *
 * @deprecated Use `isActive` instead
 */
export function isFF(id: string) {
  // TODO: remove the override + if statement once LSE and LSO start building react the same way and fflag_fix_front_lsdv_4620_memory_leaks_100723_short is removed
  const override: Record<string, boolean> = {};
  if (window?.APP_SETTINGS?.sentry_environment === "opensource" && id in override) {
    return override[id];
  }
  return isFlagEnabled(id, FEATURE_FLAGS, window.APP_SETTINGS?.feature_flags_default_value === true);
}

/**
 * Checks if the Feature Flag is active or not.
 */
export const isActive = (id: string) => {
  // TODO: remove the override + if statement once LSE and LSO start building react the same way and fflag_fix_front_lsdv_4620_memory_leaks_100723_short is removed
  const override: Record<string, boolean> = {};
  if (window?.APP_SETTINGS?.sentry_environment === "opensource" && id in override) {
    return override[id];
  }
  return isFlagEnabled(id, FEATURE_FLAGS, window.APP_SETTINGS?.feature_flags_default_value === true);
};

export * from "./flags";
