import { useEffect, useState, useCallback } from "react";
import { ToastType, useToast } from "@humansignal/ui";

// Shadcn UI components
import { Button } from "@humansignal/ui";
import { Card, CardContent, CardHeader } from "@humansignal/shad/components/ui/card";
import { Badge } from "@humansignal/shad/components/ui/badge";
import { Skeleton } from "@humansignal/shad/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@humansignal/shad/components/ui/dialog";

import { Dropdown } from "apps/labelstudio/src/components/Dropdown/Dropdown";
import { Menu } from "apps/labelstudio/src/components/Menu/Menu";
import { useAPI } from "apps/labelstudio/src/providers/ApiProvider";

import { HotkeySection } from "./Hotkeys/Section";
import { ImportDialog } from "./Hotkeys/Import";
import { DEFAULT_HOTKEYS, HOTKEY_SECTIONS } from "./Hotkeys/defaults";
import styles from "../AccountSettings.module.scss";

// Type definitions
interface Hotkey {
  id: string;
  section: string;
  element: string;
  label: string;
  key: string;
  mac?: string;
  active: boolean;
}

interface Section {
  id: string;
  title: string;
  description?: string;
}

interface DirtyState {
  [sectionId: string]: boolean;
}

interface DuplicateConfirmDialog {
  open: boolean;
  hotkeyId: string | null;
  newKey: string | null;
  conflictingHotkeys: Hotkey[];
}

interface HotkeySettings {
  autoTranslatePlatforms: boolean;
}

interface ExportData {
  hotkeys: Hotkey[];
  settings: HotkeySettings;
  exportedAt: string;
  version: string;
}

interface ImportData {
  hotkeys?: Hotkey[];
  settings?: HotkeySettings;
}

interface SaveResult {
  ok: boolean;
  error?: string;
  data?: any;
}

interface ApiResponse {
  custom_hotkeys?: Record<string, { key: string; active: boolean }>;
  hotkey_settings?: HotkeySettings;
  error?: string;
}

// Extend window type for global properties
declare global {
  interface Window {
    DEFAULT_HOTKEYS: Hotkey[];
    APP_SETTINGS?: {
      user?: {
        customHotkeys?: Record<string, { key: string; active: boolean }>;
        hotkeySettings?: HotkeySettings;
      };
    };
  }
}

// Type the imported defaults
const typedDefaultHotkeys = DEFAULT_HOTKEYS as Hotkey[];
const typedHotkeySections = HOTKEY_SECTIONS as Section[];

window.DEFAULT_HOTKEYS = typedDefaultHotkeys;

