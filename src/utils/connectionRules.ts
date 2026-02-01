import type { Edge, IsValidConnection, Node } from "@xyflow/react";
import buildingsData from "../data/buildings.json";

const resolveLiftGhostId = (
  nodeId: string | null | undefined,
): string | null | undefined => {
  if (!nodeId) return nodeId;
  if (nodeId.endsWith("-lift-ghost")) {
    return nodeId.replace("-lift-ghost", "");
  }
  return nodeId;
};

type CreateConnectionRulesArgs = {
  edgesRef: React.MutableRefObject<Edge[]>;
  nodesRef: React.MutableRefObject<Node[]>;
};

export const createConnectionRules = ({
  edgesRef,
  nodesRef,
}: CreateConnectionRulesArgs): IsValidConnection<Edge> => {
  return (connection) => {
    const sourceId = resolveLiftGhostId(connection.source);
    const targetId = resolveLiftGhostId(connection.target);
    if (targetId) {
      const targetNode = nodesRef.current.find((n) => n.id === targetId);
      if (targetNode?.type === "building") {
        const targetData = targetNode.data as Record<string, unknown>;
        const targetBuildingId = targetData.buildingId as string | undefined;
        const targetBuilding = buildingsData.buildings.find(
          (b) => b.id === targetBuildingId,
        );
        if (targetBuilding?.category === "storage") {
          const targetHandle = connection.targetHandle ?? null;
          if (!targetHandle) return false;
          const targetHandleInUse = edgesRef.current.some((edge) => {
            const virtualTargetId = (edge.data as Record<string, unknown> | undefined)
              ?.virtualTargetId as string | undefined;
            const edgeTargetId = virtualTargetId || edge.target;
            return edgeTargetId === targetId && edge.targetHandle === targetHandle;
          });
          if (targetHandleInUse) return false;
        }
      }
    }

    if (!sourceId) return true;
    const sourceNode = nodesRef.current.find((n) => n.id === sourceId);
    if (sourceNode?.type !== "splitter") return true;
    const sourceHandle = connection.sourceHandle ?? null;
    if (!sourceHandle) return false;
    const handleInUse = edgesRef.current.some((edge) => {
      const virtualSourceId = (edge.data as Record<string, unknown> | undefined)
        ?.virtualSourceId as string | undefined;
      const edgeSourceId = virtualSourceId || edge.source;
      return edgeSourceId === sourceId && edge.sourceHandle === sourceHandle;
    });
    if (handleInUse) return false;

    return true;
  };
};
