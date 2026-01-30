import { useCallback, useRef } from "react";
import { Node, Edge } from "@xyflow/react";

interface DeletedNodeEntry {
  nodes: Node[];
  connectedEdges: Edge[];
  timestamp: number;
}

interface UseUndoStackProps {
  nodesRef: React.MutableRefObject<Node[]>;
  edgesRef: React.MutableRefObject<Edge[]>;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}

interface UseUndoStackReturn {
  saveBeforeDelete: (nodeIds: string[]) => void;
  handleUndo: () => boolean;
  canUndo: () => boolean;
}

const MAX_UNDO_STACK_SIZE = 2;

export function useUndoStack({
  nodesRef,
  edgesRef,
  setNodes,
  setEdges,
}: UseUndoStackProps): UseUndoStackReturn {
  const undoStackRef = useRef<DeletedNodeEntry[]>([]);

  // Save nodes and their connected edges before deletion
  const saveBeforeDelete = useCallback(
    (nodeIds: string[]) => {
      if (nodeIds.length === 0) return;

      const nodesToSave = nodesRef.current.filter((node) =>
        nodeIds.includes(node.id),
      );
      if (nodesToSave.length === 0) return;

      // Find all edges connected to these nodes
      const nodeIdSet = new Set(nodeIds);
      const connectedEdges = edgesRef.current.filter(
        (edge) => nodeIdSet.has(edge.source) || nodeIdSet.has(edge.target),
      );

      const entry: DeletedNodeEntry = {
        nodes: nodesToSave.map((node) => ({ ...node })), // Deep copy
        connectedEdges: connectedEdges.map((edge) => ({ ...edge })), // Deep copy
        timestamp: Date.now(),
      };

      undoStackRef.current.push(entry);

      // Keep only the last N entries
      if (undoStackRef.current.length > MAX_UNDO_STACK_SIZE) {
        undoStackRef.current.shift();
      }
    },
    [nodesRef, edgesRef],
  );

  // Restore the last deleted nodes
  const handleUndo = useCallback((): boolean => {
    const lastEntry = undoStackRef.current.pop();
    if (!lastEntry) return false;

    // Restore nodes
    setNodes((nds) => {
      // Avoid duplicates
      const existingIds = new Set(nds.map((n) => n.id));
      const newNodes = lastEntry.nodes.filter((n) => !existingIds.has(n.id));
      return [...nds, ...newNodes];
    });

    // Restore edges (only those that don't already exist)
    setEdges((eds) => {
      const existingIds = new Set(eds.map((e) => e.id));
      const newEdges = lastEntry.connectedEdges.filter(
        (e) => !existingIds.has(e.id),
      );
      return [...eds, ...newEdges];
    });

    return true;
  }, [setNodes, setEdges]);

  const canUndo = useCallback((): boolean => {
    return undoStackRef.current.length > 0;
  }, []);

  return {
    saveBeforeDelete,
    handleUndo,
    canUndo,
  };
}
