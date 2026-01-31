import { memo } from 'react';
import { NodeProps, NodeResizer } from '@xyflow/react';
import itemsData from '../../data/items.json';
import { useUiSettings } from '../../contexts/UiSettingsContext';

const itemImageMap = import.meta.glob('../../assets/items/*', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const resourceImageMap = import.meta.glob('../../assets/resources/*', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

const findIconUrl = (id: string, name: string) => {
  const idKey = normalizeKey(id);
  const nameKey = normalizeKey(name);
  const entry = Object.entries(itemImageMap).find(([path]) => {
    const fileKey = normalizeKey((path.split('/').pop() || path).replace(/\.[^/.]+$/, ''));
    return fileKey === idKey || fileKey === nameKey;
  });
  if (entry) return entry[1];
  const resEntry = Object.entries(resourceImageMap).find(([path]) => {
    const fileKey = normalizeKey((path.split('/').pop() || path).replace(/\.[^/.]+$/, ''));
    return fileKey === idKey || fileKey === nameKey;
  });
  return resEntry ? resEntry[1] : '';
};

const hexToRgba = (hex: string, alpha: number) => {
  const clean = hex.replace('#', '');
  const value = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const num = parseInt(value, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

function SimpleGroupNode({ id, data, selected }: NodeProps) {
  const ui = useUiSettings();
  const label = (data.label as string) || 'Production line';
  const color = (data.color as string) || '#1f2937';
  const summaryItems = (data.summaryItems as Array<{ id: string; name: string; count: number; rate: number; activeCount: number }> | undefined) || [];
  const totalPower = (data.totalPower as number | undefined) || 0;
  const targetPower = (data.targetPower as number | undefined) || 0;
  const isOverTarget = targetPower > 0 && totalPower > targetPower;
  const isGhost = (data.isGhost as boolean) || false;
  const lockChildren = (data.lockChildren as boolean) ?? true;
  const formatNum = (value: number) => (value % 1 === 0 ? value.toFixed(0) : value.toFixed(1));

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 12,
        background: hexToRgba(color, isGhost ? 0.08 : 0.12),
        border: selected ? `3px solid ${color}` : `2px dashed ${color}`,
        boxShadow: 'none',
        padding: 10,
        fontFamily: 'Inter, sans-serif',
        position: 'relative',
      }}
    >
      <NodeResizer
        color={color}
        isVisible={selected}
        minWidth={220}
        minHeight={160}
        handleStyle={{
          width: 10,
          height: 10,
          borderRadius: 4,
          border: `1px solid ${color}`,
          background: '#0f172a',
        }}
        lineStyle={{
          borderColor: `${color}66`,
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, color }}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            {label}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            {summaryItems.length > 0 ? `Power ${formatNum(totalPower)} MW` : ''}
          </div>
        </div>
        {!isGhost && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              data-no-panel="true"
              onClick={(event) => {
                event.stopPropagation();
                const custom = new CustomEvent('groupSummary', { detail: { nodeId: id } });
                window.dispatchEvent(custom);
              }}
              style={{
                border: `1px solid ${color}`,
                color,
                background: 'transparent',
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                cursor: 'pointer',
              }}
            >
              Get Summary
            </button>
            <button
              type="button"
              data-no-panel="true"
              onClick={(event) => {
                event.stopPropagation();
                const next = !lockChildren;
                const custom = new CustomEvent('nodeDataChange', {
                  detail: { nodeId: id, field: 'lockChildren', value: next },
                });
                window.dispatchEvent(custom);
              }}
              style={{
                border: `1px solid ${color}`,
                color,
                background: lockChildren ? hexToRgba(color, 0.25) : 'transparent',
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                cursor: 'pointer',
              }}
            >
              {lockChildren ? 'Locked' : 'Unlocked'}
            </button>
          </div>
        )}
      </div>
      {summaryItems.length === 0 ? (
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          No summary yet. Click "Get Summary".
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, color: '#cbd5f5', marginBottom: 6 }}>
            This production line produces total ({summaryItems.length} types):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {summaryItems.map((item) => {
              const iconUrl = findIconUrl(item.id, item.name);
                  const isInactive = item.activeCount < item.count;
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 6px',
                        borderRadius: 8,
                        background: isInactive ? 'rgba(239, 68, 68, 0.12)' : '#0f172a',
                        border: isInactive ? '1px solid rgba(239, 68, 68, 0.55)' : `1px solid ${color}55`,
                      }}
                    >
                      {!ui.hideAllImages && (
                        iconUrl ? (
                          <img
                            src={iconUrl}
                            alt=""
                            style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ width: 18, height: 18, borderRadius: 4, background: '#1f2937' }} />
                        )
                      )}
                  <div style={{ fontSize: 11, color: isInactive ? '#fecaca' : '#e2e8f0' }}>
                    {item.name} x{item.count} ({formatNum(item.rate)}/min)
                  </div>
                    </div>
                  );
            })}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: isOverTarget ? '#f87171' : '#94a3b8' }}>
            Total power: {formatNum(totalPower)} MW
            {targetPower > 0 && (
              <> | Target: {formatNum(targetPower)} MW {isOverTarget ? '(Exceeded)' : '(Within limit)'}</>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default memo(SimpleGroupNode);
