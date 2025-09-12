import { type FC, useState, useCallback } from "react";
import { IconSettings } from "@humansignal/icons";
import { ScatterSettingsDialog } from "./ScatterSettingsDialog";
import { Block } from "../../../utils/bem";
import { Button } from "@humansignal/ui";

interface ScatterSettings {
  classField: string;
}

interface ScatterSettingsButtonProps {
  onSettingsChange: (settings: ScatterSettings) => void;
  settings: ScatterSettings;
  availableFields: string[];
}

/**
 * Button that displays a settings dialog for ScatterView configuration
 * Allows the user to configure which data field should be used for coloring points
 */
export const ScatterSettingsButton: FC<ScatterSettingsButtonProps> = ({
  onSettingsChange,
  settings,
  availableFields,
}) => {
  const [showDialog, setShowDialog] = useState(false);

  const handleOpenDialog = useCallback(() => {
    setShowDialog(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setShowDialog(false);
  }, []);

  const handleSaveSettings = useCallback(
    (newSettings: ScatterSettings) => {
      onSettingsChange(newSettings);
    },
    [onSettingsChange],
  );

  return (
    <Block name="scatter-settings">
      <Button type="button" leading={<IconSettings />} onClick={handleOpenDialog} aria-label="Scatter view settings" />

      {showDialog && (
        <ScatterSettingsDialog
          isOpen={showDialog}
          onClose={handleCloseDialog}
          onSave={handleSaveSettings}
          settings={settings}
          availableFields={availableFields}
        />
      )}
    </Block>
  );
};
