import {
  useCallback,
  useEffect,
  useState,
  useMemo,
  memo,
  useRef,
  useDeferredValue,
  lazy,
  Suspense,
} from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  Connection,
  Node,
  Edge,
  ConnectionMode,
  NodeTypes,
  EdgeTypes,
  ConnectionLineComponentProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Box } from "@mui/material";

// Node components
import SimpleBuildingNode from "./components/nodes/SimpleBuildingNode";
import SimpleGroupNode from "./components/nodes/SimpleGroupNode";
import SmartSplitterNode from "./components/nodes/SmartSplitterNode";
import GoalNode from "./components/nodes/GoalNode";
import ConveyorLiftNode from "./components/nodes/ConveyorLiftNode";

// Sidebar components
import Sidebar from "./components/sidebar/Sidebar";
const NodeEditorPanel = lazy(
  () => import("./components/sidebar/NodeEditorPanel"),
);

// Constants - using extracted modules
import { CONVEYOR_RATES, PIPE_RATES } from "./constants";

import {
  useCalculation,
  useNodeOperations,
  useStackingLogic,
  useKeyboardShortcuts,
  useConveyorLiftLogic,
} from "./hooks";
import { useUndoStack } from "./hooks/useUndoStack";

import {
  createCustomEdge,
  createCustomConnectionLine,
} from "./components/canvas";
import { ZoomControls, LayerPanel } from "./components/toolbar";
import type { ItemRequirement } from "./types";
const Header = lazy(() => import("./components/toolbar/Header"));

// Utils

// Data
import itemsData from "./data/items.json";
import buildingsData from "./data/buildings.json";

// Context & Utils
import {
  UiSettingsProvider,
  defaultUiSettings,
} from "./contexts/UiSettingsContext";
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  exportToFile,
  importFromFile,
  clearLocalStorage,
} from "./utils/storage";

// Define types OUTSIDE component - this is critical for performance
const nodeTypes: NodeTypes = {
  building: SimpleBuildingNode,
  group: SimpleGroupNode,
  smartSplitter: SmartSplitterNode,
  goal: GoalNode,
  conveyorLift: ConveyorLiftNode,
};

const getRecipeByproducts = (recipe: unknown): ItemRequirement[] => {
  if (!recipe || typeof recipe !== "object") return [];
  const value = (recipe as { byproducts?: unknown }).byproducts;
  return Array.isArray(value) ? (value as ItemRequirement[]) : [];
};

interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  nodeTypes: NodeTypes;
  edgeTypes: EdgeTypes;
  defaultEdgeOptions: { type: "custom" };
  connectionLineComponent: React.ComponentType<ConnectionLineComponentProps>;
  onNodesChange: ReturnType<typeof useNodesState>[2];
  onEdgesChange: ReturnType<typeof useEdgesState>[2];
  onConnect: (params: Connection) => void;
  onNodeClick: (event: unknown, node: Node) => void;
  onPaneClick: () => void;
  onSelectionChange: (params: { nodes: Node[]; edges: Edge[] }) => void;
  onDrop: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onEdgeMouseEnter: (event: React.MouseEvent, edge: Edge) => void;
  onEdgeMouseLeave: () => void;
  onNodeDrag: (event: unknown, node: Node) => void;
  onNodeDragStart: (event: unknown, node: Node) => void;
  onNodeDragStop: (event: unknown, node: Node) => void;
  isDragging: boolean;
  hideMinimap: boolean;
  nodesDraggable: boolean;
  nodesConnectable: boolean;
  elementsSelectable: boolean;
  panOnDrag: boolean | number[];
}

const FlowCanvas = memo(
  ({
    nodes,
    edges,
    nodeTypes,
    edgeTypes,
    defaultEdgeOptions,
    connectionLineComponent,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onPaneClick,
    onSelectionChange,
    onDrop,
    onDragOver,
    onEdgeMouseEnter,
    onEdgeMouseLeave,
    onNodeDrag,
    onNodeDragStart,
    onNodeDragStop,
    isDragging,
    hideMinimap,
    nodesDraggable,
    nodesConnectable,
    elementsSelectable,
    panOnDrag,
  }: FlowCanvasProps) => (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      onSelectionChange={onSelectionChange}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onEdgeMouseEnter={onEdgeMouseEnter}
      onEdgeMouseLeave={onEdgeMouseLeave}
      onNodeDrag={onNodeDrag}
      onNodeDragStart={onNodeDragStart}
      onNodeDragStop={onNodeDragStop}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      connectionMode={ConnectionMode.Loose}
      defaultEdgeOptions={defaultEdgeOptions}
      connectionLineComponent={connectionLineComponent}
      nodesDraggable={nodesDraggable}
      nodesConnectable={nodesConnectable}
      elementsSelectable={elementsSelectable}
      panOnDrag={panOnDrag}
      onlyRenderVisibleElements
      minZoom={0.1}
      maxZoom={2}
      fitView
    >
      {!isDragging && !hideMinimap && (
        <MiniMap
          style={{
            bottom: 20,
            left: 20,
          }}
          nodeColor={(node) => {
            if (node.type === "building") return "#fa9549";
            return "#888";
          }}
          zoomable
          pannable
        />
      )}
      {!isDragging && (
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#333"
        />
      )}
    </ReactFlow>
  ),
);

FlowCanvas.displayName = "FlowCanvas";

// Initial state
const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

