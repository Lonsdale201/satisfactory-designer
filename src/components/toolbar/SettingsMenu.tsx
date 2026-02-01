import { memo } from "react";
import { Menu, MenuItem, Switch, FormControlLabel } from "@mui/material";

export interface UiSettings {
  alwaysShowEdgeLabels: boolean;
  showPower: boolean;
  showInventory: boolean;
  showProductionEfficiency: boolean;
  hideAllImages: boolean;
  hideIoStats: boolean;
  hideMinimap: boolean;
  hideRequiredItems: boolean;
  ghostHideConnectionLines: boolean;
}

interface SettingsMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  uiSettings: UiSettings;
  setUiSettings: React.Dispatch<React.SetStateAction<UiSettings>>;
}

const SettingsMenu = memo(
  ({
    anchorEl,
    open,
    onClose,
    uiSettings,
    setUiSettings,
  }: SettingsMenuProps) => {
    return (
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: { bgcolor: "#111827", color: "#e5e7eb", minWidth: 240 },
        }}
      >
        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={uiSettings.alwaysShowEdgeLabels}
                onChange={(e) =>
                  setUiSettings((s) => ({
                    ...s,
                    alwaysShowEdgeLabels: e.target.checked,
                  }))
                }
              />
            }
            label="Always show edge labels"
          />
        </MenuItem>
        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={uiSettings.showPower}
                onChange={(e) =>
                  setUiSettings((s) => ({ ...s, showPower: e.target.checked }))
                }
              />
            }
            label="Show power"
          />
        </MenuItem>
        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={uiSettings.showInventory}
                onChange={(e) =>
                  setUiSettings((s) => ({
                    ...s,
                    showInventory: e.target.checked,
                  }))
                }
              />
            }
            label="Show inventory size"
          />
        </MenuItem>
        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={uiSettings.showProductionEfficiency}
                onChange={(e) =>
                  setUiSettings((s) => ({
                    ...s,
                    showProductionEfficiency: e.target.checked,
                  }))
                }
              />
            }
            label="Show production efficiency"
          />
        </MenuItem>
        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={uiSettings.hideAllImages}
                onChange={(e) =>
                  setUiSettings((s) => ({
                    ...s,
                    hideAllImages: e.target.checked,
                  }))
                }
              />
            }
            label="Hide all images"
          />
        </MenuItem>
        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={uiSettings.hideIoStats}
                onChange={(e) =>
                  setUiSettings((s) => ({
                    ...s,
                    hideIoStats: e.target.checked,
                  }))
                }
              />
            }
            label="Hide input/output stats"
          />
        </MenuItem>
        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={uiSettings.hideMinimap}
                onChange={(e) =>
                  setUiSettings((s) => ({
                    ...s,
                    hideMinimap: e.target.checked,
                  }))
                }
              />
            }
            label="Hide minimap"
          />
        </MenuItem>
        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={Boolean(uiSettings.hideRequiredItems)}
                onChange={(e) =>
                  setUiSettings((s) => ({
                    ...s,
                    hideRequiredItems: e.target.checked,
                  }))
                }
              />
            }
            label="Hide required items"
          />
        </MenuItem>
        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={uiSettings.ghostHideConnectionLines}
                onChange={(e) =>
                  setUiSettings((s) => ({
                    ...s,
                    ghostHideConnectionLines: e.target.checked,
                  }))
                }
              />
            }
            label="Ghost mode: hide connection lines"
          />
        </MenuItem>
      </Menu>
    );
  },
);

SettingsMenu.displayName = "SettingsMenu";

export default SettingsMenu;
