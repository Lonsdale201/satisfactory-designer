import { useCallback } from "react";
import { Node, Edge, Connection, addEdge } from "@xyflow/react";
import { getEdgeLabel } from "../utils/edgeLabelUtils";
import buildingsData from "../data/buildings.json";
import itemsData from "../data/items.json";

interface UseConnectionHandlingProps {
  nodesRef: React.MutableRefObject<Node[]>;
  edgesRef: React.MutableRefObject<Edge[]>;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  calcEnabledRef: React.MutableRefObject<boolean>;
  handleCalculate: () => void;
}

interface UseConnectionHandlingReturn {
  onConnect: (params: Connection) => void;
}

/**
 * Resolve lift ghost IDs to original lift IDs
 */
function resolveLiftGhostId(
  nodeId: string | null | undefined,
): string | null | undefined {
  if (!nodeId) return nodeId;
  if (nodeId.endsWith("-lift-ghost")) {
    return nodeId.replace("-lift-ghost", "");
  }
  return nodeId;
}

/**
 * Parse handle type from handle ID
 */
function parseType(handleId?: string | null): "pipe" | "conveyor" | null {
  if (!handleId) return null;
  if (handleId.includes("pipe")) return "pipe";
  if (handleId.includes("conveyor")) return "conveyor";
  return null;
}

/**
 * Infer connection type from node
 */
function inferType(
  nodeId: string | null | undefined,
  direction: "input" | "output",
  nodes: Node[],
): "pipe" | "conveyor" | null {
  if (!nodeId) return null;
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  if (node.type === "building") {
    const buildingId = (node.data as Record<string, unknown>)?.buildingId as
      | string
      | undefined;
    const building = buildingsData.buildings.find((b) => b.id === buildingId);
    const types =
      direction === "input"
        ? (building?.inputTypes ??
          Array(building?.inputs ?? 1).fill("conveyor"))
        : (building?.outputTypes ?? ["conveyor"]);
    const unique = Array.from(new Set(types));
    return unique.length === 1 ? (unique[0] as "pipe" | "conveyor") : null;
  }


  if (
    node.type === "smartSplitter" ||
    node.type === "goal" ||
    node.type === "conveyorLift"
  ) {
    return "conveyor";
  }

  return null;
}

/**
 * Resolve default connection type for a node
 */
function resolveDefaultType(
  node: Node | undefined,
  direction: "input" | "output",
): "pipe" | "conveyor" | null {
  if (!node) return null;

  if (node.type === "building") {
    const buildingId = (node.data as Record<string, unknown>)?.buildingId as
      | string
      | undefined;
    const building = buildingsData.buildings.find((b) => b.id === buildingId);
    const types =
      direction === "input"
        ? (building?.inputTypes ??
          Array(building?.inputs ?? 1).fill("conveyor"))
        : (building?.outputTypes ?? ["conveyor"]);
    const unique = Array.from(new Set(types));
    return unique.length === 1 ? (unique[0] as "pipe" | "conveyor") : null;
  }


  if (
    node.type === "smartSplitter" ||
    node.type === "goal" ||
    node.type === "conveyorLift"
  ) {
    return "conveyor";
  }

  return null;
}

/**
 * Get incoming item from source node
 */
function getIncomingItem(
  sourceNode: Node | undefined,
  sourceHandle: string | null | undefined,
): string | undefined {
  if (!sourceNode) return undefined;
  const sourceData = sourceNode.data as Record<string, unknown>;

  if (sourceNode.type === "building") {
    return sourceData.outputItem as string | undefined;
  }
  if (sourceNode.type === "conveyorLift") {
    return sourceData.transportingItem as string | undefined;
  }
  if (sourceNode.type === "smartSplitter") {
    const outputs = sourceData.splitOutputs as
      | Array<{ item: string | null }>
      | undefined;
    if (!outputs) return undefined;
    if (sourceHandle === "out-top-0") return outputs[0]?.item ?? undefined;
    if (sourceHandle === "out-right-0") return outputs[1]?.item ?? undefined;
    if (sourceHandle === "out-bottom-0") return outputs[2]?.item ?? undefined;
    return undefined;
  }

  return undefined;
}