function AppContent() {
  const reactFlowInstance = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [nodeIdCounter, setNodeIdCounter] = useState(1);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeSnapshot, setSelectedNodeSnapshot] = useState<Pick<
    Node,
    "id" | "type" | "data"
  > | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uiSettings, setUiSettings] = useState(defaultUiSettings);
  const [currentLayer, setCurrentLayer] = useState(1);
  const [interactionLocked, setInteractionLocked] = useState(false);
  const repoUrl = "https://github.com/Lonsdale201/satisfactory-designer";
  const allowPanelRef = useRef(false);
  const ignoreSelectionRef = useRef(false);
  const selectedNodeIdRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);
  const reactFlowRef = useRef(reactFlowInstance);
  const logicNodesRef = useRef(nodes);
  const incomingItemsByNodeRef = useRef<Map<string, string[]>>(new Map());

  // Refs to access current nodes/edges without triggering re-renders
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;
  const selectedEdgesRef = useRef<string[]>([]);

  // Use calculation hook for production line analysis (before stacking so we can pass callback)
  const {
    calcEnabled,
    setCalcEnabled,
    calcEnabledRef,
    handleCalculate,
    clearCalculation,
  } = useCalculation({ nodesRef, edgesRef, setNodes });

  const getStackKey = useCallback((node: Node) => {
    if (node.type !== "building") return null;
    const data = node.data as Record<string, unknown>;
    const buildingId = data.buildingId as string | undefined;
    if (!buildingId) return null;
    return buildingId;
  }, []);

  // Callback for stacking logic to trigger recalculation
  const handleStackChange = useCallback(() => {
    if (calcEnabledRef.current) {
      handleCalculate();
    }
  }, [handleCalculate, calcEnabledRef]);

  const {
    setSelectedNodesForStack,
    canStack,
    canUnstack,
    handleStack,
    handleUnstack,
    handleNodeDrag: handleStackNodeDrag,
  } = useStackingLogic({
    nodesRef,
    setNodes,
    setEdges,
    getStackKey,
    onStackChange: handleStackChange,
  });

  const {
    handleAddNode,
    handleDeleteNode,
    handleDuplicateNode,
    handleDuplicateNodes,
  } = useNodeOperations({
    nodeIdCounter,
    currentLayer,
    nodesRef,
    edges,
    setNodes,
    setEdges,
    setNodeIdCounter,
  });

  // Undo stack for node deletions
  const { saveBeforeDelete, handleUndo } = useUndoStack({
    nodesRef,
    edgesRef,
    setNodes,
    setEdges,
  });

  const { ctrlDownRef } = useKeyboardShortcuts({
    nodesRef,
    edgesRef,
    selectedEdgesRef,
    setNodes,
    setEdges,
    handleDuplicateNodes,
    saveBeforeDelete,
    handleUndo,
  });

  const { getLiftGhostsForLayer, syncGhostPosition } = useConveyorLiftLogic({
    nodes,
    edges,
    currentLayer,
    setNodes,
  });

  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    if (!isDragging) {
      logicNodesRef.current = nodes;
    }
  }, [nodes, isDragging]);

  const edgeContextRef = useRef({
    alwaysShowEdgeLabels: uiSettings.alwaysShowEdgeLabels,
    hoveredEdgeId: hoveredEdgeId,
    isDragging: isDragging,
    edges: edges,
  });

  useEffect(() => {
    edgeContextRef.current.alwaysShowEdgeLabels =
      uiSettings.alwaysShowEdgeLabels;
  }, [uiSettings.alwaysShowEdgeLabels]);

  useEffect(() => {
    edgeContextRef.current.hoveredEdgeId = hoveredEdgeId;
  }, [hoveredEdgeId]);

  useEffect(() => {
    edgeContextRef.current.isDragging = isDragging;
  }, [isDragging]);

  useEffect(() => {
    edgeContextRef.current.edges = edges;
  }, [edges]);

  useEffect(() => {
    reactFlowRef.current = reactFlowInstance;
  }, [reactFlowInstance]);

  const getAbsolutePosition = (
    node?: Node | null,
  ): { x: number; y: number } => {
    if (!node) return { x: 0, y: 0 };
    const absolute = (
      node as unknown as { positionAbsolute?: { x: number; y: number } }
    ).positionAbsolute;
    return absolute || node.position;
  };

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        draggable: !interactionLocked,
      })),
    );
  }, [interactionLocked, setNodes]);

  const buildNodeSnapshot = useCallback((node: Node) => {
    const incomingItems = incomingItemsByNodeRef.current.get(node.id);
    return {
      id: node.id,
      type: node.type,
      data: incomingItems ? { ...node.data, incomingItems } : node.data,
    };
  }, []);

  const captureNodeSnapshot = useCallback((nodeId: string | null) => {
    if (!nodeId) {
      setSelectedNodeSnapshot(null);
      return;
    }
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (!node) {
      setSelectedNodeSnapshot(null);
      return;
    }
    setSelectedNodeSnapshot(buildNodeSnapshot(node));
  }, [buildNodeSnapshot]);

  // Auto-load from localStorage on startup
  useEffect(() => {
    const saved = loadFromLocalStorage();
    if (saved) {
      const filteredNodes = saved.nodes.filter((node) => node.type !== "resource");
      const removedIds = new Set(
        saved.nodes.filter((node) => node.type === "resource").map((n) => n.id),
      );
      const filteredEdges = saved.edges.filter(
        (edge) => !removedIds.has(edge.source) && !removedIds.has(edge.target),
      );
      setNodes(filteredNodes);
      setEdges(filteredEdges);
      setNodeIdCounter(saved.nodeIdCounter);
    }
    setIsInitialized(true);
  }, [setNodes, setEdges]);

  // Auto-save to localStorage when state changes (debounced)
  useEffect(() => {
    if (!isInitialized) return;

    const timer = setTimeout(() => {
      saveToLocalStorage(nodes, edges, nodeIdCounter);
    }, 500);

    return () => clearTimeout(timer);
  }, [nodes, edges, nodeIdCounter, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    if (calcEnabledRef.current) {
      handleCalculate();
    }
  }, [isInitialized, handleCalculate, calcEnabledRef]);

  useEffect(() => {
    if (!isInitialized) return;
    setNodes((nds) =>
      nds.map((node) => {
        if (node.type !== "building") return node;
        const data = node.data as Record<string, unknown>;
        const buildingId = data.buildingId as string | undefined;
        if (!buildingId) return node;
        const building = buildingsData.buildings.find(
          (b) => b.id === buildingId,
        );
        if (!building || building.category !== "extraction") return node;
        const outputItem = data.outputItem as string | undefined;
        if (outputItem) return node;
        const fallback = building.outputs?.[0];
        if (!fallback) return node;
        return {
          ...node,
          data: { ...node.data, outputItem: fallback },
        };
      }),
    );
  }, [isInitialized, setNodes]);


  // Export handler
  const handleExport = useCallback(() => {
    exportToFile(nodes, edges, nodeIdCounter);
  }, [nodes, edges, nodeIdCounter]);

  // Import handler
  const handleImport = useCallback(async () => {
    try {
      const state = await importFromFile();
      const filteredNodes = state.nodes.filter((node) => node.type !== "resource");
      const removedIds = new Set(
        state.nodes.filter((node) => node.type === "resource").map((n) => n.id),
      );
      const filteredEdges = state.edges.filter(
        (edge) => !removedIds.has(edge.source) && !removedIds.has(edge.target),
      );
      setNodes(filteredNodes);
      setEdges(filteredEdges);
      setNodeIdCounter(state.nodeIdCounter);
    } catch (error) {
      console.error("Import failed:", error);
    }
  }, [setNodes, setEdges]);

  // Clear all handler - removes all nodes, edges, and localStorage
  const handleClearAll = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to delete everything? This cannot be undone.",
      )
    ) {
      setNodes([]);
      setEdges([]);
      setNodeIdCounter(1);
      setSelectedNodeId(null);
      setSelectedNodeSnapshot(null);
      clearLocalStorage();
    }
  }, [setNodes, setEdges]);

  // NOTE: handleCalculate and clearCalculation are now provided by useCalculation hook

  // Track previous edge count for detecting edge changes
  const prevEdgeCountRef = useRef(edges.length);

  // Auto-recalculate when edges change (debounced, skip during drag)
  useEffect(() => {
    if (calcEnabledRef.current && edges.length !== prevEdgeCountRef.current) {
      if (isDraggingRef.current) {
        prevEdgeCountRef.current = edges.length;
        return;
      }
      const timer = setTimeout(() => {
        handleCalculate();
      }, 120);
      return () => clearTimeout(timer);
    }
    prevEdgeCountRef.current = edges.length;
  }, [edges.length, handleCalculate]);

  // Get edge label from source node - memoized
  const getEdgeLabel = useCallback(
    (
      sourceNodeId: string,
      targetNodeId: string | null | undefined,
      nodeList: Node[],
      sourceHandle?: string | null,
      edgeData?: Record<string, unknown> | null,
    ): string => {
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

      const resolvedSourceId =
        (edgeData?.virtualSourceId as string | undefined) || sourceNodeId;
      const sourceNode = resolveStackNode(
        nodeList.find((n) => n.id === resolvedSourceId),
      );
      if (!sourceNode) return "";
      const data = sourceNode.data as Record<string, unknown>;
      const isPipe = sourceHandle?.includes("pipe") || false;
      const conveyorMk = (data.conveyorMk as number) || 1;
      const pipeMk = (data.pipeMk as number) || 1;
      const mkRate = isPipe
        ? `${PIPE_RATES[pipeMk as keyof typeof PIPE_RATES]} m³/min`
        : `${CONVEYOR_RATES[conveyorMk as keyof typeof CONVEYOR_RATES]}/min`;

      if (sourceNode.type === "building") {
        const edgeItemId = edgeData?.itemId as string | undefined;
        const outputItemId = data.outputItem as string | undefined;
        const itemId = edgeItemId || outputItemId;
        const item = itemsData.items.find((i) => i.id === itemId);
        const rawRate = data.production;
        let rate =
          typeof rawRate === "number" ? rawRate : Number(rawRate) || 0;
        if (itemId && outputItemId && itemId !== outputItemId) {
          const outputItem = itemsData.items.find(
            (i) => i.id === outputItemId,
          );
          const selectedRecipeIndex = data.selectedRecipeIndex as
            | number
            | undefined;
          const recipeIndex =
            selectedRecipeIndex ?? outputItem?.defaultRecipeIndex ?? 0;
          const recipe = outputItem?.recipes?.[recipeIndex];
          const byproduct = getRecipeByproducts(recipe).find(
            (byp) => byp.item === itemId,
          );
          if (byproduct && outputItem?.defaultProduction) {
            const scale = rate / outputItem.defaultProduction;
            rate = byproduct.amount * scale;
          }
        }
        return item ? `${item.name} ${rate}/min (${mkRate})` : "";
      }

      if (sourceNode.type === "conveyorLift") {
        const item = itemsData.items.find(
          (i) => i.id === data.transportingItem,
        );
        return item ? `${item.name} (${mkRate})` : "";
      }

      return "";
    },
    [],
  );

  // Handle edge connections - uses ref to avoid recreating on every drag
  const onConnect = useCallback(
    (params: Connection) => {
      // Resolve lift ghost IDs to original lift IDs
      const resolveLiftGhostId = (
        nodeId: string | null | undefined,
      ): string | null | undefined => {
        if (!nodeId) return nodeId;
        if (nodeId.endsWith("-lift-ghost")) {
          return nodeId.replace("-lift-ghost", "");
        }
        return nodeId;
      };

      // Use resolved IDs for the actual connection
      const resolvedParams = {
        ...params,
        source: resolveLiftGhostId(params.source),
        target: resolveLiftGhostId(params.target),
      };

      const parseType = (handleId?: string | null) => {
        if (!handleId) return null;
        if (handleId.includes("pipe")) return "pipe";
        if (handleId.includes("conveyor")) return "conveyor";
        return null;
      };

      const inferType = (
        nodeId: string | null | undefined,
        direction: "input" | "output",
      ) => {
        if (!nodeId) return null;
        const node = nodesRef.current.find((n) => n.id === nodeId);
        if (!node) return null;
        if (node.type === "building") {
          const buildingId = (node.data as Record<string, unknown>)
            ?.buildingId as string | undefined;
          const building = buildingsData.buildings.find(
            (b) => b.id === buildingId,
          );
          const types =
            direction === "input"
              ? (building?.inputTypes ??
                Array(building?.inputs ?? 1).fill("conveyor"))
              : (building?.outputTypes ?? ["conveyor"]);
          const unique = Array.from(new Set(types));
          return unique.length === 1 ? unique[0] : null;
        }
        if (node.type === "smartSplitter") {
          // Smart Splitter always uses conveyor for both input and output
          return "conveyor";
        }
        if (node.type === "goal") {
          return "conveyor";
        }
        if (node.type === "conveyorLift") {
          // Conveyor Lift always uses conveyor
          return "conveyor";
        }
        return null;
      };

      const sourceType =
        parseType(params.sourceHandle) ??
        inferType(resolvedParams.source, "output");
      const targetType =
        parseType(params.targetHandle) ??
        inferType(resolvedParams.target, "input");

      const resolveStackEndpoint = (nodeId: string | null | undefined) => {
        if (!nodeId) return nodeId;
        const node = nodesRef.current.find((n) => n.id === nodeId);
        if (!node) return nodeId;
        const data = node.data as Record<string, unknown>;
        const stackCount = data.stackCount as number | undefined;
        const stackActiveId = data.stackActiveId as string | undefined;
        if (stackCount && stackCount > 1 && stackActiveId) {
          return stackActiveId;
        }
        return nodeId;
      };

      const virtualSourceId = resolveStackEndpoint(resolvedParams.source);
      const virtualTargetId = resolveStackEndpoint(resolvedParams.target);
      if (!virtualSourceId || !virtualTargetId) return;

      const sourceNode = nodesRef.current.find(
        (n) => n.id === virtualSourceId,
      );
      const targetNode = nodesRef.current.find(
        (n) => n.id === virtualTargetId,
      );
      const resolvedTargetNode = targetNode;

      const resolveDefaultType = (
        node: Node | undefined,
        direction: "input" | "output",
      ) => {
        if (!node) return null;
        if (node.type === "building") {
          const buildingId = (node.data as Record<string, unknown>)
            ?.buildingId as string | undefined;
          const building = buildingsData.buildings.find(
            (b) => b.id === buildingId,
          );
          const types =
            direction === "input"
              ? (building?.inputTypes ??
                Array(building?.inputs ?? 1).fill("conveyor"))
              : (building?.outputTypes ?? ["conveyor"]);
          const unique = Array.from(new Set(types));
          return unique.length === 1 ? unique[0] : null;
        }
        if (
          node.type === "smartSplitter" ||
          node.type === "goal" ||
          node.type === "conveyorLift"
        ) {
          return "conveyor";
        }
        return null;
      };

      let resolvedSourceType =
        sourceType ?? resolveDefaultType(sourceNode, "output");
      let resolvedTargetType =
        targetType ?? resolveDefaultType(targetNode, "input");

      // If one side can't be resolved (e.g. loose connect onto node body), inherit from the other side.
      if (!resolvedSourceType && resolvedTargetType) {
        resolvedSourceType = resolvedTargetType;
      }
      if (!resolvedTargetType && resolvedSourceType) {
        resolvedTargetType = resolvedSourceType;
      }

      const forcedType =
        params.sourceHandle?.includes("pipe") ||
        params.targetHandle?.includes("pipe")
          ? "pipe"
          : params.sourceHandle?.includes("conveyor") ||
              params.targetHandle?.includes("conveyor")
            ? "conveyor"
            : null;
      if (forcedType) {
        resolvedSourceType = forcedType;
        resolvedTargetType = forcedType;
      }

      if (
        !resolvedSourceType ||
        !resolvedTargetType ||
        resolvedSourceType !== resolvedTargetType
      )
        return;

      const getDirectItemId = (
        node: Node | undefined,
        sourceHandle?: string | null,
        targetHandle?: string | null,
      ): string | undefined => {
        if (!node) return undefined;
        const data = node.data as Record<string, unknown>;
        if (node.type === "building") {
          const outputItemId = data.outputItem as string | undefined;
          if (!outputItemId) {
            return data.storedItem as string | undefined;
          }
          const isPipe = Boolean(
            sourceHandle?.includes("pipe") || targetHandle?.includes("pipe"),
          );
          if (isPipe) {
            const outputItem = itemsData.items.find(
              (item) => item.id === outputItemId,
            );
            if (outputItem?.category === "fluid") return outputItemId;
            const selectedRecipeIndex = data.selectedRecipeIndex as
              | number
              | undefined;
            const recipeIndex =
              selectedRecipeIndex ?? outputItem?.defaultRecipeIndex ?? 0;
            const recipe = outputItem?.recipes?.[recipeIndex];
            const byproduct = getRecipeByproducts(recipe).find((byp) => {
              const bypItem = itemsData.items.find(
                (item) => item.id === byp.item,
              );
              return bypItem?.category === "fluid";
            });
            if (byproduct) return byproduct.item;
          }
          return outputItemId;
        }
        if (node.type === "conveyorLift") {
          return data.transportingItem as string | undefined;
        }
        if (node.type === "smartSplitter") {
          const outputs = data.splitOutputs as
            | Array<{ item: string | null }>
            | undefined;
          if (!outputs) return undefined;
          if (sourceHandle === "out-top-0") return outputs[0]?.item ?? undefined;
          if (sourceHandle === "out-right-0") return outputs[1]?.item ?? undefined;
          if (sourceHandle === "out-bottom-0") return outputs[2]?.item ?? undefined;
        }
        return undefined;
      };

      const resolveSplitterIncomingItems = (
        splitterNode: Node,
      ): string[] => {
        const incoming = edgesRef.current.filter((edge) => {
          const targetId =
            (edge.data as Record<string, unknown> | undefined)
              ?.virtualTargetId ?? edge.target;
          return targetId === splitterNode.id;
        });
        const items = new Set<string>();
        incoming.forEach((edge) => {
          const sourceId =
            (edge.data as Record<string, unknown> | undefined)
              ?.virtualSourceId ?? edge.source;
          const source = nodesRef.current.find((n) => n.id === sourceId);
          const itemId = getDirectItemId(
            source,
            edge.sourceHandle,
            edge.targetHandle,
          );
          if (itemId) items.add(itemId);
        });
        return Array.from(items);
      };

      const getEdgeItemId = (
        node: Node | undefined,
        sourceHandle?: string | null,
        targetHandle?: string | null,
      ): string | undefined => {
        if (!node) return undefined;
        if (node.type !== "smartSplitter") {
          return getDirectItemId(node, sourceHandle, targetHandle);
        }
        const explicit = getDirectItemId(node, sourceHandle, targetHandle);
        if (explicit) return explicit;
        const incomingItems = resolveSplitterIncomingItems(node);
        if (incomingItems.length === 1) return incomingItems[0];
        return undefined;
      };

      const edgeItemId = getEdgeItemId(
        sourceNode,
        params.sourceHandle,
        params.targetHandle,
      );

      // Auto-set production building output based on incoming item
      if (resolvedTargetNode?.type === "building") {
        const targetData = resolvedTargetNode.data as Record<string, unknown>;
        const targetBuildingId = targetData.buildingId as string;
        const targetBuilding = buildingsData.buildings.find(
          (b) => b.id === targetBuildingId,
        );
        if (targetBuilding?.id === "fluid_buffer") {
          if (!edgeItemId) return;
          const incomingItem = itemsData.items.find(
            (item) => item.id === edgeItemId,
          );
          if (incomingItem?.category !== "fluid") return;
        }

        // Get the item being provided by the source
        let incomingItem: string | undefined;
        incomingItem = edgeItemId;

        // If target has no output set and we know what's coming in, auto-select
        if (incomingItem && !targetData.outputItem) {
          // Find items that this building can produce and that require the incoming item
          const matchingItems = itemsData.items.filter((item) => {
            if (!item.producers || !item.producers.includes(targetBuildingId))
              return false;
            if (!item.requires || item.requires.length === 0) return false;
            return item.requires.some((req) => req.item === incomingItem);
          });

          // If exactly one item matches, auto-select it
          if (matchingItems.length === 1) {
            const matchedItem = matchingItems[0];
            const defaultProduction = matchedItem.defaultProduction || 30;
            setNodes((nds) =>
              nds.map((n) => {
                if (n.id === resolvedTargetNode.id) {
                  return {
                    ...n,
                    data: {
                      ...n.data,
                      outputItem: matchedItem.id,
                      production: defaultProduction,
                    },
                  };
                }
                return n;
              }),
            );
          }
        }
      }

      // Auto-set Storage storedItem when first connected input arrives
      if (resolvedTargetNode?.type === "building") {
        const targetData = resolvedTargetNode.data as Record<string, unknown>;
        const targetBuildingId = targetData.buildingId as string | undefined;
        const targetBuilding = buildingsData.buildings.find(
          (b) => b.id === targetBuildingId,
        );
        if (targetBuilding?.category === "storage") {
          const storedItem = targetData.storedItem as string | undefined;
          const incomingItem = edgeItemId;
          if (incomingItem && !storedItem) {
            setNodes((nds) =>
              nds.map((n) => {
                if (n.id === resolvedTargetNode.id) {
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
      if (resolvedTargetNode?.type === "conveyorLift") {
        const targetData = resolvedTargetNode.data as Record<string, unknown>;
        const transportingItem = targetData.transportingItem as
          | string
          | undefined;
        const incomingItem = edgeItemId;
        if (incomingItem && !transportingItem) {
          setNodes((nds) =>
            nds.map((n) => {
              if (n.id === resolvedTargetNode.id) {
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
        {
          virtualSourceId,
          virtualTargetId,
          itemId: edgeItemId,
        },
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
              virtualSourceId,
              virtualTargetId,
              ...(edgeItemId ? { itemId: edgeItemId } : {}),
            },
          } as Connection,
          eds,
        );

        // Auto-recalculate if calculation is enabled
        if (calcEnabledRef.current) {
          // Update ref immediately so handleCalculate uses fresh data
          edgesRef.current = newEdges;
          queueMicrotask(() => {
            handleCalculate();
          });
        }

        return newEdges;
      });
    },
    [setEdges, setNodes, getEdgeLabel, handleCalculate],
  );

  // Handle node data changes from custom nodes AND update edge labels
  useEffect(() => {
    const handleNodeDataChange = (event: CustomEvent) => {
      const { nodeId, field, value } = event.detail;

      // Update node data
      setNodes((nds) => {
        const updatedNodes = nds.map((node) => {
          if (node.id === nodeId) {
            if (field === "stackActiveIndex") {
              const stackedNodeIds = (node.data as Record<string, unknown>)
                .stackedNodeIds as string[] | undefined;
              if (stackedNodeIds && stackedNodeIds.length > 0) {
                const rawIndex =
                  typeof value === "number" ? value : Number(value);
                const safeIndex = Number.isFinite(rawIndex)
                  ? ((rawIndex % stackedNodeIds.length) +
                      stackedNodeIds.length) %
                    stackedNodeIds.length
                  : 0;
                const activeId = stackedNodeIds[safeIndex];
                if (
                  selectedNodeIdRef.current === nodeId ||
                  selectedNodeIdRef.current === node.data.stackActiveId
                ) {
                  setSelectedNodeId(activeId);
                  captureNodeSnapshot(activeId);
                }
                return {
                  ...node,
                  data: {
                    ...node.data,
                    stackActiveIndex: safeIndex,
                    stackActiveId: activeId,
                  },
                };
              }
            }
            return {
              ...node,
              data: {
                ...node.data,
                [field]: value,
              },
            };
          }

          // Propagate theme changes to all stacked children
          if (field === "theme") {
            const parentNode = nds.find((n) => n.id === nodeId);
            if (parentNode) {
              const stackedNodeIds = (
                parentNode.data as Record<string, unknown>
              ).stackedNodeIds as string[] | undefined;
              if (stackedNodeIds && stackedNodeIds.includes(node.id)) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    theme: value,
                  },
                };
              }
            }
          }

          return node;
        });

        if (selectedNodeIdRef.current === nodeId) {
          const updated = updatedNodes.find((node) => node.id === nodeId);
          if (updated) {
            setSelectedNodeSnapshot(buildNodeSnapshot(updated));
          }
        }

        // Update edge labels only for relevant field changes
          const relevantFields = [
            "outputItem",
            "selectedAltIndex",
            "selectedRecipeIndex",
            "production",
            "conveyorMk",
            "pipeMk",
            "purity",
            "buildingId",
            "transportingItem",
          ];
        if (relevantFields.includes(field)) {
          setEdges((eds) =>
            eds.map((edge) => {
              const virtualSourceId = (edge.data as Record<string, unknown> | undefined)
                ?.virtualSourceId as string | undefined;
              const virtualTargetId = (edge.data as Record<string, unknown> | undefined)
                ?.virtualTargetId as string | undefined;
              if (
                edge.source !== nodeId &&
                edge.target !== nodeId &&
                virtualSourceId !== nodeId &&
                virtualTargetId !== nodeId
              ) {
                return edge;
              }
              const newLabel = getEdgeLabel(
                edge.source,
                edge.target,
                updatedNodes,
                edge.sourceHandle || null,
                (edge.data as Record<string, unknown> | undefined) || null,
              );
              if (edge.data?.label !== newLabel) {
                return {
                  ...edge,
                  data: { ...edge.data, label: newLabel },
                };
              }
              return edge;
            }),
          );

          // Auto-recalculate if calculation is enabled
          if (calcEnabledRef.current) {
            // Update ref immediately so handleCalculate uses fresh data
            nodesRef.current = updatedNodes;
            // Use microtask to run after current setNodes completes
            queueMicrotask(() => {
              handleCalculate();
            });
          }
        }

        return updatedNodes;
      });
    };

    window.addEventListener(
      "nodeDataChange",
      handleNodeDataChange as EventListener,
    );
    const handleForceRecalculate = () => {
      if (calcEnabledRef.current) {
        handleCalculate();
      }
    };
    window.addEventListener(
      "forceRecalculate",
      handleForceRecalculate as EventListener,
    );
    const handleGroupSummary = (event: CustomEvent) => {
      const { nodeId } = event.detail as { nodeId: string };
      const groupNode = nodesRef.current.find((n) => n.id === nodeId);
      if (!groupNode) return;
      const childNodes = nodesRef.current.filter(
        (n) => (n as Record<string, unknown>).parentId === nodeId,
      );
      let totalPower = 0;
      let buildingCount = 0;
      const summaryMap = new Map<
        string,
        {
          id: string;
          name: string;
          count: number;
          rate: number;
          activeCount: number;
        }
      >();
      childNodes.forEach((n) => {
        if (n.type !== "building") return;
        const data = n.data as Record<string, unknown>;
        const isStacked = data.isStacked as boolean | undefined;
        if (isStacked) return;
        const stackCount = (data.stackCount as number | undefined) || 1;
        buildingCount += stackCount;
        const powerUsage = (data.powerUsage as number) || 0;
        totalPower += powerUsage * stackCount;
        const outputItem = data.outputItem as string | undefined;
        if (!outputItem) return;
        const item = itemsData.items.find((i) => i.id === outputItem);
        if (!item) return;
        const entry = summaryMap.get(item.id) || {
          id: item.id,
          name: item.name,
          count: 0,
          rate: 0,
          activeCount: 0,
        };
        entry.count += 1;
        entry.rate += (data.production as number) || 0;
        const calcStatus = data.calcStatus as string | null | undefined;
        if (calcStatus && calcStatus !== "under") {
          entry.activeCount += 1;
        }
        summaryMap.set(item.id, entry);
      });
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          return {
            ...n,
            data: {
              ...n.data,
              summaryItems: Array.from(summaryMap.values()),
              totalPower,
              buildingCount,
            },
          };
        }),
      );
    };
    window.addEventListener(
      "groupSummary",
      handleGroupSummary as EventListener,
    );
    return () => {
      window.removeEventListener(
        "nodeDataChange",
        handleNodeDataChange as EventListener,
      );
      window.removeEventListener(
        "forceRecalculate",
        handleForceRecalculate as EventListener,
      );
      window.removeEventListener(
        "groupSummary",
        handleGroupSummary as EventListener,
      );
    };
  }, [setNodes, setEdges, getEdgeLabel, currentLayer]);

  // Drag & Drop handlers
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const data = event.dataTransfer.getData("application/satisplanner");
      if (!data) return;

      try {
        const { type, data: nodeData } = JSON.parse(data);

        // Convert screen coordinates to flow coordinates
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        handleAddNode(type, nodeData, position);
      } catch (error) {
        console.error("Failed to parse drop data:", error);
      }
    },
    [reactFlowInstance, handleAddNode],
  );

  const handleNodeClick = useCallback((event: unknown, node: Node) => {
    const mouseEvent = event as MouseEvent;
    if (mouseEvent.ctrlKey || mouseEvent.metaKey || ctrlDownRef.current) return;
    // Don't open panel for ghost nodes
    const isGhost = (node.data as Record<string, unknown>)?.isGhost;
    if (isGhost) {
      allowPanelRef.current = false;
      return;
    }
    const target = mouseEvent.target as HTMLElement | null;
    if (target?.closest('[data-no-panel="true"]')) {
      allowPanelRef.current = false;
      setSelectedNodeId(null);
      captureNodeSnapshot(null);
      ignoreSelectionRef.current = true;
      return;
    }
    allowPanelRef.current = true;
    const nodeData = node.data as Record<string, unknown>;
    const stackActiveId = nodeData.stackActiveId as string | undefined;
    const stackCount = nodeData.stackCount as number | undefined;
    const isStackParent = stackCount && stackCount > 1 && stackActiveId;
    const targetId = isStackParent ? stackActiveId : node.id;
    setSelectedNodeId(targetId);
    captureNodeSnapshot(targetId);
  }, [captureNodeSnapshot]);

  const handlePaneClick = useCallback(() => {
    allowPanelRef.current = false;
    setSelectedNodeId(null);
    captureNodeSnapshot(null);
    setSelectedNodesForStack([]);
  }, []);

  const handleSelectNodesByItems = useCallback(
    (itemIds: string[]) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.type !== "building") {
            return { ...node, selected: false };
          }
          const data = node.data as Record<string, unknown>;
          const outputItem = data.outputItem as string | undefined;
          const isSelected = outputItem ? itemIds.includes(outputItem) : false;
          return { ...node, selected: isSelected };
        }),
      );
      allowPanelRef.current = false;
      setSelectedNodeId(null);
      captureNodeSnapshot(null);
    },
    [setNodes],
  );

  const handleNodeDragStart = useCallback(
    (_: unknown, node: Node) => {
      setIsDragging(true);
      const parentId = (node as Record<string, unknown>).parentId as
        | string
        | undefined;
      if (!parentId) return;
      const parent =
        reactFlowInstance.getNode(parentId) ||
        nodesRef.current.find((n) => n.id === parentId);
      const parentData = parent?.data as Record<string, unknown> | undefined;
      if (!parentData || parentData.lockChildren) return;
      const liveNode = reactFlowInstance.getNode(node.id);
      const absPos = getAbsolutePosition(liveNode ?? node);
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== node.id) return n;
          return {
            ...n,
            parentId: undefined,
            extent: undefined,
            position: absPos,
          };
        }),
      );
    },
    [reactFlowInstance, setNodes],
  );

  const handleNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      setIsDragging(false);
      if (node.type === "group") return;
      const nodeData = node.data as Record<string, unknown>;

      // Special handling for lift ghosts - sync position to original lift
      if (nodeData.isLiftGhost) {
        const originalLiftId = nodeData.originalLiftId as string;
        if (originalLiftId) {
          syncGhostPosition(`${originalLiftId}-lift-ghost`, node.position);
        }
        return;
      }

      if (nodeData.isGhost || nodeData.isStacked) return;

      const liveNode = reactFlowInstance.getNode(node.id);
      const nodePos = getAbsolutePosition(liveNode ?? node);
      const nodeWidth = liveNode?.width || node.width || 0;
      const nodeHeight = liveNode?.height || node.height || 0;
      const nodeCenter = {
        x: nodePos.x + nodeWidth / 2,
        y: nodePos.y + nodeHeight / 2,
      };
      const currentParentId = (node as Record<string, unknown>).parentId as
        | string
        | undefined;
      if (currentParentId) {
        const parent =
          reactFlowInstance.getNode(currentParentId) ||
          nodesRef.current.find((n) => n.id === currentParentId);
        if (parent) {
          const parentWidth = parent.width || 0;
          const parentHeight = parent.height || 0;
          const parentData = parent.data as Record<string, unknown>;
          const relativePos = node.position as { x: number; y: number };
          const relCenter = {
            x: relativePos.x + nodeWidth / 2,
            y: relativePos.y + nodeHeight / 2,
          };
          const padding = 6;
          const inside =
            relCenter.x >= padding &&
            relCenter.y >= padding &&
            relCenter.x <= parentWidth - padding &&
            relCenter.y <= parentHeight - padding;
          if (inside || parentData.lockChildren) {
            setNodes((nds) => {
              const byId = new Map(nds.map((n) => [n.id, n]));
              const ordered: Node[] = [];
              const visited = new Set<string>();
              const visit = (n: Node) => {
                if (visited.has(n.id)) return;
                const parentId = (n as Record<string, unknown>).parentId as
                  | string
                  | undefined;
                if (parentId) {
                  const parentNode = byId.get(parentId);
                  if (parentNode) visit(parentNode);
                }
                visited.add(n.id);
                ordered.push(n);
              };
              nds.forEach(visit);
              return ordered;
            });
            return;
          }
        }
      }

      const intersecting = reactFlowInstance
        .getIntersectingNodes(liveNode || node)
        .filter((n) => n.type === "group");

      const targetGroup =
        intersecting.find((group) => {
          const liveGroup = reactFlowInstance.getNode(group.id);
          const groupPos = getAbsolutePosition(liveGroup ?? group);
          const groupWidth = liveGroup?.width || group.width || 0;
          const groupHeight = liveGroup?.height || group.height || 0;
          if (!groupWidth || !groupHeight) return false;
          return (
            nodeCenter.x >= groupPos.x &&
            nodeCenter.x <= groupPos.x + groupWidth &&
            nodeCenter.y >= groupPos.y &&
            nodeCenter.y <= groupPos.y + groupHeight
          );
        }) || null;
      setNodes((nds) => {
        const updated = nds.map((n) => {
          if (n.id !== node.id) return n;
          if (targetGroup) {
            const liveGroup = reactFlowInstance.getNode(targetGroup.id);
            const groupPos = getAbsolutePosition(liveGroup ?? targetGroup);
            const newPos = {
              x: nodePos.x - groupPos.x,
              y: nodePos.y - groupPos.y,
            };
            return {
              ...n,
              parentId: targetGroup.id,
              extent: "parent" as const,
              position: newPos,
            };
          }

          if ((n as Record<string, unknown>).parentId) {
            return {
              ...n,
              parentId: undefined,
              extent: undefined,
              position: nodePos,
            };
          }

          return n;
        });

        // Ensure parent nodes come before children to satisfy React Flow
        const byId = new Map(updated.map((n) => [n.id, n]));
        const ordered: Node[] = [];
        const visited = new Set<string>();

        const visit = (n: Node) => {
          if (visited.has(n.id)) return;
          const parentId = (n as Record<string, unknown>).parentId as
            | string
            | undefined;
          if (parentId) {
            const parent = byId.get(parentId);
            if (parent) visit(parent);
          }
          visited.add(n.id);
          ordered.push(n);
        };

        updated.forEach(visit);
        return ordered;
      });
    },
    [reactFlowInstance, setNodes, syncGhostPosition],
  );

  const handleNodeDrag = useCallback(
    (event: unknown, node: Node) => {
      const nodeData = node.data as Record<string, unknown>;
      if (nodeData.isLiftGhost) {
        const originalLiftId = nodeData.originalLiftId as string | undefined;
        if (originalLiftId) {
          syncGhostPosition(`${originalLiftId}-lift-ghost`, node.position);
        }
        return;
      }
      handleStackNodeDrag(event, node);
    },
    [handleStackNodeDrag, syncGhostPosition],
  );

  const handleSelectionChange = useCallback(
    (params: { nodes: Node[]; edges: Edge[] }) => {
      if (ignoreSelectionRef.current) {
        ignoreSelectionRef.current = false;
        return;
      }
      setSelectedNodesForStack(params.nodes);
      selectedEdgesRef.current = params.edges.map((e) => e.id);
      if (ctrlDownRef.current) {
        allowPanelRef.current = false;
        setSelectedNodeId(null);
        captureNodeSnapshot(null);
        return;
      }
      if (params.nodes.length !== 1) {
        allowPanelRef.current = false;
        setSelectedNodeId(null);
        captureNodeSnapshot(null);
        return;
      }
      // Don't open panel for ghost nodes
      const selectedNode = params.nodes[0];
      const isGhost = (selectedNode.data as Record<string, unknown>)?.isGhost;
      if (isGhost) {
        allowPanelRef.current = false;
        return;
      }
      if (allowPanelRef.current) {
        allowPanelRef.current = false;
        const nodeData = params.nodes[0].data as Record<string, unknown>;
        const stackActiveId = nodeData.stackActiveId as string | undefined;
        const stackCount = nodeData.stackCount as number | undefined;
        const isStackParent = stackCount && stackCount > 1 && stackActiveId;
        const targetId = isStackParent ? stackActiveId : params.nodes[0].id;
        setSelectedNodeId(targetId);
        captureNodeSnapshot(targetId);
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectedNodeId) return;
    const stillExists = nodes.some((node) => node.id === selectedNodeId);
    if (!stillExists) {
      setSelectedNodeId(null);
      captureNodeSnapshot(null);
    }
  }, [nodes, selectedNodeId]);

  useEffect(() => {
    // Clear selections from other layers to avoid deleting hidden nodes.
    setNodes((nds) =>
      nds.map((node) => {
        const layer =
          ((node.data as Record<string, unknown>).layer as number) || 1;
        if (layer !== currentLayer && node.selected) {
          return { ...node, selected: false };
        }
        return node;
      }),
    );
    selectedEdgesRef.current = [];
  }, [currentLayer, setNodes]);

  // Sync edge material and handle IDs based on connected nodes
  useEffect(() => {
    setEdges((eds) => {
      let changed = false;
      const updated = eds.map((edge) => {
        let newEdge = { ...edge };
        let edgeChanged = false;

        if (!edge.data?.material) {
          const isPipe =
            edge.sourceHandle?.includes("pipe") ||
            edge.targetHandle?.includes("pipe");
          const material = isPipe ? "pipe" : "conveyor";
          newEdge = { ...newEdge, data: { ...newEdge.data, material } };
          edgeChanged = true;
        }

        if (edgeChanged) {
          changed = true;
          return newEdge;
        }
        return edge;
      });
      return changed ? updated : eds;
    });
  }, [nodes, setEdges]);

  // Toggle all nodes collapse state
  const handleToggleAllCollapse = useCallback(
    (collapsed: boolean) => {
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: {
            ...node.data,
            collapsed,
          },
        })),
      );
    },
    [setNodes],
  );

  // Defer sidebar updates so they don't block dragging
  const deferredNodes = useDeferredValue(nodes);
  const deferredEdges = useDeferredValue(edges);

  // Check if all nodes are collapsed - use deferred to not block drag
  const allCollapsed = useMemo(() => {
    return (
      deferredNodes.length > 0 &&
      deferredNodes.every((n) => (n.data as Record<string, unknown>).collapsed)
    );
  }, [deferredNodes]);

  const logicNodes = isDragging ? logicNodesRef.current : nodes;

  const nodeById = useMemo(() => {
    return new Map(logicNodes.map((node) => [node.id, node]));
  }, [logicNodes]);

  const outgoingEdgesBySource = useMemo(() => {
    const map = new Map<string, Edge[]>();
    edges.forEach((edge) => {
      const virtualSourceId = (edge.data as Record<string, unknown> | undefined)
        ?.virtualSourceId as string | undefined;
      const sourceId = virtualSourceId || edge.source;
      const list = map.get(sourceId) || [];
      list.push(edge);
      map.set(sourceId, list);
    });
    return map;
  }, [edges]);

  const incomingItemsByNode = useMemo(() => {
    const map = new Map<string, string[]>();

    const getProvidedItems = (node: Node, edge?: Edge): string[] => {
      const data = node.data as Record<string, unknown>;
      const stackActiveData = data.stackActiveData as
        | Record<string, unknown>
        | undefined;
      const edgeItemId = (edge?.data as Record<string, unknown> | undefined)
        ?.itemId as string | undefined;
      if (edgeItemId) return [edgeItemId];
      if (node.type === "building") {
        const buildingId = data.buildingId as string | undefined;
        const building = buildingsData.buildings.find(
          (b) => b.id === buildingId,
        );
        if (building?.category === "storage") {
          const storedItem =
            (data.storedItem as string | undefined) ??
            (stackActiveData?.storedItem as string | undefined);
          return storedItem ? [storedItem] : [];
        }
        const outputItem =
          (data.outputItem as string | undefined) ??
          (stackActiveData?.outputItem as string | undefined);
        if (outputItem) return [outputItem];
        if (building?.fixedOutput) return [building.fixedOutput];
        if (building?.outputs && building.outputs.length > 0) {
          return [building.outputs[0]];
        }
        return [];
      }
      if (node.type === "conveyorLift") {
        return data.transportingItem ? [data.transportingItem as string] : [];
      }
      if (node.type === "smartSplitter") {
        const outputs = data.splitOutputs as
          | Array<{ item: string | null }>
          | undefined;
        if (!outputs) return [];
        return outputs.map((o) => o.item).filter(Boolean) as string[];
      }
      return [];
    };

    edges.forEach((edge) => {
      const virtualSourceId = (edge.data as Record<string, unknown> | undefined)
        ?.virtualSourceId as string | undefined;
      const virtualTargetId = (edge.data as Record<string, unknown> | undefined)
        ?.virtualTargetId as string | undefined;
      const sourceId = virtualSourceId || edge.source;
      const targetId = virtualTargetId || edge.target;
      const source = nodeById.get(sourceId);
      if (!source) return;
      const items = getProvidedItems(source, edge);
      if (items.length === 0) return;
      const current = map.get(targetId) || [];
      const merged = new Set([...current, ...items]);
      map.set(targetId, Array.from(merged));
    });

    // Second pass: let conveyor lifts pass through their incoming items even if not explicitly set
    edges.forEach((edge) => {
      const virtualSourceId = (edge.data as Record<string, unknown> | undefined)
        ?.virtualSourceId as string | undefined;
      const virtualTargetId = (edge.data as Record<string, unknown> | undefined)
        ?.virtualTargetId as string | undefined;
      const sourceId = virtualSourceId || edge.source;
      const targetId = virtualTargetId || edge.target;
      const source = nodeById.get(sourceId);
      if (!source || source.type !== "conveyorLift") return;
      const sourceData = source.data as Record<string, unknown>;
      const hasExplicitItem = Boolean(sourceData.transportingItem);
      if (hasExplicitItem) return;
      const incomingItems = map.get(source.id) || [];
      if (incomingItems.length === 0) return;
      const current = map.get(targetId) || [];
      const merged = new Set([...current, ...incomingItems]);
      map.set(targetId, Array.from(merged));
    });

    // Third pass: let smart splitters pass through incoming items when output filter is "Any"
    edges.forEach((edge) => {
      const virtualSourceId = (edge.data as Record<string, unknown> | undefined)
        ?.virtualSourceId as string | undefined;
      const virtualTargetId = (edge.data as Record<string, unknown> | undefined)
        ?.virtualTargetId as string | undefined;
      const sourceId = virtualSourceId || edge.source;
      const targetId = virtualTargetId || edge.target;
      const source = nodeById.get(sourceId);
      if (!source || source.type !== "smartSplitter") return;
      const sourceData = source.data as Record<string, unknown>;
      const splitOutputs = (sourceData.splitOutputs as
        | Array<{ item: string | null }>
        | undefined) ?? [
        { item: null },
        { item: null },
        { item: null },
      ];
      const handle = edge.sourceHandle || "";
      let outputItem: string | null | undefined;
      if (handle === "out-top-0") outputItem = splitOutputs[0]?.item;
      if (handle === "out-right-0") outputItem = splitOutputs[1]?.item;
      if (handle === "out-bottom-0") outputItem = splitOutputs[2]?.item;
      if (outputItem) return;
      const incomingItems = map.get(source.id) || [];
      if (incomingItems.length === 0) return;
      const current = map.get(targetId) || [];
      const merged = new Set([...current, ...incomingItems]);
      map.set(targetId, Array.from(merged));
    });

    return map;
  }, [edges, nodeById]);

  useEffect(() => {
    incomingItemsByNodeRef.current = incomingItemsByNode;
  }, [incomingItemsByNode]);

  const splitterAutoOutputsById = useMemo(() => {
    const map = new Map<
      string,
      Array<{ item: string | null; conveyorMk: number }>
    >();
    logicNodes.forEach((node) => {
      if (node.type !== "smartSplitter") return;
      const data = node.data as Record<string, unknown>;
      const splitOutputs = (data.splitOutputs as Array<{
        item: string | null;
        conveyorMk: number;
      }>) || [
        { item: null, conveyorMk: 1 },
        { item: null, conveyorMk: 1 },
        { item: null, conveyorMk: 1 },
      ];
      const incomingItems = incomingItemsByNode.get(node.id) || [];
      const outgoing = outgoingEdgesBySource.get(node.id) || [];
      const result = [...splitOutputs];

      outgoing.forEach((edge) => {
        const targetNode = nodeById.get(edge.target);
        if (!targetNode) return;
        const targetData = targetNode.data as Record<string, unknown>;
        let targetItem: string | null = null;

        if (targetNode.type === "building") {
          const outputItem = targetData.outputItem as string | undefined;
          if (outputItem) {
            const item = itemsData.items.find((i) => i.id === outputItem);
            if (item?.requires && item.requires.length > 0) {
              const match = item.requires.find((req) =>
                incomingItems.includes(req.item),
              );
              if (match) targetItem = match.item;
            }
          }
          const storedItem = targetData.storedItem as string | undefined;
          if (storedItem && incomingItems.includes(storedItem)) {
            targetItem = storedItem;
          }
        }

        if (targetNode.type === "goal") {
          const goalItemId = targetData.itemId as string | undefined;
          const goalItem = itemsData.items.find((i) => i.id === goalItemId);
          if (goalItem?.requires && goalItem.requires.length > 0) {
            const match = goalItem.requires.find((req) =>
              incomingItems.includes(req.item),
            );
            if (match) targetItem = match.item;
          }
        }

        if (edge.sourceHandle === "out-top-0" && targetItem) {
          result[0] = { ...result[0], item: targetItem };
        } else if (edge.sourceHandle === "out-right-0" && targetItem) {
          result[1] = { ...result[1], item: targetItem };
        } else if (edge.sourceHandle === "out-bottom-0" && targetItem) {
          result[2] = { ...result[2], item: targetItem };
        }
      });

      map.set(node.id, result);
    });
    return map;
  }, [logicNodes, incomingItemsByNode, outgoingEdgesBySource, nodeById]);

  const goalConnectionsById = useMemo(() => {
    const map = new Map<
      string,
      { connectedItems: string[]; missingItems: string[] }
    >();
    logicNodes.forEach((node) => {
      if (node.type !== "goal") return;
      const data = node.data as Record<string, unknown>;
      const goalItemId = data.itemId as string | undefined;
      const goalItem = itemsData.items.find((i) => i.id === goalItemId);
      const requiredIds = goalItem?.requires?.map((req) => req.item) || [];
      const incomingItems = incomingItemsByNode.get(node.id) || [];
      const connected = requiredIds.filter((id) => incomingItems.includes(id));
      const missing = requiredIds.filter((id) => !incomingItems.includes(id));
      map.set(node.id, { connectedItems: connected, missingItems: missing });
    });
    return map;
  }, [logicNodes, incomingItemsByNode]);

  // Filter and transform nodes for layer rendering
  const layeredNodes = useMemo(() => {
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
          return {
            ...node,
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
  }, [nodes, currentLayer, getLiftGhostsForLayer]);

  useEffect(() => {
    if (!selectedNodeId) return;
    const node = layeredNodes.find((n) => n.id === selectedNodeId);
    if (!node) return;
    setSelectedNodeSnapshot(buildNodeSnapshot(node));
  }, [selectedNodeId, layeredNodes, buildNodeSnapshot]);

  // Filter edges for visible layers
  const layeredEdges = useMemo(() => {
    const visibleNodeIds = new Set(layeredNodes.map((n) => n.id));
    const layeredNodeById = new Map(layeredNodes.map((n) => [n.id, n]));
    const liftGhosts = getLiftGhostsForLayer(currentLayer);
    const ghostIdByOriginal = new Map<string, string>();
    liftGhosts.forEach(({ originalNode, ghostId }) => {
      ghostIdByOriginal.set(originalNode.id, ghostId);
    });

    return edges
      .map((edge) => {
        let displaySource = edge.source;
        let displayTarget = edge.target;

        const sourceGhostId = ghostIdByOriginal.get(edge.source);
        const targetGhostId = ghostIdByOriginal.get(edge.target);

        if (
          sourceGhostId &&
          !visibleNodeIds.has(edge.source) &&
          visibleNodeIds.has(sourceGhostId)
        ) {
          displaySource = sourceGhostId;
        }
        if (
          targetGhostId &&
          !visibleNodeIds.has(edge.target) &&
          visibleNodeIds.has(targetGhostId)
        ) {
          displayTarget = targetGhostId;
        }

        if (
          !visibleNodeIds.has(displaySource) ||
          !visibleNodeIds.has(displayTarget)
        ) {
          return null;
        }
        // Check if edge connects to ghost nodes
        const sourceNode = layeredNodeById.get(displaySource);
        const targetNode = layeredNodeById.get(displayTarget);
        const isGhostEdge =
          (sourceNode?.data as Record<string, unknown>)?.isGhost ||
          (targetNode?.data as Record<string, unknown>)?.isGhost;
        return {
          ...edge,
          source: displaySource,
          target: displayTarget,
          data: { ...edge.data, isGhost: isGhostEdge },
        };
      })
      .filter(Boolean) as Edge[];
  }, [edges, layeredNodes, currentLayer, getLiftGhostsForLayer]);

  // Get max layer for layer panel
  const maxLayer = useMemo(() => {
    return nodes.reduce((max, node) => {
      const layer =
        ((node.data as Record<string, unknown>).layer as number) || 1;
      return Math.max(max, layer);
    }, 1);
  }, [nodes]);

  // Memoize default edge options
  const defaultEdgeOptions = useMemo(
    () => ({
      type: "custom" as const,
    }),
    [],
  );

  const CustomEdge = useMemo(() => createCustomEdge(edgeContextRef), []);

  const edgeTypesLocal = useMemo(
    () => ({
      custom: CustomEdge,
    }),
    [CustomEdge],
  );

  const CustomConnectionLine = useMemo(
    () => createCustomConnectionLine(isDraggingRef),
    [],
  );

  return (
    <Box sx={{ display: "flex", height: "100vh", width: "100vw" }}>
      {/* Sidebar - uses deferred values */}
      <Sidebar
        onAddNode={handleAddNode}
        onSelectNodesByItems={handleSelectNodesByItems}
        nodes={deferredNodes}
        edges={deferredEdges}
      />

      {/* Main Flow Area */}
      <Box sx={{ flexGrow: 1, position: "relative" }}>
        {/* Header */}
        <Suspense fallback={null}>
          <Header
            nodesCount={nodes.length}
            calcEnabled={calcEnabled}
            setCalcEnabled={setCalcEnabled}
            handleCalculate={handleCalculate}
            clearCalculation={clearCalculation}
            canStack={canStack}
            canUnstack={canUnstack}
            handleStack={handleStack}
            handleUnstack={handleUnstack}
            allCollapsed={allCollapsed}
            handleToggleAllCollapse={handleToggleAllCollapse}
            handleImport={handleImport}
            handleExport={handleExport}
            handleClearAll={handleClearAll}
            uiSettings={uiSettings}
            setUiSettings={setUiSettings}
            repoUrl={repoUrl}
          />
        </Suspense>

        <UiSettingsProvider value={uiSettings}>
          <FlowCanvas
            nodes={layeredNodes}
            edges={layeredEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypesLocal}
            defaultEdgeOptions={defaultEdgeOptions}
            connectionLineComponent={CustomConnectionLine}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            onSelectionChange={handleSelectionChange}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)}
            onEdgeMouseLeave={() => setHoveredEdgeId(null)}
            onNodeDrag={handleNodeDrag}
            onNodeDragStart={handleNodeDragStart}
            onNodeDragStop={handleNodeDragStop}
            isDragging={isDragging}
            hideMinimap={uiSettings.hideMinimap}
            nodesDraggable={!interactionLocked}
            nodesConnectable={!interactionLocked}
            elementsSelectable={!interactionLocked}
            panOnDrag={interactionLocked ? false : [1, 2]}
          />
          <ZoomControls
            reactFlowInstance={reactFlowInstance}
            interactionLocked={interactionLocked}
            setInteractionLocked={setInteractionLocked}
          />
          {selectedNodeSnapshot && (
            <Suspense fallback={null}>
              <NodeEditorPanel
                node={selectedNodeSnapshot}
                onClose={handlePaneClick}
                onDelete={handleDeleteNode}
                onDuplicate={handleDuplicateNode}
              />
            </Suspense>
          )}
          <LayerPanel
            currentLayer={currentLayer}
            maxLayer={maxLayer}
            onLayerChange={setCurrentLayer}
          />
        </UiSettingsProvider>
      </Box>
    </Box>
  );
}

// Wrap with ReactFlowProvider for useReactFlow hook
function App() {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  );
}

export default App;
