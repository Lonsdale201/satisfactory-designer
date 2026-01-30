import { memo } from 'react';
import { ConnectionLineComponentProps, getSmoothStepPath } from '@xyflow/react';
import { MATERIAL_COLORS } from '../../constants/colors';

interface CustomConnectionLineProps extends ConnectionLineComponentProps {
  isDragging?: boolean;
}

export const CustomConnectionLine = memo(function CustomConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
  fromHandle,
}: CustomConnectionLineProps) {
  const isPipe = fromHandle?.id?.includes('pipe') || false;
  const strokeColor = isPipe ? MATERIAL_COLORS.pipe.primary : MATERIAL_COLORS.conveyor.primary;

  const [path] = getSmoothStepPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
    borderRadius: 8,
  });

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeDasharray="6 6"
        style={{ animation: 'flow-dash 1.2s linear infinite' }}
      />
    </g>
  );
});

// Factory for creating connection line with isDragging awareness
export function createCustomConnectionLine(isDraggingRef: React.MutableRefObject<boolean>) {
  return function ConnectionLineWithDrag(props: ConnectionLineComponentProps) {
    const isPipe = props.fromHandle?.id?.includes('pipe') || false;
    const strokeColor = isPipe ? MATERIAL_COLORS.pipe.primary : MATERIAL_COLORS.conveyor.primary;

    const [path] = getSmoothStepPath({
      sourceX: props.fromX,
      sourceY: props.fromY,
      sourcePosition: props.fromPosition,
      targetX: props.toX,
      targetY: props.toY,
      targetPosition: props.toPosition,
      borderRadius: 8,
    });

    return (
      <g>
        <path
          d={path}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          strokeDasharray="6 6"
          style={{ animation: isDraggingRef.current ? 'none' : 'flow-dash 1.2s linear infinite' }}
        />
      </g>
    );
  };
}
