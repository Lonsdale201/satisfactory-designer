import { useCallback, useRef, useEffect, useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import { calculateNodeStatuses } from '../utils/calculationUtils';
import itemsData from '../data/items.json';
import buildingsData from '../data/buildings.json';
import { Item, Building } from '../types';

const items: Item[] = itemsData.items;
const buildings: Building[] = buildingsData.buildings as Building[];

interface UseCalculationProps {
  nodesRef: React.MutableRefObject<Node[]>;
  edgesRef: React.MutableRefObject<Edge[]>;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
}

interface UseCalculationReturn {
  calcEnabled: boolean;
  setCalcEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  calcEnabledRef: React.MutableRefObject<boolean>;
  handleCalculate: () => void;
  clearCalculation: () => void;
}

export function useCalculation({
  nodesRef,
  edgesRef,
  setNodes,
}: UseCalculationProps): UseCalculationReturn {
  const [calcEnabled, setCalcEnabled] = useState(true);
  const calcEnabledRef = useRef(true);

  // Keep ref in sync with state
  useEffect(() => {
    calcEnabledRef.current = calcEnabled;
  }, [calcEnabled]);

  const handleCalculate = useCallback(() => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;

    const nodeStatuses = calculateNodeStatuses({
      nodes: currentNodes,
      edges: currentEdges,
      items,
      buildings,
    });

    const parentByChild = new Map<string, string>();
    currentNodes.forEach((node) => {
      const data = node.data as Record<string, unknown>;
      const stackedNodeIds = data.stackedNodeIds as string[] | undefined;
      if (stackedNodeIds?.length) {
        stackedNodeIds.forEach((id) => parentByChild.set(id, node.id));
      }
    });

    const nodeHasEdge = (id: string): boolean =>
      currentEdges.some((edge) => {
        const edgeData = edge.data as Record<string, unknown> | undefined;
        const sourceId = (edgeData?.virtualSourceId as string | undefined) ?? edge.source;
        const targetId = (edgeData?.virtualTargetId as string | undefined) ?? edge.target;
        return sourceId === id || targetId === id;
      });

    // Update nodes with calculated status, propagating to stacked children
    setNodes(nds => nds.map(node => {
      const data = node.data as Record<string, unknown>;
      const isStacked = data.isStacked as boolean | undefined;
      if (isStacked) {
          const parentId = parentByChild.get(node.id);
          const parentStatus = parentId ? nodeStatuses[parentId] : undefined;
          const ownStatus = nodeStatuses[node.id];
          const shouldInherit =
            parentStatus &&
            !parentStatus.disconnected &&
            !nodeHasEdge(node.id);
          const status = shouldInherit ? parentStatus : ownStatus;
          return {
            ...node,
            data: {
              ...node.data,
              calcStatus: status?.status || null,
              calcSupply: status?.supply || 0,
              calcDemand: status?.demand || 0,
              calcInputDetails: status?.inputDetails,
              storageFlow: status?.storageFlow,
              calcTerminalInputOnly:
                status?.terminalInputOnly || false,
              calcMismatchIncoming: status?.mismatchIncoming || false,
              calcMismatchOutgoing: status?.mismatchOutgoing || false,
              calcMismatchOutgoingCount:
                status?.mismatchOutgoingCount || 0,
              calcMismatchOutgoingTotal:
                status?.mismatchOutgoingTotal || 0,
              calcDisconnected: status?.disconnected || false,
            }
          };
      }

      // Normal node or stack parent
      return {
        ...node,
        data: {
          ...node.data,
          calcStatus: nodeStatuses[node.id]?.status || null,
          calcSupply: nodeStatuses[node.id]?.supply || 0,
          calcDemand: nodeStatuses[node.id]?.demand || 0,
          calcInputDetails: nodeStatuses[node.id]?.inputDetails,
          storageFlow: nodeStatuses[node.id]?.storageFlow,
          calcTerminalInputOnly:
            nodeStatuses[node.id]?.terminalInputOnly || false,
          calcMismatchIncoming: nodeStatuses[node.id]?.mismatchIncoming || false,
          calcMismatchOutgoing: nodeStatuses[node.id]?.mismatchOutgoing || false,
          calcMismatchOutgoingCount:
            nodeStatuses[node.id]?.mismatchOutgoingCount || 0,
          calcMismatchOutgoingTotal:
            nodeStatuses[node.id]?.mismatchOutgoingTotal || 0,
          calcDisconnected: nodeStatuses[node.id]?.disconnected || false,
        }
      };
    }));
  }, [nodesRef, edgesRef, setNodes]);

  const clearCalculation = useCallback(() => {
    setNodes(nds => nds.map(node => ({
      ...node,
      data: {
        ...node.data,
        calcStatus: null,
        calcSupply: 0,
        calcDemand: 0,
        storageFlow: undefined,
        calcTerminalInputOnly: false,
      },
    })));
  }, [setNodes]);

  return {
    calcEnabled,
    setCalcEnabled,
    calcEnabledRef,
    handleCalculate,
    clearCalculation,
  };
}
