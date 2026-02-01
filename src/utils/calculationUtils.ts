import { Node, Edge } from "@xyflow/react";
import { CONVEYOR_RATES, PIPE_RATES, ConveyorMk, PipeMk } from "../constants/rates";
import { NodeStatusMap, CalcStatus, StorageFlow } from "../types/calculation";
import { Item, Building, ItemRecipe, ItemRequirement } from "../types";

interface CalculationContext {
  nodes: Node[];
  edges: Edge[];
  items: Item[];
  buildings: Building[];
}

function resolveRecipeForData(
  item: Item | undefined,
  data: Record<string, unknown>,
): { recipe: ItemRecipe; recipeIndex: number } | null {
  if (!item?.recipes || item.recipes.length === 0) return null;
  const buildingId = (data.buildingId as string | undefined) || "";
  const entries = item.recipes.map((recipe, index) => ({ recipe, index }));
  const filtered = entries.filter(({ recipe }) => {
    const producer = recipe.producer;
    const producers = recipe.producers;
    if (!producer && !producers) return true;
    if (!buildingId) return true;
    if (producer && producer === buildingId) return true;
    if (producers && producers.includes(buildingId)) return true;
    return false;
  });
  const eligible = filtered.length > 0 ? filtered : entries;
  const selectedRecipeIndex = data.selectedRecipeIndex as number | undefined;
  const desiredIndex = selectedRecipeIndex ?? item.defaultRecipeIndex ?? 0;
  const match =
    eligible.find((entry) => entry.index === desiredIndex) || eligible[0];
  if (!match) return null;
  return { recipe: match.recipe, recipeIndex: match.index };
}

// Build adjacency lists for graph traversal
export function buildAdjacencyLists(edges: Edge[]) {
  const outgoingEdges: Record<string, Edge[]> = {};
  const incomingEdges: Record<string, Edge[]> = {};

  edges.forEach((edge) => {
    const sourceId =
      ((edge.data as Record<string, unknown> | undefined)
        ?.virtualSourceId as string | undefined) ?? edge.source;
    const targetId =
      ((edge.data as Record<string, unknown> | undefined)
        ?.virtualTargetId as string | undefined) ?? edge.target;
    if (!outgoingEdges[sourceId]) outgoingEdges[sourceId] = [];
    if (!incomingEdges[targetId]) incomingEdges[targetId] = [];
    outgoingEdges[sourceId].push(edge);
    incomingEdges[targetId].push(edge);
  });

  return { outgoingEdges, incomingEdges };
}

// Get all nodes in a stack
export function getStackNodes(node: Node, allNodes: Node[]): Node[] {
  const data = node.data as Record<string, unknown>;
  const stackCount = data.stackCount as number | undefined;
  const stackedNodeIds = data.stackedNodeIds as string[] | undefined;

  if (
    stackCount &&
    stackCount > 1 &&
    stackedNodeIds &&
    stackedNodeIds.length > 0
  ) {
    return stackedNodeIds
      .map((id) => allNodes.find((n) => n.id === id))
      .filter(Boolean) as Node[];
  }
  return [node];
}

// Calculate demand rate for a building node
export function getDemandRate(
  node: Node,
  allNodes: Node[],
  itemById: Map<string, Item>,
): number {
  if (node.type !== "building") return 0;

  const stackNodes = getStackNodes(node, allNodes);
  return stackNodes.reduce((sum, stackNode) => {
    const data = stackNode.data as Record<string, unknown>;
    const production = (data.production as number) || 0;
    const outputItem = (data.outputItem as string) || "";
    const item = outputItem ? itemById.get(outputItem) : undefined;

    const resolvedRecipe = resolveRecipeForData(item, data);
    if (resolvedRecipe?.recipe?.inputs && resolvedRecipe.recipe.inputs.length > 0) {
      const baseOutput =
        resolvedRecipe.recipe.output ?? item?.defaultProduction ?? 0;
      if (baseOutput <= 0) return sum;
      const scale = production / baseOutput;
      return (
        sum +
        resolvedRecipe.recipe.inputs.reduce(
          (reqSum: number, req: ItemRequirement) => reqSum + req.amount * scale,
          0,
        )
      );
    }

    if (
      item?.alternateRequires &&
      item.alternateRequires.length > 0 &&
      typeof (data.selectedAltIndex as number | null | undefined) === "number"
    ) {
      const altIndex = data.selectedAltIndex as number;
      const altReqs = item.alternateRequires[altIndex];
      const baseOutput =
        item.alternateOutputRates?.[altIndex] ?? item.defaultProduction ?? 0;
      if (altReqs && baseOutput > 0) {
        const scale = production / baseOutput;
        return (
          sum +
          altReqs.reduce(
            (reqSum: number, req: ItemRequirement) => reqSum + req.amount * scale,
            0,
          )
        );
      }
    }

    if (
      item?.requires &&
      item.defaultProduction &&
      item.defaultProduction > 0
    ) {
      const scale = production / item.defaultProduction;
      return (
        sum +
      item.requires.reduce(
        (reqSum: number, req: ItemRequirement) => reqSum + req.amount * scale,
        0,
      )
    );
    }
    return sum + production;
  }, 0);
}

