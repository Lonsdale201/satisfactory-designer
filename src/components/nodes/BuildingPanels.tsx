import { memo } from "react";
import type { WheelEventHandler } from "react";
import { Button, Menu, MenuItem } from "@mui/material";
import { Building, Item, ItemRecipe, ItemRequirement } from "../../types";
import {
  formatDuration,
  formatNum,
  normalizeUnit,
  truncateLabel,
} from "../../utils/nodeUi";
import { findItemIconUrl } from "../../utils/iconLookup";

type ThemeColors = {
  header: string;
  body: string;
  border: string;
  text: string;
  box: string;
};

export const BuildingHeader = memo(
  ({
    headerLabel,
    iconUrl,
    themeColors,
    isGhost,
    isCollapsed,
    isStackParent,
    stackActiveIndex,
    stackCount,
    isDarkTheme,
    selectedOutputItem,
    productionRate,
    handleStackWheel,
    dispatchStackIndex,
    hideAllImages,
  }: {
    headerLabel: string;
    iconUrl: string;
    themeColors: ThemeColors;
    isGhost: boolean;
    isCollapsed: boolean;
    isStackParent: boolean;
    stackActiveIndex: number;
    stackCount: number;
    isDarkTheme: boolean;
    selectedOutputItem: Item | undefined;
    productionRate: number;
    handleStackWheel?: WheelEventHandler;
    dispatchStackIndex: (index: number) => void;
    hideAllImages: boolean;
  }) => (
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
        borderRadius: isGhost ? "6px 6px 0 0" : isCollapsed ? 6 : "6px 6px 0 0",
        cursor: "pointer",
        borderBottom: isGhost ? `1px dashed ${themeColors.border}4D` : "none",
      }}
    >
      {!isGhost && !hideAllImages && iconUrl && (
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
      {!isGhost && !hideAllImages && !iconUrl && (
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
            {"<"}
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
            {">"}
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
          {productionRate}/min
        </span>
      )}
    </div>
  ),
);

