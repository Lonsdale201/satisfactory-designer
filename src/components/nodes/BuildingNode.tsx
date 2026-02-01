import { memo, useCallback, useEffect, useState } from 'react';
import { Handle, useUpdateNodeInternals } from '@xyflow/react';
import {
  Box,
  Paper,
  Typography,
  Autocomplete,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
  Slider,
} from '@mui/material';
import * as Icons from '@mui/icons-material';
import { Building, Item } from '../../types';
import buildingsData from '../../data/buildings.json';
import itemsData from '../../data/items.json';
import { getRotatedHandlePosition, getRotatedHandleStyle } from '../../utils/handleRotation';

const buildings: Building[] = buildingsData.buildings as Building[];
const items: Item[] = itemsData.items;

interface BuildingNodeProps {
  id: string;
  data: {
    label: string;
    buildingId: string;
    production: number;
    customProduction: boolean;
    outputItem: string;
    powerUsage: number;
    collapsed?: boolean;
    hasInput?: boolean;
    hasOutput?: boolean;
    inputCount?: number;
    handleRotation?: number;
  };
}

const getIconComponent = (iconName: string): React.ComponentType<{ sx?: object }> => {
  const pascalCase = iconName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  return (Icons as Record<string, React.ComponentType<{ sx?: object }>>)[pascalCase] || Icons.Build;
};

