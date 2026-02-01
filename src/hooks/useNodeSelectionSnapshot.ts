import { useCallback, useEffect } from "react";
import type { Node } from "@xyflow/react";

type UseNodeSelectionSnapshotArgs = {
  selectedNodeId: string | null;
  nodes: Node[];
  layeredNodes: Node[];
  nodesRef: React.MutableRefObject<Node[]>;
  incomingItemsByNodeRef: React.MutableRefObject<Map<string, string[]>>;
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedNodeSnapshot: React.Dispatch<
    React.SetStateAction<Pick<Node, "id" | "type" | "data"> | null>
  >;
};

export const useNodeSelectionSnapshot = ({
  selectedNodeId,
  nodes,
  layeredNodes,
  nodesRef,
  incomingItemsByNodeRef,
  setSelectedNodeId,
  setSelectedNodeSnapshot,
}: UseNodeSelectionSnapshotArgs) => {
  const buildNodeSnapshot = useCallback((node: Node) => {
    const incomingItems = incomingItemsByNodeRef.current.get(node.id);
    return {
      id: node.id,
      type: node.type,
      data: incomingItems ? { ...node.data, incomingItems } : node.data,
    };
  }, [incomingItemsByNodeRef]);

  const captureNodeSnapshot = useCallback(
    (nodeId: string | null) => {
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
    },
    [buildNodeSnapshot, nodesRef, setSelectedNodeSnapshot],
  );

  useEffect(() => {
    if (!selectedNodeId) return;
    const stillExists = nodes.some((node) => node.id === selectedNodeId);
    if (!stillExists) {
      setSelectedNodeId(null);
      captureNodeSnapshot(null);
    }
  }, [nodes, selectedNodeId, captureNodeSnapshot, setSelectedNodeId]);

  useEffect(() => {
    if (!selectedNodeId) return;
    const node = layeredNodes.find((n) => n.id === selectedNodeId);
    if (!node) return;
    setSelectedNodeSnapshot(buildNodeSnapshot(node));
  }, [selectedNodeId, layeredNodes, buildNodeSnapshot, setSelectedNodeSnapshot]);

  return { buildNodeSnapshot, captureNodeSnapshot };
};
