import type { EdgeTypes, NodeTypes } from "@xyflow/react";
import SimpleBuildingNode from "../components/nodes/SimpleBuildingNode";
import SimpleGroupNode from "../components/nodes/SimpleGroupNode";
import SplitterNode from "../components/nodes/SplitterNode";
import SmartSplitterNode from "../components/nodes/SmartSplitterNode";
import GoalNode from "../components/nodes/GoalNode";
import ConveyorLiftNode from "../components/nodes/ConveyorLiftNode";

export const nodeTypes: NodeTypes = {
  building: SimpleBuildingNode,
  group: SimpleGroupNode,
  splitter: SplitterNode,
  smartSplitter: SmartSplitterNode,
  goal: GoalNode,
  conveyorLift: ConveyorLiftNode,
};

export const createEdgeTypes = (customEdge: EdgeTypes[string]): EdgeTypes => ({
  custom: customEdge,
});