const BuildingNodeComponent = memo(({ data, id }: BuildingNodeProps) => {
  const [customMode, setCustomMode] = useState(data.customProduction || false);
  const updateNodeInternals = useUpdateNodeInternals();

  const selectedBuilding = buildings.find(b => b.id === data.buildingId);
  const selectedOutputItem = items.find(i => i.id === data.outputItem);
  const isCollapsed = data.collapsed ?? false;
  const hasInput = data.hasInput ?? true;
  const hasOutput = data.hasOutput ?? true;
  const inputCount = data.inputCount ?? (selectedBuilding?.inputs || 1);
  const handleRotation = (data.handleRotation as number | undefined) ?? 0;

  useEffect(() => {
    updateNodeInternals(id);
  }, [handleRotation, inputCount, updateNodeInternals, id]);

  const availableOutputs = selectedBuilding
    ? items.filter(item => selectedBuilding.outputs.includes(item.id))
    : [];

  const IconComponent = selectedBuilding
    ? getIconComponent(selectedBuilding.icon)
    : Icons.Build;

  const dispatchChange = useCallback((field: string, value: unknown) => {
    const event = new CustomEvent('nodeDataChange', {
      detail: { nodeId: id, field, value }
    });
    window.dispatchEvent(event);
  }, [id]);

  const handleBuildingChange = useCallback((_: unknown, newValue: Building | null) => {
    if (newValue) {
      dispatchChange('buildingId', newValue.id);
      dispatchChange('production', newValue.defaultProduction);
      dispatchChange('powerUsage', newValue.defaultPower);
      dispatchChange('outputItem', '');
      dispatchChange('inputCount', newValue.inputs || 1);
    }
  }, [dispatchChange]);

  const handleProductionChange = useCallback((event: SelectChangeEvent<number>) => {
    dispatchChange('production', event.target.value);
  }, [dispatchChange]);

  const handleCustomProductionChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value) || 0;
    dispatchChange('production', value);
  }, [dispatchChange]);

  const handleOutputChange = useCallback((_: unknown, newValue: Item | null) => {
    dispatchChange('outputItem', newValue?.id || '');
  }, [dispatchChange]);

  const handlePowerChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    dispatchChange('powerUsage', parseFloat(event.target.value) || 0);
  }, [dispatchChange]);

  const handleCustomModeToggle = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setCustomMode(event.target.checked);
    dispatchChange('customProduction', event.target.checked);
  }, [dispatchChange]);

  const handleToggleCollapse = useCallback(() => {
    dispatchChange('collapsed', !isCollapsed);
  }, [dispatchChange, isCollapsed]);

  const handleInputCountChange = useCallback((_: Event, value: number | number[]) => {
    dispatchChange('inputCount', value as number);
  }, [dispatchChange]);

  return (
    <Paper
      elevation={3}
      sx={{
        minWidth: isCollapsed ? 200 : 260,
        bgcolor: '#252836',
        border: '2px solid #fa9549',
        borderRadius: 2,
      }}
    >
      {/* Input Handles */}
      {hasInput && Array.from({ length: inputCount }).map((_, index) => {
        const baseY =
          inputCount === 1 ? 50 : 25 + (index * (50 / Math.max(inputCount - 1, 1)));
        return (
          <Handle
            key={`input-${index}`}
            type="target"
            position={getRotatedHandlePosition({ x: 0, y: baseY }, handleRotation)}
            id={`input-${index}`}
            className="handle-input"
            style={{
              width: 12,
              height: 12,
              ...getRotatedHandleStyle({ x: 0, y: baseY }, handleRotation),
            }}
          />
        );
      })}

      {/* Output Handle */}
      {hasOutput && (
        <Handle
          type="source"
          position={getRotatedHandlePosition({ x: 100, y: 50 }, handleRotation)}
          id="output-0"
          className="handle-output"
          style={{
            width: 12,
            height: 12,
            ...getRotatedHandleStyle({ x: 100, y: 50 }, handleRotation),
          }}
        />
      )}

      {/* Header */}
      <Box
        onDoubleClick={handleToggleCollapse}
        sx={{
          bgcolor: '#fa9549',
          px: 1.5,
          py: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderRadius: isCollapsed ? '6px' : '6px 6px 0 0',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <IconComponent sx={{ fontSize: 20, color: '#1a1a2e' }} />
        <Typography variant="subtitle2" fontWeight="bold" color="#1a1a2e" sx={{ flexGrow: 1 }}>
          {isCollapsed && selectedBuilding ? selectedBuilding.name : 'Building'}
        </Typography>
        {isCollapsed && selectedOutputItem && (
          <Typography variant="caption" fontWeight="bold" color="#1a1a2e">
            {selectedOutputItem.name} {data.production}/min
          </Typography>
        )}
        <Tooltip title={isCollapsed ? 'Expand' : 'Collapse'}>
          <IconButton size="small" onClick={handleToggleCollapse} sx={{ p: 0.25 }}>
            {isCollapsed ? (
              <Icons.ExpandMore sx={{ fontSize: 18, color: '#1a1a2e' }} />
            ) : (
              <Icons.ExpandLess sx={{ fontSize: 18, color: '#1a1a2e' }} />
            )}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Body */}
      {!isCollapsed && (
        <Box sx={{ p: 1.5 }}>
          <Autocomplete
            size="small"
            options={buildings}
            getOptionLabel={(option) => option.name}
            value={selectedBuilding || null}
            onChange={handleBuildingChange}
            renderOption={(props, option) => {
              const { key, ...rest } = props as { key: string } & Record<string, unknown>;
              const Icon = getIconComponent(option.icon);
              return (
                <Box component="li" key={key} {...rest} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Icon sx={{ fontSize: 18, color: '#fa9549' }} />
                  {option.name}
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Building"
                variant="outlined"
                sx={{
                  mb: 1.5,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#1a1a2e',
                    color: '#fff',
                  },
                  '& .MuiInputLabel-root': { color: '#aaa' },
                }}
              />
            )}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={customMode}
                  onChange={handleCustomModeToggle}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#2ecc71',
                    },
                  }}
                />
              }
              label={<Typography variant="caption" color="#aaa">Custom Rate</Typography>}
            />
          </Box>

          {!customMode ? (
            <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
              <InputLabel sx={{ color: '#aaa' }}>Production</InputLabel>
              <Select
                value={data.production || selectedBuilding?.defaultProduction || 0}
                label="Production"
                onChange={handleProductionChange}
                sx={{
                  bgcolor: '#1a1a2e',
                  color: '#fff',
                  '& .MuiSelect-icon': { color: '#aaa' },
                }}
              >
                {(selectedBuilding?.productionOptions || []).map((rate) => (
                  <MenuItem key={rate} value={rate}>
                    {rate}/min
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Production (/min)"
              value={data.production || 0}
              onChange={handleCustomProductionChange}
              sx={{
                mb: 1.5,
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#1a1a2e',
                  color: '#fff',
                },
                '& .MuiInputLabel-root': { color: '#aaa' },
              }}
            />
          )}

          <Autocomplete
            size="small"
            options={availableOutputs}
            getOptionLabel={(option) => option.name}
            value={selectedOutputItem || null}
            onChange={handleOutputChange}
            renderOption={(props, option) => {
              const { key, ...rest } = props as { key: string } & Record<string, unknown>;
              const Icon = getIconComponent(option.icon);
              return (
                <Box component="li" key={key} {...rest} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Icon sx={{ fontSize: 18, color: '#2ecc71' }} />
                  {option.name}
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Produces"
                variant="outlined"
                sx={{
                  mb: 1.5,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#1a1a2e',
                    color: '#fff',
                  },
                  '& .MuiInputLabel-root': { color: '#aaa' },
                }}
              />
            )}
          />

          <TextField
            fullWidth
            size="small"
            type="number"
            label="Power (MW)"
            value={data.powerUsage || 0}
            onChange={handlePowerChange}
            sx={{
              mb: 1.5,
              '& .MuiOutlinedInput-root': {
                bgcolor: '#1a1a2e',
                color: '#fff',
              },
              '& .MuiInputLabel-root': { color: '#aaa' },
            }}
          />

          {/* Connection toggles */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="caption" color="#aaa" sx={{ mr: 0.5 }}>Input</Typography>
              <Switch
                size="small"
                checked={hasInput}
                onChange={(e) => dispatchChange('hasInput', e.target.checked)}
                sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#e74c3c' } }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="caption" color="#aaa" sx={{ mr: 0.5 }}>Output</Typography>
              <Switch
                size="small"
                checked={hasOutput}
                onChange={(e) => dispatchChange('hasOutput', e.target.checked)}
                sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#2ecc71' } }}
              />
            </Box>
          </Box>

          {/* Input count slider */}
          {hasInput && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="#aaa">
                Input Slots: {inputCount}
              </Typography>
              <Slider
                size="small"
                value={inputCount}
                min={1}
                max={6}
                onChange={handleInputCountChange}
                sx={{
                  color: '#e74c3c',
                  '& .MuiSlider-thumb': { bgcolor: '#e74c3c' },
                }}
              />
            </Box>
          )}

          <Box
            sx={{
              p: 1,
              bgcolor: '#1a1a2e',
              borderRadius: 1,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <Box textAlign="center">
              <Typography variant="caption" color="#aaa">
                Output
              </Typography>
              <Typography variant="body2" color="#2ecc71" fontWeight="bold">
                {data.production || 0}/min
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="caption" color="#aaa">
                Power
              </Typography>
              <Typography variant="body2" color="#e74c3c" fontWeight="bold">
                {data.powerUsage || 0} MW
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

    </Paper>
  );
});

BuildingNodeComponent.displayName = 'BuildingNode';

export default BuildingNodeComponent;