function getDemandRateForItem(
  node: Node,
  itemId: string,
  allNodes: Node[],
  itemById: Map<string, Item>,
): number {
  if (node.type !== "building") return 0;
  const stackNodes = getStackNodes(node, allNodes);
  return stackNodes.reduce((sum, stackNode) => {
    const data = stackNode.data as Record<string, unknown>;
    const production = (data.production as number) || 0;
    const outputItem = (data.outputItem as string) || "";
    const item = outputItem ? itemById.get(outputItem) : undefined;

    const resolvedRecipe = resolveRecipeForData(item, data);
    const req = resolvedRecipe?.recipe?.inputs?.find(
      (input) => input.item === itemId,
    );
    if (req) {
      const baseOutput =
        resolvedRecipe?.recipe?.output ?? item?.defaultProduction ?? 0;
      if (baseOutput <= 0) return sum;
      const scale = production / baseOutput;
      return sum + req.amount * scale;
    }

    if (
      item?.alternateRequires &&
      item.alternateRequires.length > 0 &&
      typeof (data.selectedAltIndex as number | null | undefined) === "number"
    ) {
      const altIndex = data.selectedAltIndex as number;
      if (altIndex >= 0) {
        const altReqs = item.alternateRequires[altIndex];
        const req = altReqs?.find((input) => input.item === itemId);
        const baseOutput =
          item.alternateOutputRates?.[altIndex] ??
          item.defaultProduction ??
          0;
        if (req && baseOutput > 0) {
          const scale = production / baseOutput;
          return sum + req.amount * scale;
        }
      }
      return sum;
    }

    if (
      item?.requires &&
      item.defaultProduction &&
      item.defaultProduction > 0
    ) {
      const req = item.requires.find((input) => input.item === itemId);
      if (req) {
        const scale = production / item.defaultProduction;
        return sum + req.amount * scale;
      }
    }
    return sum;
  }, 0);
}

function getRequiredItemIdsForData(
  data: Record<string, unknown>,
  itemById: Map<string, Item>,
): string[] {
  const outputItem = (data.outputItem as string) || "";
  const item = outputItem ? itemById.get(outputItem) : undefined;
  if (!item) return [];

  const resolvedRecipe = resolveRecipeForData(item, data);
  if (resolvedRecipe) {
    return resolvedRecipe.recipe.inputs?.map((req) => req.item) ?? [];
  }

  if (
    item.alternateRequires &&
    item.alternateRequires.length > 0 &&
    typeof (data.selectedAltIndex as number | null | undefined) === "number"
  ) {
    const altIndex = data.selectedAltIndex as number;
    if (altIndex >= 0) {
      const altReqs = item.alternateRequires[altIndex];
      return altReqs?.map((req) => req.item) ?? [];
    }
  }

  return item.requires?.map((req) => req.item) ?? [];
}

function getRequiredItemIdsForNode(
  node: Node,
  allNodes: Node[],
  itemById: Map<string, Item>,
): Set<string> {
  if (node.type !== "building") return new Set();
  const stackNodes = getStackNodes(node, allNodes);
  const required = new Set<string>();
  stackNodes.forEach((stackNode) => {
    const data = stackNode.data as Record<string, unknown>;
    getRequiredItemIdsForData(data, itemById).forEach((id) =>
      required.add(id),
    );
  });
  return required;
}

function getEdgeSourceId(edge: Edge): string {
  return (
    ((edge.data as Record<string, unknown> | undefined)?.virtualSourceId as
      | string
      | undefined) ?? edge.source
  );
}

function getEdgeTargetId(edge: Edge): string {
  return (
    ((edge.data as Record<string, unknown> | undefined)?.virtualTargetId as
      | string
      | undefined) ?? edge.target
  );
}

function getEdgeItemId(
  edge: Edge,
  sourceNode: Node | undefined,
  itemById: Map<string, Item>,
): string | undefined {
  const edgeItemId = (edge.data as Record<string, unknown> | undefined)
    ?.itemId as string | undefined;
  if (edgeItemId) return edgeItemId;
  if (!sourceNode) return undefined;
  const data = sourceNode.data as Record<string, unknown>;
  if (sourceNode.type === "building") {
    const outputItemId = data.outputItem as string | undefined;
    if (!outputItemId) {
      return data.storedItem as string | undefined;
    }
    const isPipe = Boolean(
      edge.sourceHandle?.includes("pipe") || edge.targetHandle?.includes("pipe"),
    );
    if (isPipe) {
      const outputItem = itemById.get(outputItemId);
      if (outputItem?.category === "fluid") return outputItemId;
      const resolvedRecipe = resolveRecipeForData(outputItem, data);
      const byproduct = resolvedRecipe?.recipe?.byproducts?.find((byp) => {
        const bypItem = itemById.get(byp.item);
        return bypItem?.category === "fluid";
      });
      if (byproduct) return byproduct.item;
    }
    return outputItemId;
  }
  if (sourceNode.type === "smartSplitter") {
    const outputs =
      (data.splitOutputs as Array<{ item: string | null }> | undefined) ??
      (data.autoAssignedOutputs as Array<{ item: string | null }> | undefined);
    if (!outputs) return undefined;
    const handle = edge.sourceHandle || "";
    if (handle === "out-top-0") return outputs[0]?.item ?? undefined;
    if (handle === "out-right-0") return outputs[1]?.item ?? undefined;
    if (handle === "out-bottom-0") return outputs[2]?.item ?? undefined;
  }
  if (sourceNode.type === "conveyorLift") {
    return data.transportingItem as string | undefined;
  }
  return undefined;
}

