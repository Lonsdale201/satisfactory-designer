# App.tsx Refaktoring Útmutató

## Új struktúra

```
src/
├── constants/
│   ├── index.ts           # Re-exports
│   ├── rates.ts           # CONVEYOR_RATES, PIPE_RATES, PURITY_RATES, MINER_MULTIPLIERS
│   └── colors.ts          # MATERIAL_COLORS, STATUS_COLORS, THEME_COLORS
├── types/
│   ├── index.ts           # Összes type export
│   └── calculation.ts     # CalcStatus, NodeStatus, NodeStatusMap
├── utils/
│   └── calculationUtils.ts # calculateNodeStatuses, buildAdjacencyLists
├── hooks/
│   ├── index.ts           # Re-exports
│   ├── useCalculation.ts  # calcEnabled, handleCalculate, clearCalculation
│   ├── useNodeOperations.ts # handleAddNode, handleDeleteNode, handleDuplicateNode
│   ├── useStackingLogic.ts  # handleStack, handleUnstack, canStack, canUnstack
│   └── useKeyboardShortcuts.ts # Ctrl+C/V, Delete kezelés
├── components/
│   ├── canvas/
│   │   ├── index.ts
│   │   ├── CustomEdge.tsx
│   │   └── CustomConnectionLine.tsx
│   └── toolbar/
│       ├── index.ts
│       ├── ZoomControls.tsx
│       └── LayerPanel.tsx
```

## Hogyan használd az új modulokat

### 1. Import a hookokat

```typescript
import {
  useCalculation,
  useNodeOperations,
  useStackingLogic,
  useKeyboardShortcuts
} from './hooks';
```

### 2. useCalculation használata

```typescript
const {
  calcEnabled,
  setCalcEnabled,
  calcEnabledRef,
  handleCalculate,
  clearCalculation,
} = useCalculation({
  nodesRef,
  edgesRef,
  setNodes,
});
```

### 3. useNodeOperations használata

```typescript
const {
  handleAddNode,
  handleDeleteNode,
  handleDuplicateNode,
  handleDuplicateNodes,
} = useNodeOperations({
  nodeIdCounter,
  currentLayer,
  nodesRef,
  edges,
  setNodes,
  setEdges,
  setNodeIdCounter,
});
```

### 4. useStackingLogic használata

```typescript
const {
  selectedNodesForStack,
  setSelectedNodesForStack,
  stackCandidates,
  canStack,
  canUnstack,
  handleStack,
  handleUnstack,
  handleNodeDrag,
} = useStackingLogic({
  nodesRef,
  setNodes,
  setEdges,
  getStackKey,
});
```

### 5. useKeyboardShortcuts használata

```typescript
const {
  ctrlDownRef,
  copyBufferRef,
} = useKeyboardShortcuts({
  nodesRef,
  edgesRef,
  selectedEdgesRef,
  setNodes,
  setEdges,
  handleDuplicateNodes,
});
```

### 6. Toolbar komponensek

```tsx
import { ZoomControls, LayerPanel } from './components/toolbar';

// JSX-ben:
<ZoomControls
  reactFlowInstance={reactFlowInstance}
  interactionLocked={interactionLocked}
  setInteractionLocked={setInteractionLocked}
/>

<LayerPanel
  currentLayer={currentLayer}
  maxLayer={maxLayer}
  onLayerChange={setCurrentLayer}
/>
```

## Migráció lépésről lépésre

### Fázis 1: Constants (Kész ✅)
- [x] rates.ts
- [x] colors.ts

### Fázis 2: Utils (Kész ✅)
- [x] calculationUtils.ts

### Fázis 3: Hooks (Kész ✅)
- [x] useCalculation.ts
- [x] useNodeOperations.ts
- [x] useStackingLogic.ts
- [x] useKeyboardShortcuts.ts

### Fázis 4: Components (Kész ✅)
- [x] CustomEdge.tsx
- [x] CustomConnectionLine.tsx
- [x] ZoomControls.tsx
- [x] LayerPanel.tsx

### Fázis 5: App.tsx integráció (Következő)
1. Cseréld le a rate konstansokat importokra
2. Használd az új hookokat
3. Használd az új komponenseket
4. Töröld a régi kódot

## Előnyök

1. **Tesztelhetőség**: Minden hook és util külön tesztelhető
2. **Újrafelhasználhatóság**: Hookokat más komponensekben is használhatod
3. **Karbantarthatóság**: Kisebb, fókuszált fájlok
4. **Teljesítmény**: useCallback és useMemo optimalizációk izolálva
5. **TypeScript**: Jobb típus-inferencia és autokomplett
