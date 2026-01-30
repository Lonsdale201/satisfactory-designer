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
  const [calcEnabled, setCalcEnabled] = useState(false);
  const calcEnabledRef = useRef(false);

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

    // Build a map of stackId -> parent status for propagation to stacked children
    const stackParentStatus = new Map<string, { status: string | null; supply: number; demand: number }>();
    currentNodes.forEach(node => {
      const data = node.data as Record<string, unknown>;
      const stackCount = data.stackCount as number | undefined;
      const stackId = data.stackId as string | undefined;
      if (stackCount && stackCount > 1 && stackId && nodeStatuses[node.id]) {
        stackParentStatus.set(stackId, nodeStatuses[node.id]);
      }
    });

    // Update nodes with calculated status, propagating to stacked children
    setNodes(nds => nds.map(node => {
      const data = node.data as Record<string, unknown>;
      const isStacked = data.isStacked as boolean | undefined;
      const stackId = data.stackId as string | undefined;

      // If this is a stacked child, use the parent's status
      if (isStacked && stackId && stackParentStatus.has(stackId)) {
        const parentStatus = stackParentStatus.get(stackId)!;
        return {
          ...node,
          data: {
            ...node.data,
            calcStatus: parentStatus.status,
            calcSupply: parentStatus.supply,
            calcDemand: parentStatus.demand,
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
          storageFlow: nodeStatuses[node.id]?.storageFlow,
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
