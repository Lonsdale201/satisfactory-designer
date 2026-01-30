import { Node, Edge } from "@xyflow/react";
import {
  CONVEYOR_RATES,
  PIPE_RATES,
  PURITY_RATES,
  MINER_MULTIPLIERS,
  ConveyorMk,
  PipeMk,
  PurityLevel,
  MinerType,
} from "../constants/rates";
import { NodeStatusMap, CalcStatus, StorageFlow } from "../types/calculation";
import { Item, Building } from "../types";

interface CalculationContext {
  nodes: Node[];
  edges: Edge[];
  items: Item[];
  buildings: Building[];
}

// Build adjacency lists for graph traversal
export function buildAdjacencyLists(edges: Edge[]) {
  const outgoingEdges: Record<string, Edge[]> = {};
  const incomingEdges: Record<string, Edge[]> = {};

  edges.forEach((edge) => {
    if (!outgoingEdges[edge.source]) outgoingEdges[edge.source] = [];
    if (!incomingEdges[edge.target]) incomingEdges[edge.target] = [];
    outgoingEdges[edge.source].push(edge);
    incomingEdges[edge.target].push(edge);
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

    if (
      item?.requires &&
      item.defaultProduction &&
      item.defaultProduction > 0
    ) {
      const scale = production / item.defaultProduction;
      return (
        sum +
        item.requires.reduce((reqSum, req) => reqSum + req.amount * scale, 0)
      );
    }
    return sum + production;
  }, 0);
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

    if (incoming.length === 0 && outgoing.length === 0) {
      nodeStatuses[node.id] = { status: null, supply: 0, demand: 0 };
      return;
    }

    if (node.type === "resource") {
      calculateResourceStatus(node, data, outgoing, nodes, nodeStatuses);
    } else if (node.type === "transport") {
      calculateTransportStatus(
        node,
        data,
        outgoing,
        nodes,
        nodeStatuses,
        itemById,
      );
    } else if (node.type === "building") {
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
  });

  return nodeStatuses;
}

function calculateResourceStatus(
  node: Node,
  data: Record<string, unknown>,
  outgoing: Edge[],
  nodes: Node[],
  nodeStatuses: NodeStatusMap,
) {
  const purity = (data.purity as string) || "normal";
  const baseRate = PURITY_RATES[purity as PurityLevel] || 60;

  const connectedMiner =
    outgoing.length > 0 ? nodes.find((n) => n.id === outgoing[0].target) : null;

  if (connectedMiner) {
    const minerData = connectedMiner.data as Record<string, unknown>;
    const minerBuildingId = (minerData.buildingId as string) || "miner_mk1";
    const minerMult = MINER_MULTIPLIERS[minerBuildingId as MinerType] || 1;
    const actualOutput = baseRate * minerMult;
    nodeStatuses[node.id] = {
      status: "optimal",
      supply: actualOutput,
      demand: 0,
    };
  } else {
    nodeStatuses[node.id] = { status: null, supply: baseRate, demand: 0 };
  }
}

