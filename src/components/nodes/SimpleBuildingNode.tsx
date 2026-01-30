import { memo, useMemo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Building, Item, ItemRequirement } from '../../types';
import buildingsData from '../../data/buildings.json';
import itemsData from '../../data/items.json';
import { useUiSettings } from '../../contexts/UiSettingsContext';

const buildings: Building[] = buildingsData.buildings as Building[];
const items: Item[] = itemsData.items;
const itemImageMap = import.meta.glob('../../assets/items/*', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const resourceImageMap = import.meta.glob('../../assets/resources/*', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const buildingImageMap = import.meta.glob('../../assets/building/*', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

// Format number: hide .0 decimals but keep .5 etc
const formatNum = (n: number | undefined): string => {
  if (n === undefined) return '0';
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(1);
};

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

const findBuildingIconUrl = (building: Building | undefined) => {
  if (!building) return '';
  if (building.id.startsWith('miner_mk')) {
    const match = Object.entries(buildingImageMap).find(([path]) =>
      normalizeKey(path).includes(normalizeKey('Miner_Mk'))
    );
    return match ? match[1] : '';
  }
  const idKey = normalizeKey(building.id);
  const nameKey = normalizeKey(building.name);
  const entry = Object.entries(buildingImageMap).find(([path]) => {
    const fileKey = normalizeKey((path.split('/').pop() || path).replace(/\.[^/.]+$/, ''));
    return fileKey === idKey || fileKey === nameKey;
  });
  return entry ? entry[1] : '';
};

interface SimpleBuildingNodeProps {
  id: string;
  selected?: boolean;
  data: {
    buildingId: string;
    production: number;
    outputItem: string;
    powerUsage: number;
    iconUrl?: string;
    customLabel?: string;
    storedItem?: string;
    collapsed?: boolean;
    hasInput?: boolean;
    hasOutput?: boolean;
    inputCount?: number;
    layer?: number;
    isGhost?: boolean;
    calcStatus?: 'optimal' | 'under' | 'over' | null;
    calcSupply?: number;
    calcDemand?: number;
    showIo?: boolean;
    theme?: string;
    // Stack properties
    stackCount?: number;
    stackActiveIndex?: number;
    stackActiveId?: string;
  };
}

const SimpleBuildingNode = memo(({ id, data, selected }: SimpleBuildingNodeProps) => {
  const ui = useUiSettings();
  const isCollapsed = data.collapsed ?? false;
  const isGhost = data.isGhost ?? false;
  const stackCount = data.stackCount ?? 1;
  const isStackParent = stackCount > 1;
  const stackLayers = Math.min(stackCount - 1, 3);
  const stackActiveIndex = typeof data.stackActiveIndex === 'number' ? data.stackActiveIndex : 0;
  const stackActiveData = (data as Record<string, unknown>).stackActiveData as Record<string, unknown> | undefined;
  const displayData = (stackActiveData ?? data) as typeof data;

  const selectedBuilding = buildings.find(b => b.id === (displayData.buildingId as string));
  const selectedOutputItem = items.find(i => i.id === (displayData.outputItem as string));
  const selectedStoredItem = items.find(i => i.id === (displayData.storedItem as string));
  const inputTypes = selectedBuilding?.inputTypes ?? Array(selectedBuilding?.inputs ?? 1).fill('conveyor');
  const outputTypes = selectedBuilding?.outputTypes ?? ['conveyor'];
  const inputCount = inputTypes.length;
  const outputCount = outputTypes.length;
  const hasInput = inputCount > 0;
  const hasOutput = outputCount > 0;
  const iconUrl = findBuildingIconUrl(selectedBuilding) || '';
  const headerLabel = ((displayData.customLabel as string) || selectedBuilding?.name || 'Building').toUpperCase();
  const showIo = (displayData.showIo as boolean | undefined);
  const showIoBlock = showIo !== false && !ui.hideIoStats;
  const [inputsExpanded, setInputsExpanded] = useState(false);
  const theme = (displayData.theme as string) || '';
  const themeMap = {
    orange: { header: '#fa9549', body: '#252836', border: '#fa9549', text: '#1a1a2e' },
    purple: { header: '#8b5cf6', body: '#252836', border: '#8b5cf6', text: '#1a1a2e' },
    blue: { header: '#60a5fa', body: '#252836', border: '#60a5fa', text: '#0f172a' },
    dark: { header: '#111827', body: '#0b0f1a', border: '#374151', text: '#e5e7eb' },
    slate: { header: '#64748b', body: '#1f2937', border: '#94a3b8', text: '#0f172a' },
    green: { header: '#22c55e', body: '#1a2e1f', border: '#22c55e', text: '#0f1a12' },
    rose: { header: '#f43f5e', body: '#2e1a22', border: '#f43f5e', text: '#1a0f14' },
    teal: { header: '#14b8a6', body: '#1a2e2b', border: '#14b8a6', text: '#0f1a18' },
    amber: { header: '#f59e0b', body: '#2e2a1a', border: '#f59e0b', text: '#1a170f' },
    indigo: { header: '#6366f1', body: '#1e1a2e', border: '#6366f1', text: '#0f0e1a' },
  } as const;
  const themeColors = theme ? (themeMap[theme as keyof typeof themeMap] || themeMap.orange) : themeMap.orange;

  const dispatchStackIndex = (nextIndex: number) => {
    const event = new CustomEvent('nodeDataChange', {
      detail: { nodeId: id, field: 'stackActiveIndex', value: nextIndex },
    });
    window.dispatchEvent(event);
  };

  const handleStackWheel: React.WheelEventHandler = (event) => {
    if (!isStackParent || isGhost) return;
    event.preventDefault();
    event.stopPropagation();
    const direction = event.deltaY > 0 ? 1 : -1;
    dispatchStackIndex(stackActiveIndex + direction);
  };

  // Ghost mode styles - wireframe look
  const ghostStyles = isGhost ? {
    opacity: 0.5,
    pointerEvents: 'none' as const,
  } : {};

  const incomingItems = (data as Record<string, unknown>).incomingItems as string[] | undefined;
  const alternateOptions = (selectedOutputItem?.alternateRequires || []) as Array<Array<{ item: string; amount: number }>>;
  const resolvedAlt = alternateOptions.find((option) => option.every((req) => (incomingItems || []).includes(req.item)));
  const altUsed = Boolean(resolvedAlt);
  const activeRequirements: ItemRequirement[] = (altUsed ? resolvedAlt : selectedOutputItem?.requires) ?? [];

  // Check if all required inputs are connected
  const requirementsMet = useMemo(() => {
    if (!selectedOutputItem || !selectedOutputItem.requires || selectedOutputItem.requires.length === 0) {
      return null; // No requirements or no output selected
    }
    const suppliedItems = incomingItems || [];
    const mainMet = selectedOutputItem.requires.every(req => suppliedItems.includes(req.item));
    const altMet = alternateOptions.some(option => option.every(req => suppliedItems.includes(req.item)));
    return mainMet || altMet;
  }, [selectedOutputItem, incomingItems, alternateOptions]);

  const missingRequirements = useMemo(() => {
    if (!selectedOutputItem || !selectedOutputItem.requires || selectedOutputItem.requires.length === 0) {
      return [];
    }
    const suppliedItems = (incomingItems || []) as string[];
    if (alternateOptions.some(option => option.every(req => suppliedItems.includes(req.item)))) {
      return [];
    }
    return selectedOutputItem.requires
      .map(req => req.item)
      .filter(reqItem => !suppliedItems.includes(reqItem));
  }, [selectedOutputItem, incomingItems, alternateOptions]);

  const getHandleStyle = (type: 'conveyor' | 'pipe') => {
    if (isGhost) {
      return {
        background: type === 'pipe' ? '#3b82f6' : themeColors.header,
        width: 8,
        height: 8,
        border: 'none',
        borderRadius: 999,
        outline: type === 'pipe' ? '1px dashed rgba(59, 130, 246, 0.5)' : `1px dashed ${themeColors.header}80`,
        outlineOffset: '2px',
      } as const;
    }
    return {
      background: type === 'pipe' ? '#3b82f6' : '#d1d5db',
      width: 14,
      height: 14,
      border: type === 'pipe' ? '1px solid #1d4ed8' : '1px solid #6b7280',
      borderRadius: 999,
    } as const;
  };

  // Get the item icon for ghost mode display
  const ghostItemIconUrl = selectedOutputItem ? findItemIconUrl(selectedOutputItem) :
                           selectedStoredItem ? findItemIconUrl(selectedStoredItem) : '';

  const requiredInputs = useMemo(() => {
    if (!selectedOutputItem || activeRequirements.length === 0) {
      return [];
    }
    const baseProduction = selectedOutputItem.defaultProduction || 0;
    const currentProduction = (displayData.production as number) || 0;
    if (!baseProduction || !currentProduction) return [];
    const scale = currentProduction / baseProduction;
    return activeRequirements.map(req => ({
      ...req,
      perMin: req.amount * scale,
      item: items.find(i => i.id === req.item),
    }));
  }, [selectedOutputItem, displayData.production, activeRequirements]);

  return (
    <>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {isStackParent && !isGhost && (
          <div
            key={`stack-switch-${stackActiveIndex}`}
            style={{
              position: 'absolute',
              top: -10,
              right: -6,
              padding: '2px 8px',
              fontSize: 10,
              fontWeight: 700,
              color: themeColors.header,
              background: 'rgba(26, 26, 46, 0.9)',
              border: `1px solid ${themeColors.header}99`,
              borderRadius: 999,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              animation: 'stack-flash 220ms ease',
              zIndex: 2,
              pointerEvents: 'none',
            }}
          >
            Stack {Math.min(stackActiveIndex + 1, stackCount)}/{stackCount}
          </div>
        )}
        {isStackParent && isGhost && (
          <div
            style={{
              position: 'absolute',
              top: -8,
              right: -6,
              padding: '1px 8px',
              fontSize: 10,
              fontWeight: 700,
              color: `${themeColors.header}CC`,
              background: 'rgba(26, 26, 46, 0.45)',
              border: `1px dashed ${themeColors.header}8C`,
              borderRadius: 999,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              zIndex: 2,
              pointerEvents: 'none',
            }}
          >
            Stack x{stackCount}
          </div>
        )}
        {isStackParent && isGhost && (
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: `${themeColors.header}B3`,
              background: 'rgba(26, 26, 46, 0.35)',
              border: `1px dashed ${themeColors.header}80`,
              padding: '1px 6px',
              borderRadius: 999,
              marginRight: 4,
              letterSpacing: '0.4px',
            }}
          >
            x{stackCount}
          </div>
        )}
        {isStackParent && !isGhost && Array.from({ length: stackLayers }).map((_, index) => {
          const offset = (index + 1) * 6;
          return (
            <div
              key={`stack-layer-${index}`}
              style={{
                position: 'absolute',
                inset: 0,
                transform: `translate(${offset}px, ${offset}px)`,
                backgroundColor: '#1f2230',
                border: `1px solid ${themeColors.header}59`,
                borderRadius: 8,
                zIndex: 0,
                opacity: 0.7 - (index * 0.15),
                pointerEvents: 'none',
              }}
            />
          );
        })}
        {isStackParent && isGhost && Array.from({ length: stackLayers }).map((_, index) => {
          const offset = (index + 1) * 6;
          return (
            <div
              key={`stack-ghost-layer-${index}`}
              style={{
                position: 'absolute',
                inset: 0,
                transform: `translate(${offset}px, ${offset}px)`,
                backgroundColor: 'transparent',
                border: `1px dashed ${themeColors.header}40`,
                borderRadius: 8,
                zIndex: 0,
                opacity: 0.6 - (index * 0.1),
                pointerEvents: 'none',
              }}
            />
          );
        })}
        <div
          style={{
            minWidth: isCollapsed ? 180 : 220,
            backgroundColor: isGhost ? 'transparent' : themeColors.body,
            border: isGhost
              ? `2px dashed ${themeColors.border}66`
              : `2px solid ${selected ? '#fff' : themeColors.border}`,
            borderRadius: 8,
            fontFamily: 'Inter, sans-serif',
            position: 'relative',
            zIndex: 1,
            boxShadow: 'none',
            ...ghostStyles,
          }}
        >
      {/* Status Indicator Dot - positioned at top-right corner */}
      {!isGhost && displayData.calcStatus && (selectedOutputItem || selectedStoredItem) && (
        <div
          title={
            displayData.calcStatus === 'optimal' ? 'Optimal - production and demand are balanced' :
            displayData.calcStatus === 'under' ? `Inefficient - input: ${formatNum(displayData.calcSupply as number | undefined)}/min, demand: ${formatNum(displayData.calcDemand as number | undefined)}/min` :
            `Overproduction - input: ${formatNum(displayData.calcSupply as number | undefined)}/min, demand: ${formatNum(displayData.calcDemand as number | undefined)}/min`
          }
          style={{
            position: 'absolute',
            top: -10,
            right: -10,
            width: 22,
            height: 22,
            borderRadius: '50%',
            backgroundColor: displayData.calcStatus === 'optimal' ? '#10b981' : displayData.calcStatus === 'under' ? '#ef4444' : '#eab308',
            animation: 'pulse 1.5s ease-in-out infinite',
            boxShadow: displayData.calcStatus === 'optimal' ? '0 0 10px #10b981' : displayData.calcStatus === 'under' ? '0 0 12px #ef4444, 0 0 24px rgba(239, 68, 68, 0.5)' : '0 0 10px #eab308',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 'bold',
            color: '#fff',
            border: '2px solid rgba(255, 255, 255, 0.4)',
          }}
        >
          {displayData.calcStatus === 'optimal' ? '✓' : displayData.calcStatus === 'under' ? '!' : '⚡'}
        </div>
      )}

      {/* Input Handles */}
      {hasInput && inputTypes.map((type, index) => (
        <Handle
          key={`input-${type}-${index}`}
          type="target"
          position={Position.Left}
          id={`in-${type}-${index}`}
          style={{
            ...getHandleStyle(type),
            top: inputCount === 1 ? '50%' : `${25 + (index * (50 / Math.max(inputCount - 1, 1)))}%`,
          }}
        />
      ))}

      {/* Header */}
      <div
        data-no-panel="true"
        onWheel={isStackParent ? handleStackWheel : undefined}
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
        {!isGhost && iconUrl && !ui.hideAllImages && (
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
        {!isGhost && !iconUrl && (
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
          color: isGhost ? `${themeColors.header}80` : themeColors.text,
          flex: isGhost ? 'none' : 1,
          textAlign: isGhost ? 'center' : 'left',
        }}>
          {headerLabel}
        </span>
        {isStackParent && !isGhost && (
          <div
            data-no-panel="true"
            onWheel={handleStackWheel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 6px',
              borderRadius: 999,
              background: 'rgba(26,26,46,0.15)',
              border: '1px solid rgba(26,26,46,0.25)',
              cursor: 'ns-resize',
            }}
            title="Scroll to switch stack member"
          >
            <span
              key={`stack-indicator-${stackActiveIndex}`}
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: themeColors.text,
                animation: 'stack-flash 160ms ease',
                minWidth: 28,
                textAlign: 'center',
              }}
            >
              {Math.min(stackActiveIndex + 1, stackCount)}/{stackCount}
            </span>
            <button
              type="button"
              data-no-panel="true"
              onClick={(e) => {
                e.stopPropagation();
                dispatchStackIndex(stackActiveIndex - 1);
              }}
              style={{
                border: 'none',
                background: 'rgba(26,26,46,0.25)',
                color: themeColors.text,
                width: 16,
                height: 16,
                borderRadius: 999,
                fontSize: 10,
                lineHeight: '16px',
                cursor: 'pointer',
              }}
            >
              ‹
            </button>
            <button
              type="button"
              data-no-panel="true"
              onClick={(e) => {
                e.stopPropagation();
                dispatchStackIndex(stackActiveIndex + 1);
              }}
              style={{
                border: 'none',
                background: 'rgba(26,26,46,0.25)',
                color: themeColors.text,
                width: 16,
                height: 16,
                borderRadius: 999,
                fontSize: 10,
                lineHeight: '16px',
                cursor: 'pointer',
              }}
            >
              ›
            </button>
          </div>
        )}
        {isStackParent && !isGhost && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: themeColors.text,
              background: 'rgba(255,255,255,0.7)',
              padding: '2px 6px',
              borderRadius: 999,
              marginRight: 4,
            }}
          >
            x{stackCount}
          </span>
        )}
        {selectedOutputItem && !isGhost && (
          <span style={{ fontSize: 11, fontWeight: 600, color: themeColors.text }}>
            {(displayData.production as number)}/min
          </span>
        )}
      </div>

      {/* Ghost Body - large centered icon */}
      {isGhost && (
        <div style={{
          padding: 12,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          gap: 6,
        }}>
          {(ghostItemIconUrl || iconUrl) && (
            <img
              src={ghostItemIconUrl || iconUrl}
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
          {isStackParent && (
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: `${themeColors.header}BF`,
                border: `1px dashed ${themeColors.header}80`,
                borderRadius: 999,
                padding: '2px 8px',
                letterSpacing: '0.4px',
              }}
            >
              x{stackCount}
            </div>
          )}
        </div>
      )}

      {/* Body - only when not collapsed and not ghost */}
      {!isCollapsed && !isGhost && (
        <div
          key={isStackParent ? `stack-body-${stackActiveIndex}` : 'stack-body'}
          style={{
            padding: 12,
            animation: isStackParent ? 'stack-swipe 180ms ease' : 'none',
          }}
        >
          {selectedBuilding?.category !== 'storage' ? (
            <>
              <div
                style={{
                  padding: 8,
                  backgroundColor: '#1a1a2e',
                  borderRadius: 4,
                  marginBottom: 8,
                }}
              >
                <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Produces
                    {altUsed && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: '#f59e0b',
                          padding: '1px 6px',
                          borderRadius: 999,
                          border: '1px solid rgba(245, 158, 11, 0.7)',
                          background: 'rgba(245, 158, 11, 0.12)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                        }}
                      >
                        Alt
                      </span>
                    )}
                  </span>
                  {requirementsMet !== null && (
                    <span
                      title={requirementsMet ? 'All inputs connected' : 'Missing inputs'}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 'bold',
                        color: requirementsMet ? '#2ecc71' : '#ef4444',
                        backgroundColor: requirementsMet ? 'rgba(46, 204, 113, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        border: `1px solid ${requirementsMet ? '#2ecc71' : '#ef4444'}`,
                      }}
                    >
                      {requirementsMet ? '✓' : '✗'}
                    </span>
                  )}
                </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {selectedOutputItem && !ui.hideAllImages && (() => {
                  const url = findItemIconUrl(selectedOutputItem);
                  if (!url) return null;
                  return (
                      <img
                        src={url}
                        alt=""
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          objectFit: 'cover',
                          background: '#0f172a',
                        }}
                      />
                    );
                  })()}
                <div style={{ fontSize: 14, fontWeight: 500, color: '#2ecc71', flex: 1 }}>
                  {selectedOutputItem ? selectedOutputItem.name : 'Not selected'}
                </div>
              </div>
              {requirementsMet === false && missingRequirements.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {missingRequirements.map((itemId) => {
                    const item = items.find(i => i.id === itemId);
                    const icon = item ? findItemIconUrl(item) : '';
                    return (
                      <div
                        key={itemId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 8px',
                          borderRadius: 6,
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.5)',
                        }}
                        title={item?.name || itemId}
                      >
                        {icon ? (
                          <img
                            src={icon}
                            alt=""
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 6,
                              objectFit: 'cover',
                              background: '#0f172a',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 6,
                              background: '#0f172a',
                              color: '#fecaca',
                              fontSize: 10,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            ?
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: '#fecaca' }}>
                          {item?.name || itemId}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            </>
          ) : (
            <div
              style={{
                padding: 8,
                backgroundColor: '#1a1a2e',
                borderRadius: 4,
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>
                Stored Item
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {selectedStoredItem && !ui.hideAllImages && (() => {
                  const url = findItemIconUrl(selectedStoredItem);
                  if (!url) return null;
                  return (
                    <img
                      src={url}
                      alt=""
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        objectFit: 'cover',
                        background: '#0f172a',
                      }}
                    />
                  );
                })()}
                <div style={{ fontSize: 14, fontWeight: 500, color: '#60a5fa' }}>
                  {selectedStoredItem ? selectedStoredItem.name : 'Not selected'}
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          {selectedBuilding?.category !== 'storage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Collapsible Inputs Section */}
              {showIoBlock && requiredInputs.length > 0 && (
                <div style={{ backgroundColor: '#1a1a2e', borderRadius: 6, overflow: 'hidden' }}>
                  <div
                    onClick={() => setInputsExpanded(!inputsExpanded)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 8px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      borderBottom: inputsExpanded ? '1px solid #333' : 'none',
                    }}
                  >
                    <span style={{ fontSize: 10, color: '#9ca3af', transition: 'transform 0.2s', transform: inputsExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                      ▶
                    </span>
                    <span style={{ fontSize: 11, color: '#9ca3af', flex: 1 }}>
                      Inputs ({requiredInputs.length})
                    </span>
                  </div>
                  {inputsExpanded && (
                    <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {requiredInputs.map((req, index) => {
                        const maxPerMin = Math.max(...requiredInputs.map(r => r.perMin));
                        const percentage = maxPerMin > 0 ? (req.perMin / maxPerMin) * 100 : 0;
                        const itemIcon = req.item ? findItemIconUrl(req.item) : '';
                        return (
                          <div key={`input-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {itemIcon && !ui.hideAllImages ? (
                              <img src={itemIcon} alt="" style={{ width: 18, height: 18, borderRadius: 3, objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: 18, height: 18, borderRadius: 3, background: '#333', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>?</div>
                            )}
                            <div style={{ flex: 1, height: 6, backgroundColor: '#333', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: '#f59e0b', borderRadius: 3, transition: 'width 0.3s' }} />
                            </div>
                            <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600, minWidth: 50, textAlign: 'right' }}>
                              {formatNum(req.perMin)}/m
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Output Display */}
              {showIoBlock && selectedOutputItem && (
                <div style={{
                  backgroundColor: '#1a1a2e',
                  borderRadius: 6,
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  border: '1px solid rgba(46, 204, 113, 0.3)',
                }}>
                  {!ui.hideAllImages && (() => {
                    const outputIcon = findItemIconUrl(selectedOutputItem);
                    if (!outputIcon) return null;
                    return (
                      <img src={outputIcon} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', background: '#0f172a' }} />
                    );
                  })()}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Output</div>
                    <div style={{ fontSize: 11, color: '#e5e7eb', fontWeight: 500 }}>{selectedOutputItem.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#2ecc71' }}>
                      {(displayData.production as number)}/min
                    </div>
                  </div>
                </div>
              )}
              {!ui.hideIoStats && (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 10,
                    color: '#9ca3af',
                    gap: 8,
                  }}
                >
                  Show I/O
                  <input
                    type="checkbox"
                    checked={showIoBlock}
                    onChange={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent('nodeDataChange', {
                        detail: { nodeId: id, field: 'showIo', value: e.target.checked }
                      }));
                    }}
                  />
                </label>
              )}
              {ui.showPower && (
                <div
                  style={{
                    padding: 8,
                    backgroundColor: '#1a1a2e',
                    borderRadius: 4,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 10, color: '#aaa' }}>Power</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#f1c40f' }}>
                    {(displayData.powerUsage as number)} MW
                  </div>
                </div>
              )}
            </div>
          )}

          {ui.showInventory && selectedBuilding && selectedBuilding.inventorySize !== undefined && (
            <div
              style={{
                marginTop: selectedBuilding.category !== 'storage' ? 8 : 0,
                padding: 8,
                backgroundColor: '#111827',
                borderRadius: 4,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>
                Inventory
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>
                {selectedBuilding.inventorySize} {selectedBuilding.inventoryUnit ?? ''}
              </div>
            </div>
          )}

          {/* Calculation Result Box - only for non-miner production buildings when setting enabled and item selected */}
          {ui.showProductionEfficiency && displayData.calcStatus && selectedOutputItem && selectedBuilding?.category !== 'storage' && !selectedBuilding?.id.startsWith('miner_') && (
            <div
              title={
                displayData.calcStatus === 'optimal' ? 'Input rate matches production demand' :
                displayData.calcStatus === 'under' ? `Not enough input! Needed: ${formatNum(displayData.calcDemand as number | undefined)}/min, Available: ${formatNum(displayData.calcSupply as number | undefined)}/min` :
                `More input than can be processed. Input: ${formatNum(displayData.calcSupply as number | undefined)}/min, Capacity: ${formatNum(displayData.calcDemand as number | undefined)}/min`
              }
              style={{
                marginTop: 8,
                padding: 8,
                backgroundColor: displayData.calcStatus === 'optimal' ? 'rgba(16, 185, 129, 0.15)' :
                  displayData.calcStatus === 'under' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(234, 179, 8, 0.15)',
                borderRadius: 4,
                border: displayData.calcStatus === 'optimal' ? '1px solid #10b981' :
                  displayData.calcStatus === 'under' ? '2px dashed #ef4444' : '1px solid #eab308',
                textAlign: 'center',
                boxShadow: displayData.calcStatus === 'under' ? 'inset 0 0 8px rgba(239, 68, 68, 0.3)' : 'none',
              }}
            >
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: displayData.calcStatus === 'optimal' ? '#10b981' :
                  displayData.calcStatus === 'under' ? '#ef4444' : '#eab308',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}>
                {displayData.calcStatus === 'optimal' ? (
                  <>✓ Optimal</>
                ) : displayData.calcStatus === 'under' ? (
                  <>
                    <span style={{ fontSize: 14 }}>⚠</span>
                    Inefficient
                  </>
                ) : (
                  <>⚡ Overproduction</>
                )}
              </div>
              <div style={{
                fontSize: 9,
                color: '#b0b0b0',
                marginTop: 2,
              }}>
                Input: {formatNum(displayData.calcSupply as number | undefined)}/min → Demand: {formatNum(displayData.calcDemand as number | undefined)}/min
              </div>
            </div>
          )}

          <div style={{ fontSize: 10, color: '#666', marginTop: 8, textAlign: 'center' }}>
            Click to edit
          </div>
        </div>
      )}

      {/* Output Handle */}
      {hasOutput && outputTypes.map((type, index) => (
        <Handle
          key={`output-${type}-${index}`}
          type="source"
          position={Position.Right}
          id={`out-${type}-${index}`}
          style={{
            ...getHandleStyle(type),
            top: outputCount === 1 ? '50%' : `${25 + (index * (50 / Math.max(outputCount - 1, 1)))}%`,
          }}
        />
      ))}
        </div>
      </div>
    </>
  );
});

SimpleBuildingNode.displayName = 'SimpleBuildingNode';

export default SimpleBuildingNode;
