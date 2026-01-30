import { Node } from "@xyflow/react";
import itemsData from "../data/items.json";
import {
  CONVEYOR_RATES,
  PIPE_RATES,
  PURITY_RATES,
  MINER_MULTIPLIERS,
} from "../constants";

/**
 * Get the label for an edge based on source and target nodes
 */
export function getEdgeLabel(
  sourceNodeId: string,
  targetNodeId: string | null | undefined,
  nodeList: Node[],
  sourceHandle?: string | null,
): string {
  const resolveStackNode = (node: Node | undefined) => {
    if (!node) return undefined;
    const nodeData = node.data as Record<string, unknown>;
    const stackActiveId = nodeData.stackActiveId as string | undefined;
    const stackCount = nodeData.stackCount as number | undefined;
    if (stackActiveId && stackCount && stackCount > 1) {
      const activeNode = nodeList.find((n) => n.id === stackActiveId);
      if (activeNode) return activeNode;
    }
    return node;
  };

  const sourceNode = resolveStackNode(
    nodeList.find((n) => n.id === sourceNodeId),
  );
  if (!sourceNode) return "";
  const targetNode = targetNodeId
    ? resolveStackNode(nodeList.find((n) => n.id === targetNodeId))
    : undefined;

  const data = sourceNode.data as Record<string, unknown>;
  const isPipe = sourceHandle?.includes("pipe") || false;
  const conveyorMk = (data.conveyorMk as number) || 1;
  const pipeMk = (data.pipeMk as number) || 1;
  const mkRate = isPipe
    ? `${PIPE_RATES[pipeMk as keyof typeof PIPE_RATES]} m3/min`
    : `${CONVEYOR_RATES[conveyorMk as keyof typeof CONVEYOR_RATES]}/min`;

  if (sourceNode.type === "resource") {
    const resource = itemsData.items.find((i) => i.id === data.resourceId);
    const purity = (data.purity as string) || "normal";
    const purityKey =
      purity === "impure" ? "impure" : purity === "pure" ? "pure" : "normal";
    const rate = PURITY_RATES[purityKey as keyof typeof PURITY_RATES] || 60;
    const targetData = (targetNode?.data as Record<string, unknown>) || {};
    const targetBuildingId = (targetData.buildingId as string) || "";
    const targetConveyorMk = (targetData.conveyorMk as number) || 1;
    const targetPipeMk = (targetData.pipeMk as number) || 1;
    const mkMultiplier = { 1: 1, 2: 2, 3: 4 } as const;
    const pipeMultiplier = { 1: 1, 2: 2, 3: 3 } as const;
    const minerMultiplier =
      MINER_MULTIPLIERS[targetBuildingId as keyof typeof MINER_MULTIPLIERS];
    const actualRate = isPipe
      ? rate * pipeMultiplier[targetPipeMk as 1 | 2 | 3]
      : rate * (minerMultiplier ?? mkMultiplier[targetConveyorMk as 1 | 2 | 3]);
    return resource ? `${resource.name} (${rate}/min) ${actualRate}/min` : "";
  }

  if (sourceNode.type === "building") {
    const item = itemsData.items.find((i) => i.id === data.outputItem);
    const rate = data.production || 0;
    return item ? `${item.name} ${rate}/min (${mkRate})` : "";
  }

  if (sourceNode.type === "transport") {
    const item = itemsData.items.find((i) => i.id === data.deliveryItem);
    return item ? `${item.name} (${mkRate})` : "";
  }

  if (sourceNode.type === "conveyorLift") {
    const item = itemsData.items.find((i) => i.id === data.transportingItem);
    return item ? `${item.name} (${mkRate})` : "";
  }

  return "";
}
