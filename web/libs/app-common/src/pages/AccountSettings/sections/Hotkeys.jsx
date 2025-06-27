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

window.DEFAULT_HOTKEYS = DEFAULT_HOTKEYS;

export const HotkeysManager = () => {
  const toast = useToast();
  const [hotkeys, setHotkeys] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingHotkeyId, setEditingHotkeyId] = useState(null);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [dirtyState, setDirtyState] = useState({});
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [autoTranslatePlatforms, setAutoTranslatePlatforms] = useState(true);
  const [duplicateConfirmDialog, setDuplicateConfirmDialog] = useState({
    open: false,
    hotkeyId: null,
    newKey: null,
    conflictingHotkeys: [],
  });

  const api = useAPI();

  // Function to identify which hotkeys were modified from defaults
  const getModifiedHotkeys = (currentHotkeys) => {
    // Create a map of default hotkeys for quick comparison
    const defaultMap = {};
    DEFAULT_HOTKEYS.forEach((hotkey) => {
      defaultMap[`${hotkey.section}:${hotkey.element}`] = {
        key: hotkey.key,
        active: hotkey.active,
      };
    });

    // Find modified hotkeys
    return currentHotkeys.filter((hotkey) => {
      const keyId = `${hotkey.section}:${hotkey.element}`;
      const defaultValue = defaultMap[keyId];

      // If no default exists or key/active state differs, it's modified
      return !defaultValue || defaultValue.key !== hotkey.key || defaultValue.active !== hotkey.active;
    });
  };

  // Check if a hotkey conflicts with others globally
  const getGlobalDuplicates = (hotkeyId, newKey) => {
    return hotkeys.filter((h) => h.id !== hotkeyId && h.key === newKey);
  };

  // Save hotkeys to API function
  const saveHotkeysToAPI = useCallback(async () => {
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
    const customHotkeys = {};

    // Process all modified hotkeys
    modifiedHotkeys.forEach((hotkey) => {
      const keyId = `${hotkey.section}:${hotkey.element}`;
      customHotkeys[keyId] = {
        key: hotkey.key,
        active: hotkey.active,
      };
    });

    // Prepare request body
    const requestBody = {
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
      const response = await api.callApi("updateHotkeys", {
        body: requestBody,
      });

      // Check for API-level errors
      if (response.error) {
        return {
          ok: false,
          error: response.error,
          data: response,
        };
      }

      return {
        ok: true,
        error: null,
        data: response,
      };
    } catch (error) {
      console.error("Error saving hotkeys:", error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to save hotkeys";
      if (error.response) {
        // Server responded with error status
        if (error.response.status === 400) {
          errorMessage = error.response.data?.error || "Invalid hotkeys configuration";
        } else if (error.response.status === 401) {
          errorMessage = "Authentication required";
        } else if (error.response.status >= 500) {
          errorMessage = "Server error - please try again later";
        }
      } else if (error.request) {
        // Network error
        errorMessage = "Network error - please check your connection";
      }
      
      return {
        ok: false,
        error: errorMessage,
      };
    }
  });

  function updateHotkeysWithCustomSettings(defaultHotkeys, customHotkeys) {
    return defaultHotkeys.map((hotkey) => {
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
      const response = await api.callApi("hotkeys");
      
      if (response && response.custom_hotkeys) {
        // Use API data
        const updatedHotkeys = updateHotkeysWithCustomSettings(DEFAULT_HOTKEYS, response.custom_hotkeys);
        setHotkeys(updatedHotkeys);
      } else {
        // Fallback to window.APP_SETTINGS
        const customHotkeys = window.APP_SETTINGS?.user?.customHotkeys || {};
        const updatedHotkeys = updateHotkeysWithCustomSettings(DEFAULT_HOTKEYS, customHotkeys);
        setHotkeys(updatedHotkeys);
      }

      // Load the platform translation setting
      const platformSetting = window.APP_SETTINGS?.user?.hotkeySettings?.autoTranslatePlatforms;
      setAutoTranslatePlatforms(platformSetting !== undefined ? platformSetting : true);

    } catch (error) {
      console.error("Error loading hotkeys from API:", error);
      
      // Fallback to window.APP_SETTINGS on error
      const customHotkeys = window.APP_SETTINGS?.user?.customHotkeys || {};
      const updatedHotkeys = updateHotkeysWithCustomSettings(DEFAULT_HOTKEYS, customHotkeys);
      setHotkeys(updatedHotkeys);
      
      // Show non-blocking error notification
      toast.show({
        message: "Could not load custom hotkeys from server, using cached settings",
        type: ToastType.warning,
      });
    } finally {
      setIsLoading(false);
    }
  }, [api, toast]);

  // Load hotkeys on component mount
  useEffect(() => {
    loadHotkeysFromAPI();
  }, [loadHotkeysFromAPI]);

  // Handle toggling a single hotkey
  const handleToggleHotkey = (hotkeyId) => {
    // Update the hotkey
    const updatedHotkeys = hotkeys.map((hotkey) => {
      if (hotkey.id === hotkeyId) {
        return { ...hotkey, active: !hotkey.active };
      }
      return hotkey;
    });

    setHotkeys(updatedHotkeys);

    // Mark the section as having changes
    const hotkey = hotkeys.find((h) => h.id === hotkeyId);
    if (hotkey) {
      setDirtyState({
        ...dirtyState,
        [hotkey.section]: true,
      });
    }

    // Update global enabled state
    const allEnabled = updatedHotkeys.every((hotkey) => hotkey.active);
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

    setHotkeys([...DEFAULT_HOTKEYS]);
    setGlobalEnabled(true);
    setAutoTranslatePlatforms(true);
    setDirtyState({});

    toast.show({
      message: "All hotkeys and settings have been reset to defaults",
      type: ToastType.success,
    });
  };

  // Check if any section has unsaved changes
  const hasUnsavedChanges = Object.keys(dirtyState).some((key) => key !== "settings");

  // Helper function to get section title by ID
  const getSectionTitle = (sectionId) => {
    const section = HOTKEY_SECTIONS.find((s) => s.id === sectionId);
    return section ? section.title : sectionId;
  };

  // Handle saving an edited hotkey
  const handleSaveHotkey = (hotkeyId, newKey) => {
    // Find the hotkey to update
    const hotkey = hotkeys.find((h) => h.id === hotkeyId);
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
  const updateHotkeyKey = (hotkeyId, newKey) => {
    // Find the hotkey to update
    const hotkey = hotkeys.find((h) => h.id === hotkeyId);
    if (!hotkey) return;

    // Update the hotkey
    const updatedHotkeys = hotkeys.map((h) => {
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
    updateHotkeyKey(hotkeyId, newKey);
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
  const handleSaveSection = async (sectionId) => {
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
          sectionId === "settings" ? "Settings" : HOTKEY_SECTIONS.find((s) => s.id === sectionId)?.title;

        toast.show({
          message: `${sectionName} saved`,
          type: ToastType.success,
        });
      } else {
        toast.show({
          message: `Failed to save: ${result.error || "Unknown error"}`,
          type: ToastType.error,
        });
      }
    } catch (error) {
      toast.show({
        message: `Error saving: ${error.message}`,
        type: ToastType.error,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle exporting hotkeys
  const handleExportHotkeys = () => {
    // Create export data including settings
    const exportData = {
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

    toast.show({ message: "Hotkeys exported successfully", type: ToastType.success });
  };

  // Handle importing hotkeys
  const handleImportHotkeys = async (importedData) => {
    try {
      setIsLoading(true);

      // Handle both old format (just hotkeys array) and new format (with settings)
      const importedHotkeys = Array.isArray(importedData) ? importedData : importedData.hotkeys;
      const importedSettings = importedData.settings || {};

      // Update local state
      setHotkeys(importedHotkeys);

      // Update settings if provided
      if (importedSettings.autoTranslatePlatforms !== undefined) {
        setAutoTranslatePlatforms(importedSettings.autoTranslatePlatforms);
      }

      // Check if any hotkey is disabled to determine global state
      const allEnabled = importedHotkeys.every((hotkey) => hotkey.active);
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

      toast.show({ message: "Hotkeys imported successfully", type: ToastType.success });
    } catch (error) {
      toast.show({ message: `Error importing hotkeys: ${error.message}`, type: ToastType.error });
    } finally {
      setIsLoading(false);
    }
  };

  // Group hotkeys by section
  const getHotkeysBySection = (sectionId) => {
    return hotkeys.filter((hotkey) => hotkey.section === sectionId);
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
            <Button variant="secondary">Actions</Button>
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
            {HOTKEY_SECTIONS.map((section) => (
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
            {HOTKEY_SECTIONS.map((section) => (
              <HotkeySection
                key={section.id}
                section={section}
                hotkeys={getHotkeysBySection(section.id)}
                editingHotkeyId={editingHotkeyId}
                onSaveHotkey={handleSaveHotkey}
                onCancelEdit={handleCancelEdit}
                onToggleHotkey={handleToggleHotkey}
                onSaveSection={handleSaveSection}
                hasChanges={dirtyState[section.id]}
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
              {duplicateConfirmDialog.conflictingHotkeys.map((conflictHotkey) => (
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