function getEdgeMaterial(edge: Edge): "pipe" | "conveyor" {
  const dataMaterial = (edge.data as Record<string, unknown> | undefined)
    ?.material as string | undefined;
  if (dataMaterial === "pipe" || dataMaterial === "conveyor") {
    return dataMaterial;
  }
  const handle = edge.sourceHandle || edge.targetHandle || "";
  if (handle.includes("pipe")) return "pipe";
  return "conveyor";
}

function getOutgoingSplitRatio(
  sourceNode: Node,
  edge: Edge,
  itemId: string | undefined,
  outgoingEdges: Record<string, Edge[]>,
  itemById: Map<string, Item>,
): number {
  const outgoing = outgoingEdges[sourceNode.id] || [];
  if (outgoing.length === 0) return 1;
  const targetMaterial = getEdgeMaterial(edge);
  const relevant = outgoing.filter((outEdge) => {
    if (getEdgeMaterial(outEdge) !== targetMaterial) return false;
    const outItemId = getEdgeItemId(outEdge, sourceNode, itemById);
    if (itemId) {
      if (outItemId === itemId) return true;
      if (sourceNode.type === "smartSplitter" && outItemId === undefined) {
        return true;
      }
      return false;
    }
    return true;
  });
  const count = relevant.length || 1;
  return 1 / count;
}

function getMismatchFlags(
  node: Node,
  nodes: Node[],
  outgoingEdges: Record<string, Edge[]>,
  incomingEdges: Record<string, Edge[]>,
  itemById: Map<string, Item>,
): {
  mismatchIncoming: boolean;
  mismatchOutgoing: boolean;
  mismatchOutgoingCount: number;
  mismatchOutgoingTotal: number;
} {
  const requiredItems = getRequiredItemIdsForNode(node, nodes, itemById);
  const mismatchIncoming = (incomingEdges[node.id] || []).some((edge) => {
    const sourceNode = nodes.find((n) => n.id === getEdgeSourceId(edge));
    if (!sourceNode) return false;
    const incomingItem = getEdgeItemId(edge, sourceNode, itemById);
    if (!incomingItem) return false;
    if (requiredItems.size === 0) return false;
    return !requiredItems.has(incomingItem);
  });

  let mismatchOutgoingCount = 0;
  let mismatchOutgoingTotal = 0;
  let mismatchOutgoing = false;
  (outgoingEdges[node.id] || []).forEach((edge) => {
    const targetNode = nodes.find((n) => n.id === getEdgeTargetId(edge));
    if (!targetNode) return;
    const outputItemId = getEdgeItemId(edge, node, itemById);
    if (!outputItemId) return;
    mismatchOutgoingTotal += 1;
    const targetRequired = getRequiredItemIdsForNode(
      targetNode,
      nodes,
      itemById,
    );
    if (targetRequired.size === 0) return;
    if (!targetRequired.has(outputItemId)) {
      mismatchOutgoingCount += 1;
      mismatchOutgoing = true;
    }
  });

  return {
    mismatchIncoming,
    mismatchOutgoing,
    mismatchOutgoingCount,
    mismatchOutgoingTotal,
  };
}

// Determine status based on supply and demand
export function determineStatus(
  supply: number,
  demand: number,
  tolerance: number = 0.01,
): CalcStatus {
  if (
    supply >= demand * (1 - tolerance) &&
    supply <= demand * (1 + tolerance)
  ) {
    return "optimal";
  } else if (supply < demand) {
    return "under";
  } else {
    return "over";
  }
}

// Calculate statuses for all nodes
export function calculateNodeStatuses(
  context: CalculationContext,
): NodeStatusMap {
  const { nodes, edges, items, buildings } = context;
  const itemById = new Map(items.map((item) => [item.id, item]));
  const { outgoingEdges, incomingEdges } = buildAdjacencyLists(edges);
  const nodeStatuses: NodeStatusMap = {};

  nodes.forEach((node) => {
    const data = node.data as Record<string, unknown>;
    const incoming = incomingEdges[node.id] || [];
    const outgoing = outgoingEdges[node.id] || [];
    const mismatchFlags = getMismatchFlags(
      node,
      nodes,
      outgoingEdges,
      incomingEdges,
      itemById,
    );

    if (incoming.length === 0 && outgoing.length === 0) {
      nodeStatuses[node.id] = {
        status: null,
        supply: 0,
        demand: 0,
        disconnected: true,
        ...mismatchFlags,
      };
      return;
    }

    if (node.type === "building") {
      calculateBuildingStatus(
        node,
        data,
        incoming,
        outgoing,
        nodes,
        edges,
        buildings,
        nodeStatuses,
        itemById,
        outgoingEdges,
        incomingEdges,
      );
    }

    if (nodeStatuses[node.id]) {
      nodeStatuses[node.id] = {
        ...nodeStatuses[node.id],
        ...mismatchFlags,
      };
    }
  });

  // For stack parents, mirror the active child's status (avoid aggregating unconnected children)
  nodes.forEach((node) => {
    const data = node.data as Record<string, unknown>;
    const stackCount = data.stackCount as number | undefined;
    const stackActiveId = data.stackActiveId as string | undefined;
    if (stackCount && stackCount > 1 && stackActiveId) {
      const parentIncoming = incomingEdges[node.id] || [];
      const parentOutgoing = outgoingEdges[node.id] || [];
      const hasDirectEdges = parentIncoming.length > 0 || parentOutgoing.length > 0;
      if (!hasDirectEdges) {
        const activeStatus = nodeStatuses[stackActiveId];
        if (activeStatus) {
          nodeStatuses[node.id] = { ...activeStatus };
        }
      }
    }
  });

  return nodeStatuses;
}

