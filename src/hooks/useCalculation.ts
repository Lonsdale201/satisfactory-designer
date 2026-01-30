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

    // Update nodes with calculated status, propagating to stacked children
    setNodes(nds => nds.map(node => {
      const data = node.data as Record<string, unknown>;
      const isStacked = data.isStacked as boolean | undefined;
      if (isStacked) {
          return {
            ...node,
            data: {
              ...node.data,
              calcStatus: nodeStatuses[node.id]?.status || null,
              calcSupply: nodeStatuses[node.id]?.supply || 0,
              calcDemand: nodeStatuses[node.id]?.demand || 0,
              storageFlow: nodeStatuses[node.id]?.storageFlow,
              calcMismatchIncoming: nodeStatuses[node.id]?.mismatchIncoming || false,
              calcMismatchOutgoing: nodeStatuses[node.id]?.mismatchOutgoing || false,
              calcDisconnected: nodeStatuses[node.id]?.disconnected || false,
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
          calcMismatchIncoming: nodeStatuses[node.id]?.mismatchIncoming || false,
          calcMismatchOutgoing: nodeStatuses[node.id]?.mismatchOutgoing || false,
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
