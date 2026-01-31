# Satisfactory Designer

A factory planning system for the game Satisfactory.

## **[Launch the Planner](https://lonsdale201.github.io/satisfactory-designer/)**

> **Note:** This system is under heavy development. Expect bugs, incomplete data, and inconsistent behavior.

For bug reports or feature requests, please use the [Issues](https://github.com/Lonsdale201/satisfactory-designer/issues) section.

---

## Features

### Connectors
Connectors link nodes together. Each connector represents a transport unit: **Conveyor** or **Pipe**, marked with yellow and blue colors respectively.

### Building Nodes
Every node that represents a building or production unit (non-special) has settings to select:
- Output type
- Production speed (Conveyor or Pipe)

### Extractors (No Resource Node Needed)
- Miners, Oil Extractor, Water Extractor, and Resource Well Extractor are **sources**
- Purity is selected directly on the extractor (where applicable)
- Production values are calculated from the extractor's purity and speed

### Common Node Settings
- **Expanded:** Toggle off to collapse the node, showing only the header
- **Custom Name:** Override the default name with your own
- **Theme:** Change the node color for visual distinction between different resource or production lines

---

## Calculator System

Calculators work directly from extractors and connected production lines - **no Resource Node required**.

> **Warning:** The calculation system is heavily in development. Do not rely on it 100% for final planning decisions.

Calculators take into account:
- Node type
- Extractor tier and purity (where applicable)
- Outgoing connector type (Conveyor or Pipe)

### Calculator Indicators

| Status | Color | Description |
|--------|-------|-------------|
| **Underproduction** | Red | The extractor cannot supply enough raw materials to the unit |
| **Optimal** | Green | The production unit receives exactly the amount it can fully utilize |
| **Overproduction** | Yellow | More raw material is extracted than a single producer can process |

### Production Lists
- Each production building shows only relevant items it can produce (database still being populated)
- Production units display required items for crafting, and the node indicates when all relevant items are connected

### Planning Style
This planner currently supports **manifold** layouts better than **load balancers**. Balancer-style planning is not the focus yet.

### Node Information Display
Nodes can show:
- Power consumption
- Incoming and outgoing material quantities

---

## Multi-Level Planning

The planner supports multiple levels, allowing you to plan across different floors.

When switching levels:
- Nodes from the level below remain visible as **Ghost nodes**
- Ghost nodes cannot be moved (you're not on that level)
- **Exception:** Conveyor Lifts can be moved and are the only nodes that can transfer flow between levels (up or down)

---

## Node Stacking

Multiple identical nodes (e.g., Smelters) can be **stacked** to save space. Stacks can be unstacked at any time.

How to stack:
1. Hold **Ctrl** (or the Mac equivalent) and select identical nodes (e.g., 3 Smelters).
2. A blue **Stack** icon appears in the header next to the calculation button -- click it.
3. To unstack, click the stacked node and use the same **Stack** icon in the header.

### Stack Rules
- Must be the same building type
- Must have the same outgoing belt/pipe type
- Changing one updates all in the stack automatically
- Production can be set to different items within the stack

---

## Prod Line Node (Production Line Groups)

A grouping system for organizing your factory:
1. Create a Prod Line node
2. Drag and drop nodes into it
3. Use the **Summary** button for detailed statistics (not fully complete yet)

> **Beta:** This feature is still in early development. More calculations and stats will be added later.

### Group Behavior
- Moving the group moves all contained nodes together
- Nodes cannot be removed from the group until you unlock the **Lock** system

---

## Getting Started (Developers)

After forking or cloning the repo:

1. Install dependencies:
   - `npm install`
2. Start the dev server:
   - `npm run dev`
3. Build for production:
   - `npm run build`

---

## Developer Notes

### Tech stack
- Vite + React + TypeScript
- React Flow for the node editor

### Data "database" (JSON)
Main data lives in:
- `src/data/items.json`
- `src/data/buildings.json`

**Items** typically include:
- `id`, `name`, `category`, `stackSize`
- `producers` (building ids that can make it)
- `defaultProduction` and optional `recipes` / `byproducts`
- `alternateRequires` + `alternateOutputRates` for alternate recipes

**Buildings** typically include:
- `id`, `name`, `category` (extraction, production, storage, etc.)
- `inputs` / `outputs` counts
- `inputTypes` / `outputTypes` (conveyor or pipe)
- `defaultProduction`, `defaultPower`
- storage fields like `inventorySize` and `inventoryUnit`

### Recipe handling (high level)
- The active recipe is picked from the item `recipes` list.
- Default recipe index is used unless a specific recipe is selected on the node.
- Alternate recipes are stored on the item (`alternateRequires`, `alternateOutputRates`)
  and activated via `selectedAltIndex`.
- Byproducts are stored in the recipe and used for output + pipe logic.

### Calculation flow
- Core logic lives in `src/utils/calculationUtils.ts`.
- `useCalculation` triggers recalculation and writes results into node data
  (status, supply/demand, storage flow, mismatch flags).

### Node UI
- Building node UI: `src/components/nodes/SimpleBuildingNode.tsx`
- Group (Prod Line) node UI: `src/components/nodes/SimpleGroupNode.tsx`
- Smart Splitter UI: `src/components/nodes/SmartSplitterNode.tsx`

### Node schema (saved state)
Nodes are persisted as JSON objects (React Flow format). A simplified example:

```json
{
  "id": "building-12",
  "type": "building",
  "position": { "x": 520, "y": 340 },
  "data": {
    "buildingId": "smelter",
    "outputItem": "iron_ingot",
    "production": 30,
    "conveyorMk": 1,
    "pipeMk": 1,
    "theme": "orange",
    "customLabel": "",
    "showIo": true
  }
}
```

Edges are also stored as JSON and include `source`, `target`, handles, and
optional `data` (label, material, itemId, virtualSourceId/virtualTargetId).

