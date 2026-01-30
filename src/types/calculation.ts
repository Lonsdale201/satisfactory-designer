// Calculation-related types

export type CalcStatus = 'optimal' | 'under' | 'over' | null;

export interface NodeStatus {
  status: CalcStatus;
  supply: number;
  demand: number;
}

export type NodeStatusMap = Record<string, NodeStatus>;

export interface CalculationResult {
  nodeStatuses: NodeStatusMap;
  totalProduction: number;
  totalConsumption: number;
}
