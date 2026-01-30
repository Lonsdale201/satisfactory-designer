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
  }: CustomEdgeProps) {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 8,
    });

    const label = data?.label || '';
    const material = data?.material || 'conveyor';
    const isGhost = data?.isGhost || false;

    const colors = MATERIAL_COLORS[material];
    const baseStrokeColor = selected ? colors.selected : colors.primary;
    const strokeColor = isGhost ? colors.ghost : baseStrokeColor;

    const context = contextRef.current;
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
}: CustomEdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  const label = data?.label || '';
  const material = data?.material || 'conveyor';
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
