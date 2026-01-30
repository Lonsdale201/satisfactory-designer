// Production and transport rate constants for Satisfactory

export const CONVEYOR_RATES = {
  1: 60,   // Mk.1
  2: 120,  // Mk.2
  3: 270,  // Mk.3
  4: 480,  // Mk.4
  5: 780,  // Mk.5
  6: 1200, // Mk.6
} as const;

export const PIPE_RATES = {
  1: 300,  // Mk.1 - 300 m³/min
  2: 600,  // Mk.2 - 600 m³/min
} as const;

export const PURITY_RATES = {
  impure: 30,
  normal: 60,
  pure: 120,
} as const;

export const MINER_MULTIPLIERS = {
  miner_mk1: 1,
  miner_mk2: 2,
  miner_mk3: 4,
} as const;

// Type exports for type-safe access
export type ConveyorMk = keyof typeof CONVEYOR_RATES;
export type PipeMk = keyof typeof PIPE_RATES;
export type PurityLevel = keyof typeof PURITY_RATES;
export type MinerType = keyof typeof MINER_MULTIPLIERS;
