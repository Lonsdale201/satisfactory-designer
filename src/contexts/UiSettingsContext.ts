import { createContext, useContext } from 'react';

export type UiSettings = {
  alwaysShowEdgeLabels: boolean;
  showPower: boolean;
  showInventory: boolean;
  showResourceImageInBody: boolean;
  showProductionEfficiency: boolean;
  hideAllImages: boolean;
  hideIoStats: boolean;
};

export const defaultUiSettings: UiSettings = {
  alwaysShowEdgeLabels: false,
  showPower: false,
  showInventory: false,
  showResourceImageInBody: true,
  showProductionEfficiency: true,
  hideAllImages: false,
  hideIoStats: false,
};

const UiSettingsContext = createContext<UiSettings>(defaultUiSettings);

export const UiSettingsProvider = UiSettingsContext.Provider;

export const useUiSettings = () => useContext(UiSettingsContext);
