import { memo, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Handle, Position, useUpdateNodeInternals } from "@xyflow/react";
import type { Building, BuildingNodeData, Item } from "../../types";
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
import { getRotatedHandleStyle } from "../../utils/handleRotation";

const buildings: Building[] = (buildingsData as { buildings: Building[] })
  .buildings;
const items: Item[] = (itemsData as { items: Item[] }).items;
interface SimpleBuildingNodeProps {
  id: string;
  selected?: boolean;
  data: BuildingNodeData;
}

const SimpleBuildingNode = memo(
  ({ id, data, selected }: SimpleBuildingNodeProps) => {
    const ui = useUiSettings();
    const isCollapsed = data.collapsed ?? false;
    const isGhost = data.isGhost ?? false;
    const stackCount = data.stackCount ?? 1;
    const isStackParent = stackCount > 1;
    const isStacked = (data as Record<string, unknown>).isStacked as
      | boolean
      | undefined;
    const stackLayers = Math.min(stackCount - 1, 3);
    const stackActiveIndex =
      typeof data.stackActiveIndex === "number" ? data.stackActiveIndex : 0;
    const stackActiveData = (data as Record<string, unknown>)
      .stackActiveData as Record<string, unknown> | undefined;
    const displayData = (stackActiveData ?? data) as typeof data;
    const incomingItems = (data as Record<string, unknown>).incomingItems as
      | string[]
      | undefined;
    const hasIncomingItems = (incomingItems?.length ?? 0) > 0;
    const calcDisconnected =
      displayData.calcDisconnected && !(isStacked && hasIncomingItems);

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

    const {
      recipes,
      recipeEntries,
      hasRecipes,
      effectiveRecipeIndex,
      selectedAltIndex,
      filteredAltOptions,
      hasAlternateOptions,
      canUseDefault,
      effectiveAltIndex,
      activeRequirements,
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

    useEffect(() => {
      if (isGhost) return;
      if (displayData.outputItem) return;
      if (!selectedBuilding) return;
      if (!incomingItems || incomingItems.length === 0) return;
      const uniqueIncoming = Array.from(new Set(incomingItems));
      if (uniqueIncoming.length !== 1) return;
      const incomingId = uniqueIncoming[0];
      const matching = items.filter((item) => {
        if (!item.producers || !item.producers.includes(selectedBuilding.id)) {
          return false;
        }
        if (!item.requires || item.requires.length === 0) return false;
        return item.requires.some((req) => req.item === incomingId);
      });
      if (matching.length !== 1) return;
      const matchedItem = matching[0];
      window.dispatchEvent(
        new CustomEvent("nodeDataChange", {
          detail: { nodeId: id, field: "outputItem", value: matchedItem.id },
        }),
      );
      const defaultProduction = matchedItem.defaultProduction;
      if (defaultProduction) {
        updateProductionForRate(defaultProduction);
      }
    }, [displayData.outputItem, id, incomingItems, isGhost, selectedBuilding]);

    const ghostBorderColor = isDarkTheme ? "#94a3b8" : themeColors.border;
    const ghostTextColor = isDarkTheme ? "#e2e8f0" : `${themeColors.header}CC`;
    const ghostAccent = isDarkTheme ? "#94a3b8" : themeColors.header;
    const handleRotation = (data.handleRotation as number | undefined) ?? 0;
    const updateNodeInternals = useUpdateNodeInternals();

    const getHandleStyle = (type: "conveyor" | "pipe") => {
      const baseStyle: CSSProperties = {
        width: isGhost ? 8 : 14,
        height: isGhost ? 8 : 14,
        borderRadius: 999,
      };

      if (type === "pipe") {
        const cssVars = baseStyle as CSSProperties &
          Record<string, string | number>;
        cssVars["--handle-bg"] = "#3b82f6";
        cssVars["--handle-border"] = "#1d4ed8";
      }

      if (isGhost) {
        return {
          ...baseStyle,
          border: "none",
          outline: "1px dashed var(--handle-bg)",
          outlineOffset: "2px",
        };
      }

      return baseStyle;
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

    useEffect(() => {
      updateNodeInternals(id);
    }, [handleRotation, inputCount, outputCount, updateNodeInternals, id]);
    const calcStatusTitle =
      displayData.calcStatus === "optimal"
        ? "Supply rate matches demand"
        : displayData.calcStatus === "under"
          ? `Under: ${formatNum(displayData.calcSupply as number | undefined)}/min vs ${formatNum(displayData.calcDemand as number | undefined)}/min`
          : displayData.calcStatus === "over"
            ? `Over: ${formatNum(displayData.calcSupply as number | undefined)}/min vs ${formatNum(displayData.calcDemand as number | undefined)}/min`
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
                color: ghostTextColor,
                background: isDarkTheme
                  ? "rgba(148, 163, 184, 0.2)"
                  : "rgba(26, 26, 46, 0.45)",
                border: `1px dashed ${ghostAccent}8C`,
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
                color: ghostTextColor,
                background: isDarkTheme
                  ? "rgba(148, 163, 184, 0.2)"
                  : "rgba(26, 26, 46, 0.35)",
                border: `1px dashed ${ghostAccent}80`,
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
              backgroundColor:
                isGhost && isDarkTheme
                  ? "rgba(148, 163, 184, 0.06)"
                  : isGhost
                    ? "transparent"
                    : themeColors.body,
              border: isGhost
                ? `2px dashed ${ghostBorderColor}80`
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
              ui.showProductionEfficiency &&
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
              inputTypes.map((type, index) => {
                const baseY =
                  inputCount === 1
                    ? 50
                    : 25 + index * (50 / Math.max(inputCount - 1, 1));
                return (
                  <Handle
                    key={`input-${type}-${index}`}
                    type="target"
                    position={Position.Left}
                    id={`in-${type}-${index}`}
                    className={type === "pipe" ? "handle-pipe" : "handle-input"}
                    style={{
                      ...getHandleStyle(type),
                      ...getRotatedHandleStyle(
                        { x: 0, y: baseY },
                        handleRotation,
                      ),
                    }}
                  />
                );
              })}

            {/* Output Handles */}
            {hasOutput &&
              outputTypes.map((type, index) => {
                const baseY =
                  outputCount === 1
                    ? 50
                    : 25 + index * (50 / Math.max(outputCount - 1, 1));
                return (
                  <Handle
                    key={`output-${type}-${index}`}
                    type="source"
                    position={Position.Right}
                    id={`out-${type}-${index}`}
                    className={
                      type === "pipe" ? "handle-pipe" : "handle-output"
                    }
                    style={{
                      ...getHandleStyle(type),
                      ...getRotatedHandleStyle(
                        { x: 100, y: baseY },
                        handleRotation,
                      ),
                    }}
                  />
                );
              })}
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
                      opacity: 0.7,
                      border: `1px dashed ${ghostBorderColor}80`,
                    }}
                  />
                )}
                {isStackParent && (
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: ghostTextColor,
                      border: `1px dashed ${ghostAccent}80`,
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
                      hideRequiredItems={ui.hideRequiredItems}
                      outputItem={selectedOutputItem}
                      missingRequirements={missingRequirements}
                      items={items}
                    />
                    {!ui.hideRequiredItems &&
                      activeRequirements.length > 0 &&
                      selectedOutputItem && (
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
                  calcDisconnected &&
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
                  !calcDisconnected &&
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
                      showDemandLine={!displayData.calcTerminalInputOnly}
                      surplusItemName={
                        displayData.calcStatus === "over"
                          ? (selectedOutputItem?.name ??
                            selectedStoredItem?.name ??
                            undefined)
                          : undefined
                      }
                    />
                  )}

                {!calcDisconnected &&
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
          </div>
        </div>
      </>
    );
  },
);

SimpleBuildingNode.displayName = "SimpleBuildingNode";

export default SimpleBuildingNode;
