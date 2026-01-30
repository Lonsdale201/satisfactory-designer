import { Node, Edge } from '@xyflow/react';

export interface PurityType {
  id: string;
  name: string;
  multiplier: number;
}

// Building types
export interface Building {
  id: string;
  name: string;
  icon: string;
  category: 'extraction' | 'production' | 'storage' | 'logistics';
  defaultProduction: number;
  defaultPower: number;
  productionOptions: number[];
  inputs?: number;
  inputTypes?: Array<'conveyor' | 'pipe'>;
  outputTypes?: Array<'conveyor' | 'pipe'>;
  outputPositions?: Array<'left' | 'top' | 'right' | 'bottom'>;
  inventorySize?: number;
  inventoryUnit?: string;
  fixedOutput?: string;
  outputs: string[];
}

// Item types
export interface ItemRequirement {
  item: string;
  amount: number;
}

export interface ItemRecipe {
  name?: string;
  inputs: ItemRequirement[];
  byproducts?: ItemRequirement[];
}

export interface Item {
  id: string;
  name: string;
  category: string;
  icon: string;
  stackSize?: number;
  recipes?: ItemRecipe[];
  defaultRecipeIndex?: number;
  inputCount?: number;
  defaultProduction?: number;
  producers?: string[];
  requires?: ItemRequirement[];
  alternateRequires?: ItemRequirement[][];
  alternateOutputRates?: number[];
  defaultProducer?: string;
  alternateProducers?: string[];
}

export interface BuildingNodeData {
  [key: string]: unknown;
  label: string;
  buildingId: string;
  production: number;
  customProduction: boolean;
  outputItem: string;
  powerUsage: number;
  purity?: string;
  iconUrl?: string;
  customLabel?: string;
  storedItem?: string;
  selectedRecipeIndex?: number;
  selectedAltIndex?: number | null;
  conveyorMk?: 1 | 2 | 3;
  pipeMk?: 1 | 2 | 3;
  theme?: string;
  // Stack properties
  stackId?: string;
  stackCount?: number;
  stackedNodeIds?: string[];
  stackActiveIndex?: number;
  stackActiveId?: string;
  stackPositions?: Record<string, { x: number; y: number }>;
  stackAnchor?: { x: number; y: number };
  isStacked?: boolean;
}

export interface GroupNodeData {
  [key: string]: unknown;
  label: string;
  color: string;
  summaryItems?: Array<{ id: string; name: string; count: number; rate: number }>;
  lockChildren?: boolean;
}

export interface TransportNodeData {
  [key: string]: unknown;
  label: string;
  vehicle: 'truck' | 'tractor' | 'drone';
  deliveryItem: string;
  customLabel?: string;
  conveyorMk?: 1 | 2 | 3;
  outputCount?: number;
  theme?: string;
}

export interface SplitterOutputConfig {
  item: string | null;
  conveyorMk: 1 | 2 | 3;
}

export interface SmartSplitterNodeData {
  [key: string]: unknown;
  label: string;
  customLabel?: string;
  collapsed?: boolean;
  compactMode?: boolean;
  theme?: string;
  // Split configuration for each output (left=0, top=1, right=2)
  splitOutputs: [SplitterOutputConfig, SplitterOutputConfig, SplitterOutputConfig];
}

export interface ConveyorLiftNodeData {
  [key: string]: unknown;
  label: string;
  liftMk: 1 | 2 | 3 | 4 | 5 | 6;
  direction: 'up' | 'down';
  customLabel?: string;
  collapsed?: boolean;
  theme?: string;
  layer?: number;
  targetLayer?: number;
  isLiftGhost?: boolean;
  transportingItem?: string;
}

// Custom node types
export type BuildingNode = Node<BuildingNodeData, 'building'>;
export type GroupNode = Node<GroupNodeData, 'group'>;
export type TransportNode = Node<TransportNodeData, 'transport'>;
export type SmartSplitterNode = Node<SmartSplitterNodeData, 'smartSplitter'>;
export type ConveyorLiftNode = Node<ConveyorLiftNodeData, 'conveyorLift'>;
export type AppNode = BuildingNode | GroupNode | TransportNode | SmartSplitterNode | ConveyorLiftNode;

// Edge type
export type AppEdge = Edge;

// Sidebar tabs
export type SidebarTab = 'production' | 'items' | 'energy';

// Re-export calculation types
export * from './calculation';
