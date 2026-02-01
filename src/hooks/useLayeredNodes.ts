import { useMemo } from "react";
import type { Node } from "@xyflow/react";
import { themeMap } from "../constants/themeMap";

const hexToRgba = (hex: string, alpha: number) => {
  const clean = hex.replace("#", "");
  const value =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = parseInt(value, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

type LiftGhostInfo = {
  originalNode: Node;
  ghostId: string;
};

type UseLayeredNodesArgs = {
  nodes: Node[];
  currentLayer: number;
  nodeById: Map<string, Node>;
  incomingItemsByNode: Map<string, string[]>;
  splitterAutoOutputsById: Map<string, unknown>;
  goalConnectionsById: Map<string, { connectedItems: unknown; missingItems: unknown }>;
  getLiftGhostsForLayer: (layer: number) => LiftGhostInfo[];
};

export const useLayeredNodes = ({
  nodes,
  currentLayer,
  nodeById,
  incomingItemsByNode,
  splitterAutoOutputsById,
  goalConnectionsById,
  getLiftGhostsForLayer,
}: UseLayeredNodesArgs) =>
  useMemo(() => {
    const visible = nodes
      .map((node) => {
        const data = node.data as Record<string, unknown>;
        const nodeLayer = (data.layer as number) || 1;
        const stackActiveId = data.stackActiveId as string | undefined;
        const stackCount = data.stackCount as number | undefined;
        const incomingItems =
          stackActiveId && stackCount && stackCount > 1
            ? incomingItemsByNode.get(stackActiveId) || []
            : incomingItemsByNode.get(node.id) || [];
        const splitterOutputs = splitterAutoOutputsById.get(node.id);
        const goalConnections = goalConnectionsById.get(node.id);
        const stackActiveData =
          stackActiveId && stackCount && stackCount > 1
            ? (nodeById.get(stackActiveId)?.data as
                | Record<string, unknown>
                | undefined)
            : undefined;
        if (nodeLayer === currentLayer) {
          // Active layer - normal rendering
          return {
            ...node,
            data: {
              ...node.data,
              isGhost: false,
              incomingItems,
              autoAssignedOutputs: splitterOutputs,
              connectedItems: goalConnections?.connectedItems,
              missingItems: goalConnections?.missingItems,
              stackActiveData,
            },
            selectable: data.isStacked ? false : node.selectable,
            draggable: data.isStacked ? false : node.draggable,
            hidden: node.hidden || data.isStacked,
          };
        } else if (nodeLayer === currentLayer - 1) {
          // One layer below - ghost mode
          if (node.type === "conveyorLift") {
            const direction = (data.direction as "up" | "down") || "up";
            const targetLayer =
              (data.targetLayer as number) ??
              (direction === "up" ? nodeLayer + 1 : nodeLayer - 1);
            if (targetLayer === currentLayer) {
              return null;
            }
          }
          const groupThemeKey = (data.theme as string | undefined) || "";
          const legacyGroupColor = data.color as string | undefined;
          const groupThemeColor =
            themeMap[groupThemeKey]?.header ||
            legacyGroupColor ||
            themeMap.orange.header;
          const ghostGroupStyle =
            node.type === "group"
              ? ({
                  ...(node.style ?? {}),
                  backgroundColor: "transparent",
                  ["--xy-node-group-background-color" as string]: hexToRgba(
                    groupThemeColor,
                    0.004,
                  ),
                } as Node["style"])
              : node.style;
          const ghostZIndex =
            node.type === "group" ? -5 : (node.zIndex as number | undefined);
          return {
            ...node,
            zIndex: ghostZIndex,
            style: ghostGroupStyle,
            data: {
              ...node.data,
              isGhost: true,
              incomingItems,
              autoAssignedOutputs: splitterOutputs,
              connectedItems: goalConnections?.connectedItems,
              missingItems: goalConnections?.missingItems,
              stackActiveData,
            },
            selectable: false,
            draggable: false,
            hidden: node.hidden || data.isStacked,
          };
        }
        // Other layers - hide completely
        return null;
      })
      .filter(Boolean) as Node[];

    // Add lift ghost nodes for lifts that target the current layer
    const liftGhosts = getLiftGhostsForLayer(currentLayer);
    liftGhosts.forEach(({ originalNode, ghostId }) => {
      // Don't add ghost if the original is already on this layer
      const originalData = originalNode.data as Record<string, unknown>;
      const originalLayer = (originalData.layer as number) || 1;
      if (originalLayer === currentLayer) return;
      const ghostIncomingItems = incomingItemsByNode.get(originalNode.id) || [];

      // Create a ghost node that represents the lift on this layer
      // This ghost CAN be interacted with (unique lift behavior)
      const ghostNode: Node = {
        ...originalNode,
        id: ghostId,
        data: {
          ...originalNode.data,
          isGhost: true,
          isLiftGhost: true, // Special flag - this ghost can be interacted with
          originalLiftId: originalNode.id,
          incomingItems: ghostIncomingItems,
        },
        selectable: true,
        draggable: true,
        connectable: true,
      };
      visible.push(ghostNode);
    });

    const visibleIds = new Set(visible.map((n) => n.id));
    const normalized = visible.map((node) => {
      const parentId = (node as Record<string, unknown>).parentId as
        | string
        | undefined;
      if (parentId && !visibleIds.has(parentId)) {
        return {
          ...node,
          parentId: undefined,
          extent: undefined,
        };
      }
      return node;
    });

    // Ensure parent nodes appear before their children to avoid React Flow warnings.
    return normalized.slice().sort((a, b) => {
      const aParent = (a as Record<string, unknown>).parentId as
        | string
        | undefined;
      const bParent = (b as Record<string, unknown>).parentId as
        | string
        | undefined;
      if (aParent && aParent === b.id) return 1;
      if (bParent && bParent === a.id) return -1;
      return 0;
    });
  }, [
    nodes,
    currentLayer,
    nodeById,
    incomingItemsByNode,
    splitterAutoOutputsById,
    goalConnectionsById,
    getLiftGhostsForLayer,
  ]);
