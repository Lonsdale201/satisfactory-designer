import { useCallback, useMemo, useState } from 'react';
import { Node, Edge } from '@xyflow/react';

interface UseStackingLogicProps {
  nodesRef: React.MutableRefObject<Node[]>;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  getStackKey: (node: Node) => string | null;
  onStackChange?: () => void; // Called after stack/unstack to trigger recalculation
}

interface UseStackingLogicReturn {
  selectedNodesForStack: Node[];
  setSelectedNodesForStack: React.Dispatch<React.SetStateAction<Node[]>>;
  stackCandidates: Node[];
  canStack: boolean;
  canUnstack: boolean;
  handleStack: () => void;
  handleUnstack: () => void;
  handleNodeDrag: (event: unknown, node: Node) => void;
}

export function useStackingLogic({
  nodesRef,
  setNodes,
  setEdges,
  getStackKey,
  onStackChange,
}: UseStackingLogicProps): UseStackingLogicReturn {
  const [selectedNodesForStack, setSelectedNodesForStack] = useState<Node[]>([]);

  // Filter to eligible buildings for stacking
  const stackCandidates = useMemo(() => {
    return selectedNodesForStack.filter((node) => {
      if (node.type !== 'building') return false;
      const data = node.data as Record<string, unknown>;
      if (data.isGhost) return false;
      if (data.isStacked) return false;
      return true;
    });
  }, [selectedNodesForStack]);

  // Check if we can stack (2+ candidates with same buildingId)
  const canStack = useMemo(() => {
    if (stackCandidates.length < 2) return false;
    const keys = stackCandidates.map(getStackKey).filter(Boolean);
    const uniqueKeys = new Set(keys);
    return uniqueKeys.size === 1 && keys.length === stackCandidates.length;
  }, [stackCandidates, getStackKey]);

  // Check if we can unstack (1 selected node is stacked parent)
  const canUnstack = useMemo(() => {
    if (selectedNodesForStack.length !== 1) return false;
    const node = selectedNodesForStack[0];
    const data = node.data as Record<string, unknown>;
    return Boolean(data.stackCount && (data.stackCount as number) > 1);
  }, [selectedNodesForStack]);

  const handleStack = useCallback(() => {
    if (!canStack) return;

    const allNodesById = new Map(nodesRef.current.map((n) => [n.id, n]));
    const expandedIds = new Set<string>();

    // Expand any existing stacks
    stackCandidates.forEach((candidate) => {
      expandedIds.add(candidate.id);
      const data = candidate.data as Record<string, unknown>;
      const stackedNodeIds = data.stackedNodeIds as string[] | undefined;
      const stackCount = data.stackCount as number | undefined;
      if (stackCount && stackCount > 1 && stackedNodeIds) {
        stackedNodeIds.forEach((id) => expandedIds.add(id));
      }
    });

    const nodesToStack = Array.from(expandedIds)
      .map((id) => allNodesById.get(id))
      .filter(Boolean) as Node[];

    // Sort by position for consistent ordering
    nodesToStack.sort((a, b) => {
      if (a.position.y !== b.position.y) return a.position.y - b.position.y;
      return a.position.x - b.position.x;
    });

    // Use existing parent if available
    const existingParent = nodesToStack.find((n) => {
      const data = n.data as Record<string, unknown>;
      return (data.stackCount as number | undefined) && (data.stackCount as number) > 1;
    });
    const parentNode = existingParent || nodesToStack[0];

    const stackId = `stack-${Date.now()}`;
    const stackPositions = nodesToStack.reduce<Record<string, { x: number; y: number }>>((acc, node) => {
      acc[node.id] = { ...node.position };
      return acc;
    }, {});
    const stackAnchor = { ...parentNode.position };

    setNodes((nds) =>
      nds.map((node) => {
        const isInStack = nodesToStack.some((n) => n.id === node.id);
        if (!isInStack) return node;

        if (node.id === parentNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              stackId,
              stackCount: nodesToStack.length,
              stackedNodeIds: nodesToStack.map((n) => n.id),
              stackPositions,
              stackAnchor,
              stackActiveIndex: 0,
              stackActiveId: parentNode.id,
            },
            hidden: false,
            selectable: true,
            draggable: true,
            selected: true,
          };
        }

        return {
          ...node,
          data: {
            ...node.data,
            isStacked: true,
            stackId,
          },
          position: { ...parentNode.position },
          hidden: true,
          selectable: false,
          draggable: false,
          selected: false,
        };
      })
    );

    // Redirect child edges to parent, but remember the original child in edge data
    setEdges((eds) =>
      eds.map((edge) => {
        const sourceInStack = nodesToStack.some((n) => n.id === edge.source);
        const targetInStack = nodesToStack.some((n) => n.id === edge.target);
        const sourceIsChild = sourceInStack && edge.source !== parentNode.id;
        const targetIsChild = targetInStack && edge.target !== parentNode.id;

        if (!sourceIsChild && !targetIsChild) return edge;

        return {
          ...edge,
          source: sourceIsChild ? parentNode.id : edge.source,
          target: targetIsChild ? parentNode.id : edge.target,
          data: {
            ...edge.data,
            ...(sourceIsChild ? { virtualSourceId: edge.source } : {}),
            ...(targetIsChild ? { virtualTargetId: edge.target } : {}),
          },
        };
      })
    );

    setSelectedNodesForStack([parentNode]);

    // Trigger recalculation after stacking
    if (onStackChange) {
      // Use setTimeout to ensure state updates have been applied
      setTimeout(() => onStackChange(), 0);
    }
  }, [canStack, stackCandidates, nodesRef, setNodes, setEdges, onStackChange]);

  const handleUnstack = useCallback(() => {
    if (!canUnstack) return;

    const parentNode = selectedNodesForStack[0];
    const parentData = parentNode.data as Record<string, unknown>;
    const stackedNodeIds = (parentData.stackedNodeIds as string[]) || [];
    const stackPositions = parentData.stackPositions as Record<string, { x: number; y: number }> | undefined;
    const stackAnchor = parentData.stackAnchor as { x: number; y: number } | undefined;

    // Calculate position delta for restoration
    const delta = stackAnchor
      ? { x: parentNode.position.x - stackAnchor.x, y: parentNode.position.y - stackAnchor.y }
      : { x: 0, y: 0 };

    setNodes((nds) =>
      nds.map((node) => {
        if (!stackedNodeIds.includes(node.id)) return node;

        if (node.id === parentNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              stackId: undefined,
              stackCount: undefined,
              stackedNodeIds: undefined,
              stackPositions: undefined,
              stackAnchor: undefined,
              stackActiveIndex: undefined,
              stackActiveId: undefined,
            },
            hidden: false,
            selectable: true,
            draggable: true,
            selected: false,
          };
        }

        const originalPos = stackPositions?.[node.id];
        const restoredPos = originalPos
          ? { x: originalPos.x + delta.x, y: originalPos.y + delta.y }
          : node.position;

        return {
          ...node,
          data: {
            ...node.data,
            isStacked: false,
            stackId: undefined,
          },
          position: restoredPos,
          hidden: false,
          selectable: true,
          draggable: true,
          selected: false,
        };
      })
    );

    // Restore edges back to their original child endpoints
    setEdges((eds) =>
      eds.map((edge) => {
        const edgeData = edge.data as Record<string, unknown> | undefined;
        const virtualSourceId = edgeData?.virtualSourceId as string | undefined;
        const virtualTargetId = edgeData?.virtualTargetId as string | undefined;

        const restoreSource =
          edge.source === parentNode.id &&
          virtualSourceId &&
          stackedNodeIds.includes(virtualSourceId);
        const restoreTarget =
          edge.target === parentNode.id &&
          virtualTargetId &&
          stackedNodeIds.includes(virtualTargetId);

        if (!restoreSource && !restoreTarget) return edge;

        const nextData = { ...(edge.data as Record<string, unknown>) };
        if (restoreSource) delete nextData.virtualSourceId;
        if (restoreTarget) delete nextData.virtualTargetId;

        return {
          ...edge,
          source: restoreSource ? virtualSourceId : edge.source,
          target: restoreTarget ? virtualTargetId : edge.target,
          data: nextData,
        };
      })
    );

    setSelectedNodesForStack([]);

    // Trigger recalculation after unstacking
    if (onStackChange) {
      setTimeout(() => onStackChange(), 0);
    }
  }, [canUnstack, selectedNodesForStack, setNodes, setEdges, onStackChange]);

  // Sync stacked node positions during drag
  const handleNodeDrag = useCallback((_: unknown, node: Node) => {
    const data = node.data as Record<string, unknown>;
    const stackedNodeIds = data.stackedNodeIds as string[] | undefined;

    if (!data.stackId || !stackedNodeIds || stackedNodeIds.length === 0) return;

    setNodes((nds) =>
      nds.map((n) => {
        if (!stackedNodeIds.includes(n.id) || n.id === node.id) return n;
        return { ...n, position: { ...node.position } };
      })
    );
  }, [setNodes]);

  return {
    selectedNodesForStack,
    setSelectedNodesForStack,
    stackCandidates,
    canStack,
    canUnstack,
    handleStack,
    handleUnstack,
    handleNodeDrag,
  };
}
