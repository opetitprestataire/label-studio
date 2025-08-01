import { ToastType, useToast } from "@humansignal/ui";
// @ts-ignore
import { confirm } from "apps/labelstudio/src/components/Modal/Modal";
import { useAPI } from "apps/labelstudio/src/providers/ApiProvider";
import { useCallback, useEffect, useState } from "react";
import {
  type ApiResponse,
  type ExportData,
  getTypedDefaultHotkeys,
  type Hotkey,
  type HotkeySettings,
  type ImportData,
  type SaveResult,
} from "../sections/Hotkeys/utils";

// Type definitions for better type safety
type EditorInstance = {
  store?: {
    annotation?: {
      setupHotKeys?: () => void;
    };
  };
  annotation?: {
    setupHotKeys?: () => void;
  };
};

// Type the imported defaults and convert numeric ids to strings
const typedDefaultHotkeys: Hotkey[] = getTypedDefaultHotkeys();

export const useHotkeys = () => {
  const toast = useToast();
  const [hotkeys, setHotkeys] = useState<Hotkey[]>([]);
  const [hotkeySettings, setHotkeySettings] = useState<HotkeySettings>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const api = useAPI();

  // Update hotkeys with custom settings
  const updateHotkeysWithCustomSettings = useCallback(
    (
      defaultHotkeys: Hotkey[],
      customHotkeys: Record<string, { key: string; active: boolean; description?: string }>,
    ): Hotkey[] => {
      return defaultHotkeys.map((hotkey: Hotkey) => {
        // Create the lookup key format used in the API response (section:element)
        const lookupKey = `${hotkey.section}:${hotkey.element}`;

        // Check if there's a custom setting for this hotkey
        if (customHotkeys[lookupKey]) {
          const customSetting = customHotkeys[lookupKey];
          // Create a new object with the default properties and override with custom ones
          return {
            ...hotkey,
            key: customSetting.key,
            active: customSetting.active,
            // Preserve the original label, only update description if provided
            ...(customSetting.description && {
              description: customSetting.description,
            }),
          };
        }

        // If no custom setting exists, return the default hotkey unchanged
        return hotkey;
      });
    },
    [],
  );

  // Runtime hotkey reload function - applies hotkeys without page refresh
  const reloadHotkeysInRuntime = useCallback(
    async (customHotkeys: Record<string, { key: string; active: boolean; description?: string }>) => {
      try {
        // Step 1: Process custom hotkeys the same way the server does in base.html
        const editorCustomHotkeys: Record<string, { key: string | null; active: boolean; description?: string }> = {};
        const prefixRegex = /^(annotation|timeseries|audio|regions|video|image_gallery|tools|data_manager):(.*)/;

        for (const key in customHotkeys) {
          const match = key.match(prefixRegex);
          if (match) {
            const [, prefix, shortKey] = match;
            const value = customHotkeys[key];

            // The shortKey might have double prefixes like "annotation:submit"
            // We need to construct the correct editor keymap key format
            const editorKey = shortKey.includes(":") ? shortKey : `${prefix}:${shortKey}`;

            // Check if value has active property set to false
            if (value && value.active === false) {
              // Create a copy of the value with key set to null
              const modifiedValue = { ...value, key: null };
              editorCustomHotkeys[editorKey] = modifiedValue;
            } else {
              // Use the original value
              editorCustomHotkeys[editorKey] = value;
            }
          }
        }

        // Step 2: Get default editor keymap and merge with custom hotkeys
        // Use the original defaults, which are now properly exposed globally
        const defaultEditorKeymap = window.DEFAULT_HOTKEYS || {};

        const mergedEditorKeymap = Object.assign({}, defaultEditorKeymap, editorCustomHotkeys);

        // Step 3: Update window.APP_SETTINGS with new hotkeys
        if (window.APP_SETTINGS) {
          window.APP_SETTINGS.editor_keymap = mergedEditorKeymap;
          window.APP_SETTINGS.user = window.APP_SETTINGS.user || {};
          window.APP_SETTINGS.user.customHotkeys = customHotkeys;
        }

        // Step 4: Re-apply keymap to editor instances if available
        // Check if Hotkey class is available globally
        if (typeof window !== "undefined") {
          // Try to access the Hotkey class through various possible global references
          const HotkeyClass = (window as any).Hotkey || (window as any).LSF?.Hotkey;

          if (HotkeyClass && typeof HotkeyClass.setKeymap === "function") {
            HotkeyClass.setKeymap(mergedEditorKeymap);
          }
        }

        // Step 5: Trigger re-initialization of hotkeys in editor instances
        // This is the most complex part as we need to access LabelStudio instances
        if (typeof window !== "undefined") {
          // Try to access LabelStudio instances through various possible global references
          const instances = (window as any).LabelStudio?.instances || (window as any).LSF?.instances || [];

          // Iterate through instances and trigger hotkey re-initialization
          if (Array.isArray(instances)) {
            instances.forEach((instance: EditorInstance) => {
              try {
                // Check if the instance has the store and annotation with setupHotKeys method
                if (
                  instance?.store?.annotation?.setupHotKeys &&
                  typeof instance.store.annotation.setupHotKeys === "function"
                ) {
                  instance.store.annotation.setupHotKeys();
                } else if (
                  instance?.annotation?.setupHotKeys &&
                  typeof instance.annotation.setupHotKeys === "function"
                ) {
                  instance.annotation.setupHotKeys();
                }
              } catch (error) {
                // Only log editor instance refresh failures in debug mode
                if (typeof window !== "undefined" && window.APP_SETTINGS?.debug) {
                  console.warn("Failed to refresh hotkeys for editor instance:", error);
                }
              }
            });
          } else if (instances && typeof (instances as any).forEach === "function") {
            // Handle Set or other iterable
            (instances as any).forEach((instance: EditorInstance) => {
              try {
                if (
                  instance?.store?.annotation?.setupHotKeys &&
                  typeof instance.store.annotation.setupHotKeys === "function"
                ) {
                  instance.store.annotation.setupHotKeys();
                } else if (
                  instance?.annotation?.setupHotKeys &&
                  typeof instance.annotation.setupHotKeys === "function"
                ) {
                  instance.annotation.setupHotKeys();
                }
              } catch (error) {
                // Only log editor instance refresh failures in debug mode
                if (typeof window !== "undefined" && window.APP_SETTINGS?.debug) {
                  console.warn("Failed to refresh hotkeys for editor instance:", error);
                }
              }
            });
          }
        }

        // Only log in debug mode
        if (typeof window !== "undefined" && window.APP_SETTINGS?.debug) {
          console.log("Hotkeys successfully reloaded at runtime");
        }
        return true;
      } catch (error) {
        // Only log in debug mode
        if (typeof window !== "undefined" && window.APP_SETTINGS?.debug) {
          console.error("Failed to reload hotkeys at runtime:", error);
        }
        return false;
      }
    },
    [],
  );

  // Load hotkeys from API
  const loadHotkeysFromAPI = useCallback(async () => {
    try {
      setIsLoading(true);

      // Use proper API endpoint name from the config
      const response = await api.callApi("hotkeys" as any);

      if (response && (response as ApiResponse).custom_hotkeys) {
        // Use API data
        const apiResponse = response as ApiResponse;
        const updatedHotkeys = updateHotkeysWithCustomSettings(typedDefaultHotkeys, apiResponse.custom_hotkeys!);
        setHotkeys(updatedHotkeys);
        // Store current settings from API response
        setHotkeySettings(apiResponse.hotkey_settings || {});
      } else {
        // Fallback to window.APP_SETTINGS
        const customHotkeys = window.APP_SETTINGS?.user?.customHotkeys || {};
        const updatedHotkeys = updateHotkeysWithCustomSettings(typedDefaultHotkeys, customHotkeys);
        setHotkeys(updatedHotkeys);
        // No settings available in fallback
        setHotkeySettings({});
      }
    } catch (error) {
      console.error("Error loading hotkeys from API:", error);

      // Fallback to window.APP_SETTINGS on error
      const customHotkeys = window.APP_SETTINGS?.user?.customHotkeys || {};
      const updatedHotkeys = updateHotkeysWithCustomSettings(typedDefaultHotkeys, customHotkeys);
      setHotkeys(updatedHotkeys);
      // No settings available in fallback
      setHotkeySettings({});

      // Show non-blocking error notification
      if (toast) {
        toast.show({
          message: "Could not load custom hotkeys from server, using cached settings",
          type: ToastType.error,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [api, toast, updateHotkeysWithCustomSettings]);

  // Save hotkeys to API function (handles both save and reset operations)
  const saveHotkeysToAPI = useCallback(
    async (currentHotkeys: Hotkey[], currentSettings: HotkeySettings): Promise<SaveResult> => {
      // Convert current hotkeys to API format - INCLUDE description to maintain API compatibility
      const customHotkeys: Record<string, { key: string; active: boolean; description?: string }> = {};

      // Process all current hotkeys (if empty, this results in reset)
      currentHotkeys.forEach((hotkey: Hotkey) => {
        const keyId = `${hotkey.section}:${hotkey.element}`;
        customHotkeys[keyId] = {
          key: hotkey.key,
          active: hotkey.active,
          ...(hotkey.description && { description: hotkey.description }),
        };
      });

      const requestBody = {
        custom_hotkeys: customHotkeys,
        hotkey_settings: currentSettings,
      };

      try {
        // Use proper API endpoint name from the config
        const response = await api.callApi("updateHotkeys" as any, {
          body: requestBody,
        });

        // Check for API-level errors
        if (response?.error) {
          return {
            ok: false,
            error: response.error,
            data: response,
          };
        }

        // After successful save, reload hotkeys at runtime to apply changes immediately
        const reloadSuccess = await reloadHotkeysInRuntime(customHotkeys);

        // Only log runtime reload status in debug mode
        if (typeof window !== "undefined" && window.APP_SETTINGS?.debug) {
          if (reloadSuccess) {
            console.log("Hotkeys successfully applied at runtime - no page refresh needed");
          } else {
            console.warn("Runtime hotkey reload failed - page refresh may be required");
          }
        }

        return {
          ok: true,
          error: undefined,
          data: response,
          runtimeReloadSuccess: reloadSuccess,
        };
      } catch (error: unknown) {
        const isReset = currentHotkeys.length === 0;
        const operation = isReset ? "resetting" : "saving";
        console.error(`Error ${operation} hotkeys:`, error);

        // Provide more specific error messages
        let errorMessage = `Failed to ${isReset ? "reset" : "save"} hotkeys`;
        if (error && typeof error === "object" && "response" in error) {
          const err = error as any;
          // Server responded with error status
          if (err.response?.status === 400) {
            errorMessage = err.response.data?.error || `Invalid ${isReset ? "reset request" : "hotkeys configuration"}`;
          } else if (err.response?.status === 401) {
            errorMessage = "Authentication required";
          } else if (err.response?.status >= 500) {
            errorMessage = "Server error - please try again later";
          }
        } else if (error && typeof error === "object" && "request" in error) {
          // Network error
          errorMessage = "Network error - please check your connection";
        }

        return {
          ok: false,
          error: errorMessage,
        };
      }
    },
    [api],
  );

  // Handle resetting all hotkeys to defaults
  const handleResetToDefaults = useCallback(() => {
    confirm({
      title: "Reset Hotkeys to Defaults?",
      body: "Are you sure you want to reset all hotkeys and settings to their default values? This action cannot be undone.",
      okText: "Reset to Defaults",
      buttonLook: "negative",
      style: { width: 500 },
      onOk: async () => {
        setIsLoading(true);

        try {
          // Reset hotkeys to defaults in the backend API (sets custom_hotkeys to {})
          const result = await saveHotkeysToAPI([], {});

          if (result.ok) {
            if (toast) {
              toast.show({
                message: "All hotkeys and settings have been reset to defaults and saved",
                type: ToastType.info,
              });
            }
            // Update local state to reflect the reset
            setHotkeys([...typedDefaultHotkeys]);
          } else {
            if (toast) {
              toast.show({
                message: `Failed to save reset hotkeys: ${result.error || "Unknown error"}`,
                type: ToastType.error,
              });
            }
          }
        } catch (error: unknown) {
          if (toast) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            toast.show({
              message: `Error resetting hotkeys: ${errorMessage}`,
              type: ToastType.error,
            });
          }
        } finally {
          setIsLoading(false);
        }
      },
    });
  }, [saveHotkeysToAPI, toast]);

  // Handle exporting hotkeys
  const handleExportHotkeys = useCallback(() => {
    // Create export data including current settings
    const exportData: ExportData = {
      hotkeys: hotkeys,
      settings: hotkeySettings,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };

    // Create a JSON string of the export data
    const exportJson = JSON.stringify(exportData, null, 2);

    // Create a blob with the JSON
    const blob = new Blob([exportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // Create a temporary link and click it to download the file
    const link = document.createElement("a");
    link.href = url;
    link.download = "hotkeys-export.json";
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (toast) {
      toast.show({
        message: "Hotkeys exported successfully",
        type: ToastType.info,
      });
    }
  }, [hotkeys, hotkeySettings, toast]);

  // Handle importing hotkeys
  const handleImportHotkeys = useCallback(
    async (importedData: ImportData | Hotkey[]) => {
      try {
        setIsLoading(true);

        // Handle both old format (just hotkeys array) and new format (with settings)
        const importedHotkeys = Array.isArray(importedData) ? importedData : importedData.hotkeys || [];
        const importedSettings: HotkeySettings = Array.isArray(importedData) ? {} : importedData.settings || {};

        // Save all imported data to API
        const result = await saveHotkeysToAPI(importedHotkeys, importedSettings);

        if (!result.ok) {
          throw new Error(result.error || "Failed to save imported hotkeys");
        }

        // Update local state
        setHotkeys(importedHotkeys);

        if (toast) {
          toast.show({
            message: "Hotkeys imported successfully",
            type: ToastType.info,
          });
        }

        // Reload from API to ensure consistency
        await loadHotkeysFromAPI();
      } catch (error: unknown) {
        if (toast) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          toast.show({
            message: `Error importing hotkeys: ${errorMessage}`,
            type: ToastType.error,
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [saveHotkeysToAPI, loadHotkeysFromAPI, toast],
  );

  // Load hotkeys on hook mount
  useEffect(() => {
    loadHotkeysFromAPI();
  }, [loadHotkeysFromAPI]);

  return {
    hotkeys,
    setHotkeys,
    hotkeySettings,
    setHotkeySettings,
    isLoading,
    setIsLoading,
    loadHotkeysFromAPI,
    saveHotkeysToAPI,
    handleResetToDefaults,
    handleExportHotkeys,
    handleImportHotkeys,
  };
};