function calculateTransportStatus(
  node: Node,
  data: Record<string, unknown>,
  outgoing: Edge[],
  nodes: Node[],
  nodeStatuses: NodeStatusMap,
  itemById: Map<string, Item>,
) {
  const conveyorMk = (data.conveyorMk as number) || 1;
  const outputCount = (data.outputCount as number) || 1;
  const beltCapacity = CONVEYOR_RATES[conveyorMk as ConveyorMk];
  const actualOutput = beltCapacity * outputCount;

  let totalDemand = 0;
  outgoing.forEach((edge) => {
    const targetNode = nodes.find((n) => n.id === edge.target);
    if (targetNode?.type === "building") {
      totalDemand += getDemandRate(targetNode, nodes, itemById);
    }
  });

  let status: CalcStatus = null;
  if (totalDemand > 0) {
    status = determineStatus(actualOutput, totalDemand);
  } else if (outgoing.length > 0) {
    status = "over";
  }

  nodeStatuses[node.id] = { status, supply: actualOutput, demand: totalDemand };
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
  const isMiner = buildingId.startsWith("miner_");
  const isStorage = building?.category === "storage";

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
  } else if (isMiner) {
    calculateMinerStatus(
      node,
      data,
      incoming,
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

function calculateMinerStatus(
  node: Node,
  data: Record<string, unknown>,
  incoming: Edge[],
  outgoing: Edge[],
  nodes: Node[],
  building: Building | undefined,
  nodeStatuses: NodeStatusMap,
  itemById: Map<string, Item>,
  conveyorMk: number,
  pipeMk: number,
) {
  const buildingId = (data.buildingId as string) || "";
  const resourceEdge = incoming.find((e) => {
    const sourceNode = nodes.find((n) => n.id === e.source);
    return sourceNode?.type === "resource";
  });

  if (!resourceEdge) {
    nodeStatuses[node.id] = { status: null, supply: 0, demand: 0 };
    return;
  }

  const resourceNode = nodes.find((n) => n.id === resourceEdge.source);
  const resourceData = resourceNode?.data as Record<string, unknown>;
  const purity = (resourceData?.purity as string) || "normal";
  const baseRate = PURITY_RATES[purity as PurityLevel] || 60;
  const stackNodes = getStackNodes(node, nodes);

  const totalExtraction = stackNodes.reduce((sum, stackNode) => {
    const stackData = stackNode.data as Record<string, unknown>;
    const stackBuildingId = (stackData.buildingId as string) || buildingId;
    const minerMult = MINER_MULTIPLIERS[stackBuildingId as MinerType] || 1;
    return sum + baseRate * minerMult;
  }, 0);

  const isPipe = building?.outputTypes?.[0] === "pipe";
  const beltCapacity = isPipe
    ? PIPE_RATES[pipeMk as PipeMk]
    : CONVEYOR_RATES[conveyorMk as ConveyorMk];
  const actualOutput = Math.min(totalExtraction, beltCapacity);

  let totalDemand = 0;
  outgoing.forEach((edge) => {
    const targetNode = nodes.find((n) => n.id === edge.target);
    if (targetNode?.type === "building") {
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

  const getIncomingItemId = (): string | undefined => {
    const incoming = incomingEdges[node.id] || [];
    for (const edge of incoming) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;
      const sourceData = sourceNode.data as Record<string, unknown>;
      if (sourceNode.type === "resource") {
        return sourceData.resourceId as string | undefined;
      }
      if (sourceNode.type === "building") {
        return (
          (sourceData.storedItem as string | undefined) ||
          (sourceData.outputItem as string | undefined)
        );
      }
      if (sourceNode.type === "transport") {
        return sourceData.deliveryItem as string | undefined;
      }
      if (sourceNode.type === "conveyorLift") {
        return sourceData.transportingItem as string | undefined;
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
    const sourceNode = nodes.find((n) => n.id === edge.source);
    if (!sourceNode) return;
    const sourceOutgoing = outgoingEdges[sourceNode.id] || [];
    const splitRatio =
      sourceOutgoing.length > 0 ? 1 / sourceOutgoing.length : 1;
    const sourceRate = getNodeOutputRate(
      sourceNode,
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
    const targetNode = nodes.find((n) => n.id === edge.target);
    if (targetNode?.type === "building") {
      outDemand += getDemandRate(targetNode, nodes, itemById);
    }
  });

  const outRate = Math.min(outDemand, outputCapacity, incomingRate);
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

function getNodeOutputRate(
  node: Node,
  nodes: Node[],
  edges: Edge[],
  buildings: Building[],
  itemById: Map<string, Item>,
  outgoingEdges: Record<string, Edge[]>,
  incomingEdges: Record<string, Edge[]>,
  visited: Set<string>,
): number {
  if (visited.has(node.id)) return 0;
  const data = node.data as Record<string, unknown>;

  if (node.type === "resource") {
    const purity = (data.purity as string) || "normal";
    return PURITY_RATES[purity as PurityLevel] || 60;
  }

  if (node.type === "transport") {
    const conveyorMk = (data.conveyorMk as number) || 1;
    const outputCount = (data.outputCount as number) || 1;
    const beltCapacity = CONVEYOR_RATES[conveyorMk as ConveyorMk];
    return beltCapacity * outputCount;
  }

  if (node.type === "building") {
    const buildingId = (data.buildingId as string) || "";
    const building = buildings.find((b) => b.id === buildingId);
    const conveyorMk = (data.conveyorMk as number) || 1;
    const pipeMk = (data.pipeMk as number) || 1;
    if (building?.category === "storage") {
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
        new Set(visited),
      );
      return flow.outRate;
    }

    if (buildingId.startsWith("miner_")) {
      const minerIncoming = edges.filter((e) => e.target === node.id);
      const resourceEdge = minerIncoming.find((e) => {
        const resNode = nodes.find((n) => n.id === e.source);
        return resNode?.type === "resource";
      });
      if (!resourceEdge) return 0;
      const resourceNode = nodes.find((n) => n.id === resourceEdge.source);
      const resourceData = resourceNode?.data as Record<string, unknown>;
      const purity = (resourceData?.purity as string) || "normal";
      const baseRate = PURITY_RATES[purity as PurityLevel] || 60;

      const stackNodes = getStackNodes(node, nodes);
      const totalExtraction = stackNodes.reduce((sum, stackNode) => {
        const stackData = stackNode.data as Record<string, unknown>;
        const stackBuildingId =
          (stackData.buildingId as string) || buildingId;
        const minerMult =
          MINER_MULTIPLIERS[stackBuildingId as MinerType] || 1;
        return sum + baseRate * minerMult;
      }, 0);

      const isPipe = building?.outputTypes?.[0] === "pipe";
      const beltCapacity = isPipe
        ? PIPE_RATES[pipeMk as PipeMk]
        : CONVEYOR_RATES[conveyorMk as ConveyorMk];
      return Math.min(totalExtraction, beltCapacity);
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
    return Math.min(production, beltCapacity);
  }

  const producers = traceBackToProducers(
    node,
    nodes,
    edges,
    incomingEdges,
    outgoingEdges,
    new Set(visited),
  );

  let totalSupply = 0;
  producers.forEach(({ node: producerNode, splitRatio }) => {
    const producerData = producerNode.data as Record<string, unknown>;
    const producerType = producerNode.type;
    if (producerType !== "building") return;
    const producerBuildingId = (producerData.buildingId as string) || "";
    const isMiner = producerBuildingId.startsWith("miner_");
    if (isMiner) {
      const minerIncoming = edges.filter((e) => e.target === producerNode.id);
      const resourceEdge = minerIncoming.find((e) => {
        const resNode = nodes.find((n) => n.id === e.source);
        return resNode?.type === "resource";
      });
      if (resourceEdge) {
        const resourceNode = nodes.find((n) => n.id === resourceEdge.source);
        const resourceData = resourceNode?.data as Record<string, unknown>;
        const purity = (resourceData?.purity as string) || "normal";
        const baseRate = PURITY_RATES[purity as PurityLevel] || 60;
        const minerMult =
          MINER_MULTIPLIERS[producerBuildingId as MinerType] || 1;
        totalSupply += baseRate * minerMult * splitRatio;
      }
    } else {
      const stackNodes = getStackNodes(producerNode, nodes);
      const producerProduction = stackNodes.reduce((sum, stackNode) => {
        const stackData = stackNode.data as Record<string, unknown>;
        return sum + ((stackData.production as number) || 0);
      }, 0);
      totalSupply += producerProduction * splitRatio;
    }
  });

  return totalSupply;
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
  if (outgoing.length > 0 && flow.outDemand > 0) {
    status = determineStatus(flow.inRate, flow.outDemand);
  } else if (incoming.length > 0) {
    status = "over";
  }

  nodeStatuses[node.id] = {
    status,
    supply: flow.inRate,
    demand: flow.outDemand,
    storageFlow: flow,
  };
}

// Types that pass through items without producing them
const PASSTHROUGH_TYPES = new Set([
  "storage",
  "conveyorLift",
  "transport",
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

  // If this is a resource node, it's a source
  if (nodeType === "resource") {
    return [{ node: startNode, splitRatio: currentSplitRatio }];
  }

  // For pass-through nodes, trace back to their sources
  const incoming = incomingEdgesMap[startNode.id] || [];
  if (incoming.length === 0) return [];

  const producers: ProducerInfo[] = [];

  incoming.forEach((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    if (!sourceNode) return;

    // Calculate new split ratio based on how many outputs this pass-through has
    let newSplitRatio = currentSplitRatio;
    if (PASSTHROUGH_TYPES.has(nodeType)) {
      const outgoing = outgoingEdgesMap[startNode.id] || [];
      if (outgoing.length > 1) {
        newSplitRatio = currentSplitRatio / outgoing.length;
      }
    }

    const foundProducers = traceBackToProducers(
      sourceNode,
      nodes,
      edges,
      incomingEdgesMap,
      outgoingEdgesMap,
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
  let totalSupply = 0;

  incoming.forEach((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    if (!sourceNode) return;

    const sourceData = sourceNode.data as Record<string, unknown>;
    const sourceType = sourceNode.type;

    if (sourceType === "building") {
      const sourceBuildingId = (sourceData.buildingId as string) || "";
      const isMinerSource = sourceBuildingId.startsWith("miner_");
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
        const sourceOutgoing = outgoingEdges[sourceNode.id] || [];
        const splitRatio =
          sourceOutgoing.length > 0 ? 1 / sourceOutgoing.length : 1;
        totalSupply += flow.outRate * splitRatio;
      } else if (isMinerSource) {

        // For miners, calculate output based on resource purity and miner multiplier
        // Find the resource connected to this miner
        const minerIncoming = edges.filter((e) => e.target === sourceNode.id);
        const resourceEdge = minerIncoming.find((e) => {
          const resNode = nodes.find((n) => n.id === e.source);
          return resNode?.type === "resource";
        });

        if (resourceEdge) {
          const resourceNode = nodes.find((n) => n.id === resourceEdge.source);
          const resourceData = resourceNode?.data as Record<string, unknown>;
          const purity = (resourceData?.purity as string) || "normal";
          const baseRate = PURITY_RATES[purity as PurityLevel] || 60;

          const stackNodes = getStackNodes(sourceNode, nodes);
          const totalExtraction = stackNodes.reduce((sum, stackNode) => {
            const stackData = stackNode.data as Record<string, unknown>;
            const stackBuildingId =
              (stackData.buildingId as string) || sourceBuildingId;
            const minerMult =
              MINER_MULTIPLIERS[stackBuildingId as MinerType] || 1;
            return sum + baseRate * minerMult;
          }, 0);

          const sourceConveyorMk = (sourceData.conveyorMk as number) || 1;
          const sourcePipeMk = (sourceData.pipeMk as number) || 1;
          const sourceBuilding = buildings.find(
            (b) => b.id === sourceBuildingId,
          );
          const isPipe = sourceBuilding?.outputTypes?.[0] === "pipe";
          const beltCapacity = isPipe
            ? PIPE_RATES[sourcePipeMk as PipeMk]
            : CONVEYOR_RATES[sourceConveyorMk as ConveyorMk];

          const sourceOutgoing = outgoingEdges[sourceNode.id] || [];
          const splitRatio =
            sourceOutgoing.length > 0 ? 1 / sourceOutgoing.length : 1;
          totalSupply += Math.min(totalExtraction, beltCapacity) * splitRatio;
        }
      } else {
        // Normal production building
        const stackNodes = getStackNodes(sourceNode, nodes);
        const sourceProduction = stackNodes.reduce((sum, stackNode) => {
          const stackData = stackNode.data as Record<string, unknown>;
          return sum + ((stackData.production as number) || 0);
        }, 0);

        const sourceConveyorMk = (sourceData.conveyorMk as number) || 1;
        const sourcePipeMk = (sourceData.pipeMk as number) || 1;
        const isPipe = sourceBuilding?.outputTypes?.[0] === "pipe";
        const beltCapacity = isPipe
          ? PIPE_RATES[sourcePipeMk as PipeMk]
          : CONVEYOR_RATES[sourceConveyorMk as ConveyorMk];

        const sourceOutgoing = outgoingEdges[sourceNode.id] || [];
        const splitRatio =
          sourceOutgoing.length > 0 ? 1 / sourceOutgoing.length : 1;
        totalSupply += Math.min(sourceProduction, beltCapacity) * splitRatio;
      }
    } else if (sourceType === "transport") {
      const sourceConveyorMk = (sourceData.conveyorMk as number) || 1;
      const sourceOutputCount = (sourceData.outputCount as number) || 1;
      const beltCapacity = CONVEYOR_RATES[sourceConveyorMk as ConveyorMk];
      const sourceOutgoing = outgoingEdges[sourceNode.id] || [];
      const splitRatio =
        sourceOutgoing.length > 0 ? 1 / sourceOutgoing.length : 1;
      totalSupply += beltCapacity * sourceOutputCount * splitRatio;
    } else {
      // For other node types (storage, conveyorLift, splitter, etc.)
      // Trace back to find the original producer
      const producers = traceBackToProducers(
        sourceNode,
        nodes,
        edges,
        incomingEdges,
        outgoingEdges,
      );

      producers.forEach(({ node: producerNode, splitRatio }) => {
        const producerData = producerNode.data as Record<string, unknown>;
        const producerType = producerNode.type;

        if (producerType === "building") {
          const producerBuildingId = (producerData.buildingId as string) || "";
          const isMiner = producerBuildingId.startsWith("miner_");

          if (isMiner) {
            // Get miner production from resource
            const minerIncoming = edges.filter(
              (e) => e.target === producerNode.id,
            );
            const resourceEdge = minerIncoming.find((e) => {
              const resNode = nodes.find((n) => n.id === e.source);
              return resNode?.type === "resource";
            });

            if (resourceEdge) {
              const resourceNode = nodes.find(
                (n) => n.id === resourceEdge.source,
              );
              const resourceData = resourceNode?.data as Record<
                string,
                unknown
              >;
              const purity = (resourceData?.purity as string) || "normal";
              const baseRate = PURITY_RATES[purity as PurityLevel] || 60;
              const minerMult =
                MINER_MULTIPLIERS[producerBuildingId as MinerType] || 1;
              totalSupply += baseRate * minerMult * splitRatio;
            }
          } else {
            // Normal production building
            const stackNodes = getStackNodes(producerNode, nodes);
            const producerProduction = stackNodes.reduce((sum, stackNode) => {
              const stackData = stackNode.data as Record<string, unknown>;
              return sum + ((stackData.production as number) || 0);
            }, 0);
            totalSupply += producerProduction * splitRatio;
          }
        }
      });
    }
  });

  const demand = getDemandRate(node, nodes, itemById);

  let status: CalcStatus = null;
  if (incoming.length > 0 && demand > 0) {
    status = determineStatus(totalSupply, demand);
  }

  nodeStatuses[node.id] = { status, supply: totalSupply, demand };
}
