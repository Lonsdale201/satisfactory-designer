import { useCallback, useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';

interface UseConveyorLiftLogicProps {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
}

interface LiftGhostInfo {
  originalNodeId: string;
  ghostLayer: number;
  direction: 'up' | 'down';
}

export function useConveyorLiftLogic({
  nodes,
  edges,
  setNodes,
}: UseConveyorLiftLogicProps) {
  // Find all lift nodes and determine their ghost layers
  const liftGhostMap = useMemo(() => {
    const map = new Map<string, LiftGhostInfo>();

    nodes.forEach((node) => {
      if (node.type !== 'conveyorLift') return;

      const data = node.data as Record<string, unknown>;
      const nodeLayer = (data.layer as number) || 1;
      const direction = (data.direction as 'up' | 'down') || 'up';
      const targetLayer = direction === 'up' ? nodeLayer + 1 : nodeLayer - 1;

      // Only create ghost for valid target layers (>= 1)
      if (targetLayer >= 1) {
        const ghostId = `${node.id}-lift-ghost`;
        map.set(ghostId, {
          originalNodeId: node.id,
          ghostLayer: targetLayer,
          direction,
        });
      }
    });

    return map;
  }, [nodes]);

  // Check if a node ID is a lift ghost
  const isLiftGhost = useCallback((nodeId: string) => {
    return liftGhostMap.has(nodeId);
  }, [liftGhostMap]);

  // Get the original lift node ID from a ghost ID
  const getOriginalLiftId = useCallback((ghostId: string) => {
    return liftGhostMap.get(ghostId)?.originalNodeId ?? null;
  }, [liftGhostMap]);

  // Get lift nodes that should appear as ghosts on the current layer
  const getLiftGhostsForLayer = useCallback((layer: number) => {
    const ghosts: Array<{ originalNode: Node; ghostInfo: LiftGhostInfo; ghostId: string }> = [];

    liftGhostMap.forEach((info, ghostId) => {
      if (info.ghostLayer === layer) {
        const originalNode = nodes.find((n) => n.id === info.originalNodeId);
        if (originalNode) {
          ghosts.push({ originalNode, ghostInfo: info, ghostId });
        }
      }
    });

    return ghosts;
  }, [liftGhostMap, nodes]);

  // Handle position sync from ghost to original node
  const syncGhostPosition = useCallback((ghostId: string, newPosition: { x: number; y: number }) => {
    const info = liftGhostMap.get(ghostId);
    if (!info) return;

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === info.originalNodeId) {
          return { ...node, position: newPosition };
        }
        return node;
      })
    );
  }, [liftGhostMap, setNodes]);

  // Update direction of a lift (recalculates target layer)
  const updateLiftDirection = useCallback((nodeId: string, newDirection: 'up' | 'down') => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId && node.type === 'conveyorLift') {
          const data = node.data as Record<string, unknown>;
          const nodeLayer = (data.layer as number) || 1;
          const newTargetLayer = newDirection === 'up' ? nodeLayer + 1 : Math.max(1, nodeLayer - 1);

          return {
            ...node,
            data: {
              ...node.data,
              direction: newDirection,
              targetLayer: newTargetLayer,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Get edges that cross layers via lifts
  const getCrossLayerEdges = useMemo(() => {
    const crossLayerEdges: Edge[] = [];

    edges.forEach((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);

      if (!sourceNode || !targetNode) return;

      const sourceData = sourceNode.data as Record<string, unknown>;
      const targetData = targetNode.data as Record<string, unknown>;
      const sourceLayer = (sourceData.layer as number) || 1;
      const targetLayer = (targetData.layer as number) || 1;

      // Check if this edge involves a lift and crosses layers
      if (sourceNode.type === 'conveyorLift' || targetNode.type === 'conveyorLift') {
        if (sourceLayer !== targetLayer) {
          crossLayerEdges.push(edge);
        }
      }
    });

    return crossLayerEdges;
  }, [edges, nodes]);

  return {
    liftGhostMap,
    isLiftGhost,
    getOriginalLiftId,
    getLiftGhostsForLayer,
    syncGhostPosition,
    updateLiftDirection,
    getCrossLayerEdges,
  };
}
