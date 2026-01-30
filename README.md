# Satisfactory Designer

A factory planning system for the game Satisfactory.

## **[Launch the Planner](https://lonsdale201.github.io/satisfactory-designer/)**

> **Note:** This system is under heavy development. Expect bugs, incomplete database, and inconsistent behavior!

For bug reports or feature requests, please use the [Issues](https://github.com/Lonsdale201/satisfactory-designer/issues) section.

---

## Features

### Resource Node
- Set the raw material type and node purity (Impure, Normal, Pure)
- The system automatically calculates default production values based on purity
- Connectors automatically adapt to the resource type (yellow for solids, blue for liquids)

### Connectors
Connectors link nodes together. Each connector represents a transport unit: **Conveyor** or **Pipe**, marked with yellow and blue colors respectively.

> **Note:** Currently, pipe connector color is yellow. This is still under development to differentiate from conveyors, but connector markers already indicate the type by color.

### Building Nodes
Every node that represents a building or production unit (non-special) has settings to select:
- Output type
- Speed (Conveyor or Pipe)

### Common Node Settings
- **Expanded:** Toggle off to collapse the node, showing only the header
- **Custom Name:** Override the default name with your own
- **Theme:** Change the node color for visual distinction between different resource or production lines

---

## Calculator System

The calculator requires the flow to start from a Resource Node. Until a resource node is connected to an extractor, calculators won't work with correct values.

Calculators take into account:
- Node type
- Extractor tier (Mk1, etc.)
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

### Stack Rules
- Stacks distribute transport evenly
- Must be the same building type
- Must have the same outgoing belt/pipe type
- Changing one updates all in the stack automatically
- Production can be set to different items within the stack

> **Note:** Calculators are not yet 100% accurate with the stacking system. This is under development.

---

## Prod Line Node (Production Line Groups)

A grouping system for organizing your factory:
1. Create a Prod Line node
2. Drag and drop nodes into it
3. Use the **Summary** button for detailed statistics (not fully complete yet)

### Group Behavior
- Moving the group moves all contained nodes together
- Nodes cannot be removed from the group until you unlock the **Lock** system