function calculateBuildingStatus(
  node: Node,
  data: Record<string, unknown>,
  incoming: Edge[],
  outgoing: Edge[],
  nodes: Node[],
  edges: Edge[],
  buildings: Building[],
  nodeStatuses: NodeStatusMap,
  itemById: Map<string, Item>,
  outgoingEdges: Record<string, Edge[]>,
  incomingEdges: Record<string, Edge[]>,
) {
  const buildingId = (data.buildingId as string) || "";
  const building = buildings.find((b) => b.id === buildingId);
  const conveyorMk = (data.conveyorMk as number) || 1;
  const pipeMk = (data.pipeMk as number) || 1;
  const isStorage = building?.category === "storage";
  const isExtraction = building?.category === "extraction";

  if (isStorage) {
    calculateStorageStatus(
      node,
      incoming,
      outgoing,
      nodes,
      edges,
      buildings,
      nodeStatuses,
      itemById,
      outgoingEdges,
      incomingEdges,
      conveyorMk,
      pipeMk,
    );
  } else if (isExtraction) {
    calculateExtractionStatus(
      node,
      outgoing,
      nodes,
      building,
      nodeStatuses,
      itemById,
      conveyorMk,
      pipeMk,
    );
  } else {
    calculateProductionBuildingStatus(
      node,
      incoming,
      nodes,
      edges,
      buildings,
      nodeStatuses,
      itemById,
      outgoingEdges,
      incomingEdges,
    );
  }
}

function calculateExtractionStatus(
  node: Node,
  outgoing: Edge[],
  nodes: Node[],
  building: Building | undefined,
  nodeStatuses: NodeStatusMap,
  itemById: Map<string, Item>,
  conveyorMk: number,
  pipeMk: number,
) {
  const stackNodes = getStackNodes(node, nodes);
  const totalExtraction = stackNodes.reduce((sum, stackNode) => {
    const stackData = stackNode.data as Record<string, unknown>;
    return sum + ((stackData.production as number) || 0);
  }, 0);

  const isPipe = building?.outputTypes?.[0] === "pipe";
  const beltCapacity = isPipe
    ? PIPE_RATES[pipeMk as PipeMk]
    : CONVEYOR_RATES[conveyorMk as ConveyorMk];
  const actualOutput = Math.min(totalExtraction, beltCapacity);

  let totalDemand = 0;
  outgoing.forEach((edge) => {
    const targetNode = nodes.find((n) => n.id === getEdgeTargetId(edge));
    if (targetNode?.type === "building") {
      const outputItemId = getEdgeItemId(edge, node, itemById);
      if (outputItemId) {
        const required = getRequiredItemIdsForNode(
          targetNode,
          nodes,
          itemById,
        );
        if (!required.has(outputItemId)) return;
        totalDemand += getDemandRateForItem(
          targetNode,
          outputItemId,
          nodes,
          itemById,
        );
        return;
      }
      totalDemand += getDemandRate(targetNode, nodes, itemById);
    }
  });

  let status: CalcStatus = null;
  if (totalDemand > 0) {
    status = determineStatus(actualOutput, totalDemand);
  } else if (outgoing.length === 0) {
    status = null;
  } else {
    status = "over";
  }

  nodeStatuses[node.id] = { status, supply: actualOutput, demand: totalDemand };
}

function resolveIoType(types: string[] | undefined): "pipe" | "conveyor" {
  if (!types || types.length === 0) return "conveyor";
  const unique = new Set(types);
  if (unique.size === 1) return types[0] as "pipe" | "conveyor";
  if (unique.has("pipe") && !unique.has("conveyor")) return "pipe";
  if (unique.has("conveyor") && !unique.has("pipe")) return "conveyor";
  return "conveyor";
}

