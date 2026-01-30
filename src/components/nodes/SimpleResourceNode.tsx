import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Resource, PurityType } from '../../types';
import resourcesData from '../../data/resources.json';
import { useUiSettings } from '../../contexts/UiSettingsContext';

const resources: Resource[] = resourcesData.resources;
const purityTypes: PurityType[] = resourcesData.purityTypes;
const resourceImageMap = import.meta.glob('../../assets/resources/*', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

const findResourceIconUrl = (resource: Resource | undefined) => {
  if (!resource) return '';
  const idKey = normalizeKey(resource.id);
  const nameKey = normalizeKey(resource.name);
  const entry = Object.entries(resourceImageMap).find(([path]) => {
    const fileKey = normalizeKey((path.split('/').pop() || path).replace(/\.[^/.]+$/, ''));
    return fileKey === idKey || fileKey === nameKey;
  });
  return entry ? entry[1] : '';
};

interface SimpleResourceNodeProps {
  id: string;
  selected?: boolean;
  data: {
    resourceId: string;
    purity: string;
    outputRate: number;
    iconUrl?: string;
    customLabel?: string;
    collapsed?: boolean;
    hasInput?: boolean;
    hasOutput?: boolean;
    layer?: number;
    isGhost?: boolean;
    calcStatus?: 'optimal' | 'under' | 'over' | null;
    calcSupply?: number;
    calcDemand?: number;
  };
}

const SimpleResourceNode = memo(({ data, selected }: SimpleResourceNodeProps) => {
  const ui = useUiSettings();
  const selectedResource = resources.find(r => r.id === data.resourceId);
  const selectedPurity = purityTypes.find(p => p.id === data.purity);
  const isCollapsed = data.collapsed ?? false;
  const isGhost = data.isGhost ?? false;
  const hasInput = false;
  const hasOutput = true;
  const theme = (data as { theme?: string }).theme || 'dark';

  const themeMap = {
    dark: { header: '#111827', body: '#0b0f1a', border: '#374151', text: '#e5e7eb' },
    orange: { header: '#fa9549', body: '#252836', border: '#fa9549', text: '#1a1a2e' },
    purple: { header: '#8b5cf6', body: '#252836', border: '#8b5cf6', text: '#1a1a2e' },
    blue: { header: '#60a5fa', body: '#252836', border: '#60a5fa', text: '#0f172a' },
    slate: { header: '#64748b', body: '#1f2937', border: '#94a3b8', text: '#0f172a' },
  } as const;
  const themeColors = themeMap[theme as keyof typeof themeMap] || themeMap.dark;

  const displayRate = selectedPurity
    ? 60 * selectedPurity.multiplier
    : data.outputRate || 60;

  const iconUrl = findResourceIconUrl(selectedResource) || '';
  const headerLabel = (data.customLabel || selectedResource?.name || 'Resource Node').toUpperCase();
  const isFluid = selectedResource?.state === 'fluid';

  // Ghost mode styles - wireframe look
  const ghostStyles = isGhost ? {
    opacity: 0.5,
    pointerEvents: 'none' as const,
  } : {};

  const handleStyle = isGhost ? {
    background: '#fa9549',
    width: 8,
    height: 8,
    border: 'none',
    borderRadius: 999,
    outline: '1px dashed rgba(250, 149, 73, 0.5)',
    outlineOffset: '2px',
  } as const : {
    background: '#d1d5db',
    width: 14,
    height: 14,
    border: '1px solid #6b7280',
    borderRadius: 999,
  } as const;

  const pipeHandleStyle = isGhost ? {
    background: '#3b82f6',
    width: 8,
    height: 8,
    border: 'none',
    borderRadius: 999,
    outline: '1px dashed rgba(59, 130, 246, 0.5)',
    outlineOffset: '2px',
  } as const : {
    background: '#3b82f6',
    width: 14,
    height: 14,
    border: '1px solid #1d4ed8',
    borderRadius: 999,
  } as const;

  return (
    <>
      <div
        style={{
          minWidth: isCollapsed ? 160 : 200,
          backgroundColor: isGhost ? 'transparent' : themeColors.body,
          border: isGhost
            ? '2px dashed rgba(250, 149, 73, 0.4)'
            : `2px solid ${selected ? '#fff' : themeColors.border}`,
          borderRadius: 8,
          fontFamily: 'Inter, sans-serif',
          ...ghostStyles,
        }}
      >
      {/* Input Handle */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          id="in-conveyor-0"
          style={handleStyle}
        />
      )}

      {/* Header */}
      <div
        data-no-panel="true"
        style={{
          backgroundColor: isGhost ? 'transparent' : themeColors.header,
          padding: isGhost ? '4px 8px' : '6px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isGhost ? 'center' : 'flex-start',
          gap: 8,
          borderRadius: isGhost ? '6px 6px 0 0' : (isCollapsed ? 6 : '6px 6px 0 0'),
          cursor: 'pointer',
          borderBottom: isGhost ? '1px dashed rgba(250, 149, 73, 0.3)' : 'none',
        }}
      >
        {!isGhost && !ui.hideAllImages && iconUrl && (
          <img
            src={iconUrl}
            alt=""
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              objectFit: 'cover',
              background: '#1a1a2e',
            }}
          />
        )}
        {!isGhost && !ui.hideAllImages && !iconUrl && (
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              background: '#1a1a2e',
            }}
          />
        )}
        <span style={{
          fontSize: isGhost ? 10 : 14,
          fontWeight: 600,
          color: isGhost ? 'rgba(250, 149, 73, 0.5)' : themeColors.text,
          flex: isGhost ? 'none' : 1,
          textAlign: isGhost ? 'center' : 'left',
        }}>
          {headerLabel}
        </span>
        {!isGhost && (
          <span style={{ fontSize: 12, fontWeight: 600, color: themeColors.text, display: 'flex', alignItems: 'center', gap: 4 }}>
            {displayRate}/min
            {data.calcStatus && (
              <span
                title={
                  data.calcStatus === 'optimal' ? 'Optimal - extraction and demand are balanced' :
                  data.calcStatus === 'under' ? `Inefficient - output: ${data.calcSupply?.toFixed(1)}/min, demand: ${data.calcDemand?.toFixed(1)}/min` :
                  `Overproduction - output: ${data.calcSupply?.toFixed(1)}/min, demand: ${data.calcDemand?.toFixed(1)}/min`
                }
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: data.calcStatus === 'optimal' ? '#10b981' : data.calcStatus === 'under' ? '#ef4444' : '#ec4899',
                  animation: 'pulse 1.5s ease-in-out infinite',
                  boxShadow: data.calcStatus === 'optimal' ? '0 0 6px #10b981' : data.calcStatus === 'under' ? '0 0 6px #ef4444' : '0 0 6px #ec4899',
                }}
              />
            )}
          </span>
        )}
      </div>

      {/* Ghost Body - large centered icon */}
      {isGhost && iconUrl && (
        <div style={{
          padding: 12,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <img
            src={iconUrl}
            alt=""
            style={{
              width: 40,
              height: 40,
              borderRadius: 6,
              objectFit: 'cover',
              opacity: 0.6,
              border: '1px dashed rgba(250, 149, 73, 0.3)',
            }}
          />
        </div>
      )}

      {/* Body - only when not collapsed and not ghost */}
      {!isCollapsed && !isGhost && (
        <div style={{ padding: 12 }}>
          <div
            style={{
              padding: 8,
              backgroundColor: '#1a1a2e',
              borderRadius: 4,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>
              {selectedPurity?.name || 'Normal'} Purity
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#fa9549' }}>
              {displayRate}/min
            </div>
          </div>
          {ui.showResourceImageInBody && iconUrl && !ui.hideAllImages && (
            <div
              style={{
                marginTop: 8,
                padding: 8,
                backgroundColor: '#111827',
                borderRadius: 4,
                textAlign: 'center',
              }}
            >
              <img
                src={iconUrl}
                alt=""
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  objectFit: 'cover',
                  background: '#0f172a',
                }}
              />
            </div>
          )}
          <div style={{ fontSize: 10, color: '#666', marginTop: 8, textAlign: 'center' }}>
            Click to edit
          </div>
        </div>
      )}

      {/* Output Handle - unified ID with type suffix for proper connection matching */}
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          id={`out-${isFluid ? 'pipe' : 'conveyor'}-0`}
          style={{ ...(isFluid ? pipeHandleStyle : handleStyle), top: '50%' }}
        />
      )}
      </div>
    </>
  );
});

SimpleResourceNode.displayName = 'SimpleResourceNode';

export default SimpleResourceNode;
