import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import * as Icons from "@mui/icons-material";
import itemsData from "../../data/items.json";
import type { Item } from "../../types";
import { useUiSettings } from "../../contexts/UiSettingsContext";
import { themeMap } from "../../constants/themeMap";

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

interface SplitterNodeProps {
  id: string;
  selected?: boolean;
  data: {
    label?: string;
    customLabel?: string;
    collapsed?: boolean;
    theme?: string;
    isGhost?: boolean;
    incomingItems?: string[];
  };
}

const SplitterNode = memo(({ data, selected }: SplitterNodeProps) => {
  const ui = useUiSettings();
  const isCollapsed = data.collapsed ?? false;
  const isGhost = data.isGhost ?? false;
  const headerLabel = (data.customLabel || "Splitter").toUpperCase();
  const themeKey = data.theme || "";
  const themeColors =
    themeMap[themeKey as keyof typeof themeMap] || themeMap.purple;

  const incomingItemId = data.incomingItems?.[0];
  const incomingItem = incomingItemId
    ? items.find((i) => i.id === incomingItemId)
    : undefined;
  const iconUrl = findItemIconUrl(incomingItem);

  const handleStyle = {
    background: "#d1d5db",
    width: isGhost ? 8 : 14,
    height: isGhost ? 8 : 14,
    border: isGhost ? "none" : "1px solid #6b7280",
    borderRadius: 999,
  } as const;

  return (
    <div
      style={{
        minWidth: isCollapsed ? 160 : 200,
        backgroundColor: themeColors.body,
        border: `2px solid ${selected ? "#fff" : themeColors.border}`,
        borderRadius: 8,
        fontFamily: "Inter, sans-serif",
        position: "relative",
        opacity: isGhost ? 0.5 : 1,
        pointerEvents: isGhost ? "none" : "auto",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="in-conveyor-0"
        style={{
          ...handleStyle,
          top: "50%",
        }}
      />

      <Handle
        type="source"
        position={Position.Top}
        id="out-top-0"
        style={{
          ...handleStyle,
          left: "50%",
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="out-right-0"
        style={{
          ...handleStyle,
          top: "50%",
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="out-bottom-0"
        style={{
          ...handleStyle,
          left: "50%",
        }}
      />

      <div
        data-no-panel="true"
        style={{
          backgroundColor: themeColors.header,
          padding: "6px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderRadius: isCollapsed ? 6 : "6px 6px 0 0",
          cursor: "pointer",
        }}
      >
        <Icons.CallSplit sx={{ fontSize: 18, color: themeColors.text }} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: themeColors.text,
            flex: 1,
          }}
        >
          {headerLabel}
        </span>
      </div>

      {!isCollapsed && !isGhost && (
        <div style={{ padding: 12 }}>
          <div
            style={{
              padding: 10,
              backgroundColor: "#1a1a2e",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {!ui.hideAllImages && iconUrl && (
              <img
                src={iconUrl}
                alt=""
                style={{ width: 24, height: 24, borderRadius: 4 }}
              />
            )}
            <div style={{ fontSize: 12, color: "#cbd5f5" }}>
              {incomingItem ? incomingItem.name : "No item"}
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
            Pass-through splitter
          </div>
        </div>
      )}
    </div>
  );
});

SplitterNode.displayName = "SplitterNode";

export default SplitterNode;
