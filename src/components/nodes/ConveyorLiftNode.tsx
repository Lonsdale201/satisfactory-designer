import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import * as Icons from "@mui/icons-material";
import { CONVEYOR_RATES } from "../../constants";
import itemsData from "../../data/items.json";
import type { Item } from "../../types";
import { useUiSettings } from "../../contexts/UiSettingsContext";

const items: Item[] = itemsData.items;
const itemImageMap = import.meta.glob("../../assets/items/*", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

const normalizeKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "");

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
  return entry ? entry[1] : "";
};

interface ConveyorLiftNodeProps {
  id: string;
  selected?: boolean;
  data: {
    label: string;
    liftMk: 1 | 2 | 3 | 4 | 5 | 6;
    direction: "up" | "down";
    customLabel?: string;
    collapsed?: boolean;
    isGhost?: boolean;
    isLiftGhost?: boolean; // Special flag for lift ghost - can be interacted with
    theme?: string;
    layer?: number;
    targetLayer?: number;
    transportingItem?: string;
  };
}

const ConveyorLiftNode = memo(
  ({ id, data, selected }: ConveyorLiftNodeProps) => {
    const ui = useUiSettings();
    const isCollapsed = data.collapsed ?? false;
    const isGhost = data.isGhost ?? false;
    const isLiftGhost = data.isLiftGhost ?? false;
    const direction = data.direction || "up";
    const liftMk = data.liftMk || 1;
    const maxRate = CONVEYOR_RATES[liftMk as keyof typeof CONVEYOR_RATES] || 60;
    const headerLabel = (
      (data.customLabel as string) || `LIFT MK.${liftMk}`
    ).toUpperCase();
    const theme = data.theme || "";

    const themeMap = {
      orange: {
        header: "#fa9549",
        body: "#252836",
        border: "#fa9549",
        text: "#1a1a2e",
      },
      purple: {
        header: "#8b5cf6",
        body: "#252836",
        border: "#8b5cf6",
        text: "#1a1a2e",
      },
      blue: {
        header: "#60a5fa",
        body: "#252836",
        border: "#60a5fa",
        text: "#0f172a",
      },
      dark: {
        header: "#111827",
        body: "#0b0f1a",
        border: "#374151",
        text: "#e5e7eb",
      },
      slate: {
        header: "#64748b",
        body: "#1f2937",
        border: "#94a3b8",
        text: "#0f172a",
      },
      green: {
        header: "#22c55e",
        body: "#1a2e1f",
        border: "#22c55e",
        text: "#0f1a12",
      },
      rose: {
        header: "#f43f5e",
        body: "#2e1a22",
        border: "#f43f5e",
        text: "#1a0f14",
      },
      teal: {
        header: "#14b8a6",
        body: "#1a2e2b",
        border: "#14b8a6",
        text: "#0f1a18",
      },
      amber: {
        header: "#f59e0b",
        body: "#2e2a1a",
        border: "#f59e0b",
        text: "#1a170f",
      },
      indigo: {
        header: "#6366f1",
        body: "#1e1a2e",
        border: "#6366f1",
        text: "#0f0e1a",
      },
      cyan: {
        header: "#06b6d4",
        body: "#1a2e2e",
        border: "#06b6d4",
        text: "#0f1a1a",
      },
    } as const;

    // Lift default is cyan theme to stand out
    const themeColors = theme
      ? themeMap[theme as keyof typeof themeMap] || themeMap.cyan
      : themeMap.cyan;

    // Ghost lift can still be interacted with (special behavior)
    const canInteract = !isGhost || isLiftGhost;

    const ghostStyles =
      isGhost && !isLiftGhost
        ? {
            opacity: 0.5,
            pointerEvents: "none" as const,
          }
        : isLiftGhost
          ? {
              opacity: 0.7,
            }
          : {};

    const getHandleStyle = (isInput: boolean) => {
      const baseStyle = {
        width: isGhost ? 8 : 14,
        height: isGhost ? 8 : 14,
        borderRadius: 999,
      };

      if (isGhost && !isLiftGhost) {
        return {
          ...baseStyle,
          background: themeColors.header,
          border: "none",
          outline: `1px dashed ${themeColors.header}80`,
          outlineOffset: "2px",
        } as const;
      }

      if (isLiftGhost) {
        return {
          ...baseStyle,
          background: isInput ? "#f59e0b" : "#22c55e",
          border: `2px solid ${isInput ? "#d97706" : "#16a34a"}`,
          boxShadow: `0 0 8px ${isInput ? "#f59e0b" : "#22c55e"}`,
        } as const;
      }

      return {
        ...baseStyle,
        background: isInput ? "#f59e0b" : "#22c55e",
        border: `1px solid ${isInput ? "#d97706" : "#16a34a"}`,
      } as const;
    };

    const DirectionIcon =
      direction === "up" ? Icons.ArrowUpward : Icons.ArrowDownward;
    const targetLayer =
      data.targetLayer ??
      (data.layer
        ? direction === "up"
          ? data.layer + 1
          : data.layer - 1
        : null);

    return (
      <div
        style={{
          minWidth: isCollapsed ? 140 : 180,
          backgroundColor: isGhost ? "transparent" : themeColors.body,
          border: isLiftGhost
            ? `2px dashed ${themeColors.border}`
            : isGhost
              ? `2px dashed ${themeColors.border}66`
              : `2px solid ${selected ? "#fff" : themeColors.border}`,
          borderRadius: 8,
          fontFamily: "Inter, sans-serif",
          cursor: canInteract ? "pointer" : "default",
          ...ghostStyles,
        }}
      >
        {/* Input Handle */}
        <Handle
          type="target"
          position={Position.Left}
          id="in-conveyor-0"
          style={{
            ...getHandleStyle(true),
            top: "50%",
          }}
        />

        {/* Output Handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="out-conveyor-0"
          style={{
            ...getHandleStyle(false),
            top: "50%",
          }}
        />

        {/* Header */}
        <div
          data-no-panel="true"
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
            cursor: canInteract ? "pointer" : "default",
            borderBottom: isGhost
              ? `1px dashed ${themeColors.border}4D`
              : "none",
          }}
        >
          {!isGhost && (
            <Icons.SwapVert sx={{ fontSize: 18, color: themeColors.text }} />
          )}
          <span
            style={{
              fontSize: isGhost ? 10 : 13,
              fontWeight: isGhost ? 600 : 700,
              color: isGhost ? `${themeColors.header}` : themeColors.text,
              flex: isGhost ? "none" : 1,
            }}
          >
            {headerLabel}
          </span>
          {!isGhost && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: themeColors.text,
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <DirectionIcon sx={{ fontSize: 14 }} />
            </span>
          )}
        </div>

        {/* Ghost Body */}
        {isGhost && (
          <div
            style={{
              padding: 8,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {/* Show transported item if available */}
            {(() => {
              const transportItem = items.find(
                (i) => i.id === data.transportingItem,
              );
              const iconUrl = findItemIconUrl(transportItem);
              if (transportItem) {
                return (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {iconUrl && (
                      <img
                        src={iconUrl}
                        alt=""
                        style={{ width: 16, height: 16, borderRadius: 2 }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        color: themeColors.header,
                      }}
                    >
                      {transportItem.name.length > 12
                        ? transportItem.name.slice(0, 12) + "..."
                        : transportItem.name}
                    </span>
                  </div>
                );
              }
              return (
                <DirectionIcon
                  sx={{
                    fontSize: 24,
                    color: isLiftGhost
                      ? themeColors.header
                      : `${themeColors.header}99`,
                  }}
                />
              );
            })()}
            {isLiftGhost && (
              <span
                style={{
                  fontSize: 8,
                  color: `${themeColors.header}99`,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                }}
              >
                Cross-layer
              </span>
            )}
          </div>
        )}

        {/* Normal Body */}
        {!isCollapsed && !isGhost && (
          <div style={{ padding: 12 }}>
            {/* Item display - main feature */}
            <div
              style={{
                padding: 12,
                backgroundColor: "#1a1a2e",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              {(() => {
                const transportItem = items.find(
                  (i) => i.id === data.transportingItem,
                );
                const iconUrl = findItemIconUrl(transportItem);
                if (transportItem) {
                  return (
                    <>
                      {!ui.hideAllImages && iconUrl && (
                        <img
                          src={iconUrl}
                          alt=""
                          style={{ width: 32, height: 32, borderRadius: 4 }}
                        />
                      )}
                      <div style={{ textAlign: "left" }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#06b6d4",
                          }}
                        >
                          {transportItem.name}
                        </div>
                        <div style={{ fontSize: 10, color: "#9ca3af" }}>
                          Transporting
                        </div>
                      </div>
                    </>
                  );
                }
                return (
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{ fontSize: 14, fontWeight: 600, color: "#666" }}
                    >
                      No Item
                    </div>
                    <div style={{ fontSize: 10, color: "#555" }}>
                      Click to select
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Stats - Speed and Direction */}
            <div style={{ display: "flex", gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  padding: 8,
                  backgroundColor: "#1a1a2e",
                  borderRadius: 4,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 10, color: "#aaa" }}>Speed</div>
                <div
                  style={{ fontSize: 14, fontWeight: 700, color: "#06b6d4" }}
                >
                  {maxRate}/m
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  padding: 8,
                  backgroundColor: "#1a1a2e",
                  borderRadius: 4,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 10, color: "#aaa" }}>Direction</div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  <DirectionIcon
                    sx={{
                      fontSize: 16,
                      color: direction === "up" ? "#22c55e" : "#f59e0b",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: direction === "up" ? "#22c55e" : "#f59e0b",
                    }}
                  >
                    {direction === "up" ? "Up" : "Down"}
                  </span>
                </div>
              </div>
            </div>

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
    );
  },
);

ConveyorLiftNode.displayName = "ConveyorLiftNode";

export default ConveyorLiftNode;
