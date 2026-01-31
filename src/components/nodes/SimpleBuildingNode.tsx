import { memo, useEffect, useMemo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { Building, Item } from "../../types";
import buildingsData from "../../data/buildings.json";
import itemsData from "../../data/items.json";
import { useUiSettings } from "../../contexts/UiSettingsContext";
import { formatNum } from "../../utils/nodeUi";
import { findBuildingIconUrl, findItemIconUrl } from "../../utils/iconLookup";
import { getThemeColors } from "../../constants/themeMap";
import { useBuildingRecipes } from "../../hooks/useBuildingRecipes";
import {
  BuildingHeader,
  ProducesPanel,
  InputsPanel,
  OutputsPanel,
  StoragePanel,
  CalcStatusPanel,
  InventoryPanel,
} from "./BuildingPanels";

const buildings: Building[] = buildingsData.buildings as Building[];
const items: Item[] = itemsData.items;
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
    calcMismatchOutgoingCount?: number;
    calcMismatchOutgoingTotal?: number;
    calcDisconnected?: boolean;
    calcInputDetails?: Array<{
      itemId: string;
      supply: number;
      demand: number;
    }>;
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
    const productionRate = (displayData.production as number) || 0;
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
    const themeColors = getThemeColors(theme);
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
    const {
      recipes,
      recipeEntries,
      hasRecipes,
      effectiveRecipeIndex,
      activeRecipe,
      selectedAltIndex,
      alternateOptions,
      filteredAltOptions,
      hasAlternateOptions,
      canUseDefault,
      effectiveAltIndex,
      activeAlt,
      activeRequirements,
      activeByproducts,
      requiredInputs,
      requirementsMet,
      missingRequirements,
      outputRows,
      getRecipeLabel,
      getAltLabel,
    } = useBuildingRecipes({
      selectedOutputItem,
      buildingId,
      displayData: displayData as Record<string, unknown>,
      items,
      selectedBuilding,
      incomingItems,
      productionRate,
    });
    const handleRecipeSelect = (index: number) => {
      const event = new CustomEvent("nodeDataChange", {
        detail: { nodeId: id, field: "selectedRecipeIndex", value: index },
      });
      window.dispatchEvent(event);
      const recipe = recipes[index];
      updateProductionForRate(
        recipe?.output ?? selectedOutputItem?.defaultProduction,
      );
      setRecipeAnchorEl(null);
    };
    const handleAltSelect = (index: number) => {
      const event = new CustomEvent("nodeDataChange", {
        detail: { nodeId: id, field: "selectedAltIndex", value: index },
      });
      window.dispatchEvent(event);
      const nextRate =
        index >= 0
          ? selectedOutputItem?.alternateOutputRates?.[index]
          : selectedOutputItem?.defaultProduction;
      updateProductionForRate(nextRate);
      setAltAnchorEl(null);
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

    useEffect(() => {
      if (isGhost) return;
      if (!selectedBuilding?.fixedOutput) return;
      const currentOutput = displayData.outputItem as string | undefined;
      if (currentOutput === selectedBuilding.fixedOutput) return;
      window.dispatchEvent(
        new CustomEvent("nodeDataChange", {
          detail: {
            nodeId: id,
            field: "outputItem",
            value: selectedBuilding.fixedOutput,
          },
        }),
      );
    }, [displayData.outputItem, id, isGhost, selectedBuilding?.fixedOutput]);

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

    const outputRowsWithIcons = useMemo(
      () =>
        outputRows.map((output) => {
          const item = items.find((i) => i.id === output.id);
          return {
            ...output,
            icon: item ? findItemIconUrl(item) : "",
          };
        }),
      [outputRows],
    );
    const calcStatusTitle =
      displayData.calcStatus === "optimal"
        ? "Supply rate matches demand"
        : displayData.calcStatus === "under"
          ? `Not enough supply! Needed: ${formatNum(displayData.calcDemand as number | undefined)}/min, Available: ${formatNum(displayData.calcSupply as number | undefined)}/min`
          : displayData.calcStatus === "over"
            ? `Supply exceeds demand. Supply: ${formatNum(displayData.calcSupply as number | undefined)}/min, Demand: ${formatNum(displayData.calcDemand as number | undefined)}/min`
            : undefined;

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
                    ? "OK"
                    : displayData.calcStatus === "under"
                      ? "!"
                      : "^"}
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
            <BuildingHeader
              headerLabel={headerLabel}
              iconUrl={iconUrl}
              themeColors={themeColors}
              isGhost={isGhost}
              isCollapsed={isCollapsed}
              isStackParent={isStackParent}
              stackActiveIndex={stackActiveIndex}
              stackCount={stackCount}
              isDarkTheme={isDarkTheme}
              selectedOutputItem={selectedOutputItem}
              productionRate={productionRate}
              handleStackWheel={handleStackWheel}
              dispatchStackIndex={dispatchStackIndex}
              hideAllImages={ui.hideAllImages}
            />

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
                    <ProducesPanel
                      themeColors={themeColors}
                      isGhost={isGhost}
                      requirementsMet={requirementsMet}
                      hasRecipes={hasRecipes}
                      recipeEntries={recipeEntries}
                      recipeAnchorEl={recipeAnchorEl}
                      setRecipeAnchorEl={setRecipeAnchorEl}
                      selectedOutputItem={selectedOutputItem}
                      effectiveRecipeIndex={effectiveRecipeIndex}
                      getRecipeLabel={getRecipeLabel}
                      onRecipeSelect={handleRecipeSelect}
                      hasAlternateOptions={hasAlternateOptions}
                      altAnchorEl={altAnchorEl}
                      setAltAnchorEl={setAltAnchorEl}
                      canUseDefault={canUseDefault}
                      effectiveAltIndex={effectiveAltIndex}
                      filteredAltOptions={filteredAltOptions}
                      getAltLabel={getAltLabel}
                      onAltSelect={handleAltSelect}
                      hideAllImages={ui.hideAllImages}
                      outputItem={selectedOutputItem}
                      missingRequirements={missingRequirements}
                      items={items}
                    />
                    {activeRequirements.length > 0 && selectedOutputItem && (
                      <div style={{ marginBottom: 8 }}>
                        <InputsPanel
                          themeColors={themeColors}
                          requiredInputs={requiredInputs}
                          inputsExpanded={inputsExpanded}
                          setInputsExpanded={setInputsExpanded}
                          hideAllImages={ui.hideAllImages}
                        />
                      </div>
                    )}
                    {showIoBlock &&
                      selectedOutputItem &&
                      outputRows.length > 0 && (
                        <OutputsPanel
                          themeColors={themeColors}
                          outputs={outputRowsWithIcons}
                          hideAllImages={ui.hideAllImages}
                        />
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
                  </>
                ) : (
                  <StoragePanel
                    selectedStoredItem={selectedStoredItem}
                    hideAllImages={ui.hideAllImages}
                    themeColors={themeColors}
                    storageFlow={
                      ui.showProductionEfficiency ? storageFlow : undefined
                    }
                  />
                )}

                {ui.showInventory &&
                  selectedBuilding &&
                  selectedBuilding.inventorySize !== undefined && (
                    <InventoryPanel building={selectedBuilding} />
                  )}

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
                    <CalcStatusPanel
                      calcStatus={displayData.calcStatus}
                      calcSupply={displayData.calcSupply as number | undefined}
                      calcDemand={displayData.calcDemand as number | undefined}
                      calcInputDetails={displayData.calcInputDetails}
                      items={items}
                      title={calcStatusTitle}
                    />
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
                        <span style={{ fontSize: 14 }}>!</span>
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
                          (displayData.calcMismatchOutgoingTotal ?? 0) > 0 && (
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 9,
                                color: "#fca5a5",
                              }}
                            >
                              Invalid outputs:{" "}
                              {displayData.calcMismatchOutgoingCount ?? 0}/
                              {displayData.calcMismatchOutgoingTotal ?? 0}
                            </div>
                          )}
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
