import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import * as Icons from '@mui/icons-material';
import { Item } from '../../types';
import itemsData from '../../data/items.json';
import { useUiSettings } from '../../contexts/UiSettingsContext';

const items: Item[] = itemsData.items;
const itemImageMap = import.meta.glob('../../assets/items/*', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

const findItemIconUrl = (item: Item | undefined) => {
  if (!item) return '';
  const idKey = normalizeKey(item.id);
  const nameKey = normalizeKey(item.name);
  const entry = Object.entries(itemImageMap).find(([path]) => {
    const fileKey = normalizeKey((path.split('/').pop() || path).replace(/\.[^/.]+$/, ''));
    return fileKey === idKey || fileKey === nameKey;
  });
  return entry ? entry[1] : '';
};

interface SimpleTransportNodeProps {
  id: string;
  selected?: boolean;
  data: {
    label: string;
    vehicle: 'truck' | 'tractor' | 'drone';
    deliveryItem: string;
    customLabel?: string;
    conveyorMk?: 1 | 2 | 3 | 4 | 5 | 6;
    outputCount?: number;
    collapsed?: boolean;
    isGhost?: boolean;
    theme?: string;
  };
}

const vehicleIcon = (vehicle: string) => {
  if (vehicle === 'drone') return Icons.FlightTakeoff;
  if (vehicle === 'tractor') return Icons.Agriculture;
  return Icons.LocalShipping;
};

const SimpleTransportNode = memo(({ data, selected }: SimpleTransportNodeProps) => {
  const ui = useUiSettings();
  const isCollapsed = data.collapsed ?? false;
  const isGhost = data.isGhost ?? false;
  const vehicle = data.vehicle || 'truck';
  const VehicleIcon = vehicleIcon(vehicle);
  const item = items.find(i => i.id === data.deliveryItem);
  const itemIcon = findItemIconUrl(item);
  const headerLabel = ((data.customLabel as string) || data.label || 'Transport').toUpperCase();
  const mk = data.conveyorMk || 1;
  const outputCount = data.outputCount || 1;
  const theme = data.theme || '';
  const themeMap = {
    blue: { header: '#60a5fa', body: '#252836', border: '#60a5fa', text: '#0f172a' },
    dark: { header: '#111827', body: '#0b0f1a', border: '#374151', text: '#e5e7eb' },
    orange: { header: '#fa9549', body: '#252836', border: '#fa9549', text: '#1a1a2e' },
    purple: { header: '#8b5cf6', body: '#252836', border: '#8b5cf6', text: '#1a1a2e' },
    slate: { header: '#64748b', body: '#1f2937', border: '#94a3b8', text: '#0f172a' },
    green: { header: '#22c55e', body: '#1a2e1f', border: '#22c55e', text: '#0f1a12' },
    rose: { header: '#f43f5e', body: '#2e1a22', border: '#f43f5e', text: '#1a0f14' },
    teal: { header: '#14b8a6', body: '#1a2e2b', border: '#14b8a6', text: '#0f1a18' },
    amber: { header: '#f59e0b', body: '#2e2a1a', border: '#f59e0b', text: '#1a170f' },
    indigo: { header: '#6366f1', body: '#1e1a2e', border: '#6366f1', text: '#0f0e1a' },
  } as const;
  const themeColors = theme ? (themeMap[theme as keyof typeof themeMap] || themeMap.blue) : themeMap.blue;

  // Ghost mode styles
  const ghostStyles = isGhost ? {
    opacity: 0.5,
    pointerEvents: 'none' as const,
  } : {};

  const getHandleStyle = () => {
    if (isGhost) {
      return {
        background: themeColors.header,
        width: 8,
        height: 8,
        border: 'none',
        borderRadius: 999,
        outline: `1px dashed ${themeColors.header}80`,
        outlineOffset: '2px',
      } as const;
    }
    return {
      background: '#d1d5db',
      width: 14,
      height: 14,
      border: '1px solid #6b7280',
      borderRadius: 999,
    } as const;
  };

  return (
    <div
      style={{
        minWidth: isCollapsed ? 180 : 220,
        backgroundColor: isGhost ? 'transparent' : themeColors.body,
        border: isGhost
          ? `2px dashed ${themeColors.border}66`
          : `2px solid ${selected ? '#fff' : themeColors.border}`,
        borderRadius: 8,
        fontFamily: 'Inter, sans-serif',
        ...ghostStyles,
      }}
    >
      {/* Output Handles */}
      {Array.from({ length: outputCount }).map((_, index) => (
        <Handle
          key={`out-conveyor-${index}`}
          type="source"
          position={Position.Right}
          id={`out-conveyor-${index}`}
          style={{
            ...getHandleStyle(),
            top: outputCount === 1 ? '50%' : `${25 + (index * (50 / Math.max(outputCount - 1, 1)))}%`,
          }}
        />
      ))}

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
          borderBottom: isGhost ? `1px dashed ${themeColors.border}4D` : 'none',
        }}
      >
        {!isGhost && <VehicleIcon sx={{ fontSize: 18, color: themeColors.text }} />}
        <span style={{
          fontSize: isGhost ? 10 : 13,
          fontWeight: isGhost ? 600 : 700,
          color: isGhost ? `${themeColors.header}80` : themeColors.text,
          flex: isGhost ? 'none' : 1,
        }}>
          {headerLabel}
        </span>
      </div>

      {/* Ghost Body */}
      {isGhost && (
        <div style={{
          padding: 12,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          gap: 6,
        }}>
          {itemIcon && (
            <img
              src={itemIcon}
              alt=""
              style={{
                width: 40,
                height: 40,
                borderRadius: 6,
                objectFit: 'cover',
                opacity: 0.6,
                border: `1px dashed ${themeColors.border}4D`,
              }}
            />
          )}
          <VehicleIcon sx={{ fontSize: 20, color: `${themeColors.header}99` }} />
        </div>
      )}

      {/* Normal Body */}
      {!isCollapsed && !isGhost && (
        <div style={{ padding: 12 }}>
          <div
            style={{
              padding: 8,
              backgroundColor: '#1a1a2e',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}
          >
            {itemIcon && !ui.hideAllImages ? (
              <img
                src={itemIcon}
                alt=""
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  objectFit: 'cover',
                  background: '#0f172a',
                }}
              />
            ) : (
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: '#0f172a',
                }}
              />
            )}
            <div style={{ fontSize: 13, fontWeight: 600, color: '#93c5fd', flex: 1 }}>
              {item?.name || 'No delivery item'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div
              style={{
                flex: 1,
                padding: 8,
                backgroundColor: '#1a1a2e',
                borderRadius: 4,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 10, color: '#aaa' }}>Vehicle</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#93c5fd' }}>
                {vehicle.toUpperCase()}
              </div>
            </div>
            <div
              style={{
                flex: 1,
                padding: 8,
                backgroundColor: '#1a1a2e',
                borderRadius: 4,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 10, color: '#aaa' }}>Conveyor</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#93c5fd' }}>
                Mk.{mk}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#666', marginTop: 8, textAlign: 'center' }}>
            Click to edit
          </div>
        </div>
      )}
    </div>
  );
});

SimpleTransportNode.displayName = 'SimpleTransportNode';

export default SimpleTransportNode;