function calculateStorageFlow(
  node: Node,
  nodes: Node[],
  edges: Edge[],
  buildings: Building[],
  itemById: Map<string, Item>,
  outgoingEdges: Record<string, Edge[]>,
  incomingEdges: Record<string, Edge[]>,
  conveyorMk: number,
  pipeMk: number,
  visited: Set<string>,
): StorageFlow {
  if (visited.has(node.id)) {
    return {
      inRate: 0,
      outRate: 0,
      netRate: 0,
      outDemand: 0,
      canFill: false,
      fillMinutes: null,
    };
  }
  visited.add(node.id);

  const data = node.data as Record<string, unknown>;
  const buildingId = (data.buildingId as string) || "";
  const building = buildings.find((b) => b.id === buildingId);
  const inputTypes =
    building?.inputTypes ?? Array(building?.inputs ?? 1).fill("conveyor");
  const outputTypes = building?.outputTypes ?? ["conveyor"];
  const inputCount = Math.max(inputTypes.length, 1);
  const outputCount = Math.max(outputTypes.length, 1);
  const inputType = resolveIoType(inputTypes);
  const outputType = resolveIoType(outputTypes);

  const inputRatePer = inputType === "pipe"
    ? PIPE_RATES[pipeMk as PipeMk]
    : CONVEYOR_RATES[conveyorMk as ConveyorMk];
  const outputRatePer = outputType === "pipe"
    ? PIPE_RATES[pipeMk as PipeMk]
    : CONVEYOR_RATES[conveyorMk as ConveyorMk];
  const inputCapacity = inputRatePer * inputCount;
  const outputCapacity = outputRatePer * outputCount;

  const resolveSplitterIncomingItemId = (splitterNode: Node): string | undefined => {
    const splitterIncoming = incomingEdges[splitterNode.id] || [];
    for (const splitterEdge of splitterIncoming) {
      const splitterSource = nodes.find(
        (n) => n.id === getEdgeSourceId(splitterEdge),
      );
      const incomingId = getEdgeItemId(splitterEdge, splitterSource, itemById);
      if (incomingId) return incomingId;
    }
    return undefined;
  };

  const getIncomingItemId = (): string | undefined => {
    const incoming = incomingEdges[node.id] || [];
    for (const edge of incoming) {
      const sourceNode = nodes.find((n) => n.id === getEdgeSourceId(edge));
      if (!sourceNode) continue;
      const edgeItemId = getEdgeItemId(edge, sourceNode, itemById);
      if (edgeItemId) return edgeItemId;
      if (sourceNode.type === "smartSplitter") {
        const incomingId = resolveSplitterIncomingItemId(sourceNode);
        if (incomingId) return incomingId;
      }
    }
    return undefined;
  };

  const storedItemId =
    (data.storedItem as string | undefined) || getIncomingItemId();
  const storedItem = storedItemId ? itemById.get(storedItemId) : undefined;
  const stackSize = storedItem?.stackSize ?? 1;
  const inventoryUnit = (building?.inventoryUnit || "").toLowerCase();
  const isSlotInventory =
    inventoryUnit.includes("slot") || inventoryUnit.includes("slots");
  const capacityUnits = isSlotInventory
    ? (building?.inventorySize ?? 0) * stackSize
    : building?.inventorySize ?? 0;

  const incoming = incomingEdges[node.id] || [];
  let incomingRate = 0;

  incoming.forEach((edge) => {
    const sourceNode = nodes.find((n) => n.id === getEdgeSourceId(edge));
    if (!sourceNode) return;
    let incomingItemId =
      getEdgeItemId(edge, sourceNode, itemById) || storedItemId;
    if (!incomingItemId && sourceNode.type === "smartSplitter") {
      incomingItemId = resolveSplitterIncomingItemId(sourceNode) || storedItemId;
    }
    const splitRatio = getOutgoingSplitRatio(
      sourceNode,
      edge,
      incomingItemId,
      outgoingEdges,
      itemById,
    );
    const sourceRate = getNodeOutputRateForItem(
      sourceNode,
      incomingItemId,
      edge,
      nodes,
      edges,
      buildings,
      itemById,
      outgoingEdges,
      incomingEdges,
      new Set(visited),
    );
    incomingRate += sourceRate * splitRatio;
  });
  incomingRate = Math.min(incomingRate, inputCapacity);

  const outgoing = outgoingEdges[node.id] || [];
  let outDemand = 0;
  outgoing.forEach((edge) => {
    const targetNode = nodes.find((n) => n.id === getEdgeTargetId(edge));
    if (targetNode?.type === "building") {
      if (storedItemId) {
        const required = getRequiredItemIdsForNode(
          targetNode,
          nodes,
          itemById,
        );
        if (!required.has(storedItemId)) return;
        outDemand += getDemandRateForItem(
          targetNode,
          storedItemId,
          nodes,
          itemById,
        );
        return;
      }
      outDemand += getDemandRate(targetNode, nodes, itemById);
    }
  });

  const hasIncoming = incoming.length > 0;
  const availableRate =
    !hasIncoming && storedItemId && outgoing.length > 0
      ? outputCapacity
      : incomingRate;
  const outRate = Math.min(outDemand, outputCapacity, availableRate);
  const netRate = incomingRate - outRate;
  const canFill = netRate > 0 && capacityUnits > 0;
  const fillMinutes = canFill ? capacityUnits / netRate : null;

  return {
    inRate: incomingRate,
    outRate,
    netRate,
    outDemand,
    canFill,
    fillMinutes,
  };
}

