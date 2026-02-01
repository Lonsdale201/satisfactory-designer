import { useEffect, useRef } from "react";
import { Node, Edge } from "@xyflow/react";

interface UseKeyboardShortcutsProps {
  nodesRef: React.MutableRefObject<Node[]>;
  edgesRef: React.MutableRefObject<Edge[]>;
  selectedEdgesRef: React.MutableRefObject<string[]>;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  handleDuplicateNodes: (nodeIds: string[]) => void;
  saveBeforeDelete?: (nodeIds: string[]) => void;
  handleUndo?: () => boolean;
}

interface UseKeyboardShortcutsReturn {
  ctrlDownRef: React.MutableRefObject<boolean>;
  copyBufferRef: React.MutableRefObject<string[]>;
}

export function useKeyboardShortcuts({
  nodesRef,
  edgesRef,
  selectedEdgesRef,
  setNodes,
  setEdges,
  handleDuplicateNodes,
  saveBeforeDelete,
  handleUndo,
}: UseKeyboardShortcutsProps): UseKeyboardShortcutsReturn {
  const ctrlDownRef = useRef(false);
  const copyBufferRef = useRef<string[]>([]);

  // Ctrl/Cmd key tracking
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Control" || event.key === "Meta") {
        ctrlDownRef.current = true;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Control" || event.key === "Meta") {
        ctrlDownRef.current = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Copy/Paste shortcuts
  useEffect(() => {
    const handleCopyPaste = (event: KeyboardEvent) => {
      const isModifier = event.ctrlKey || event.metaKey;
      if (!isModifier) return;

      const target = event.target as HTMLElement | null;
      const isEditing =
        !!target?.closest("input, textarea, [contenteditable='true'], [role='textbox']");
      if (isEditing) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "c") {
        event.preventDefault();
        copyBufferRef.current = nodesRef.current
          .filter((n) => n.selected)
          .map((n) => n.id);
      } else if (key === "v") {
        event.preventDefault();
        if (copyBufferRef.current.length > 0) {
          handleDuplicateNodes(copyBufferRef.current);
        }
      }
    };

    window.addEventListener("keydown", handleCopyPaste);
    return () => window.removeEventListener("keydown", handleCopyPaste);
  }, [handleDuplicateNodes, nodesRef]);

  // Delete/Backspace shortcut
  useEffect(() => {
    const handleDelete = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;

      const target = event.target as HTMLElement | null;
      const isEditing =
        !!target?.closest("input, textarea, [contenteditable='true'], [role='textbox']");
      if (isEditing) {
        return;
      }

      event.preventDefault();

      // Get selected items
      const selectedNodeIds = nodesRef.current
        .filter((n) => n.selected)
        .map((n) => n.id);
      const selectedEdgeIds =
        selectedEdgesRef.current.length > 0
          ? selectedEdgesRef.current
          : edgesRef.current.filter((e) => e.selected).map((e) => e.id);

      if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) return;

      // Expand stacked nodes to include children
      const expandedNodeIds = new Set(selectedNodeIds);
      nodesRef.current.forEach((node) => {
        if (!selectedNodeIds.includes(node.id)) return;
        const data = node.data as Record<string, unknown>;
        const stackedNodeIds = data.stackedNodeIds as string[] | undefined;
        if (stackedNodeIds) {
          stackedNodeIds.forEach((id) => expandedNodeIds.add(id));
        }
      });

      // Delete nodes
      if (expandedNodeIds.size > 0) {
        // Save nodes before deletion for undo
        if (saveBeforeDelete) {
          saveBeforeDelete(Array.from(expandedNodeIds));
        }
        setNodes((nds) => nds.filter((node) => !expandedNodeIds.has(node.id)));
        setEdges((eds) =>
          eds.filter(
            (edge) =>
              !expandedNodeIds.has(edge.source) &&
              !expandedNodeIds.has(edge.target),
          ),
        );
      }

      // Delete edges
      if (selectedEdgeIds.length > 0) {
        setEdges((eds) =>
          eds.filter((edge) => !selectedEdgeIds.includes(edge.id)),
        );
      }
    };

    window.addEventListener("keydown", handleDelete);
    return () => window.removeEventListener("keydown", handleDelete);
  }, [
    nodesRef,
    edgesRef,
    selectedEdgesRef,
    setNodes,
    setEdges,
    saveBeforeDelete,
  ]);

  // Rotate handle positions (R)
  useEffect(() => {
    const handleRotate = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "r") return;

      const target = event.target as HTMLElement | null;
      const isEditing =
        !!target?.closest("input, textarea, [contenteditable='true'], [role='textbox']");
      if (isEditing) {
        return;
      }

      const hasSelection = nodesRef.current.some((node) => node.selected);
      if (!hasSelection) return;

      event.preventDefault();

      setNodes((nds) =>
        nds.map((node) => {
          if (!node.selected) return node;
          const current =
            (node.data as Record<string, unknown>).handleRotation as number | undefined;
          const nextRotation = ((current ?? 0) + 1) % 4;
          return {
            ...node,
            data: {
              ...node.data,
              handleRotation: nextRotation,
            },
          };
        }),
      );
    };

    window.addEventListener("keydown", handleRotate);
    return () => window.removeEventListener("keydown", handleRotate);
  }, [nodesRef, setNodes]);

  // Undo shortcut (Ctrl+Z / Cmd+Z)
  useEffect(() => {
    const handleUndoShortcut = (event: KeyboardEvent) => {
      const isModifier = event.ctrlKey || event.metaKey;
      if (!isModifier || event.key.toLowerCase() !== "z") return;

      // Don't trigger in input fields
      const target = event.target as HTMLElement | null;
      const isEditing =
        !!target?.closest("input, textarea, [contenteditable='true'], [role='textbox']");
      if (isEditing) {
        return;
      }

      // Don't handle Ctrl+Shift+Z (redo) here
      if (event.shiftKey) return;

      event.preventDefault();
      if (handleUndo) {
        handleUndo();
      }
    };

    window.addEventListener("keydown", handleUndoShortcut);
    return () => window.removeEventListener("keydown", handleUndoShortcut);
  }, [handleUndo]);

  return {
    ctrlDownRef,
    copyBufferRef,
  };
}
