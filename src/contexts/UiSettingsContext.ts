import { createContext, useContext } from 'react';

export type UiSettings = {
  alwaysShowEdgeLabels: boolean;
  showPower: boolean;
  showInventory: boolean;
  showProductionEfficiency: boolean;
  hideAllImages: boolean;
  hideIoStats: boolean;
  hideMinimap: boolean;
  hideRequiredItems: boolean;
};

export const defaultUiSettings: UiSettings = {
  alwaysShowEdgeLabels: false,
  showPower: false,
  showInventory: false,
  showProductionEfficiency: true,
  hideAllImages: false,
  hideIoStats: false,
  hideMinimap: false,
  hideRequiredItems: false,
};

const UiSettingsContext = createContext<UiSettings>(defaultUiSettings);

export const UiSettingsProvider = UiSettingsContext.Provider;

export const useUiSettings = () => useContext(UiSettingsContext);