function getNodeOutputRateForItem(
  node: Node,
  itemId: string | undefined,
  edge: Edge,
  nodes: Node[],
  edges: Edge[],
  buildings: Building[],
  itemById: Map<string, Item>,
  outgoingEdges: Record<string, Edge[]>,
  incomingEdges: Record<string, Edge[]>,
  visited: Set<string>,
): number {
  if (!itemId) return 0;
  if (visited.has(node.id)) return 0;
  visited.add(node.id);
  if (node.type === "conveyorLift") {
    const data = node.data as Record<string, unknown>;
    const transportingItem = data.transportingItem as string | undefined;
    if (transportingItem && transportingItem !== itemId) return 0;
    const beltCapacity = CONVEYOR_RATES[1];
    return beltCapacity;
  }

  if (node.type === "smartSplitter") {
    const outgoing = outgoingEdges[node.id] || [];
    if (outgoing.length === 0) return 0;
    const targetMaterial = getEdgeMaterial(edge);
    let totalRatio = 0;
    outgoing.forEach((outEdge) => {
      if (getEdgeMaterial(outEdge) !== targetMaterial) return;
      const outItemId = getEdgeItemId(outEdge, node, itemById);
      if (itemId) {
        if (outItemId === itemId) {
          totalRatio += getOutgoingSplitRatio(
            node,
            outEdge,
            itemId,
            outgoingEdges,
            itemById,
          );
        } else if (!outItemId) {
          totalRatio += getOutgoingSplitRatio(
            node,
            outEdge,
            itemId,
            outgoingEdges,
            itemById,
          );
        }
        return;
      }
      totalRatio += getOutgoingSplitRatio(
        node,
        outEdge,
        itemId,
        outgoingEdges,
        itemById,
      );
    });
    const producers = traceBackToProducers(
      node,
      nodes,
      edges,
      incomingEdges,
      outgoingEdges,
      itemById,
      (() => {
        const nextVisited = new Set(visited);
        nextVisited.delete(node.id);
        return nextVisited;
      })(),
    );
    let total = 0;
    producers.forEach(({ node: producerNode, splitRatio }) => {
      if (producerNode.type !== "building") return;
      const rate = getNodeOutputRateForItem(
        producerNode,
        itemId,
        edge,
        nodes,
        edges,
        buildings,
        itemById,
        outgoingEdges,
        incomingEdges,
        new Set(visited),
      );
      total += rate * splitRatio;
    });
    return total * totalRatio;
  }

  if (node.type === "building") {
    const data = node.data as Record<string, unknown>;
    const buildingId = (data.buildingId as string) || "";
    const building = buildings.find((b) => b.id === buildingId);
    if (building?.category === "storage") {
      const flow = calculateStorageFlow(
        node,
        nodes,
        edges,
        buildings,
        itemById,
        outgoingEdges,
        incomingEdges,
        (data.conveyorMk as number) || 1,
        (data.pipeMk as number) || 1,
        new Set(visited),
      );
      return flow.outRate;
    }

    const outputItemId = data.outputItem as string | undefined;
    const production = (data.production as number) || 0;
    if (!outputItemId || !production) return 0;
    const isPipe = Boolean(
      edge.sourceHandle?.includes("pipe") || edge.targetHandle?.includes("pipe"),
    );
    const conveyorMk = (data.conveyorMk as number) || 1;
    const pipeMk = (data.pipeMk as number) || 1;
    const beltCapacity = isPipe
      ? PIPE_RATES[pipeMk as PipeMk]
      : CONVEYOR_RATES[conveyorMk as ConveyorMk];

    if (outputItemId === itemId) {
      return Math.min(production, beltCapacity);
    }

    const item = itemById.get(outputItemId);
    const resolvedRecipe = resolveRecipeForData(item, data);
    const byproduct = resolvedRecipe?.recipe?.byproducts?.find(
      (byp) => byp.item === itemId,
    );
    if (byproduct) {
      const baseOutput =
        resolvedRecipe?.recipe?.output ?? item?.defaultProduction ?? 0;
      if (baseOutput <= 0) return 0;
      const scale = production / baseOutput;
      const byRate = byproduct.amount * scale;
      return Math.min(byRate, beltCapacity);
    }
    return 0;
  }

  const producers = traceBackToProducers(
    node,
    nodes,
    edges,
    incomingEdges,
    outgoingEdges,
    itemById,
    new Set(visited),
  );
  let total = 0;
  producers.forEach(({ node: producerNode, splitRatio }) => {
    if (producerNode.type !== "building") return;
    total += getNodeOutputRateForItem(
      producerNode,
      itemId,
      edge,
      nodes,
      edges,
      buildings,
      itemById,
      outgoingEdges,
      incomingEdges,
      new Set(visited),
    ) * splitRatio;
  });
  return total;

  return 0;
}

function calculateStorageStatus(
  node: Node,
  incoming: Edge[],
  outgoing: Edge[],
  nodes: Node[],
  edges: Edge[],
  buildings: Building[],
  nodeStatuses: NodeStatusMap,
  itemById: Map<string, Item>,
  outgoingEdges: Record<string, Edge[]>,
  incomingEdges: Record<string, Edge[]>,
  conveyorMk: number,
  pipeMk: number,
) {
  const flow = calculateStorageFlow(
    node,
    nodes,
    edges,
    buildings,
    itemById,
    outgoingEdges,
    incomingEdges,
    conveyorMk,
    pipeMk,
    new Set(),
  );

  let status: CalcStatus = null;
  let supply = flow.inRate;
  if (outgoing.length > 0 && flow.outDemand > 0) {
    if (incoming.length === 0 && flow.outRate > 0) {
      status = determineStatus(flow.outRate, flow.outDemand);
      supply = flow.outRate;
    } else {
      status = determineStatus(flow.inRate, flow.outDemand);
    }
  } else if (incoming.length > 0) {
    status = "over";
  }

  nodeStatuses[node.id] = {
    status,
    supply,
    demand: flow.outDemand,
    storageFlow: flow,
  };
}

