import { memo, useEffect, useMemo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { Button, Menu, MenuItem } from "@mui/material";
import { Building, Item, ItemRecipe, ItemRequirement } from "../../types";
import buildingsData from "../../data/buildings.json";
import itemsData from "../../data/items.json";
import { useUiSettings } from "../../contexts/UiSettingsContext";

const buildings: Building[] = buildingsData.buildings as Building[];
const items: Item[] = itemsData.items;
const itemImageMap = import.meta.glob("../../assets/items/*", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;
const resourceImageMap = import.meta.glob("../../assets/resources/*", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;
const buildingImageMap = import.meta.glob("../../assets/building/*", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

const normalizeKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "");

// Format number: hide .0 decimals but keep .5 etc
const formatNum = (n: number | undefined): string => {
  if (n === undefined) return "0";
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(1);
};

const formatDuration = (minutes: number | null): string => {
  if (minutes === null || !Number.isFinite(minutes)) return "—";
  if (minutes < 60) return `${formatNum(minutes)} min`;
  const hours = minutes / 60;
  return `${formatNum(hours)} h`;
};

const findItemIconUrl = (item: Item | undefined) => {
  if (!item) return "";
  const idKey = normalizeKey(item.id);
  const nameKey = normalizeKey(item.name);
  const entry = Object.entries(itemImageMap).find(([path]) => {
    const fileKey = normalizeKey(
      (path.split("/").pop() || path).replace(/\.[^/.]+$/, ""),
    );
    return fileKey === idKey || fileKey === nameKey;
  });
  if (entry) return entry[1];
  if (item.category === "ore" || item.category === "fluid") {
    const resEntry = Object.entries(resourceImageMap).find(([path]) => {
      const fileKey = normalizeKey(
        (path.split("/").pop() || path).replace(/\.[^/.]+$/, ""),
      );
      return fileKey === idKey || fileKey === nameKey;
    });
    return resEntry ? resEntry[1] : "";
  }
  return "";
};

const findBuildingIconUrl = (building: Building | undefined) => {
  if (!building) return "";
  if (building.id.startsWith("miner_mk")) {
    const match = Object.entries(buildingImageMap).find(([path]) =>
      normalizeKey(path).includes(normalizeKey("Miner_Mk")),
    );
    return match ? match[1] : "";
  }
  const idKey = normalizeKey(building.id);
  const nameKey = normalizeKey(building.name);
  const entry = Object.entries(buildingImageMap).find(([path]) => {
    const fileKey = normalizeKey(
      (path.split("/").pop() || path).replace(/\.[^/.]+$/, ""),
    );
    return fileKey === idKey || fileKey === nameKey;
  });
  return entry ? entry[1] : "";
};

interface SimpleBuildingNodeProps {
  id: string;
  selected?: boolean;
  data: {
    buildingId: string;
    production: number;
    outputItem: string;
    powerUsage: number;
    iconUrl?: string;
    customLabel?: string;
    storedItem?: string;
    collapsed?: boolean;
    hasInput?: boolean;
    hasOutput?: boolean;
    inputCount?: number;
    layer?: number;
    isGhost?: boolean;
    calcStatus?: "optimal" | "under" | "over" | null;
    calcSupply?: number;
    calcDemand?: number;
    calcMismatchIncoming?: boolean;
    calcMismatchOutgoing?: boolean;
    calcDisconnected?: boolean;
    storageFlow?: {
      inRate: number;
      outRate: number;
      netRate: number;
      outDemand: number;
      canFill: boolean;
      fillMinutes: number | null;
    };
    showIo?: boolean;
    theme?: string;
    // Stack properties
    stackCount?: number;
    stackActiveIndex?: number;
    stackActiveId?: string;
  };
}

const SimpleBuildingNode = memo(
  ({ id, data, selected }: SimpleBuildingNodeProps) => {
    const ui = useUiSettings();
    const isCollapsed = data.collapsed ?? false;
    const isGhost = data.isGhost ?? false;
    const stackCount = data.stackCount ?? 1;
    const isStackParent = stackCount > 1;
    const stackLayers = Math.min(stackCount - 1, 3);
    const stackActiveIndex =
      typeof data.stackActiveIndex === "number" ? data.stackActiveIndex : 0;
    const stackActiveData = (data as Record<string, unknown>)
      .stackActiveData as Record<string, unknown> | undefined;
    const displayData = (stackActiveData ?? data) as typeof data;

    const selectedBuilding = buildings.find(
      (b) => b.id === (displayData.buildingId as string),
    );
    const selectedOutputItem = items.find(
      (i) => i.id === (displayData.outputItem as string),
    );
    const selectedStoredItem = items.find(
      (i) => i.id === (displayData.storedItem as string),
    );
    const buildingId = selectedBuilding?.id ?? "";
    const inputTypes =
      selectedBuilding?.inputTypes ??
      Array(selectedBuilding?.inputs ?? 1).fill("conveyor");
    const outputTypes = selectedBuilding?.outputTypes ?? ["conveyor"];
    const inputCount = inputTypes.length;
    const outputCount = outputTypes.length;
    const hasInput = inputCount > 0;
    const hasOutput = outputCount > 0;
    const iconUrl = findBuildingIconUrl(selectedBuilding) || "";
    const headerLabel = (
      (displayData.customLabel as string) ||
      selectedBuilding?.name ||
      "Building"
    ).toUpperCase();
    const showIo = displayData.showIo as boolean | undefined;
    const showIoBlock = showIo !== false && !ui.hideIoStats;
    const storageFlow = (displayData as Record<string, unknown>).storageFlow as
      | {
          inRate: number;
          outRate: number;
          netRate: number;
          outDemand: number;
          canFill: boolean;
          fillMinutes: number | null;
        }
      | undefined;
    const [inputsExpanded, setInputsExpanded] = useState(false);
    const [recipeAnchorEl, setRecipeAnchorEl] = useState<null | HTMLElement>(
      null,
    );
    const [altAnchorEl, setAltAnchorEl] = useState<null | HTMLElement>(null);
    const theme = (displayData.theme as string) || "";
    const themeMap = {
      orange: {
        header: "#fa9549",
        body: "#252836",
        border: "#fa9549",
        text: "#1a1a2e",
        box: "#1a1a2e",
      },
      purple: {
        header: "#8b5cf6",
        body: "#252836",
        border: "#8b5cf6",
        text: "#1a1a2e",
        box: "#1a1a2e",
      },
      blue: {
        header: "#60a5fa",
        body: "#252836",
        border: "#60a5fa",
        text: "#0f172a",
        box: "#1a1a2e",
      },
      dark: {
        header: "#111827",
        body: "#0b0f1a",
        border: "#374151",
        text: "#e5e7eb",
        box: "#1a1a2e",
      },
      slate: {
        header: "#64748b",
        body: "#1f2937",
        border: "#94a3b8",
        text: "#0f172a",
        box: "#1a1a2e",
      },
      green: {
        header: "#22c55e",
        body: "#1a2e1f",
        border: "#22c55e",
        text: "#0f1a12",
        box: "#1a1a2e",
      },
      rose: {
        header: "#f43f5e",
        body: "#2e1a22",
        border: "#f43f5e",
        text: "#1a0f14",
        box: "#1a1a2e",
      },
      teal: {
        header: "#14b8a6",
        body: "#1a2e2b",
        border: "#14b8a6",
        text: "#0f1a18",
        box: "#1a1a2e",
      },
      amber: {
        header: "#f59e0b",
        body: "#2e2a1a",
        border: "#f59e0b",
        text: "#1a170f",
        box: "#1a1a2e",
      },
      indigo: {
        header: "#6366f1",
        body: "#1e1a2e",
        border: "#6366f1",
        text: "#0f0e1a",
        box: "#2d2640",
      },
    } as const;
    const themeColors = theme
      ? themeMap[theme as keyof typeof themeMap] || themeMap.orange
      : themeMap.orange;
    const isDarkTheme = theme === "dark";

    const updateProductionForRate = (rate?: number) => {
      if (!rate || !Number.isFinite(rate)) return;
      window.dispatchEvent(
        new CustomEvent("nodeDataChange", {
          detail: { nodeId: id, field: "production", value: rate },
        }),
      );
      if (selectedBuilding) {
        const options = selectedBuilding.productionOptions ?? [];
        const isOption = options.includes(rate);
        window.dispatchEvent(
          new CustomEvent("nodeDataChange", {
            detail: { nodeId: id, field: "customProduction", value: !isOption },
          }),
        );
      }
    };

    const dispatchStackIndex = (nextIndex: number) => {
      const event = new CustomEvent("nodeDataChange", {
        detail: { nodeId: id, field: "stackActiveIndex", value: nextIndex },
      });
      window.dispatchEvent(event);
    };

    const handleStackWheel: React.WheelEventHandler = (event) => {
      if (!isStackParent || isGhost) return;
      event.preventDefault();
      event.stopPropagation();
      const direction = event.deltaY > 0 ? 1 : -1;
      dispatchStackIndex(stackActiveIndex + direction);
    };

    // Ghost mode styles - wireframe look
    const ghostStyles = isGhost
      ? {
          opacity: 0.5,
          pointerEvents: "none" as const,
        }
      : {};

    const incomingItems = (data as Record<string, unknown>).incomingItems as
      | string[]
      | undefined;
    const hasRecipes = Boolean(
      selectedOutputItem?.recipes && selectedOutputItem.recipes.length > 0,
    );
    const recipes = selectedOutputItem?.recipes ?? [];
    const selectedRecipeIndex = (displayData as Record<string, unknown>)
      .selectedRecipeIndex as number | undefined;
    const effectiveRecipeIndex =
      selectedRecipeIndex ?? selectedOutputItem?.defaultRecipeIndex ?? 0;
    const activeRecipe = hasRecipes
      ? selectedOutputItem?.recipes?.[effectiveRecipeIndex]
      : undefined;
    const alternateOptions = hasRecipes
      ? []
      : ((selectedOutputItem?.alternateRequires ||
          []) as Array<Array<{ item: string; amount: number }>>);
    const alternateProducers = selectedOutputItem?.alternateProducers ?? [];
    const defaultProducer = selectedOutputItem?.defaultProducer;
    const canUseDefault =
      !defaultProducer || !buildingId || defaultProducer === buildingId;
    const altOptionsWithIndex = alternateOptions.map((requirements, index) => ({
      requirements,
      index,
    }));
    const filteredAltOptions = altOptionsWithIndex.filter(({ index }) => {
      const producer = alternateProducers[index];
      return !producer || !buildingId || producer === buildingId;
    });
    const allowedAltIndices = new Set(
      filteredAltOptions.map((option) => option.index),
    );
    const selectedAltIndex = (displayData as Record<string, unknown>)
      .selectedAltIndex as number | null | undefined;
    const hasExplicitAltSelection = typeof selectedAltIndex === "number";
    const effectiveAltIndex =
      hasExplicitAltSelection &&
      selectedAltIndex >= 0 &&
      allowedAltIndices.has(selectedAltIndex)
        ? selectedAltIndex
        : !canUseDefault && filteredAltOptions.length > 0
          ? filteredAltOptions[0].index
          : -1;
    const activeAlt =
      effectiveAltIndex >= 0 ? alternateOptions[effectiveAltIndex] : undefined;
    const altUsed = Boolean(activeAlt);
    const hasAlternateOptions = filteredAltOptions.length > 0;
    const activeRequirements: ItemRequirement[] = hasRecipes
      ? activeRecipe?.inputs ?? []
      : (activeAlt ?? selectedOutputItem?.requires) ?? [];
    const activeByproducts: ItemRequirement[] =
      hasRecipes && activeRecipe?.byproducts
        ? activeRecipe.byproducts
        : [];
    const getRecipeLabel = (recipe: ItemRecipe) => {
      if (recipe.name) return recipe.name;
      const names = recipe.inputs
        .map((req) => items.find((item) => item.id === req.item)?.name ?? req.item)
        .filter(Boolean)
        .join(" + ");
      return names || "Recipe";
    };
    const getAltLabel = (requirements: ItemRequirement[]) => {
      const names = requirements
        .map((req) => items.find((item) => item.id === req.item)?.name ?? req.item)
        .filter(Boolean)
        .join(" + ");
      return names || "Alternate";
    };

    useEffect(() => {
      if (isGhost) return;
      if (!canUseDefault && filteredAltOptions.length > 0) {
        const desiredIndex = filteredAltOptions[0].index;
        if (selectedAltIndex !== desiredIndex) {
          window.dispatchEvent(
            new CustomEvent("nodeDataChange", {
              detail: {
                nodeId: id,
                field: "selectedAltIndex",
                value: desiredIndex,
              },
            }),
          );
          updateProductionForRate(
            selectedOutputItem?.alternateOutputRates?.[desiredIndex] ??
              selectedOutputItem?.defaultProduction,
          );
        }
      }
    }, [
      canUseDefault,
      filteredAltOptions,
      id,
      isGhost,
      selectedAltIndex,
      selectedOutputItem?.alternateOutputRates,
      selectedOutputItem?.defaultProduction,
    ]);

    // Check if all required inputs are connected
    const requirementsMet = useMemo(() => {
      if (!selectedOutputItem) return null;
      if (hasRecipes) {
        if (!activeRecipe || activeRequirements.length === 0) return null;
        const suppliedItems = incomingItems || [];
        return activeRequirements.every((req) =>
          suppliedItems.includes(req.item),
        );
      }
      const suppliedItems = incomingItems || [];
      if (activeAlt && activeAlt.length > 0) {
        return activeAlt.every((req) => suppliedItems.includes(req.item));
      }
      if (
        !selectedOutputItem.requires ||
        selectedOutputItem.requires.length === 0
      ) {
        return null; // No requirements or no output selected
      }
      return selectedOutputItem.requires.every((req) =>
        suppliedItems.includes(req.item),
      );
    }, [
      selectedOutputItem,
      incomingItems,
      alternateOptions,
      hasRecipes,
      activeRecipe,
      activeRequirements,
      activeAlt,
    ]);

    const missingRequirements = useMemo(() => {
      if (!selectedOutputItem) return [];
      if (hasRecipes) {
        if (!activeRecipe || activeRequirements.length === 0) return [];
        const suppliedItems = (incomingItems || []) as string[];
        return activeRequirements
          .map((req) => req.item)
          .filter((reqItem) => !suppliedItems.includes(reqItem));
      }
      if (activeAlt && activeAlt.length > 0) {
        const suppliedItems = (incomingItems || []) as string[];
        return activeAlt
          .map((req) => req.item)
          .filter((reqItem) => !suppliedItems.includes(reqItem));
      }
      if (
        !selectedOutputItem.requires ||
        selectedOutputItem.requires.length === 0
      ) {
        return [];
      }
      const suppliedItems = (incomingItems || []) as string[];
      return selectedOutputItem.requires
        .map((req) => req.item)
        .filter((reqItem) => !suppliedItems.includes(reqItem));
    }, [
      selectedOutputItem,
      incomingItems,
      alternateOptions,
      hasRecipes,
      activeRecipe,
      activeRequirements,
      activeAlt,
    ]);

    const getHandleStyle = (type: "conveyor" | "pipe") => {
      if (isGhost) {
        return {
          background: type === "pipe" ? "#3b82f6" : themeColors.header,
          width: 8,
          height: 8,
          border: "none",
          borderRadius: 999,
          outline:
            type === "pipe"
              ? "1px dashed rgba(59, 130, 246, 0.5)"
              : `1px dashed ${themeColors.header}80`,
          outlineOffset: "2px",
        } as const;
      }
      return {
        background: type === "pipe" ? "#3b82f6" : "#d1d5db",
        width: 14,
        height: 14,
        border: type === "pipe" ? "1px solid #1d4ed8" : "1px solid #6b7280",
        borderRadius: 999,
      } as const;
    };

    // Get the item icon for ghost mode display
    const ghostItemIconUrl = selectedOutputItem
      ? findItemIconUrl(selectedOutputItem)
      : selectedStoredItem
        ? findItemIconUrl(selectedStoredItem)
        : "";

    const requiredInputs = useMemo(() => {
      if (!selectedOutputItem || activeRequirements.length === 0) {
        return [];
      }
      const altBaseProduction =
        !hasRecipes && effectiveAltIndex >= 0
          ? selectedOutputItem.alternateOutputRates?.[effectiveAltIndex]
          : undefined;
      const baseProduction =
        (altBaseProduction ?? selectedOutputItem.defaultProduction) || 0;
      const currentProduction = (displayData.production as number) || 0;
      if (!baseProduction || !currentProduction) return [];
      const scale = currentProduction / baseProduction;
      return activeRequirements.map((req) => ({
        ...req,
        perMin: req.amount * scale,
        item: items.find((i) => i.id === req.item),
      }));
    }, [selectedOutputItem, displayData.production, activeRequirements]);

    return (
      <>
        <div style={{ position: "relative", display: "inline-block" }}>
          {isStackParent && !isGhost && (
            <div
              key={`stack-switch-${stackActiveIndex}`}
              style={{
                position: "absolute",
                top: -10,
                right: -6,
                padding: "2px 8px",
                fontSize: 10,
                fontWeight: 700,
                color: isDarkTheme ? "#e5e7eb" : themeColors.header,
                background: isDarkTheme
                  ? "rgba(55, 65, 81, 0.95)"
                  : "rgba(26, 26, 46, 0.9)",
                border: `1px solid ${isDarkTheme ? "#4b5563" : themeColors.header}99`,
                borderRadius: 999,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                animation: "stack-flash 220ms ease",
                zIndex: 2,
                pointerEvents: "none",
              }}
            >
              Stack {Math.min(stackActiveIndex + 1, stackCount)}/{stackCount}
            </div>
          )}
          {isStackParent && isGhost && (
            <div
              style={{
                position: "absolute",
                top: -8,
                right: -6,
                padding: "1px 8px",
                fontSize: 10,
                fontWeight: 700,
                color: `${themeColors.header}CC`,
                background: "rgba(26, 26, 46, 0.45)",
                border: `1px dashed ${themeColors.header}8C`,
                borderRadius: 999,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                zIndex: 2,
                pointerEvents: "none",
              }}
            >
              Stack x{stackCount}
            </div>
          )}
          {isStackParent && isGhost && (
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: `${themeColors.header}B3`,
                background: "rgba(26, 26, 46, 0.35)",
                border: `1px dashed ${themeColors.header}80`,
                padding: "1px 6px",
                borderRadius: 999,
                marginRight: 4,
                letterSpacing: "0.4px",
              }}
            >
              x{stackCount}
            </div>
          )}
          {isStackParent &&
            !isGhost &&
            Array.from({ length: stackLayers }).map((_, index) => {
              const offset = (index + 1) * 6;
              return (
                <div
                  key={`stack-layer-${index}`}
                  style={{
                    position: "absolute",
                    inset: 0,
                    transform: `translate(${offset}px, ${offset}px)`,
                    backgroundColor: themeColors.box,
                    border: `1px solid ${themeColors.header}59`,
                    borderRadius: 8,
                    zIndex: 0,
                    opacity: 0.7 - index * 0.15,
                    pointerEvents: "none",
                  }}
                />
              );
            })}
          {isStackParent &&
            isGhost &&
            Array.from({ length: stackLayers }).map((_, index) => {
              const offset = (index + 1) * 6;
              return (
                <div
                  key={`stack-ghost-layer-${index}`}
                  style={{
                    position: "absolute",
                    inset: 0,
                    transform: `translate(${offset}px, ${offset}px)`,
                    backgroundColor: "transparent",
                    border: `1px dashed ${themeColors.header}40`,
                    borderRadius: 8,
                    zIndex: 0,
                    opacity: 0.6 - index * 0.1,
                    pointerEvents: "none",
                  }}
                />
              );
            })}
          <div
            style={{
              minWidth: isCollapsed ? 180 : 220,
              backgroundColor: isGhost ? "transparent" : themeColors.body,
              border: isGhost
                ? `2px dashed ${themeColors.border}66`
                : `2px solid ${selected ? "#fff" : themeColors.border}`,
              borderRadius: 8,
              fontFamily: "Inter, sans-serif",
              position: "relative",
              zIndex: 1,
              boxShadow: "none",
              ...ghostStyles,
            }}
          >
            {/* Status Indicator Dot - positioned at top-right corner */}
            {!isGhost &&
              displayData.calcStatus &&
              (selectedOutputItem || selectedStoredItem) && (
                <div
                  title={
                    displayData.calcStatus === "optimal"
                      ? "Optimal - supply and demand are balanced"
                      : displayData.calcStatus === "under"
                        ? `Inefficient - supply: ${formatNum(displayData.calcSupply as number | undefined)}/min, demand: ${formatNum(displayData.calcDemand as number | undefined)}/min`
                        : `Overproduction - supply: ${formatNum(displayData.calcSupply as number | undefined)}/min, demand: ${formatNum(displayData.calcDemand as number | undefined)}/min`
                  }
                  style={{
                    position: "absolute",
                    top: -10,
                    right: -10,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    backgroundColor:
                      displayData.calcStatus === "optimal"
                        ? "#10b981"
                        : displayData.calcStatus === "under"
                          ? "#ef4444"
                          : "#eab308",
                    animation: "pulse 1.5s ease-in-out infinite",
                    boxShadow:
                      displayData.calcStatus === "optimal"
                        ? "0 0 10px #10b981"
                        : displayData.calcStatus === "under"
                          ? "0 0 12px #ef4444, 0 0 24px rgba(239, 68, 68, 0.5)"
                          : "0 0 10px #eab308",
                    zIndex: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: "bold",
                    color: "#fff",
                    border: "2px solid rgba(255, 255, 255, 0.4)",
                  }}
                >
                  {displayData.calcStatus === "optimal"
                    ? "✓"
                    : displayData.calcStatus === "under"
                      ? "!"
                      : "⚡"}
                </div>
              )}

            {/* Input Handles */}
            {hasInput &&
              inputTypes.map((type, index) => (
                <Handle
                  key={`input-${type}-${index}`}
                  type="target"
                  position={Position.Left}
                  id={`in-${type}-${index}`}
                  style={{
                    ...getHandleStyle(type),
                    top:
                      inputCount === 1
                        ? "50%"
                        : `${25 + index * (50 / Math.max(inputCount - 1, 1))}%`,
                  }}
                />
              ))}

            {/* Header */}
            <div
              data-no-panel="true"
              onWheel={isStackParent ? handleStackWheel : undefined}
              style={{
                backgroundColor: isGhost ? "transparent" : themeColors.header,
                padding: isGhost ? "4px 8px" : "6px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: isGhost ? "center" : "flex-start",
                gap: 8,
                borderRadius: isGhost
                  ? "6px 6px 0 0"
                  : isCollapsed
                    ? 6
                    : "6px 6px 0 0",
                cursor: "pointer",
                borderBottom: isGhost
                  ? `1px dashed ${themeColors.border}4D`
                  : "none",
              }}
            >
              {!isGhost && !ui.hideAllImages && iconUrl && (
                <img
                  src={iconUrl}
                  alt=""
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    objectFit: "cover",
                  }}
                />
              )}
              {!isGhost && !ui.hideAllImages && !iconUrl && (
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    background: themeColors.box,
                  }}
                />
              )}
              <span
                style={{
                  fontSize: isGhost ? 10 : 14,
                  fontWeight: 600,
                  color: isGhost ? `${themeColors.header}80` : themeColors.text,
                  flex: isGhost ? "none" : 1,
                  textAlign: isGhost ? "center" : "left",
                }}
              >
                {headerLabel}
              </span>
              {isStackParent && !isGhost && (
                <div
                  data-no-panel="true"
                  onWheel={handleStackWheel}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 6px",
                    borderRadius: 999,
                    background: isDarkTheme
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(26,26,46,0.15)",
                    border: isDarkTheme
                      ? "1px solid rgba(255,255,255,0.3)"
                      : "1px solid rgba(26,26,46,0.25)",
                    cursor: "ns-resize",
                  }}
                  title="Scroll to switch stack member"
                >
                  <span
                    key={`stack-indicator-${stackActiveIndex}`}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: isDarkTheme ? "#111827" : themeColors.text,
                      animation: "stack-flash 160ms ease",
                      minWidth: 28,
                      textAlign: "center",
                    }}
                  >
                    {Math.min(stackActiveIndex + 1, stackCount)}/{stackCount}
                  </span>
                  <button
                    type="button"
                    data-no-panel="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatchStackIndex(stackActiveIndex - 1);
                    }}
                    style={{
                      border: "none",
                      background: isDarkTheme
                        ? "rgba(17,24,39,0.15)"
                        : "rgba(26,26,46,0.25)",
                      color: isDarkTheme ? "#111827" : themeColors.text,
                      width: 16,
                      height: 16,
                      borderRadius: 999,
                      fontSize: 10,
                      lineHeight: "16px",
                      cursor: "pointer",
                    }}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    data-no-panel="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatchStackIndex(stackActiveIndex + 1);
                    }}
                    style={{
                      border: "none",
                      background: isDarkTheme
                        ? "rgba(17,24,39,0.15)"
                        : "rgba(26,26,46,0.25)",
                      color: isDarkTheme ? "#111827" : themeColors.text,
                      width: 16,
                      height: 16,
                      borderRadius: 999,
                      fontSize: 10,
                      lineHeight: "16px",
                      cursor: "pointer",
                    }}
                  >
                    ›
                  </button>
                </div>
              )}
              {selectedOutputItem && !isGhost && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: themeColors.text,
                  }}
                >
                  {displayData.production as number}/min
                </span>
              )}
            </div>

            {/* Ghost Body - large centered icon */}
            {isGhost && (
              <div
                style={{
                  padding: 12,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {(ghostItemIconUrl || iconUrl) && (
                  <img
                    src={ghostItemIconUrl || iconUrl}
                    alt=""
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 6,
                      objectFit: "cover",
                      opacity: 0.6,
                      border: `1px dashed ${themeColors.border}4D`,
                    }}
                  />
                )}
                {isStackParent && (
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: `${themeColors.header}BF`,
                      border: `1px dashed ${themeColors.header}80`,
                      borderRadius: 999,
                      padding: "2px 8px",
                      letterSpacing: "0.4px",
                    }}
                  >
                    x{stackCount}
                  </div>
                )}
              </div>
            )}

            {/* Body - only when not collapsed and not ghost */}
            {!isCollapsed && !isGhost && (
              <div
                key={
                  isStackParent
                    ? `stack-body-${stackActiveIndex}`
                    : "stack-body"
                }
                style={{
                  padding: 12,
                  animation: isStackParent ? "stack-swipe 180ms ease" : "none",
                }}
              >
                {selectedBuilding?.category !== "storage" ? (
                  <>
                    <div
                      style={{
                        padding: 8,
                        backgroundColor: "#1a1a2e",
                        borderRadius: 4,
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: "#aaa",
                          marginBottom: 4,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            Produces
                          </span>
                        {requirementsMet !== null && (
                          <span
                            title={
                              requirementsMet
                                ? "All inputs connected"
                                : "Missing inputs"
                            }
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10,
                              fontWeight: "bold",
                              color: requirementsMet ? "#2ecc71" : "#ef4444",
                              backgroundColor: requirementsMet
                                ? "rgba(46, 204, 113, 0.2)"
                                : "rgba(239, 68, 68, 0.2)",
                              border: `1px solid ${requirementsMet ? "#2ecc71" : "#ef4444"}`,
                            }}
                          >
                            {requirementsMet ? "✓" : "✗"}
                          </span>
                        )}
                      </div>
                      {hasRecipes && recipes.length > 1 && (
                        <>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(event) => {
                              if (isGhost) return;
                              setRecipeAnchorEl(event.currentTarget);
                            }}
                            sx={{
                              mt: 0.5,
                              width: "100%",
                              textTransform: "uppercase",
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.4px",
                              color: "#cbd5f5",
                              borderColor: "rgba(255,255,255,0.12)",
                              backgroundColor: "rgba(15, 23, 42, 0.55)",
                              "&:hover": {
                                borderColor: "rgba(255,255,255,0.2)",
                                backgroundColor: "rgba(15, 23, 42, 0.7)",
                              },
                              mb: 0.75,
                            }}
                          >
                            Multiple recipes
                          </Button>
                          <Menu
                            anchorEl={recipeAnchorEl}
                            open={Boolean(recipeAnchorEl)}
                            onClose={() => setRecipeAnchorEl(null)}
                            PaperProps={{
                              sx: {
                                bgcolor: "#111827",
                                color: "#e5e7eb",
                                border: "1px solid rgba(255,255,255,0.12)",
                                minWidth: 180,
                              },
                            }}
                          >
                            {recipes.map((recipe, index) => (
                              <MenuItem
                                key={`${selectedOutputItem?.id ?? "recipe"}-${index}`}
                                selected={index === effectiveRecipeIndex}
                              onClick={() => {
                                  const event = new CustomEvent("nodeDataChange", {
                                    detail: {
                                      nodeId: id,
                                      field: "selectedRecipeIndex",
                                      value: index,
                                    },
                                  });
                                  window.dispatchEvent(event);
                                  updateProductionForRate(
                                    selectedOutputItem?.defaultProduction,
                                  );
                                  setRecipeAnchorEl(null);
                                }}
                                sx={{
                                  fontSize: 12,
                                  "&.Mui-selected": {
                                    backgroundColor: `${themeColors.header}1a`,
                                  },
                                  "&.Mui-selected:hover": {
                                    backgroundColor: `${themeColors.header}2a`,
                                  },
                                }}
                              >
                                {getRecipeLabel(recipe)}
                              </MenuItem>
                            ))}
                          </Menu>
                        </>
                      )}
                      {!hasRecipes && hasAlternateOptions && (
                        <>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(event) => {
                              if (isGhost) return;
                              setAltAnchorEl(event.currentTarget);
                            }}
                            sx={{
                              mt: 0.5,
                              width: "100%",
                              textTransform: "uppercase",
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.4px",
                              color: "#cbd5f5",
                              borderColor: "rgba(255,255,255,0.12)",
                              backgroundColor: "rgba(15, 23, 42, 0.55)",
                              "&:hover": {
                                borderColor: "rgba(255,255,255,0.2)",
                                backgroundColor: "rgba(15, 23, 42, 0.7)",
                              },
                              mb: 0.75,
                            }}
                          >
                            Alternate recipes
                          </Button>
                          <Menu
                            anchorEl={altAnchorEl}
                            open={Boolean(altAnchorEl)}
                            onClose={() => setAltAnchorEl(null)}
                            PaperProps={{
                              sx: {
                                bgcolor: "#111827",
                                color: "#e5e7eb",
                                border: "1px solid rgba(255,255,255,0.12)",
                                minWidth: 180,
                              },
                            }}
                          >
                            {canUseDefault && (
                              <MenuItem
                                selected={effectiveAltIndex < 0}
                                onClick={() => {
                                  const event = new CustomEvent(
                                    "nodeDataChange",
                                    {
                                      detail: {
                                        nodeId: id,
                                        field: "selectedAltIndex",
                                        value: -1,
                                      },
                                    },
                                  );
                                  window.dispatchEvent(event);
                                  updateProductionForRate(
                                    selectedOutputItem?.defaultProduction,
                                  );
                                  setAltAnchorEl(null);
                                }}
                                sx={{
                                  fontSize: 12,
                                  "&.Mui-selected": {
                                    backgroundColor: `${themeColors.header}1a`,
                                  },
                                  "&.Mui-selected:hover": {
                                    backgroundColor: `${themeColors.header}2a`,
                                  },
                                }}
                              >
                                Default
                              </MenuItem>
                            )}
                            {filteredAltOptions.map((option) => (
                              <MenuItem
                                key={`alt-${selectedOutputItem?.id ?? "item"}-${option.index}`}
                                selected={effectiveAltIndex === option.index}
                                onClick={() => {
                                  const event = new CustomEvent("nodeDataChange", {
                                    detail: {
                                      nodeId: id,
                                      field: "selectedAltIndex",
                                      value: option.index,
                                    },
                                  });
                                  window.dispatchEvent(event);
                                  updateProductionForRate(
                                    selectedOutputItem?.alternateOutputRates?.[
                                      option.index
                                    ] ?? selectedOutputItem?.defaultProduction,
                                  );
                                  setAltAnchorEl(null);
                                }}
                                sx={{
                                  fontSize: 12,
                                  "&.Mui-selected": {
                                    backgroundColor: `${themeColors.header}1a`,
                                  },
                                  "&.Mui-selected:hover": {
                                    backgroundColor: `${themeColors.header}2a`,
                                },
                              }}
                            >
                                {getAltLabel(option.requirements)}
                              </MenuItem>
                            ))}
                          </Menu>
                        </>
                      )}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {selectedOutputItem &&
                          !ui.hideAllImages &&
                          (() => {
                            const url = findItemIconUrl(selectedOutputItem);
                            if (!url) return null;
                            return (
                              <img
                                src={url}
                                alt=""
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: 6,
                                  objectFit: "cover",
                                }}
                              />
                            );
                          })()}
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: "#2ecc71",
                            flex: 1,
                          }}
                        >
                          {selectedOutputItem
                            ? selectedOutputItem.name
                            : "Not selected"}
                        </div>
                      </div>
                      {requirementsMet === false &&
                        missingRequirements.length > 0 && (
                          <div
                            style={{
                              marginTop: 6,
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 6,
                            }}
                          >
                            {missingRequirements.map((itemId) => {
                              const item = items.find((i) => i.id === itemId);
                              const icon = item ? findItemIconUrl(item) : "";
                              return (
                                <div
                                  key={itemId}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "4px 8px",
                                    borderRadius: 6,
                                    background: "rgba(239, 68, 68, 0.12)",
                                    border: "1px solid rgba(239, 68, 68, 0.5)",
                                  }}
                                  title={item?.name || itemId}
                                >
                                  {!ui.hideAllImages &&
                                    (icon ? (
                                      <img
                                        src={icon}
                                        alt=""
                                        style={{
                                          width: 22,
                                          height: 22,
                                          borderRadius: 6,
                                          objectFit: "cover",
                                        }}
                                      />
                                    ) : (
                                      <div
                                        style={{
                                          width: 22,
                                          height: 22,
                                          borderRadius: 6,
                                          background: "#0f172a",
                                          color: "#fecaca",
                                          fontSize: 10,
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                        }}
                                      >
                                        ?
                                      </div>
                                    ))}
                                  <div
                                    style={{ fontSize: 11, color: "#fecaca" }}
                                  >
                                    {item?.name || itemId}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        padding: 8,
                        backgroundColor: "#1a1a2e",
                        borderRadius: 4,
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}
                      >
                        Stored Item
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {selectedStoredItem &&
                          !ui.hideAllImages &&
                          (() => {
                            const url = findItemIconUrl(selectedStoredItem);
                            if (!url) return null;
                            return (
                              <img
                                src={url}
                                alt=""
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: 6,
                                  objectFit: "cover",
                                  background: "#0f172a",
                                }}
                              />
                            );
                          })()}
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: "#60a5fa",
                          }}
                        >
                          {selectedStoredItem
                            ? selectedStoredItem.name
                            : "Not selected"}
                        </div>
                      </div>
                    </div>
                    {ui.showProductionEfficiency && storageFlow && (
                      <div
                        style={{
                          padding: 8,
                          backgroundColor: themeColors.box,
                          borderRadius: 6,
                          border: "1px solid #1f2937",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: "#9ca3af",
                            marginBottom: 6,
                            textTransform: "uppercase",
                            letterSpacing: "0.4px",
                          }}
                        >
                          Storage Flow
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 6,
                          }}
                        >
                          <div style={{ fontSize: 11, color: "#93c5fd" }}>
                            In: {formatNum(storageFlow.inRate)}/min
                          </div>
                          <div style={{ fontSize: 11, color: "#93c5fd" }}>
                            Out: {formatNum(storageFlow.outRate)}/min
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color:
                                storageFlow.netRate > 0 ? "#22c55e" : "#f59e0b",
                            }}
                          >
                            Net: {formatNum(storageFlow.netRate)}/min
                          </div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>
                            Demand: {formatNum(storageFlow.outDemand)}/min
                          </div>
                        </div>
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 11,
                            color: storageFlow.canFill ? "#22c55e" : "#f87171",
                          }}
                        >
                          {storageFlow.canFill
                            ? `Full in ${formatDuration(storageFlow.fillMinutes)}`
                            : "Will not fill (drain or flat)"}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Stats */}
                {selectedBuilding?.category !== "storage" && (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {/* Collapsible Inputs Section */}
                    {showIoBlock && requiredInputs.length > 0 && (
                      <div
                        style={{
                          backgroundColor: themeColors.box,
                          borderRadius: 6,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          onClick={() => setInputsExpanded(!inputsExpanded)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 8px",
                            cursor: "pointer",
                            userSelect: "none",
                            borderBottom: inputsExpanded
                              ? "1px solid #333"
                              : "none",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              color: "#9ca3af",
                              transition: "transform 0.2s",
                              transform: inputsExpanded
                                ? "rotate(90deg)"
                                : "rotate(0deg)",
                            }}
                          >
                            ▶
                          </span>
                          <span
                            style={{ fontSize: 11, color: "#9ca3af", flex: 1 }}
                          >
                            Inputs ({requiredInputs.length})
                          </span>
                        </div>
                        {inputsExpanded && (
                          <div
                            style={{
                              padding: "6px 8px",
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                            }}
                          >
                            {requiredInputs.map((req, index) => {
                              const maxPerMin = Math.max(
                                ...requiredInputs.map((r) => r.perMin),
                              );
                              const percentage =
                                maxPerMin > 0
                                  ? (req.perMin / maxPerMin) * 100
                                  : 0;
                              const itemIcon = req.item
                                ? findItemIconUrl(req.item)
                                : "";
                              return (
                                <div
                                  key={`input-${index}`}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                  }}
                                >
                                  {!ui.hideAllImages &&
                                    (itemIcon ? (
                                      <img
                                        src={itemIcon}
                                        alt=""
                                        style={{
                                          width: 18,
                                          height: 18,
                                          borderRadius: 3,
                                          objectFit: "cover",
                                        }}
                                      />
                                    ) : (
                                      <div
                                        style={{
                                          width: 18,
                                          height: 18,
                                          borderRadius: 3,
                                          background: "#333",
                                          fontSize: 8,
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          color: "#666",
                                        }}
                                      >
                                        ?
                                      </div>
                                    ))}
                                  <div
                                    style={{
                                      flex: 1,
                                      height: 6,
                                      backgroundColor: "#333",
                                      borderRadius: 3,
                                      overflow: "hidden",
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: `${percentage}%`,
                                        height: "100%",
                                        backgroundColor: "#f59e0b",
                                        borderRadius: 3,
                                        transition: "width 0.3s",
                                      }}
                                    />
                                  </div>
                                  <span
                                    style={{
                                      fontSize: 10,
                                      color: "#f59e0b",
                                      fontWeight: 600,
                                      minWidth: 50,
                                      textAlign: "right",
                                    }}
                                  >
                                    {formatNum(req.perMin)}/m
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Output Display */}
                    {showIoBlock && selectedOutputItem && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {(() => {
                          const baseProduction =
                            selectedOutputItem.defaultProduction ?? 0;
                          const productionRate =
                            (displayData.production as number) || 0;
                          const byproductScale =
                            baseProduction > 0
                              ? productionRate / baseProduction
                              : 1;
                          const outputs = [
                            {
                              id: selectedOutputItem.id,
                              name: selectedOutputItem.name,
                              icon: findItemIconUrl(selectedOutputItem),
                              rate: productionRate,
                            },
                            ...activeByproducts.map((byproduct) => {
                              const item = items.find(
                                (i) => i.id === byproduct.item,
                              );
                              return {
                                id: byproduct.item,
                                name: item?.name ?? byproduct.item,
                                icon: item ? findItemIconUrl(item) : "",
                                rate: byproduct.amount * byproductScale,
                              };
                            }),
                          ];
                          return outputs.map((output, index, array) => (
                            <div
                              key={`${output.id}-${index}`}
                              style={{
                                backgroundColor: themeColors.box,
                                borderRadius: 6,
                                padding: "8px 10px",
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                border: "1px solid rgba(46, 204, 113, 0.3)",
                              }}
                            >
                              {!ui.hideAllImages && output.icon && (
                                <img
                                  src={output.icon}
                                  alt=""
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 4,
                                    objectFit: "cover",
                                  }}
                                />
                              )}
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    fontSize: 9,
                                    color: "#9ca3af",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",
                                  }}
                                >
                                  {array.length > 1
                                    ? `Output #${index + 1}`
                                    : "Output"}
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "#e5e7eb",
                                    fontWeight: 500,
                                  }}
                                >
                                  {output.name}
                                </div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div
                                  style={{
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: "#2ecc71",
                                  }}
                                >
                                  {formatNum(output.rate)}/min
                                </div>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                    {!ui.hideIoStats && (
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: 10,
                          color: "#9ca3af",
                          gap: 8,
                        }}
                      >
                        Show I/O
                        <input
                          type="checkbox"
                          checked={showIoBlock}
                          onChange={(e) => {
                            e.stopPropagation();
                            window.dispatchEvent(
                              new CustomEvent("nodeDataChange", {
                                detail: {
                                  nodeId: id,
                                  field: "showIo",
                                  value: e.target.checked,
                                },
                              }),
                            );
                          }}
                        />
                      </label>
                    )}
                    {ui.showPower && (
                      <div
                        style={{
                          padding: 8,
                          backgroundColor: themeColors.box,
                          borderRadius: 4,
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: 10, color: "#aaa" }}>Power</div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#f1c40f",
                          }}
                        >
                          {displayData.powerUsage as number} MW
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {ui.showInventory &&
                  selectedBuilding &&
                  selectedBuilding.inventorySize !== undefined && (
                    <div
                      style={{
                        marginTop:
                          selectedBuilding.category !== "storage" ? 8 : 0,
                        padding: 8,
                        backgroundColor: "#111827",
                        borderRadius: 4,
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: "#9ca3af",
                          marginBottom: 4,
                        }}
                      >
                        Inventory
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#e5e7eb",
                        }}
                      >
                        {selectedBuilding.inventorySize}{" "}
                        {selectedBuilding.inventoryUnit ?? ""}
                      </div>
                    </div>
                  )}

                {/* Calculation Result Box - only for non-miner production buildings when setting enabled and item selected */}
                {ui.showProductionEfficiency &&
                  displayData.calcDisconnected &&
                  selectedBuilding?.category !== "storage" && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: 8,
                        backgroundColor: "rgba(148, 163, 184, 0.12)",
                        borderRadius: 4,
                        border: "1px dashed rgba(148, 163, 184, 0.6)",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Not connected yet
                      </div>
                    </div>
                  )}

                {ui.showProductionEfficiency &&
                  !displayData.calcDisconnected &&
                  !displayData.calcMismatchIncoming &&
                  !displayData.calcMismatchOutgoing &&
                  displayData.calcStatus &&
                  selectedOutputItem &&
                  selectedBuilding?.category !== "storage" && (
                    <div
                      title={
                        displayData.calcStatus === "optimal"
                          ? "Supply rate matches demand"
                          : displayData.calcStatus === "under"
                            ? `Not enough supply! Needed: ${formatNum(displayData.calcDemand as number | undefined)}/min, Available: ${formatNum(displayData.calcSupply as number | undefined)}/min`
                            : `Supply exceeds demand. Supply: ${formatNum(displayData.calcSupply as number | undefined)}/min, Demand: ${formatNum(displayData.calcDemand as number | undefined)}/min`
                      }
                      style={{
                        marginTop: 8,
                        padding: 8,
                        backgroundColor:
                          displayData.calcStatus === "optimal"
                            ? "rgba(16, 185, 129, 0.15)"
                            : displayData.calcStatus === "under"
                              ? "rgba(239, 68, 68, 0.25)"
                              : "rgba(234, 179, 8, 0.15)",
                        borderRadius: 4,
                        border:
                          displayData.calcStatus === "optimal"
                            ? "1px solid #10b981"
                            : displayData.calcStatus === "under"
                              ? "2px dashed #ef4444"
                              : "1px solid #eab308",
                        textAlign: "center",
                        boxShadow:
                          displayData.calcStatus === "under"
                            ? "inset 0 0 8px rgba(239, 68, 68, 0.3)"
                            : "none",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color:
                            displayData.calcStatus === "optimal"
                              ? "#10b981"
                              : displayData.calcStatus === "under"
                                ? "#ef4444"
                                : "#eab308",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        {displayData.calcStatus === "optimal" ? (
                          <>✓ Optimal</>
                        ) : displayData.calcStatus === "under" ? (
                          <>
                            <span style={{ fontSize: 14 }}>⚠</span>
                            Inefficient
                          </>
                        ) : (
                          <>⚡ Overproduction</>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: "#b0b0b0",
                          marginTop: 2,
                        }}
                      >
                        Supply:{" "}
                        {formatNum(
                          displayData.calcSupply as number | undefined,
                        )}
                        /min → Demand:{" "}
                        {formatNum(
                          displayData.calcDemand as number | undefined,
                        )}
                        /min
                      </div>
                    </div>
                  )}

                {!displayData.calcDisconnected &&
                  (displayData.calcMismatchOutgoing ||
                  displayData.calcMismatchIncoming) &&
                  selectedBuilding?.category !== "storage" && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: 8,
                        backgroundColor: "rgba(239, 68, 68, 0.25)",
                        borderRadius: 4,
                        border: "2px dashed #ef4444",
                        textAlign: "center",
                        boxShadow: "inset 0 0 8px rgba(239, 68, 68, 0.3)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#ef4444",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <span style={{ fontSize: 14 }}>⚠</span>
                        Invalid connection
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: "#fca5a5",
                          marginTop: 4,
                          lineHeight: 1.4,
                        }}
                      >
                        {displayData.calcMismatchOutgoing &&
                          "Irrelevant material delivery"}
                        {displayData.calcMismatchOutgoing &&
                          displayData.calcMismatchIncoming && <br />}
                        {displayData.calcMismatchIncoming &&
                          "Invalid incoming material"}
                      </div>
                    </div>
                  )}

                <div
                  style={{
                    fontSize: 10,
                    color: "#666",
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  Click to edit
                </div>
              </div>
            )}

            {/* Output Handle */}
            {hasOutput &&
              outputTypes.map((type, index) => (
                <Handle
                  key={`output-${type}-${index}`}
                  type="source"
                  position={Position.Right}
                  id={`out-${type}-${index}`}
                  style={{
                    ...getHandleStyle(type),
                    top:
                      outputCount === 1
                        ? "50%"
                        : `${25 + index * (50 / Math.max(outputCount - 1, 1))}%`,
                  }}
                />
              ))}
          </div>
        </div>
      </>
    );
  },
);

SimpleBuildingNode.displayName = "SimpleBuildingNode";

export default SimpleBuildingNode;
