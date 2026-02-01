import { useMemo } from "react";
import type { Edge, Node } from "@xyflow/react";

type LiftGhostInfo = {
  originalNode: Node;
  ghostId: string;
};

type UseLayeredEdgesArgs = {
  edges: Edge[];
  layeredNodes: Node[];
  currentLayer: number;
  getLiftGhostsForLayer: (layer: number) => LiftGhostInfo[];
};

export const useLayeredEdges = ({
  edges,
  layeredNodes,
  currentLayer,
  getLiftGhostsForLayer,
}: UseLayeredEdgesArgs) =>
  useMemo(() => {
    const visibleNodeIds = new Set(layeredNodes.map((n) => n.id));
    const layeredNodeById = new Map(layeredNodes.map((n) => [n.id, n]));
    const liftGhosts = getLiftGhostsForLayer(currentLayer);
    const ghostIdByOriginal = new Map<string, string>();
    liftGhosts.forEach(({ originalNode, ghostId }) => {
      ghostIdByOriginal.set(originalNode.id, ghostId);
    });

    return edges
      .map((edge) => {
        let displaySource = edge.source;
        let displayTarget = edge.target;

        const sourceGhostId = ghostIdByOriginal.get(edge.source);
        const targetGhostId = ghostIdByOriginal.get(edge.target);

        if (
          sourceGhostId &&
          !visibleNodeIds.has(edge.source) &&
          visibleNodeIds.has(sourceGhostId)
        ) {
          displaySource = sourceGhostId;
        }
        if (
          targetGhostId &&
          !visibleNodeIds.has(edge.target) &&
          visibleNodeIds.has(targetGhostId)
        ) {
          displayTarget = targetGhostId;
        }

        if (!visibleNodeIds.has(displaySource) || !visibleNodeIds.has(displayTarget)) {
          return null;
        }
        // Check if edge connects to ghost nodes
        const sourceNode = layeredNodeById.get(displaySource);
        const targetNode = layeredNodeById.get(displayTarget);
        const isGhostEdge =
          (sourceNode?.data as Record<string, unknown>)?.isGhost ||
          (targetNode?.data as Record<string, unknown>)?.isGhost;
        return {
          ...edge,
          source: displaySource,
          target: displayTarget,
          data: { ...edge.data, isGhost: isGhostEdge },
        };
      })
      .filter(Boolean) as Edge[];
  }, [edges, layeredNodes, currentLayer, getLiftGhostsForLayer]);