// Types that pass through items without producing them
const PASSTHROUGH_TYPES = new Set([
  "storage",
  "conveyorLift",
  "splitter",
  "merger",
]);

interface ProducerInfo {
  node: Node;
  splitRatio: number; // Accumulated split ratio from splitters
}

// Trace back through the node graph to find the original producer(s)
// This handles storage, lifts, splitters, etc. that pass items through
function traceBackToProducers(
  startNode: Node,
  nodes: Node[],
  edges: Edge[],
  incomingEdgesMap: Record<string, Edge[]>,
  outgoingEdgesMap: Record<string, Edge[]>,
  itemById: Map<string, Item>,
  visited: Set<string> = new Set(),
  currentSplitRatio: number = 1,
): ProducerInfo[] {
  // Prevent infinite loops
  if (visited.has(startNode.id)) return [];
  visited.add(startNode.id);

  const nodeType = startNode.type || "";
  const nodeData = startNode.data as Record<string, unknown>;

  // If this is a producer (building that's not just storage), return it
  if (nodeType === "building") {
    const buildingId = (nodeData.buildingId as string) || "";
    // Storage buildings pass through, other buildings are producers
    const isStorage =
      buildingId.includes("storage") || buildingId.includes("buffer");
    if (!isStorage) {
      return [{ node: startNode, splitRatio: currentSplitRatio }];
    }
  }

  // For pass-through nodes, trace back to their sources
  const incoming = incomingEdgesMap[startNode.id] || [];
  if (incoming.length === 0) return [];

  const producers: ProducerInfo[] = [];

  incoming.forEach((edge) => {
    const sourceNode = nodes.find((n) => n.id === getEdgeSourceId(edge));
    if (!sourceNode) return;
    const incomingItemId = getEdgeItemId(edge, sourceNode, itemById);
    if (incomingItemId) {
      const required = getRequiredItemIdsForNode(startNode, nodes, itemById);
      if (required.size > 0 && !required.has(incomingItemId)) return;
    }

    // Calculate new split ratio based on how many outputs this pass-through has
    let newSplitRatio = currentSplitRatio;
    if (PASSTHROUGH_TYPES.has(nodeType)) {
      const splitRatio = getOutgoingSplitRatio(
        startNode,
        edge,
        incomingItemId,
        outgoingEdgesMap,
        itemById,
      );
      newSplitRatio = currentSplitRatio * splitRatio;
    }

    const foundProducers = traceBackToProducers(
      sourceNode,
      nodes,
      edges,
      incomingEdgesMap,
      outgoingEdgesMap,
      itemById,
      visited,
      newSplitRatio,
    );
    producers.push(...foundProducers);
  });

  return producers;
}

