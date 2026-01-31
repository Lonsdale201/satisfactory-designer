// Calculation-related types

export type CalcStatus = 'optimal' | 'under' | 'over' | null;

export interface StorageFlow {
  inRate: number;
  outRate: number;
  netRate: number;
  outDemand: number;
  canFill: boolean;
  fillMinutes: number | null;
}

export interface NodeStatus {
  status: CalcStatus;
  supply: number;
  demand: number;
  inputDetails?: Array<{ itemId: string; supply: number; demand: number }>;
  storageFlow?: StorageFlow;
  mismatchIncoming?: boolean;
  mismatchOutgoing?: boolean;
  mismatchOutgoingCount?: number;
  mismatchOutgoingTotal?: number;
  disconnected?: boolean;
}

export type NodeStatusMap = Record<string, NodeStatus>;

export interface CalculationResult {
  nodeStatuses: NodeStatusMap;
  totalProduction: number;
  totalConsumption: number;
}
