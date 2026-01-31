import { useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';

export type NodeType = 'building' | 'group' | 'smartSplitter' | 'goal' | 'conveyorLift';

interface UseNodeOperationsProps {
  nodeIdCounter: number;
  currentLayer: number;
  nodesRef: React.MutableRefObject<Node[]>;
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setNodeIdCounter: React.Dispatch<React.SetStateAction<number>>;
}

interface UseNodeOperationsReturn {
  handleAddNode: (
    type: NodeType,
    data?: Partial<Record<string, unknown>>,
    position?: { x: number; y: number }
  ) => void;
  handleDeleteNode: (nodeId: string) => void;
  handleDuplicateNode: (nodeId: string) => void;
  handleDuplicateNodes: (nodeIds: string[]) => void;
}

// Default node data factories
function createGroupNodeData(currentLayer: number) {
  return {
    label: 'Production line',
    color: '#0ea5e9',
    summaryItems: [],
    totalPower: 0,
    targetPower: 0,
    lockChildren: true,
    layer: currentLayer,
  };
}


function createSmartSplitterNodeData(currentLayer: number) {
  return {
    label: 'Smart Splitter',
    customLabel: '',
    collapsed: false,
    compactMode: false,
    theme: '',
    splitOutputs: [
      { item: null, conveyorMk: 1 },
      { item: null, conveyorMk: 1 },
      { item: null, conveyorMk: 1 },
    ],
    layer: currentLayer,
  };
}

function createGoalNodeData(currentLayer: number, data?: Partial<Record<string, unknown>>) {
  return {
    itemId: (data?.itemId as string) || 'smart_plating',
    targetRate: (data?.targetRate as number) || 2,
    customLabel: '',
    collapsed: false,
    layer: currentLayer,
  };
}

function createConveyorLiftNodeData(currentLayer: number, data?: Partial<Record<string, unknown>>) {
  const direction = (data?.direction as 'up' | 'down') || 'up';
  const targetLayer = direction === 'up' ? currentLayer + 1 : currentLayer - 1;
  return {
    label: 'Conveyor Lift',
    liftMk: (data?.liftMk as 1 | 2 | 3 | 4 | 5 | 6) || 1,
    direction,
    customLabel: '',
    collapsed: false,
    theme: (data?.theme as string) || 'cyan',
    layer: currentLayer,
    targetLayer: Math.max(1, targetLayer),
    transportingItem: '',
  };
}

function createBuildingNodeData(currentLayer: number, data?: Partial<Record<string, unknown>>) {
  return {
    label: 'Building',
    buildingId: (data?.buildingId as string) || '',
    production: (data?.production as number) || 30,
    customProduction: false,
    outputItem: (data?.outputItem as string) || '',
    powerUsage: (data?.powerUsage as number) || 4,
    purity: (data?.purity as string) || '',
    iconUrl: (data?.iconUrl as string) || '',
    customLabel: '',
    storedItem: '',
    selectedRecipeIndex: 0,
    selectedAltIndex: null,
    conveyorMk: 1,
    pipeMk: 1,
    theme: (data?.theme as string) || '',
    showIo: (data?.showIo as boolean) ?? true,
    collapsed: false,
    hasInput: true,
    hasOutput: true,
    inputCount: (data?.inputCount as number) ?? 1,
    layer: currentLayer,
  };
}

export function useNodeOperations({
  nodeIdCounter,
  currentLayer,
  nodesRef,
  edges,
  setNodes,
  setEdges,
  setNodeIdCounter,
}: UseNodeOperationsProps): UseNodeOperationsReturn {

  const handleAddNode = useCallback(
    (type: NodeType, data?: Partial<Record<string, unknown>>, position?: { x: number; y: number }) => {
      const id = `${type}-${nodeIdCounter}`;

      let nodeData: Record<string, unknown>;
      switch (type) {
        case 'group':
          nodeData = createGroupNodeData(currentLayer);
          break;
        case 'smartSplitter':
          nodeData = createSmartSplitterNodeData(currentLayer);
          break;
        case 'goal':
          nodeData = createGoalNodeData(currentLayer, data);
          break;
        case 'conveyorLift':
          nodeData = createConveyorLiftNodeData(currentLayer, data);
          break;
        default:
          nodeData = createBuildingNodeData(currentLayer, data);
      }

      const newNode: Node = {
        id,
        type,
        position: position || {
          x: 350 + Math.random() * 200,
          y: 100 + Math.random() * 300,
        },
        data: nodeData,
        ...(type === 'group' ? { style: { width: 360, height: 220 } } : {}),
      };

      setNodes((nds) => [...nds, newNode]);
      setNodeIdCounter((c) => c + 1);
    },
    [nodeIdCounter, setNodes, currentLayer, setNodeIdCounter]
  );

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  }, [setNodes, setEdges]);

  const handleDuplicateNode = useCallback((nodeId: string) => {
    const sourceNode = nodesRef.current.find((node) => node.id === nodeId);
    if (!sourceNode) return;

    const newId = `${sourceNode.type}-${nodeIdCounter}`;
    const offset = 50;

    const newNode: Node = {
      ...sourceNode,
      id: newId,
      position: {
        x: sourceNode.position.x + offset,
        y: sourceNode.position.y + offset,
      },
      selected: false,
    };

    const incomingEdges = edges.filter((edge) => edge.target === nodeId);
    const newEdges: Edge[] = incomingEdges.map((edge, index) => ({
      ...edge,
      id: `edge-${newId}-${index}-${Date.now()}`,
      target: newId,
      data: {
        ...(edge.data || {}),
        virtualTargetId:
          (edge.data as Record<string, unknown> | undefined)?.virtualTargetId ===
          nodeId
            ? newId
            : (edge.data as Record<string, unknown> | undefined)?.virtualTargetId,
      },
    }));

    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [...eds, ...newEdges]);
    setNodeIdCounter((c) => c + 1);
    window.dispatchEvent(new CustomEvent("forceRecalculate"));
  }, [nodeIdCounter, edges, setNodes, setEdges, nodesRef, setNodeIdCounter]);

  const handleDuplicateNodes = useCallback((nodeIds: string[]) => {
    if (nodeIds.length === 0) return;

    let counter = nodeIdCounter;
    const createdNodes: Node[] = [];
    const createdEdges: Edge[] = [];

    nodeIds.forEach((nodeId, index) => {
      const sourceNode = nodesRef.current.find((node) => node.id === nodeId);
      if (!sourceNode) return;

      const newId = `${sourceNode.type}-${counter}`;
      counter += 1;
      const offset = 40 + (index * 10);

      createdNodes.push({
        ...sourceNode,
        id: newId,
        position: {
          x: sourceNode.position.x + offset,
          y: sourceNode.position.y + offset,
        },
        selected: false,
      });

      const incomingEdges = edges.filter((edge) => edge.target === nodeId);
      incomingEdges.forEach((edge, idx) => {
        createdEdges.push({
          ...edge,
          id: `edge-${newId}-${idx}-${Date.now()}-${counter}`,
          target: newId,
          data: {
            ...(edge.data || {}),
            virtualTargetId:
              (edge.data as Record<string, unknown> | undefined)?.virtualTargetId ===
              nodeId
                ? newId
                : (edge.data as Record<string, unknown> | undefined)?.virtualTargetId,
          },
        });
      });
    });

    if (createdNodes.length > 0) {
      setNodes((nds) => [...nds, ...createdNodes]);
      setEdges((eds) => [...eds, ...createdEdges]);
      setNodeIdCounter(counter);
      window.dispatchEvent(new CustomEvent("forceRecalculate"));
    }
  }, [nodeIdCounter, edges, setNodes, setEdges, nodesRef, setNodeIdCounter]);

  return {
    handleAddNode,
    handleDeleteNode,
    handleDuplicateNode,
    handleDuplicateNodes,
  };
}
