import { memo, useMemo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Item } from "../../types";
import itemsData from "../../data/items.json";
import { useUiSettings } from "../../contexts/UiSettingsContext";

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
  };
}

const GoalNode = memo(({ id, data }: GoalNodeProps) => {
  const ui = useUiSettings();
  const selectedItem = items.find((i) => i.id === data.itemId);
  const isCollapsed = data.collapsed ?? false;
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

  return (
    <>
      <div
        style={{
          minWidth: isCollapsed ? 180 : 240,
          backgroundColor: "#1a1a2e",
          border: `3px solid ${goalAchieved ? "#22c55e" : "#eab308"}`,
          borderRadius: 12,
          fontFamily: "Inter, sans-serif",
          animation: goalAchieved
            ? "goal-achieved 2s ease-in-out infinite"
            : "goal-glow 2s ease-in-out infinite",
          position: "relative",
          overflow: "visible",
        }}
      >
        {/* Status Badge */}
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

        {/* Input Handles */}
        {Array.from({ length: inputCount }).map((_, index) => (
          <Handle
            key={`input-${index}`}
            type="target"
            position={Position.Left}
            id={`in-conveyor-${index}`}
            style={{
              background: "#d1d5db",
              width: 14,
              height: 14,
              border: "2px solid #eab308",
              borderRadius: 999,
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
          style={{
            background: `linear-gradient(135deg, ${goalAchieved ? "#22c55e" : "#eab308"} 0%, ${goalAchieved ? "#16a34a" : "#ca8a04"} 100%)`,
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderRadius: isCollapsed ? "9px" : "9px 9px 0 0",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 18 }}>🎯</span>
          {!ui.hideAllImages && iconUrl && (
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
              fontSize: 14,
              fontWeight: 700,
              color: "#1a1a2e",
              flex: 1,
              textShadow: "0 1px 2px rgba(255,255,255,0.2)",
            }}
          >
            {headerLabel}
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#1a1a2e",
              background: "rgba(255,255,255,0.3)",
              padding: "2px 8px",
              borderRadius: 999,
            }}
          >
            {targetRate}/min
          </span>
        </div>

        {/* Body */}
        {!isCollapsed && (
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
            {requiredInputs.length > 0 && (
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
          position={Position.Right}
          id="out-conveyor-0"
          style={{
            background: goalAchieved ? "#22c55e" : "#eab308",
            width: 14,
            height: 14,
            border: "2px solid #1a1a2e",
            borderRadius: 999,
          }}
        />
      </div>
    </>
  );
});

GoalNode.displayName = "GoalNode";

export default GoalNode;
