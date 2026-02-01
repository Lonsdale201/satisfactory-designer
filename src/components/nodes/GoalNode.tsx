import { memo, useEffect, useMemo } from "react";
import { Handle, Position, useUpdateNodeInternals } from "@xyflow/react";
import { Item } from "../../types";
import itemsData from "../../data/items.json";
import { useUiSettings } from "../../contexts/UiSettingsContext";
import { getRotatedHandlePosition, getRotatedHandleStyle } from "../../utils/handleRotation";

const items: Item[] = itemsData.items;
const itemImageMap = import.meta.glob("../../assets/items/*", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

// Project Assembly Phase items - only these can be selected as goals
export const PROJECT_ASSEMBLY_ITEM_IDS = [
  "smart_plating",
  "automated_wiring",
  "versatile_framework",
  "adaptive_control_unit",
  "modular_engine",
  "assembly_director_system",
  "magnetic_field_generator",
  "nuclear_pasta",
  "thermal_propulsion_rocket",
  "biochemical_sculptor",
  "ai_expansion_server",
  "ballistic_warp_drive",
];

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

interface GoalNodeProps {
  id: string;
  data: {
    itemId: string;
    targetRate: number;
    customLabel?: string;
    collapsed?: boolean;
    isGhost?: boolean;
    handleRotation?: number;
  };
}

const GoalNode = memo(({ data, id }: GoalNodeProps) => {
  const ui = useUiSettings();
  const updateNodeInternals = useUpdateNodeInternals();
  const handleRotation = (data.handleRotation as number | undefined) ?? 0;
  const selectedItem = items.find((i) => i.id === data.itemId);
  const isCollapsed = data.collapsed ?? false;
  const isGhost = data.isGhost ?? false;
  const targetRate = data.targetRate || selectedItem?.defaultProduction || 1;
  const iconUrl = selectedItem ? findItemIconUrl(selectedItem) : "";

  const headerLabel = (
    data.customLabel ||
    selectedItem?.name ||
    "Goal"
  ).toUpperCase();

  // Calculate required inputs based on item recipe
  const requiredInputs = useMemo(() => {
    if (!selectedItem?.requires) return [];
    const baseProduction = selectedItem.defaultProduction || 1;
    const scale = targetRate / baseProduction;
    return selectedItem.requires.map((req) => ({
      ...req,
      perMin: req.amount * scale,
      item: items.find((i) => i.id === req.item),
    }));
  }, [selectedItem, targetRate]);

  const inputCount = requiredInputs.length || 1;

  useEffect(() => {
    updateNodeInternals(id);
  }, [handleRotation, inputCount, updateNodeInternals, id]);

  // Check if all required inputs are connected
  const connectedItems =
    ((data as Record<string, unknown>).connectedItems as
      | string[]
      | undefined) || [];
  const missingItems =
    ((data as Record<string, unknown>).missingItems as string[] | undefined) ||
    [];
  const goalAchieved = useMemo(() => {
    if (!selectedItem?.requires || selectedItem.requires.length === 0)
      return true;
    return missingItems.length === 0;
  }, [selectedItem, missingItems]);

  const ghostStyles = isGhost
    ? {
        opacity: 0.6,
        pointerEvents: "none" as const,
      }
    : {};

  return (
    <>
      <div
        style={{
          minWidth: isCollapsed ? 180 : 240,
          backgroundColor: isGhost ? "transparent" : "#1a1a2e",
          border: isGhost
            ? `2px dashed ${goalAchieved ? "rgba(34, 197, 94, 0.6)" : "rgba(234, 179, 8, 0.6)"}`
            : `3px solid ${goalAchieved ? "#22c55e" : "#eab308"}`,
          borderRadius: 12,
          fontFamily: "Inter, sans-serif",
          animation: isGhost
            ? "none"
            : goalAchieved
              ? "goal-achieved 2s ease-in-out infinite"
              : "goal-glow 2s ease-in-out infinite",
          position: "relative",
          overflow: "visible",
          ...ghostStyles,
        }}
      >
        {/* Status Badge */}
        {!isGhost && (
          <div
          style={{
            position: "absolute",
            top: -12,
            right: -12,
            width: 32,
            height: 32,
            borderRadius: "50%",
            backgroundColor: goalAchieved ? "#22c55e" : "#eab308",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: "bold",
            color: "#1a1a2e",
            boxShadow: `0 2px 8px ${goalAchieved ? "rgba(34, 197, 94, 0.5)" : "rgba(234, 179, 8, 0.5)"}`,
            animation: goalAchieved
              ? "checkmark-bounce 1s ease-in-out infinite"
              : "none",
            zIndex: 10,
          }}
        >
          {goalAchieved ? "✓" : "⚑"}
        </div>
        )}

        {/* Input Handles */}
        {Array.from({ length: inputCount }).map((_, index) => {
          const baseY =
            inputCount === 1
              ? 50
              : 25 + index * (50 / Math.max(inputCount - 1, 1));
          return (
            <Handle
              key={`input-${index}`}
              type="target"
              position={getRotatedHandlePosition({ x: 0, y: baseY }, handleRotation)}
              id={`in-conveyor-${index}`}
              className="handle-input"
              style={{
                width: 14,
                height: 14,
                border: "2px solid #eab308",
                borderRadius: 999,
                ...getRotatedHandleStyle({ x: 0, y: baseY }, handleRotation),
              }}
            />
          );
        })}

        {/* Header */}
        <div
          data-no-panel="true"
          style={{
            background: isGhost ? "transparent" : `linear-gradient(135deg, ${goalAchieved ? "#22c55e" : "#eab308"} 0%, ${goalAchieved ? "#16a34a" : "#ca8a04"} 100%)`,
            padding: isGhost ? "6px 12px" : "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderRadius: isGhost ? "9px" : isCollapsed ? "9px" : "9px 9px 0 0",
            cursor: isGhost ? "default" : "pointer",
            borderBottom: isGhost
              ? `1px dashed ${goalAchieved ? "rgba(34, 197, 94, 0.4)" : "rgba(234, 179, 8, 0.4)"}`
              : "none",
          }}
        >
          {!ui.hideAllImages && iconUrl && !isGhost && (
            <img
              src={iconUrl}
              alt=""
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                objectFit: "cover",
                background: "#1a1a2e",
                border: "2px solid rgba(255,255,255,0.3)",
              }}
            />
          )}
          <span
            style={{
              fontSize: isGhost ? 12 : 14,
              fontWeight: 700,
              color: isGhost
                ? goalAchieved
                  ? "rgba(34, 197, 94, 0.85)"
                  : "rgba(234, 179, 8, 0.85)"
                : "#1a1a2e",
              flex: 1,
              textShadow: isGhost ? "none" : "0 1px 2px rgba(255,255,255,0.2)",
            }}
          >
            {headerLabel}
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: isGhost
                ? goalAchieved
                  ? "rgba(34, 197, 94, 0.85)"
                  : "rgba(234, 179, 8, 0.85)"
                : "#1a1a2e",
              background: "rgba(255,255,255,0.3)",
              padding: "2px 8px",
              borderRadius: 999,
            }}
          >
            {targetRate}/min
          </span>
        </div>

        {isGhost && (
          <div
            style={{
              padding: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {!ui.hideAllImages && iconUrl && (
              <img
                src={iconUrl}
                alt=""
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  objectFit: "cover",
                  opacity: 0.6,
                  border: goalAchieved
                    ? "1px dashed rgba(34, 197, 94, 0.4)"
                    : "1px dashed rgba(234, 179, 8, 0.4)",
                }}
              />
            )}
            <span
              style={{
                fontSize: 10,
                color: goalAchieved
                  ? "rgba(34, 197, 94, 0.7)"
                  : "rgba(234, 179, 8, 0.7)",
                textTransform: "uppercase",
                letterSpacing: "0.4px",
                fontWeight: 700,
              }}
            >
              Project Parts
            </span>
          </div>
        )}

        {/* Body */}
        {!isCollapsed && !isGhost && (
          <div style={{ padding: 12 }}>
            {/* Goal Status */}
            <div
              style={{
                padding: 10,
                backgroundColor: goalAchieved
                  ? "rgba(34, 197, 94, 0.15)"
                  : "rgba(234, 179, 8, 0.15)",
                border: `1px solid ${goalAchieved ? "rgba(34, 197, 94, 0.4)" : "rgba(234, 179, 8, 0.4)"}`,
                borderRadius: 8,
                textAlign: "center",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: goalAchieved ? "#22c55e" : "#eab308",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                {goalAchieved ? "✓ Goal Achieved!" : "⚠ Requirements Missing"}
              </div>
              <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
                {connectedItems.length}/{requiredInputs.length} inputs connected
              </div>
            </div>

            {/* Required Inputs */}
            {!ui.hideRequiredItems && requiredInputs.length > 0 && (
              <div
                style={{
                  backgroundColor: "#111827",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#9ca3af",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Required Inputs
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {requiredInputs.map((req, index) => {
                    const isConnected = connectedItems.includes(
                      req.item?.id || "",
                    );
                    const itemIcon = req.item ? findItemIconUrl(req.item) : "";
                    return (
                      <div
                        key={`req-${index}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 8px",
                          backgroundColor: isConnected
                            ? "rgba(34, 197, 94, 0.1)"
                            : "rgba(239, 68, 68, 0.1)",
                          border: `1px solid ${isConnected ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                          borderRadius: 6,
                        }}
                      >
                        <span
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            backgroundColor: isConnected
                              ? "#22c55e"
                              : "#ef4444",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            color: "#fff",
                            fontWeight: "bold",
                          }}
                        >
                          {isConnected ? "✓" : "✗"}
                        </span>
                        {!ui.hideAllImages && itemIcon && (
                          <img
                            src={itemIcon}
                            alt=""
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 4,
                              objectFit: "cover",
                            }}
                          />
                        )}
                        <span
                          style={{ fontSize: 11, color: "#e5e7eb", flex: 1 }}
                        >
                          {req.item?.name || "Unknown"}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: isConnected ? "#22c55e" : "#f59e0b",
                          }}
                        >
                          {req.perMin.toFixed(1)}/m
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div
              style={{
                fontSize: 10,
                color: "#666",
                marginTop: 10,
                textAlign: "center",
              }}
            >
              Click to edit
            </div>
          </div>
        )}

        {/* Output Handle */}
        <Handle
          type="source"
          position={getRotatedHandlePosition({ x: 100, y: 50 }, handleRotation)}
          id="out-conveyor-0"
          className="handle-output"
          style={{
            width: 14,
            height: 14,
            border: "2px solid #1a1a2e",
            borderRadius: 999,
            ...getRotatedHandleStyle({ x: 100, y: 50 }, handleRotation),
          }}
        />
      </div>
    </>
  );
});

GoalNode.displayName = "GoalNode";

export default GoalNode;