function calculateProductionBuildingStatus(
  node: Node,
  incoming: Edge[],
  nodes: Node[],
  edges: Edge[],
  buildings: Building[],
  nodeStatuses: NodeStatusMap,
  itemById: Map<string, Item>,
  outgoingEdges: Record<string, Edge[]>,
  incomingEdges: Record<string, Edge[]>,
) {
  const inputSupplyByItem = new Map<string, number>();
  const data = node.data as Record<string, unknown>;
  const buildingId = (data.buildingId as string) || "";
  const building = buildings.find((b) => b.id === buildingId);
  const conveyorMk = (data.conveyorMk as number) || 1;
  const pipeMk = (data.pipeMk as number) || 1;
  const requiredItemIds = Array.from(
    getRequiredItemIdsForNode(node, nodes, itemById),
  );
  const outgoing = outgoingEdges[node.id] || [];

    incoming.forEach((edge) => {
      const sourceNode = nodes.find((n) => n.id === getEdgeSourceId(edge));
      if (!sourceNode) return;
      const resolvedIncomingItemId =
        getEdgeItemId(edge, sourceNode, itemById) ||
        (requiredItemIds.length === 1 ? requiredItemIds[0] : undefined);

      const sourceData = sourceNode.data as Record<string, unknown>;
      const sourceType = sourceNode.type;

    if (sourceType === "building") {
      const sourceBuildingId = (sourceData.buildingId as string) || "";
      const sourceBuilding = buildings.find((b) => b.id === sourceBuildingId);
      const isStorageSource = sourceBuilding?.category === "storage";

      if (isStorageSource) {
        const sourceConveyorMk = (sourceData.conveyorMk as number) || 1;
        const sourcePipeMk = (sourceData.pipeMk as number) || 1;
        const flow = calculateStorageFlow(
          sourceNode,
          nodes,
          edges,
          buildings,
          itemById,
          outgoingEdges,
          incomingEdges,
          sourceConveyorMk,
          sourcePipeMk,
          new Set(),
        );
        const splitRatio = getOutgoingSplitRatio(
          sourceNode,
          edge,
          resolvedIncomingItemId,
          outgoingEdges,
          itemById,
        );
        if (resolvedIncomingItemId) {
          const current = inputSupplyByItem.get(resolvedIncomingItemId) || 0;
          inputSupplyByItem.set(
            resolvedIncomingItemId,
            current + flow.outRate * splitRatio,
          );
        }
      } else {
        // Normal production building
        const splitRatio = getOutgoingSplitRatio(
          sourceNode,
          edge,
          resolvedIncomingItemId,
          outgoingEdges,
          itemById,
        );
        const rate = getNodeOutputRateForItem(
          sourceNode,
          resolvedIncomingItemId,
          edge,
          nodes,
          edges,
          buildings,
          itemById,
          outgoingEdges,
          incomingEdges,
          new Set(),
        );
        if (resolvedIncomingItemId) {
          const current = inputSupplyByItem.get(resolvedIncomingItemId) || 0;
          inputSupplyByItem.set(
            resolvedIncomingItemId,
            current + rate * splitRatio,
          );
        }
      }
    } else {
      // For other node types (storage, conveyorLift, splitter, etc.)
      // Trace back to find the original producer
      const producers = traceBackToProducers(
        sourceNode,
        nodes,
        edges,
        incomingEdges,
        outgoingEdges,
        itemById,
      );

      producers.forEach(({ node: producerNode, splitRatio }) => {
        const producerType = producerNode.type;

        if (producerType === "building") {
          const stackNodes = getStackNodes(producerNode, nodes);
          const producerProduction = stackNodes.reduce((sum, stackNode) => {
            const stackData = stackNode.data as Record<string, unknown>;
            return sum + ((stackData.production as number) || 0);
          }, 0);
          if (resolvedIncomingItemId) {
            const current =
              inputSupplyByItem.get(resolvedIncomingItemId) || 0;
            inputSupplyByItem.set(
              resolvedIncomingItemId,
              current + producerProduction * splitRatio,
            );
          }
        }
      });
    }
  });

  const inputDemandByItem = new Map<string, number>();
  requiredItemIds.forEach((itemId) => {
    inputDemandByItem.set(
      itemId,
      getDemandRateForItem(node, itemId, nodes, itemById),
    );
  });
  const inputDemandTotal = Array.from(inputDemandByItem.values()).reduce(
    (sum, value) => sum + value,
    0,
  );
  let worstItemId: string | undefined;
  let worstRatio = Number.POSITIVE_INFINITY;
  requiredItemIds.forEach((itemId) => {
    const demand = inputDemandByItem.get(itemId) || 0;
    if (demand <= 0) return;
    const supply = inputSupplyByItem.get(itemId) || 0;
    const ratio = supply / demand;
    if (ratio < worstRatio) {
      worstRatio = ratio;
      worstItemId = itemId;
    }
  });
  const worstDemand = worstItemId
    ? inputDemandByItem.get(worstItemId) || 0
    : inputDemandTotal;
  const worstSupply = worstItemId
    ? inputSupplyByItem.get(worstItemId) || 0
    : Array.from(inputSupplyByItem.values()).reduce(
        (sum, value) => sum + value,
        0,
      );

  const inputDetails =
    requiredItemIds.length > 0
      ? requiredItemIds.map((itemId) => ({
          itemId,
          supply: inputSupplyByItem.get(itemId) || 0,
          demand: inputDemandByItem.get(itemId) || 0,
        }))
      : undefined;

  if (incoming.length === 0 && requiredItemIds.length > 0) {
    if (inputDemandTotal > 0) {
      nodeStatuses[node.id] = {
        status: "under",
        supply: 0,
        demand: inputDemandTotal,
        inputDetails,
        terminalInputOnly: true,
      };
      return;
    }
  }

  if (
    incoming.length > 0 &&
    worstDemand > 0 &&
    worstSupply < worstDemand
  ) {
    nodeStatuses[node.id] = {
      status: "under",
      supply: worstSupply,
      demand: worstDemand,
      inputDetails,
    };
    return;
  }

  if (outgoing.length === 0 && inputDemandTotal > 0) {
    nodeStatuses[node.id] = {
      status: determineStatus(worstSupply, worstDemand),
      supply: worstSupply,
      demand: worstDemand,
      inputDetails,
      terminalInputOnly: true,
    };
    return;
  }

  const stackNodes = getStackNodes(node, nodes);
  const production = stackNodes.reduce((sum, stackNode) => {
    const stackData = stackNode.data as Record<string, unknown>;
    return sum + ((stackData.production as number) || 0);
  }, 0);
  const isPipe = building?.outputTypes?.[0] === "pipe";
  const beltCapacity = isPipe
    ? PIPE_RATES[pipeMk as PipeMk]
    : CONVEYOR_RATES[conveyorMk as ConveyorMk];
  const outputSupply = Math.min(production, beltCapacity);

  let outputDemand = 0;
  outgoing.forEach((edge) => {
    const targetNode = nodes.find((n) => n.id === getEdgeTargetId(edge));
    if (targetNode?.type === "building") {
      const outputItemId = getEdgeItemId(edge, node, itemById);
      if (outputItemId) {
        const required = getRequiredItemIdsForNode(
          targetNode,
          nodes,
          itemById,
        );
        if (!required.has(outputItemId)) return;
        outputDemand += getDemandRateForItem(
          targetNode,
          outputItemId,
          nodes,
          itemById,
        );
        return;
      }
      outputDemand += getDemandRate(targetNode, nodes, itemById);
    }
  });

  let status: CalcStatus = null;
  if (outgoing.length > 0 && outputDemand > 0) {
    status = determineStatus(outputSupply, outputDemand);
  } else if (outgoing.length > 0) {
    status = "over";
  }

  nodeStatuses[node.id] = {
    status,
    supply: outputSupply,
    demand: outputDemand,
    inputDetails,
  };
}