export const HotkeysManager = () => {
  const toast = useToast();
  const [hotkeys, setHotkeys] = useState<Hotkey[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [editingHotkeyId, setEditingHotkeyId] = useState<string | null>(null);
  const [globalEnabled, setGlobalEnabled] = useState<boolean>(true);
  const [dirtyState, setDirtyState] = useState<DirtyState>({});
  const [importDialogOpen, setImportDialogOpen] = useState<boolean>(false);
  const [autoTranslatePlatforms, setAutoTranslatePlatforms] = useState<boolean>(true);
  const [duplicateConfirmDialog, setDuplicateConfirmDialog] = useState<DuplicateConfirmDialog>({
    open: false,
    hotkeyId: null,
    newKey: null,
    conflictingHotkeys: [],
  });

  const api = useAPI();

  // Function to identify which hotkeys were modified from defaults
  const getModifiedHotkeys = (currentHotkeys: Hotkey[]): Hotkey[] => {
    // Create a map of default hotkeys for quick comparison
    const defaultMap: Record<string, { key: string; active: boolean }> = {};
    typedDefaultHotkeys.forEach((hotkey: Hotkey) => {
      defaultMap[`${hotkey.section}:${hotkey.element}`] = {
        key: hotkey.key,
        active: hotkey.active,
      };
    });

    // Find modified hotkeys
    return currentHotkeys.filter((hotkey: Hotkey) => {
      const keyId = `${hotkey.section}:${hotkey.element}`;
      const defaultValue = defaultMap[keyId];

      // If no default exists or key/active state differs, it's modified
      return !defaultValue || defaultValue.key !== hotkey.key || defaultValue.active !== hotkey.active;
    });
  };

  // Check if a hotkey conflicts with others globally
  const getGlobalDuplicates = (hotkeyId: string, newKey: string): Hotkey[] => {
    return hotkeys.filter((h: Hotkey) => h.id !== hotkeyId && h.key === newKey);
  };

  // Save hotkeys to API function
  const saveHotkeysToAPI = useCallback(async (): Promise<SaveResult> => {
    // Get all modified hotkeys, not just from one section
    const modifiedHotkeys = getModifiedHotkeys(hotkeys);

    // Check if settings changed from defaults
    const defaultAutoTranslate = true; // Default value
    const settingsChanged = autoTranslatePlatforms !== defaultAutoTranslate;

    // If nothing was modified, return success without API call
    if (modifiedHotkeys.length === 0 && !settingsChanged) {
      return { ok: true, data: { message: "No changes to save" } };
    }

    // Convert our array format to the API's expected JSON object format
    const customHotkeys: Record<string, { key: string; active: boolean }> = {};

    // Process all modified hotkeys
    modifiedHotkeys.forEach((hotkey: Hotkey) => {
      const keyId = `${hotkey.section}:${hotkey.element}`;
      customHotkeys[keyId] = {
        key: hotkey.key,
        active: hotkey.active,
      };
    });

    // Prepare request body
    const requestBody: {
      custom_hotkeys: Record<string, { key: string; active: boolean }>;
      hotkey_settings?: HotkeySettings;
    } = {
      custom_hotkeys: customHotkeys,
    };

    // Only include settings if they changed from defaults
    if (settingsChanged) {
      requestBody.hotkey_settings = {
        autoTranslatePlatforms: autoTranslatePlatforms,
      };
    }

    try {
      // Call the API to save all modified hotkeys and settings
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

      return {
        ok: true,
        error: undefined,
        data: response,
      };
    } catch (error: unknown) {
      console.error("Error saving hotkeys:", error);

      // Provide more specific error messages
      let errorMessage = "Failed to save hotkeys";
      if (error && typeof error === "object" && "response" in error) {
        const err = error as any;
        // Server responded with error status
        if (err.response?.status === 400) {
          errorMessage = err.response.data?.error || "Invalid hotkeys configuration";
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
  }, [hotkeys, autoTranslatePlatforms, api]);

  function updateHotkeysWithCustomSettings(
    defaultHotkeys: Hotkey[],
    customHotkeys: Record<string, { key: string; active: boolean }>,
  ): Hotkey[] {
    return defaultHotkeys.map((hotkey: Hotkey) => {
      // Create the lookup key format used in the API response (section:element)
      const lookupKey = `${hotkey.section}:${hotkey.element}`;

      // Check if there's a custom setting for this hotkey
      if (customHotkeys[lookupKey]) {
        // Create a new object with the default properties and override with custom ones
        return {
          ...hotkey,
          ...customHotkeys[lookupKey],
        };
      }

      // If no custom setting exists, return the default hotkey unchanged
      return hotkey;
    });
  }

  // Load hotkeys from API
  const loadHotkeysFromAPI = useCallback(async () => {
    try {
      setIsLoading(true);

      // Try to load from API first
      const response = await api.callApi("hotkeys" as any);

      if (response && (response as ApiResponse).custom_hotkeys) {
        // Use API data
        const apiResponse = response as ApiResponse;
        const updatedHotkeys = updateHotkeysWithCustomSettings(typedDefaultHotkeys, apiResponse.custom_hotkeys!);
        setHotkeys(updatedHotkeys);
      } else {
        // Fallback to window.APP_SETTINGS
        const customHotkeys = window.APP_SETTINGS?.user?.customHotkeys || {};
        const updatedHotkeys = updateHotkeysWithCustomSettings(typedDefaultHotkeys, customHotkeys);
        setHotkeys(updatedHotkeys);
      }

      // Load the platform translation setting
      const platformSetting = window.APP_SETTINGS?.user?.hotkeySettings?.autoTranslatePlatforms;
      setAutoTranslatePlatforms(platformSetting !== undefined ? platformSetting : true);
    } catch (error) {
      console.error("Error loading hotkeys from API:", error);

      // Fallback to window.APP_SETTINGS on error
      const customHotkeys = window.APP_SETTINGS?.user?.customHotkeys || {};
      const updatedHotkeys = updateHotkeysWithCustomSettings(typedDefaultHotkeys, customHotkeys);
      setHotkeys(updatedHotkeys);

      // Show non-blocking error notification
      if (toast) {
        toast.show({
          message: "Could not load custom hotkeys from server, using cached settings",
          type: ToastType.Warning,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [api, toast]);

  // Load hotkeys on component mount
  useEffect(() => {
    loadHotkeysFromAPI();
  }, [loadHotkeysFromAPI]);

  // Handle toggling a single hotkey
  const handleToggleHotkey = (hotkeyId: string) => {
    // Update the hotkey
    const updatedHotkeys = hotkeys.map((hotkey: Hotkey) => {
      if (hotkey.id === hotkeyId) {
        return { ...hotkey, active: !hotkey.active };
      }
      return hotkey;
    });

    setHotkeys(updatedHotkeys);

    // Mark the section as having changes
    const hotkey = hotkeys.find((h: Hotkey) => h.id === hotkeyId);
    if (hotkey) {
      setDirtyState({
        ...dirtyState,
        [hotkey.section]: true,
      });
    }

    // Update global enabled state
    const allEnabled = updatedHotkeys.every((hotkey: Hotkey) => hotkey.active);
    setGlobalEnabled(allEnabled);
  };

  // Handle resetting all hotkeys to defaults
  const handleResetToDefaults = () => {
    const hasChanges = hasUnsavedChanges || dirtyState.settings;
    const confirmMessage = hasChanges
      ? "Are you sure you want to reset all hotkeys and settings to their default values? This will discard all unsaved changes and cannot be undone."
      : "Are you sure you want to reset all hotkeys and settings to their default values? This cannot be undone.";

    if (!confirm(confirmMessage)) {
      return;
    }

    setHotkeys([...typedDefaultHotkeys]);
    setGlobalEnabled(true);
    setAutoTranslatePlatforms(true);
    setDirtyState({});

    if (toast) {
      toast.show({
        message: "All hotkeys and settings have been reset to defaults",
        type: ToastType.Success,
      });
    }
  };

  // Check if any section has unsaved changes
  const hasUnsavedChanges = Object.keys(dirtyState).some((key: string) => key !== "settings");

  // Helper function to get section title by ID
  const getSectionTitle = (sectionId: string): string => {
    const section = typedHotkeySections.find((s: Section) => s.id === sectionId);
    return section ? section.title : sectionId;
  };

  // Handle saving an edited hotkey
  const handleSaveHotkey = (hotkeyId: string, newKey: string) => {
    // Find the hotkey to update
    const hotkey = hotkeys.find((h: Hotkey) => h.id === hotkeyId);
    if (!hotkey) return;

    // Check for global duplicates
    const conflictingHotkeys = getGlobalDuplicates(hotkeyId, newKey);

    if (conflictingHotkeys.length > 0) {
      // Show confirmation dialog for duplicates
      setDuplicateConfirmDialog({
        open: true,
        hotkeyId,
        newKey,
        conflictingHotkeys,
      });
      return;
    }

    // No conflicts, proceed with the update
    updateHotkeyKey(hotkeyId, newKey);
  };

  // Function to actually update the hotkey key
  const updateHotkeyKey = (hotkeyId: string, newKey: string) => {
    // Find the hotkey to update
    const hotkey = hotkeys.find((h: Hotkey) => h.id === hotkeyId);
    if (!hotkey) return;

    // Update the hotkey
    const updatedHotkeys = hotkeys.map((h: Hotkey) => {
      if (h.id === hotkeyId) {
        return { ...h, key: newKey, mac: newKey };
      }
      return h;
    });

    setHotkeys(updatedHotkeys);

    // Mark the section as having changes
    setDirtyState({
      ...dirtyState,
      [hotkey.section]: true,
    });

    // Exit edit mode
    setEditingHotkeyId(null);
  };

  // Handle confirming duplicate hotkey
  const handleConfirmDuplicate = () => {
    const { hotkeyId, newKey } = duplicateConfirmDialog;

    // Close the dialog
    setDuplicateConfirmDialog({
      open: false,
      hotkeyId: null,
      newKey: null,
      conflictingHotkeys: [],
    });

    // Proceed with the update
    if (hotkeyId && newKey) {
      updateHotkeyKey(hotkeyId, newKey);
    }
  };

  // Handle canceling duplicate confirmation
  const handleCancelDuplicate = () => {
    setDuplicateConfirmDialog({
      open: false,
      hotkeyId: null,
      newKey: null,
      conflictingHotkeys: [],
    });
  };

  // Handle canceling edit mode
  const handleCancelEdit = () => {
    setEditingHotkeyId(null);
  };

  // Handle saving a section's hotkeys
  const handleSaveSection = async (sectionId: string) => {
    setIsLoading(true);

    try {
      // Save ALL modified hotkeys and settings, not just this section
      const result = await saveHotkeysToAPI();

      if (result.ok) {
        // Clear the dirty state for this section
        const newDirtyState = { ...dirtyState };
        delete newDirtyState[sectionId];
        setDirtyState(newDirtyState);

        const sectionName =
          sectionId === "settings" ? "Settings" : typedHotkeySections.find((s: Section) => s.id === sectionId)?.title;

        if (toast) {
          toast.show({
            message: `${sectionName} saved`,
            type: ToastType.Success,
          });
        }
      } else {
        if (toast) {
          toast.show({
            message: `Failed to save: ${result.error || "Unknown error"}`,
            type: ToastType.Error,
          });
        }
      }
    } catch (error: unknown) {
      if (toast) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        toast.show({
          message: `Error saving: ${errorMessage}`,
          type: ToastType.Error,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle exporting hotkeys
  const handleExportHotkeys = () => {
    // Create export data including settings
    const exportData: ExportData = {
      hotkeys: hotkeys,
      settings: {
        autoTranslatePlatforms: autoTranslatePlatforms,
      },
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
      toast.show({ message: "Hotkeys exported successfully", type: ToastType.Success });
    }
  };

  // Handle importing hotkeys
  const handleImportHotkeys = async (importedData: ImportData | Hotkey[]) => {
    try {
      setIsLoading(true);

      // Handle both old format (just hotkeys array) and new format (with settings)
      const importedHotkeys = Array.isArray(importedData) ? importedData : importedData.hotkeys || [];
      const importedSettings = Array.isArray(importedData) ? {} : importedData.settings || {};

      // Update local state
      setHotkeys(importedHotkeys);

      // Update settings if provided
      if (importedSettings.autoTranslatePlatforms !== undefined) {
        setAutoTranslatePlatforms(importedSettings.autoTranslatePlatforms);
      }

      // Check if any hotkey is disabled to determine global state
      const allEnabled = importedHotkeys.every((hotkey: Hotkey) => hotkey.active);
      setGlobalEnabled(allEnabled);

      // Save all imported data to API
      const result = await saveHotkeysToAPI();

      if (!result.ok) {
        throw new Error(result.error || "Failed to save imported hotkeys");
      }

      // Reload from API to ensure consistency
      await loadHotkeysFromAPI();

      // Reset dirty state
      setDirtyState({});

      if (toast) {
        toast.show({ message: "Hotkeys imported successfully", type: ToastType.Success });
      }
    } catch (error: unknown) {
      if (toast) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        toast.show({ message: `Error importing hotkeys: ${errorMessage}`, type: ToastType.Error });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Group hotkeys by section
  const getHotkeysBySection = (sectionId: string): Hotkey[] => {
    return hotkeys.filter((hotkey: Hotkey) => hotkey.section === sectionId);
  };

  return (
    <div id="hotkeys-manager">
      <div className={styles.sectionContent}>
        <div className={styles.flexRow} style={{ justifyContent: "flex-end", marginBottom: "var(--spacing-wide)" }}>
          <Dropdown.Trigger
            align="right"
            content={
              <Menu>
                <Menu.Item label="Export Hotkeys" onClick={handleExportHotkeys} />
                <Menu.Item label="Import Hotkeys" onClick={() => setImportDialogOpen(true)} />
                <Menu.Divider />
                <Menu.Item label="Reset to Defaults" onClick={handleResetToDefaults} />
              </Menu>
            }
          >
            <Button variant="neutral">Actions</Button>
          </Dropdown.Trigger>
        </div>

        {isLoading && hotkeys.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-wide)" }}>
            {/* Platform settings skeleton */}
            <Card>
              <CardHeader style={{ paddingBottom: "var(--spacing-tight)" }}>
                <Skeleton style={{ height: "1.5rem", width: "250px" }} />
                <Skeleton style={{ height: "1rem", width: "300px" }} />
              </CardHeader>
              <CardContent>
                <Skeleton style={{ height: "1.25rem", width: "180px", marginBottom: "var(--spacing-tight)" }} />
                <Skeleton style={{ height: "1rem", width: "250px" }} />
              </CardContent>
            </Card>

            {/* Hotkey sections skeleton */}
            {typedHotkeySections.map((section: Section) => (
              <Card key={section.id}>
                <CardHeader style={{ paddingBottom: "var(--spacing-tight)" }}>
                  <Skeleton style={{ height: "1.5rem", width: "250px" }} />
                  <Skeleton style={{ height: "1rem", width: "300px" }} />
                </CardHeader>
                <CardContent>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        padding: "var(--spacing-wide) 0",
                        borderBottom: i < 3 ? "1px solid var(--border-color)" : "none",
                      }}
                    >
                      <Skeleton style={{ height: "1.25rem", width: "180px", marginBottom: "var(--spacing-tight)" }} />
                      <Skeleton style={{ height: "1rem", width: "250px" }} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-wide)" }}>
            {/* Hotkey Sections */}
            {typedHotkeySections.map((section: Section) => (
              <HotkeySection
                key={section.id}
                section={section}
                hotkeys={getHotkeysBySection(section.id)}
                editingHotkeyId={editingHotkeyId}
                onSaveHotkey={handleSaveHotkey}
                onCancelEdit={handleCancelEdit}
                onToggleHotkey={handleToggleHotkey}
                onSaveSection={handleSaveSection}
                hasChanges={dirtyState[section.id] || false}
                onEditHotkey={setEditingHotkeyId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Import Dialog */}
      <ImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} onImport={handleImportHotkeys} />

      {/* Duplicate Confirmation Dialog */}
      <Dialog open={duplicateConfirmDialog.open} onOpenChange={handleCancelDuplicate}>
        <DialogContent className="bg-neutral-surface">
          <DialogHeader>
            <DialogTitle>Duplicate Hotkey Detected</DialogTitle>
            <DialogDescription>
              The hotkey combination "<strong>{duplicateConfirmDialog.newKey}</strong>" is already being used by:
            </DialogDescription>
          </DialogHeader>

          <div
            style={{
              padding: "var(--spacing-wide) 0",
              maxHeight: "15rem",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-wide)" }}>
              {duplicateConfirmDialog.conflictingHotkeys.map((conflictHotkey: Hotkey) => (
                <div
                  key={conflictHotkey.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "var(--spacing-wide)",
                    backgroundColor: "var(--bg-neutral-surface)",
                    borderRadius: "var(--border-radius)",
                  }}
                >
                  <div style={{ flex: "1", minWidth: "0" }}>
                    <div
                      style={{ fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {conflictHotkey.label}
                    </div>
                    <div style={{ fontSize: "var(--font-size-small)", color: "var(--text-muted)" }}>
                      {getSectionTitle(conflictHotkey.section)}
                    </div>
                  </div>
                  <Badge variant="secondary" style={{ marginLeft: "var(--spacing-tight)", flexShrink: "0" }}>
                    {conflictHotkey.key}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <DialogDescription
            style={{
              color: "var(--color-warning-text)",
              backgroundColor: "var(--color-warning-background)",
              padding: "var(--spacing-wide)",
              borderRadius: "var(--border-radius)",
              border: "1px solid var(--color-warning-border)",
            }}
          >
            ⚠️ Having duplicate hotkeys may cause conflicts and unexpected behavior. Are you sure you want to proceed?
          </DialogDescription>

          <DialogFooter>
            <Button variant="neutral" onClick={handleCancelDuplicate}>
              Cancel
            </Button>
            <Button onClick={handleConfirmDuplicate}>Allow Duplicate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
