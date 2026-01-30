import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getSmoothStepPath } from '@xyflow/react';
import { MATERIAL_COLORS, MaterialType } from '../../constants/colors';

interface CustomEdgeProps extends EdgeProps {
  data?: {
    label?: string;
    material?: MaterialType;
    isGhost?: boolean;
  };
}

interface CustomEdgeContext {
  alwaysShowEdgeLabels: boolean;
  hoveredEdgeId: string | null;
  isDragging: boolean;
  edges: Array<{ id: string; source: string; target: string }>;
}

// Factory function to create CustomEdge with context
export function createCustomEdge(contextRef: React.MutableRefObject<CustomEdgeContext>) {
  return memo(function CustomEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
    source,
    target,
    sourceHandle,
    targetHandle,
  }: CustomEdgeProps) {
    const context = contextRef.current;
    const parallelEdges = context.edges?.filter(
      (edge) => edge.source === source && edge.target === target,
    ) || [];
    const parallelIndex = parallelEdges.findIndex((edge) => edge.id === id);
    const parallelCount = parallelEdges.length;
    const offsetBase = parallelCount > 1 ? 12 : 0;
    const offset = parallelCount > 1
      ? (parallelIndex - (parallelCount - 1) / 2) * offsetBase
      : 0;
    const isHorizontal =
      sourcePosition === 'left' ||
      sourcePosition === 'right' ||
      targetPosition === 'left' ||
      targetPosition === 'right';
    const adjustedSourceX = isHorizontal ? sourceX : sourceX + offset;
    const adjustedSourceY = isHorizontal ? sourceY + offset : sourceY;
    const adjustedTargetX = isHorizontal ? targetX : targetX + offset;
    const adjustedTargetY = isHorizontal ? targetY + offset : targetY;
    const [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX: adjustedSourceX,
      sourceY: adjustedSourceY,
      sourcePosition,
      targetX: adjustedTargetX,
      targetY: adjustedTargetY,
      targetPosition,
      borderRadius: 8,
    });

    const label = data?.label || '';
    const labelText = data?.label || '';
    const inferredMaterial =
      sourceHandle?.includes('pipe') ||
      targetHandle?.includes('pipe') ||
      labelText.includes('m³') ||
      labelText.includes('mÂł')
        ? 'pipe'
        : 'conveyor';
    const material = data?.material || inferredMaterial;
    const isGhost = data?.isGhost || false;

    const colors = MATERIAL_COLORS[material];
    const baseStrokeColor = selected ? colors.selected : colors.primary;
    const strokeColor = isGhost ? colors.ghost : baseStrokeColor;

    const showLabel = Boolean(
      label &&
      !isGhost &&
      (context.alwaysShowEdgeLabels || selected || context.hoveredEdgeId === id)
    );

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            stroke: strokeColor,
            strokeWidth: isGhost ? 1.5 : (selected ? 3 : 2),
            strokeDasharray: isGhost ? '4 8' : '6 6',
            animation: context.isDragging || isGhost ? 'none' : 'flow-dash 1.2s linear infinite',
          }}
        />
        {showLabel && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                background: '#1a1a2e',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 'bold',
                color: strokeColor,
                border: `1px solid ${strokeColor}`,
                pointerEvents: 'all',
              }}
              className="nodrag nopan"
            >
              {label}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  });
}

// Standalone CustomEdge for simpler use cases
export const SimpleCustomEdge = memo(function SimpleCustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  source,
  target,
  sourceHandle,
  targetHandle,
}: CustomEdgeProps) {
  const parallelEdges =
    typeof source === 'string' && typeof target === 'string'
      ? [{ id, source, target }]
      : [];
  const parallelIndex = parallelEdges.findIndex((edge) => edge.id === id);
  const parallelCount = parallelEdges.length;
  const offsetBase = parallelCount > 1 ? 12 : 0;
  const offset = parallelCount > 1
    ? (parallelIndex - (parallelCount - 1) / 2) * offsetBase
    : 0;
  const isHorizontal =
    sourcePosition === 'left' ||
    sourcePosition === 'right' ||
    targetPosition === 'left' ||
    targetPosition === 'right';
  const adjustedSourceX = isHorizontal ? sourceX : sourceX + offset;
  const adjustedSourceY = isHorizontal ? sourceY + offset : sourceY;
  const adjustedTargetX = isHorizontal ? targetX : targetX + offset;
  const adjustedTargetY = isHorizontal ? targetY + offset : targetY;
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: adjustedSourceX,
    sourceY: adjustedSourceY,
    sourcePosition,
    targetX: adjustedTargetX,
    targetY: adjustedTargetY,
    targetPosition,
    borderRadius: 8,
  });

  const label = data?.label || '';
  const inferredMaterial =
    sourceHandle?.includes('pipe') ||
    targetHandle?.includes('pipe') ||
    label.includes('m³') ||
    label.includes('mÂł')
      ? 'pipe'
      : 'conveyor';
  const material = data?.material || inferredMaterial;
  const isGhost = data?.isGhost || false;

  const colors = MATERIAL_COLORS[material];
  const baseStrokeColor = selected ? colors.selected : colors.primary;
  const strokeColor = isGhost ? colors.ghost : baseStrokeColor;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: isGhost ? 1.5 : (selected ? 3 : 2),
          strokeDasharray: isGhost ? '4 8' : '6 6',
          animation: isGhost ? 'none' : 'flow-dash 1.2s linear infinite',
        }}
      />
      {label && !isGhost && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: '#1a1a2e',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 'bold',
              color: strokeColor,
              border: `1px solid ${strokeColor}`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
