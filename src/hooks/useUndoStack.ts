import { useCallback, useRef } from "react";
import { Node, Edge } from "@xyflow/react";

type UndoEntry =
  | {
      type: "delete";
      nodes: Node[];
      connectedEdges: Edge[];
      timestamp: number;
    }
  | {
      type: "snapshot";
      nodes: Node[];
      connectedEdges: Edge[];
      timestamp: number;
    }
  | {
      type: "add";
      nodeIds: string[];
      edgeIds: string[];
      timestamp: number;
    };

interface UseUndoStackProps {
  nodesRef: React.MutableRefObject<Node[]>;
  edgesRef: React.MutableRefObject<Edge[]>;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}

interface UseUndoStackReturn {
  saveBeforeDelete: (nodeIds: string[]) => void;
  saveAfterAdd: (nodeIds: string[], edgeIds: string[]) => void;
  saveSnapshot: () => void;
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
  const undoStackRef = useRef<UndoEntry[]>([]);

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

      const entry: UndoEntry = {
        type: "delete",
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

  const saveAfterAdd = useCallback((nodeIds: string[], edgeIds: string[]) => {
    if (nodeIds.length === 0 && edgeIds.length === 0) return;
    undoStackRef.current.push({
      type: "add",
      nodeIds: [...nodeIds],
      edgeIds: [...edgeIds],
      timestamp: Date.now(),
    });

    if (undoStackRef.current.length > MAX_UNDO_STACK_SIZE) {
      undoStackRef.current.shift();
    }
  }, []);

  const saveSnapshot = useCallback(() => {
    const nodes = nodesRef.current.map((node) => ({ ...node }));
    const edges = edgesRef.current.map((edge) => ({ ...edge }));
    undoStackRef.current.push({
      type: "snapshot",
      nodes,
      connectedEdges: edges,
      timestamp: Date.now(),
    });

    if (undoStackRef.current.length > MAX_UNDO_STACK_SIZE) {
      undoStackRef.current.shift();
    }
  }, [nodesRef, edgesRef]);

  // Restore the last deleted nodes
  const handleUndo = useCallback((): boolean => {
    const lastEntry = undoStackRef.current.pop();
    if (!lastEntry) return false;

    if (lastEntry.type === "delete") {
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
    }

    if (lastEntry.type === "snapshot") {
      setNodes(lastEntry.nodes);
      setEdges(lastEntry.connectedEdges);
      return true;
    }

    // Undo added nodes/edges
    const removeNodeIds = new Set(lastEntry.nodeIds);
    const removeEdgeIds = new Set(lastEntry.edgeIds);
    setNodes((nds) => nds.filter((n) => !removeNodeIds.has(n.id)));
    setEdges((eds) =>
      eds.filter(
        (e) =>
          !removeEdgeIds.has(e.id) &&
          !removeNodeIds.has(e.source) &&
          !removeNodeIds.has(e.target),
      ),
    );

    return true;
  }, [setNodes, setEdges]);

  const canUndo = useCallback((): boolean => {
    return undoStackRef.current.length > 0;
  }, []);

  return {
    saveBeforeDelete,
    saveAfterAdd,
    saveSnapshot,
    handleUndo,
    canUndo,
  };
}