export function useConnectionHandling({
  nodesRef,
  edgesRef,
  setNodes,
  setEdges,
  calcEnabledRef,
  handleCalculate,
}: UseConnectionHandlingProps): UseConnectionHandlingReturn {
  const onConnect = useCallback(
    (params: Connection) => {
      // Use resolved IDs for the actual connection
      const resolvedParams = {
        ...params,
        source: resolveLiftGhostId(params.source),
        target: resolveLiftGhostId(params.target),
      };

      const sourceType =
        parseType(params.sourceHandle) ??
        inferType(resolvedParams.source, "output", nodesRef.current);
      const targetType =
        parseType(params.targetHandle) ??
        inferType(resolvedParams.target, "input", nodesRef.current);

      const sourceNode = nodesRef.current.find(
        (n) => n.id === resolvedParams.source,
      );
      const targetNode = nodesRef.current.find(
        (n) => n.id === resolvedParams.target,
      );
      const targetData = targetNode?.data as Record<string, unknown> | undefined;
      const stackActiveId = targetData?.stackActiveId as string | undefined;
      const stackedNodeIds = targetData?.stackedNodeIds as string[] | undefined;
      const isStackParent =
        Boolean(
          targetData?.stackCount &&
            (targetData.stackCount as number) > 1 &&
            stackedNodeIds &&
            stackedNodeIds.length > 1,
        );

      let resolvedSourceType =
        sourceType ?? resolveDefaultType(sourceNode, "output");
      let resolvedTargetType =
        targetType ?? resolveDefaultType(targetNode, "input");

      // If one side can't be resolved, inherit from the other side
      if (!resolvedSourceType && resolvedTargetType) {
        resolvedSourceType = resolvedTargetType;
      }
      if (!resolvedTargetType && resolvedSourceType) {
        resolvedTargetType = resolvedSourceType;
      }

      if (
        !resolvedSourceType ||
        !resolvedTargetType ||
        resolvedSourceType !== resolvedTargetType
      )
        return;

      // Auto-set production building output based on incoming item
      let applyToAllStackMembers = false;
      if (targetNode?.type === "building") {
        const targetBuildingId = targetData?.buildingId as string | undefined;
        const incomingItem = getIncomingItem(sourceNode, params.sourceHandle);

        if (incomingItem && targetBuildingId) {
          const matchingItems = itemsData.items.filter((item) => {
            if (!item.producers || !item.producers.includes(targetBuildingId))
              return false;
            if (!item.requires || item.requires.length === 0) return false;
            return item.requires.some((req) => req.item === incomingItem);
          });

          if (matchingItems.length === 1) {
            const matchedItem = matchingItems[0];
            const defaultProduction = matchedItem.defaultProduction || 30;

            applyToAllStackMembers =
              isStackParent &&
              stackedNodeIds &&
              stackedNodeIds.every((id) => {
                const node = nodesRef.current.find((n) => n.id === id);
                const outputItem = (node?.data as Record<string, unknown>)
                  ?.outputItem as string | undefined;
                return !outputItem || outputItem === matchedItem.id;
              });

            const targetIds = applyToAllStackMembers
              ? stackedNodeIds || [resolvedParams.target as string]
              : [stackActiveId || (resolvedParams.target as string)];

            setNodes((nds) =>
              nds.map((n) => {
                if (!targetIds?.includes(n.id)) return n;
                return {
                  ...n,
                  data: {
                    ...n.data,
                    outputItem: matchedItem.id,
                    production: defaultProduction,
                  },
                };
              }),
            );
          }
        }
      }

      // Auto-set Storage storedItem when first connected input arrives
      if (targetNode?.type === "building") {
        const targetData = targetNode.data as Record<string, unknown>;
        const targetBuildingId = targetData.buildingId as string | undefined;
        const targetBuilding = buildingsData.buildings.find(
          (b) => b.id === targetBuildingId,
        );
        if (targetBuilding?.category === "storage") {
          const storedItem = targetData.storedItem as string | undefined;
          const incomingItem = getIncomingItem(sourceNode, params.sourceHandle);
          if (incomingItem && !storedItem) {
            setNodes((nds) =>
              nds.map((n) => {
                if (n.id === resolvedParams.target) {
                  return {
                    ...n,
                    data: { ...n.data, storedItem: incomingItem },
                  };
                }
                return n;
              }),
            );
          }
        }
      }

      // Auto-set Conveyor Lift transported item when first connected input arrives
      if (targetNode?.type === "conveyorLift") {
        const targetData = targetNode.data as Record<string, unknown>;
        const transportingItem = targetData.transportingItem as
          | string
          | undefined;
        const incomingItem = getIncomingItem(sourceNode, params.sourceHandle);
        if (incomingItem && !transportingItem) {
          setNodes((nds) =>
            nds.map((n) => {
              if (n.id === resolvedParams.target) {
                return {
                  ...n,
                  data: { ...n.data, transportingItem: incomingItem },
                };
              }
              return n;
            }),
          );
        }
      }

      const label = getEdgeLabel(
        resolvedParams.source || "",
        resolvedParams.target,
        nodesRef.current,
        params.sourceHandle || null,
      );
      setEdges((eds) => {
        const newEdges = addEdge(
          {
            ...params,
            source: resolvedParams.source,
            target: resolvedParams.target,
            type: "custom",
            data: {
              label,
              material: resolvedSourceType,
              ...(isStackParent && stackActiveId && !applyToAllStackMembers
                ? { virtualTargetId: stackActiveId }
                : {}),
            },
          } as Connection,
          eds,
        );

        // Auto-recalculate if calculation is enabled
        if (calcEnabledRef.current) {
          edgesRef.current = newEdges;
          queueMicrotask(() => {
            handleCalculate();
          });
        }

        return newEdges;
      });
    },
    [setEdges, setNodes, nodesRef, edgesRef, calcEnabledRef, handleCalculate],
  );

  return { onConnect };
}
