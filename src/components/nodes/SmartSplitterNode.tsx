import { memo, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Item, SplitterOutputConfig } from '../../types';
import itemsData from '../../data/items.json';
import { useUiSettings } from '../../contexts/UiSettingsContext';

const items: Item[] = itemsData.items;
const itemImageMap = import.meta.glob('../../assets/items/*', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const resourceImageMap = import.meta.glob('../../assets/resources/*', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const buildingImageMap = import.meta.glob('../../assets/building/*', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

const findItemIconUrl = (item: Item | undefined) => {
  if (!item) return '';
  const idKey = normalizeKey(item.id);
  const nameKey = normalizeKey(item.name);
  const entry = Object.entries(itemImageMap).find(([path]) => {
    const fileKey = normalizeKey((path.split('/').pop() || path).replace(/\.[^/.]+$/, ''));
    return fileKey === idKey || fileKey === nameKey;
  });
  if (entry) return entry[1];
  if (item.category === 'ore' || item.category === 'fluid') {
    const resEntry = Object.entries(resourceImageMap).find(([path]) => {
      const fileKey = normalizeKey((path.split('/').pop() || path).replace(/\.[^/.]+$/, ''));
      return fileKey === idKey || fileKey === nameKey;
    });
    return resEntry ? resEntry[1] : '';
  }
  return '';
};

const findBuildingIconUrl = (buildingId: string) => {
  const idKey = normalizeKey(buildingId);
  const entry = Object.entries(buildingImageMap).find(([path]) => {
    const fileKey = normalizeKey((path.split('/').pop() || path).replace(/\.[^/.]+$/, ''));
    return fileKey === idKey || fileKey.includes(idKey);
  });
  return entry ? entry[1] : '';
};

interface SmartSplitterNodeProps {
  id: string;
  selected?: boolean;
  data: {
    label?: string;
    customLabel?: string;
    collapsed?: boolean;
    compactMode?: boolean;
    splitOutputs?: [SplitterOutputConfig, SplitterOutputConfig, SplitterOutputConfig];
  };
}

const SmartSplitterNode = memo(({ id, data, selected }: SmartSplitterNodeProps) => {
  const ui = useUiSettings();
  const isCollapsed = data.collapsed ?? false;
  const isCompact = data.compactMode ?? false;
  const headerLabel = (data.customLabel || 'Smart Splitter').toUpperCase();
  const theme = (data as { theme?: string }).theme || '';
  const themeMap = {
    purple: { header: '#8b5cf6', body: '#252836', border: '#8b5cf6', text: '#1a1a2e' },
    dark: { header: '#111827', body: '#0b0f1a', border: '#374151', text: '#e5e7eb' },
    orange: { header: '#fa9549', body: '#252836', border: '#fa9549', text: '#1a1a2e' },
    blue: { header: '#60a5fa', body: '#252836', border: '#60a5fa', text: '#0f172a' },
    slate: { header: '#64748b', body: '#1f2937', border: '#94a3b8', text: '#0f172a' },
  } as const;
  const themeColors = theme ? (themeMap[theme as keyof typeof themeMap] || themeMap.purple) : themeMap.purple;

  // Default split outputs configuration
  const splitOutputs: [SplitterOutputConfig, SplitterOutputConfig, SplitterOutputConfig] = data.splitOutputs ?? [
    { item: null, conveyorMk: 1 },
    { item: null, conveyorMk: 1 },
    { item: null, conveyorMk: 1 },
  ];

  const incomingItems = (data.incomingItems as string[] | undefined) || [];
  const autoAssignedOutputs = useMemo(() => {
    return (data.autoAssignedOutputs as [SplitterOutputConfig, SplitterOutputConfig, SplitterOutputConfig] | undefined)
      || (splitOutputs as [SplitterOutputConfig, SplitterOutputConfig, SplitterOutputConfig]);
  }, [data.autoAssignedOutputs, splitOutputs]);

  const iconUrl = findBuildingIconUrl('smart_splitter') || findBuildingIconUrl('smartsplitter');

  const handleStyle = {
    background: '#d1d5db',
    width: 14,
    height: 14,
    border: '1px solid #6b7280',
    borderRadius: 999,
  } as const;

  const outputLabels = ['Top', 'Right', 'Bottom'];
  const outputPositions = [Position.Top, Position.Right, Position.Bottom];

  return (
    <div
      style={{
        minWidth: isCollapsed ? 160 : 200,
        backgroundColor: themeColors.body,
        border: `2px solid ${selected ? '#fff' : themeColors.border}`,
        borderRadius: 8,
        fontFamily: 'Inter, sans-serif',
        position: 'relative',
      }}
    >
      {/* Input Handle - Back (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        id="in-conveyor-0"
        style={{
          ...handleStyle,
          top: '50%',
        }}
      />

      {/* Output Handles - Top, Right, Bottom */}
      <Handle
        type="source"
        position={Position.Top}
        id="out-top-0"
        style={{
          ...handleStyle,
          left: '50%',
          background: autoAssignedOutputs[0].item ? '#8b5cf6' : '#d1d5db',
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="out-right-0"
        style={{
          ...handleStyle,
          top: '50%',
          background: autoAssignedOutputs[1].item ? '#8b5cf6' : '#d1d5db',
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="out-bottom-0"
        style={{
          ...handleStyle,
          left: '50%',
          background: autoAssignedOutputs[2].item ? '#8b5cf6' : '#d1d5db',
        }}
      />

      {/* Header */}
        <div
          data-no-panel="true"
        style={{
          backgroundColor: themeColors.header,
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderRadius: (isCollapsed || isCompact) ? 6 : '6px 6px 0 0',
          cursor: 'pointer',
        }}
      >
          {!ui.hideAllImages && (
            iconUrl ? (
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
            ) : (
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  background: '#1a1a2e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  color: '#8b5cf6',
                }}
              >
                ???
              </div>
            )
          )}
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              color: themeColors.text,
              flex: 1,
            }}>
            {headerLabel}
          </span>
          <div
            data-no-panel="true"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <label
              data-no-panel="true"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 10,
                fontWeight: 700,
                color: themeColors.text,
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
              }}
            >
              Compact
              <input
                type="checkbox"
                checked={isCompact}
                onChange={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent('nodeDataChange', {
                    detail: { nodeId: id, field: 'compactMode', value: e.target.checked }
                  }));
                }}
                style={{ width: 28, height: 16 }}
              />
            </label>
          </div>
        </div>

        {/* Body */}
        {!isCollapsed && (
          <div style={{ padding: 12 }}>
            {/* Incoming Items */}
            <div
              style={{
                padding: 8,
                backgroundColor: '#1a1a2e',
                borderRadius: 4,
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>
                Incoming Items
              </div>
              {incomingItems.length === 0 ? (
                <div style={{ fontSize: 12, color: '#666', fontStyle: 'italic' }}>
                  No items connected
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {incomingItems.map(itemId => {
                    const item = items.find(i => i.id === itemId);
                    const icon = item ? findItemIconUrl(item) : '';
                    return (
                      <div
                        key={itemId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(139, 92, 246, 0.2)',
                          border: '1px solid rgba(139, 92, 246, 0.4)',
                        }}
                        title={item?.name || itemId}
                      >
                        {icon && !ui.hideAllImages && (
                          <img
                            src={icon}
                            alt=""
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 3,
                              objectFit: 'cover',
                            }}
                          />
                        )}
                        <span style={{ fontSize: 10, color: '#c4b5fd' }}>
                          {item?.name || itemId}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Split Outputs Configuration */}
            {!isCompact && (
              <div
                style={{
                  padding: 8,
                  backgroundColor: '#1a1a2e',
                  borderRadius: 4,
                }}
              >
                <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>
                  Split Outputs
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {autoAssignedOutputs.map((output, index) => {
                    const item = output.item ? items.find(i => i.id === output.item) : null;
                    const icon = item ? findItemIconUrl(item) : '';
                    return (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '4px 8px',
                          borderRadius: 4,
                          background: output.item ? 'rgba(139, 92, 246, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                          border: `1px solid ${output.item ? 'rgba(139, 92, 246, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 9,
                          fontWeight: 600,
                          color: '#9ca3af',
                          textTransform: 'uppercase',
                          width: 40,
                        }}>
                          {outputLabels[index]}
                        </span>
                        {icon && !ui.hideAllImages && (
                          <img
                            src={icon}
                            alt=""
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: 3,
                                objectFit: 'cover',
                              }}
                            />
                          )}
                          <span style={{
                            fontSize: 11,
                            color: output.item ? '#c4b5fd' : '#666',
                          }}>
                            {item?.name || 'Any'}
                          </span>
                        </div>
                        <span style={{
                          fontSize: 9,
                          padding: '2px 6px',
                          borderRadius: 999,
                          background: 'rgba(100, 116, 139, 0.3)',
                          color: '#9ca3af',
                        }}>
                          Mk.{output.conveyorMk}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ fontSize: 10, color: '#666', marginTop: 8, textAlign: 'center' }}>
              Click to edit
            </div>
          </div>
        )}
    </div>
  );
});

SmartSplitterNode.displayName = 'SmartSplitterNode';

export default SmartSplitterNode;