export const ProducesPanel = memo(
  ({
    themeColors,
    isGhost,
    requirementsMet,
    hasRecipes,
    recipeEntries,
    recipeAnchorEl,
    setRecipeAnchorEl,
    selectedOutputItem,
    effectiveRecipeIndex,
    getRecipeLabel,
    onRecipeSelect,
    hasAlternateOptions,
    altAnchorEl,
    setAltAnchorEl,
    canUseDefault,
    effectiveAltIndex,
    filteredAltOptions,
    getAltLabel,
    onAltSelect,
    hideAllImages,
    outputItem,
    missingRequirements,
    items,
  }: {
    themeColors: ThemeColors;
    isGhost: boolean;
    requirementsMet: boolean | null;
    hasRecipes: boolean;
    recipeEntries: Array<{ recipe: ItemRecipe; index: number }>;
    recipeAnchorEl: HTMLElement | null;
    setRecipeAnchorEl: (el: HTMLElement | null) => void;
    selectedOutputItem: Item | undefined;
    effectiveRecipeIndex: number;
    getRecipeLabel: (recipe: ItemRecipe) => string;
    onRecipeSelect: (index: number) => void;
    hasAlternateOptions: boolean;
    altAnchorEl: HTMLElement | null;
    setAltAnchorEl: (el: HTMLElement | null) => void;
    canUseDefault: boolean;
    effectiveAltIndex: number;
    filteredAltOptions: Array<{ requirements: ItemRequirement[]; index: number }>;
    getAltLabel: (requirements: ItemRequirement[]) => string;
    onAltSelect: (index: number) => void;
    hideAllImages: boolean;
    outputItem: Item | undefined;
    missingRequirements: string[];
    items: Item[];
  }) => (
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
            title={requirementsMet ? "All inputs connected" : "Missing inputs"}
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
            {requirementsMet ? "OK" : "X"}
          </span>
        )}
      </div>
      {hasRecipes && recipeEntries.length > 1 && (
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
            {recipeEntries.map(({ recipe, index }) => (
              <MenuItem
                key={`${selectedOutputItem?.id ?? "recipe"}-${index}`}
                selected={index === effectiveRecipeIndex}
                onClick={() => onRecipeSelect(index)}
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
                onClick={() => onAltSelect(-1)}
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
                onClick={() => onAltSelect(option.index)}
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
        {outputItem &&
          !hideAllImages &&
          (() => {
            const url = findItemIconUrl(outputItem);
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
          {outputItem ? outputItem.name : "Not selected"}
        </div>
      </div>
      {requirementsMet === false && missingRequirements.length > 0 && (
        <div
          style={{
            marginTop: 6,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
          }}
        >
          {missingRequirements.map((itemId) => {
            const item = items.find((i) => i.id === itemId);
            const icon = item ? findItemIconUrl(item) : "";
            const itemName = item?.name || itemId;
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
                title={itemName}
              >
                {!hideAllImages &&
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
                <div style={{ fontSize: 11, color: "#fecaca" }}>
                  {truncateLabel(itemName)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  ),
);

export const InputsPanel = memo(
  ({
    themeColors,
    requiredInputs,
    inputsExpanded,
    setInputsExpanded,
    hideAllImages,
  }: {
    themeColors: ThemeColors;
    requiredInputs: Array<{
      perMin: number;
      item: Item | undefined;
    }>;
    inputsExpanded: boolean;
    setInputsExpanded: (expanded: boolean) => void;
    hideAllImages: boolean;
  }) => (
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
          borderBottom: inputsExpanded ? "1px solid #333" : "none",
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "#9ca3af",
            transition: "transform 0.2s",
            transform: inputsExpanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          {">"}
        </span>
        <span style={{ fontSize: 11, color: "#9ca3af", flex: 1 }}>
          Inputs ({requiredInputs.length})
        </span>
      </div>
      {inputsExpanded && (
        <div
          style={{
            padding: "6px 8px",
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 6,
          }}
        >
          {requiredInputs.map((req, index) => {
            const maxPerMin = Math.max(...requiredInputs.map((r) => r.perMin));
            const percentage = maxPerMin > 0 ? (req.perMin / maxPerMin) * 100 : 0;
            const itemIcon = req.item ? findItemIconUrl(req.item) : "";
            return (
              <div
                key={`input-${index}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {!hideAllImages &&
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
  ),
);

export const OutputsPanel = memo(
  ({
    themeColors,
    outputs,
    hideAllImages,
  }: {
    themeColors: ThemeColors;
    outputs: Array<{ id: string; name: string; icon: string; rate: number }>;
    hideAllImages: boolean;
  }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {outputs.map((output, index, array) => (
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
          {!hideAllImages && output.icon && (
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
              {array.length > 1 ? `Output #${index + 1}` : "Output"}
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
      ))}
    </div>
  ),
);

export const StoragePanel = memo(
  ({
    selectedStoredItem,
    hideAllImages,
    themeColors,
    storageFlow,
  }: {
    selectedStoredItem: Item | undefined;
    hideAllImages: boolean;
    themeColors: ThemeColors;
    storageFlow:
      | {
          inRate: number;
          outRate: number;
          netRate: number;
          outDemand: number;
          canFill: boolean;
          fillMinutes: number | null;
        }
      | undefined;
  }) => (
    <>
      <div
        style={{
          padding: 8,
          backgroundColor: "#1a1a2e",
          borderRadius: 4,
          marginBottom: 8,
        }}
      >
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>
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
            !hideAllImages &&
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
            {selectedStoredItem ? selectedStoredItem.name : "Not selected"}
          </div>
        </div>
      </div>
      {storageFlow && (
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
                color: storageFlow.netRate > 0 ? "#22c55e" : "#f59e0b",
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
  ),
);

export const CalcStatusPanel = memo(
  ({
    calcStatus,
    calcSupply,
    calcDemand,
    calcInputDetails,
    items,
    title,
  }: {
    calcStatus: "optimal" | "under" | "over" | null;
    calcSupply: number | undefined;
    calcDemand: number | undefined;
    calcInputDetails?: Array<{ itemId: string; supply: number; demand: number }>;
    items: Item[];
    title?: string;
  }) => (
    <div
      title={title}
      style={{
        marginTop: 8,
        padding: 8,
        backgroundColor:
          calcStatus === "optimal"
            ? "rgba(16, 185, 129, 0.15)"
            : calcStatus === "under"
              ? "rgba(239, 68, 68, 0.25)"
              : "rgba(234, 179, 8, 0.15)",
        borderRadius: 4,
        border:
          calcStatus === "optimal"
            ? "1px solid #10b981"
            : calcStatus === "under"
              ? "2px dashed #ef4444"
              : "1px solid #eab308",
        textAlign: "center",
        boxShadow:
          calcStatus === "under"
            ? "inset 0 0 8px rgba(239, 68, 68, 0.3)"
            : "none",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color:
            calcStatus === "optimal"
              ? "#10b981"
              : calcStatus === "under"
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
        {calcStatus === "optimal" ? (
          <>OK Optimal</>
        ) : calcStatus === "under" ? (
          <>
            <span style={{ fontSize: 14 }}>!</span>
            Inefficient
          </>
        ) : (
          <>^ Overproduction</>
        )}
      </div>
      <div
        style={{
          fontSize: 9,
          color: "#b0b0b0",
          marginTop: 2,
        }}
      >
        Supply: {formatNum(calcSupply)}/min {" -> "} Demand:{" "}
        {formatNum(calcDemand)}/min
      </div>
      {Array.isArray(calcInputDetails) && calcInputDetails.length > 1 && (
        <div
          style={{
            marginTop: 4,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            fontSize: 9,
            color: "#cbd5f5",
          }}
        >
          {calcInputDetails.map((detail) => {
            const detailItem = items.find((item) => item.id === detail.itemId);
            return (
              <div key={detail.itemId}>
                {detailItem?.name ?? detail.itemId}: {formatNum(detail.supply)}
                /min {" -> "} {formatNum(detail.demand)}/min
              </div>
            );
          })}
        </div>
      )}
    </div>
  ),
);

export const InventoryPanel = memo(
  ({
    building,
  }: {
    building: Building;
  }) => (
    <div
      style={{
        marginTop: building.category !== "storage" ? 8 : 0,
        padding: 8,
        backgroundColor: "#111827",
        borderRadius: 4,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 4 }}>
        Inventory
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb" }}>
        {building.inventorySize} {normalizeUnit(building.inventoryUnit ?? "")}
      </div>
    </div>
  ),
);
