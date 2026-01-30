import { useCallback, useMemo, memo } from 'react';
import {
  Box,
  Drawer,
  Typography,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Autocomplete,
  Button,
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import { SelectChangeEvent } from '@mui/material/Select';
import { Node } from '@xyflow/react';
import { Building, Item, PurityType, Resource } from '../../types';
import buildingsData from '../../data/buildings.json';
import itemsData from '../../data/items.json';
import resourcesData from '../../data/resources.json';
import { PROJECT_ASSEMBLY_ITEM_IDS } from '../nodes/GoalNode';

const buildings: Building[] = buildingsData.buildings as Building[];
const items: Item[] = itemsData.items;
const resources: Resource[] = resourcesData.resources;
const purityTypes: PurityType[] = resourcesData.purityTypes;

const groupColors = [
  { label: 'Blue', value: '#0ea5e9' },
  { label: 'Teal', value: '#14b8a6' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Slate', value: '#64748b' },
];

interface NodeEditorPanelProps {
  node: Pick<Node, 'id' | 'type' | 'data'> | null;
  onClose: () => void;
  onDelete?: (nodeId: string) => void;
  onDuplicate?: (nodeId: string) => void;
}

const getIconComponent = (iconName: string): React.ComponentType<{ sx?: object }> => {
  const pascalCase = iconName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  return (MuiIcons as Record<string, React.ComponentType<{ sx?: object }>>)[pascalCase] || MuiIcons.Category;
};

const drawerPaperSx = {
  width: 300,
  bgcolor: '#111827',
  color: '#fff',
  borderLeft: '1px solid #1f2937',
} as const;

function NodeEditorPanel({ node, onClose, onDelete, onDuplicate }: NodeEditorPanelProps) {
  if (!node) return null;

  const isOpen = true;

  const dispatchChange = useCallback((field: string, value: unknown) => {
    if (!node) return;
    const event = new CustomEvent('nodeDataChange', {
      detail: { nodeId: node.id, field, value },
    });
    window.dispatchEvent(event);
  }, [node]);

  const nodeData = node?.data as Record<string, unknown> | undefined;

  const selectedResource = useMemo(() => {
    if (!node || node.type !== 'resource') return null;
    return resources.find(r => r.id === nodeData?.resourceId);
  }, [node, nodeData?.resourceId]);

  const selectedPurity = useMemo(() => {
    if (!node || node.type !== 'resource') return null;
    return purityTypes.find(p => p.id === nodeData?.purity);
  }, [node, nodeData?.purity]);

  const selectedBuilding = useMemo(() => {
    if (!node || node.type !== 'building') return null;
    return buildings.find(b => b.id === nodeData?.buildingId);
  }, [node, nodeData?.buildingId]);

  const selectedOutputItem = useMemo(() => {
    if (!node || node.type !== 'building') return null;
    return items.find(i => i.id === nodeData?.outputItem);
  }, [node, nodeData?.outputItem]);

  const selectedStoredItem = useMemo(() => {
    if (!node || node.type !== 'building') return null;
    return items.find(i => i.id === nodeData?.storedItem);
  }, [node, nodeData?.storedItem]);

  const selectedDeliveryItem = useMemo(() => {
    if (!node || node.type !== 'transport') return null;
    return items.find(i => i.id === nodeData?.deliveryItem);
  }, [node, nodeData?.deliveryItem]);

  const groupColorValue = (nodeData?.color as string) || '#0ea5e9';
  const nodeThemeValue = (nodeData?.theme as string) || '';

  const themeOptions = [
    { label: 'Default', value: '' },
    { label: 'Dark', value: 'dark' },
    { label: 'Orange', value: 'orange' },
    { label: 'Blue', value: 'blue' },
    { label: 'Purple', value: 'purple' },
    { label: 'Slate', value: 'slate' },
    { label: 'Green', value: 'green' },
    { label: 'Rose', value: 'rose' },
    { label: 'Teal', value: 'teal' },
    { label: 'Amber', value: 'amber' },
    { label: 'Indigo', value: 'indigo' },
  ];

  const transportItems = useMemo(() => {
    return items.filter((item) => item.category !== 'fluid');
  }, []);

  const availableOutputs = useMemo(() => {
    if (!selectedBuilding) return [];
    if (selectedBuilding.fixedOutput) {
      return items.filter((item) => item.id === selectedBuilding.fixedOutput);
    }
    const inputs = selectedBuilding.inputs ?? 1;
    const outputTypes = selectedBuilding.outputTypes ?? ['conveyor'];
    const hasPipeOutput = outputTypes.includes('pipe');

    // Special filtering for Smelter and Foundry
    const smelterAllowedItems = ['caterium_ingot', 'copper_ingot', 'iron_ingot', 'aluminum_ingot'];
    const foundryAllowedItems = ['steel_ingot', 'aluminum_ingot'];

    return items.filter((item) => {
      // Exclude fluids and ores for smelter and foundry
      if (selectedBuilding.id === 'smelter' || selectedBuilding.id === 'foundry') {
        if (item.category === 'fluid' || item.category === 'ore') return false;
      }

      // Smelter specific filtering
      if (selectedBuilding.id === 'smelter') {
        return smelterAllowedItems.includes(item.id);
      }

      // Foundry specific filtering
      if (selectedBuilding.id === 'foundry') {
        return foundryAllowedItems.includes(item.id);
      }

      if (selectedBuilding.id === 'constructor') {
        return item.producers?.includes('constructor') || false;
      }

      if (selectedBuilding.id === 'assembler') {
        return item.producers?.includes('assembler') || false;
      }

      if (selectedBuilding.id === 'manufacturer') {
        return item.producers?.includes('manufacturer') || false;
      }

      // General filtering for other buildings
      if (item.producers && !item.producers.includes(selectedBuilding.id)) return false;
      if (item.inputCount && item.inputCount > inputs) return false;
      if (item.category === 'fluid' && !hasPipeOutput) return false;
      return true;
    });
  }, [selectedBuilding]);

  const buildingTypeOptions = useMemo(() => {
    if (!selectedBuilding) return [];
    // If it's a miner, show all miner variants
    if (selectedBuilding.id.startsWith('miner_')) {
      return buildings.filter(b => b.id.startsWith('miner_'));
    }
    // For other buildings, only show the current one (disabled anyway)
    return [selectedBuilding];
  }, [selectedBuilding]);

  const displayRate = selectedPurity
    ? 60 * selectedPurity.multiplier
    : (nodeData?.outputRate as number) || 60;

  const isCollapsed = Boolean(nodeData?.collapsed);
  const customProduction = Boolean(nodeData?.customProduction);
  const hasPipe = Boolean(
    selectedBuilding?.inputTypes?.includes('pipe') ||
    selectedBuilding?.outputTypes?.includes('pipe'),
  );

  const handleResourceChange = useCallback((_: unknown, newValue: Resource | null) => {
    if (!newValue) return;
    dispatchChange('resourceId', newValue.id);
    const purity = purityTypes.find(p => p.id === nodeData?.purity);
    const baseRate = 60;
    const outputRate = baseRate * (purity?.multiplier || 1);
    dispatchChange('outputRate', outputRate);
  }, [dispatchChange, nodeData?.purity]);

  const handlePurityChange = useCallback((event: SelectChangeEvent) => {
    const value = event.target.value as string;
    dispatchChange('purity', value);
    const purity = purityTypes.find(p => p.id === value);
    const baseRate = 60;
    const outputRate = baseRate * (purity?.multiplier || 1);
    dispatchChange('outputRate', outputRate);
  }, [dispatchChange]);

  const handleBuildingChange = useCallback((_: unknown, newValue: Building | null) => {
    if (!newValue) return;
    const isFromMiner = selectedBuilding?.id.startsWith('miner_');
    const isToMiner = newValue.id.startsWith('miner_');

    dispatchChange('buildingId', newValue.id);
    dispatchChange('production', newValue.defaultProduction);
    dispatchChange('powerUsage', newValue.defaultPower);

    // Don't reset outputItem when switching between miners
    if (!(isFromMiner && isToMiner)) {
      dispatchChange('outputItem', newValue.fixedOutput || '');
    }

    dispatchChange('inputCount', newValue.inputs || 1);
  }, [dispatchChange, selectedBuilding]);

  const handleProductionSelect = useCallback((event: SelectChangeEvent) => {
    dispatchChange('production', Number(event.target.value));
  }, [dispatchChange]);

  const handleCustomProductionChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10) || 0;
    dispatchChange('production', value);
  }, [dispatchChange]);

  const handleOutputChange = useCallback((_: unknown, newValue: Item | null) => {
    dispatchChange('outputItem', newValue?.id || '');
    if (newValue?.defaultProduction) {
      dispatchChange('production', newValue.defaultProduction);
    }
  }, [dispatchChange]);

  const handlePowerChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    dispatchChange('powerUsage', parseFloat(event.target.value) || 0);
  }, [dispatchChange]);

  const handleConveyorMkChange = useCallback((event: SelectChangeEvent) => {
    dispatchChange('conveyorMk', Number(event.target.value));
  }, [dispatchChange]);

  const handlePipeMkChange = useCallback((event: SelectChangeEvent) => {
    dispatchChange('pipeMk', Number(event.target.value));
  }, [dispatchChange]);

  const handleTransportOutputCountChange = useCallback((event: SelectChangeEvent) => {
    dispatchChange('outputCount', Number(event.target.value));
  }, [dispatchChange]);

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={onClose}
      PaperProps={{ sx: drawerPaperSx }}
      variant="persistent"
      ModalProps={{ hideBackdrop: true }}
    >
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="caption" color="#9ca3af" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
          Node Settings
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {node?.type === 'resource' && (selectedResource?.name || 'Resource Node')}
            {node?.type === 'building' && (selectedBuilding?.name || 'Building')}
            {node?.type === 'group' && ((nodeData?.label as string) || 'Production line')}
            {node?.type === 'transport' && ((nodeData?.label as string) || 'Transport')}
            {node?.type === 'smartSplitter' && ((nodeData?.customLabel as string) || 'Smart Splitter')}
            {node?.type === 'goal' && ((nodeData?.customLabel as string) || 'Production Goal')}
            {node?.type === 'conveyorLift' && ((nodeData?.customLabel as string) || `Conveyor Lift Mk.${(nodeData?.liftMk as number) || 1}`)}
          </Typography>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={!isCollapsed}
                onChange={(e) => dispatchChange('collapsed', !e.target.checked)}
                sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#2ecc71' } }}
              />
            }
            label={<Typography variant="caption" color="#9ca3af" sx={{ fontSize: 10 }}>Expanded</Typography>}
            sx={{ m: 0 }}
          />
        </Box>
      </Box>

      <Divider sx={{ borderColor: '#1f2937' }} />

      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* General Settings */}
        <Box
          component="fieldset"
          sx={{
            border: '1px solid #1f2937',
            borderRadius: 1,
            p: 1.5,
            m: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          <Typography component="legend" variant="caption" sx={{ color: '#9ca3af', px: 0.5 }}>
            General
          </Typography>

          {node?.type !== 'group' ? (
            <TextField
              size="small"
              label="Custom Name"
              value={(nodeData?.customLabel as string) || ''}
              onChange={(e) => dispatchChange('customLabel', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#0f172a',
                  color: '#fff',
                },
                '& .MuiInputLabel-root': { color: '#9ca3af' },
              }}
            />
          ) : (
            <>
              <TextField
                size="small"
                label="Group Name"
                value={(nodeData?.label as string) || ''}
                onChange={(e) => dispatchChange('label', e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#0f172a',
                    color: '#fff',
                  },
                  '& .MuiInputLabel-root': { color: '#9ca3af' },
                }}
              />
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#aaa' }}>Color</InputLabel>
                <Select
                  value={groupColorValue}
                  label="Color"
                  onChange={(e) => dispatchChange('color', e.target.value)}
                  sx={{
                    bgcolor: '#0f172a',
                    color: '#fff',
                    '& .MuiSelect-icon': { color: '#aaa' },
                  }}
                >
                  {groupColors.map((color) => (
                    <MenuItem key={color.value} value={color.value}>
                      {color.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  const custom = new CustomEvent('groupSummary', { detail: { nodeId: node.id } });
                  window.dispatchEvent(custom);
                }}
                sx={{
                  borderColor: groupColorValue,
                  color: groupColorValue,
                  '&:hover': { borderColor: groupColorValue, bgcolor: `${groupColorValue}22` },
                }}
              >
                Get Summary
              </Button>
            </>
          )}
          {node?.type !== 'group' && (
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#aaa' }}>Theme</InputLabel>
              <Select
                value={nodeThemeValue}
                label="Theme"
                onChange={(e) => dispatchChange('theme', e.target.value)}
                sx={{
                  bgcolor: '#0f172a',
                  color: '#fff',
                  '& .MuiSelect-icon': { color: '#aaa' },
                }}
              >
                {themeOptions.map((theme) => (
                  <MenuItem key={theme.value} value={theme.value}>
                    {theme.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        {node?.type === 'resource' && (
          <Box
            component="fieldset"
            sx={{
              border: '1px solid #1f2937',
              borderRadius: 1,
              p: 1.5,
              m: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            <Typography component="legend" variant="caption" sx={{ color: '#9ca3af', px: 0.5 }}>
              Resource Settings
            </Typography>

            <Autocomplete
              size="small"
              options={resources}
              getOptionLabel={(option) => option.name}
              value={selectedResource || null}
              onChange={handleResourceChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Resource"
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#0f172a',
                      color: '#fff',
                    },
                    '& .MuiInputLabel-root': { color: '#9ca3af' },
                  }}
                />
              )}
            />

            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#aaa' }}>Purity</InputLabel>
              <Select
                value={(nodeData?.purity as string) || 'normal'}
                label="Purity"
                onChange={handlePurityChange}
                sx={{
                  bgcolor: '#0f172a',
                  color: '#fff',
                  '& .MuiSelect-icon': { color: '#aaa' },
                }}
              >
                {purityTypes.map((purity) => (
                  <MenuItem key={purity.id} value={purity.id}>
                    {purity.name} ({purity.multiplier}x)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box
              sx={{
                p: 1.5,
                bgcolor: '#16213e',
                borderRadius: 1,
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" color="#888">
                Output Rate
              </Typography>
              <Typography variant="h6" color="#fa9549">
                {displayRate}/min
              </Typography>
            </Box>
          </Box>
        )}

        {node?.type === 'transport' && (
          <>
            <Box
              component="fieldset"
              sx={{
                border: '1px solid #1f2937',
                borderRadius: 1,
                p: 1.5,
                m: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Typography component="legend" variant="caption" sx={{ color: '#9ca3af', px: 0.5 }}>
                Transport Settings
              </Typography>

              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#aaa' }}>Vehicle</InputLabel>
                <Select
                  value={(nodeData?.vehicle as string) || 'truck'}
                  label="Vehicle"
                  onChange={(e) => dispatchChange('vehicle', e.target.value)}
                  sx={{
                    bgcolor: '#0f172a',
                    color: '#fff',
                    '& .MuiSelect-icon': { color: '#aaa' },
                  }}
                >
                  <MenuItem value="truck">Truck</MenuItem>
                  <MenuItem value="tractor">Tractor</MenuItem>
                  <MenuItem value="drone">Drone</MenuItem>
                </Select>
              </FormControl>

              <Autocomplete
                size="small"
                options={transportItems}
                getOptionLabel={(option) => option.name}
                value={selectedDeliveryItem || null}
                onChange={(_, newValue) => dispatchChange('deliveryItem', newValue?.id || '')}
                renderOption={(props, option) => {
                  const { key, ...rest } = props as { key: string } & Record<string, unknown>;
                  const Icon = getIconComponent(option.icon);
                  return (
                    <Box component="li" key={key} {...rest} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Icon sx={{ fontSize: 18, color: '#60a5fa' }} />
                      {option.name}
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Delivery Item"
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: '#0f172a',
                        color: '#fff',
                      },
                      '& .MuiInputLabel-root': { color: '#9ca3af' },
                    }}
                  />
                )}
              />

              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#9ca3af' }}>Output Conveyors</InputLabel>
                <Select
                  value={(nodeData?.outputCount as number) || 1}
                  label="Output Conveyors"
                  onChange={handleTransportOutputCountChange}
                  sx={{
                    bgcolor: '#0f172a',
                    color: '#fff',
                    '& .MuiSelect-icon': { color: '#9ca3af' },
                  }}
                >
                  <MenuItem value={1}>1 conveyor</MenuItem>
                  <MenuItem value={2}>2 conveyors</MenuItem>
                  <MenuItem value={3}>3 conveyors</MenuItem>
                  <MenuItem value={4}>4 conveyors</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box
              component="fieldset"
              sx={{
                border: '1px solid #1f2937',
                borderRadius: 1,
                p: 1.5,
                m: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Typography component="legend" variant="caption" sx={{ color: '#9ca3af', px: 0.5 }}>
                Conveyor Settings
              </Typography>

              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#9ca3af' }}>Conveyor</InputLabel>
                <Select
                  value={(nodeData?.conveyorMk as number) || 1}
                  label="Conveyor"
                  onChange={handleConveyorMkChange}
                  sx={{
                    bgcolor: '#0f172a',
                    color: '#fff',
                    '& .MuiSelect-icon': { color: '#9ca3af' },
                  }}
                >
                  <MenuItem value={1}>Mk.1 (60/min)</MenuItem>
                  <MenuItem value={2}>Mk.2 (120/min)</MenuItem>
                  <MenuItem value={3}>Mk.3 (270/min)</MenuItem>
                  <MenuItem value={4}>Mk.4 (480/min)</MenuItem>
                  <MenuItem value={5}>Mk.5 (780/min)</MenuItem>
                  <MenuItem value={6}>Mk.6 (1200/min)</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </>
        )}

        {node?.type === 'smartSplitter' && (
          <>
            {/* Smart Splitter Settings */}
            <Box
              component="fieldset"
              sx={{
                border: '1px solid #1f2937',
                borderRadius: 1,
                p: 1.5,
                m: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Typography component="legend" variant="caption" sx={{ color: '#9ca3af', px: 0.5 }}>
                Output Conveyors
              </Typography>

              {(['Top', 'Right', 'Bottom'] as const).map((label, index) => {
                const splitOutputs = (nodeData?.splitOutputs as Array<{ item: string | null; conveyorMk: number }>) || [
                  { item: null, conveyorMk: 1 },
                  { item: null, conveyorMk: 1 },
                  { item: null, conveyorMk: 1 },
                ];
                const output = splitOutputs[index] || { item: null, conveyorMk: 1 };
                return (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: '#9ca3af', width: 50 }}>
                      {label}
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={output.conveyorMk}
                        onChange={(e) => {
                          const newOutputs = [...splitOutputs];
                          newOutputs[index] = { ...newOutputs[index], conveyorMk: Number(e.target.value) };
                          dispatchChange('splitOutputs', newOutputs);
                        }}
                        sx={{
                          bgcolor: '#0f172a',
                          color: '#fff',
                          '& .MuiSelect-icon': { color: '#9ca3af' },
                        }}
                      >
                        <MenuItem value={1}>Mk.1 (60/min)</MenuItem>
                        <MenuItem value={2}>Mk.2 (120/min)</MenuItem>
                        <MenuItem value={3}>Mk.3 (270/min)</MenuItem>
                        <MenuItem value={4}>Mk.4 (480/min)</MenuItem>
                        <MenuItem value={5}>Mk.5 (780/min)</MenuItem>
                        <MenuItem value={6}>Mk.6 (1200/min)</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                );
              })}
            </Box>

            <Box
              component="fieldset"
              sx={{
                border: '1px solid #1f2937',
                borderRadius: 1,
                p: 1.5,
                m: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Typography component="legend" variant="caption" sx={{ color: '#9ca3af', px: 0.5 }}>
                Item Filters (Optional)
              </Typography>
              <Typography variant="caption" sx={{ color: '#666', fontSize: 10 }}>
                Items are auto-assigned based on connected buildings
              </Typography>

              {(['Top', 'Right', 'Bottom'] as const).map((label, index) => {
                const splitOutputs = (nodeData?.splitOutputs as Array<{ item: string | null; conveyorMk: number }>) || [
                  { item: null, conveyorMk: 1 },
                  { item: null, conveyorMk: 1 },
                  { item: null, conveyorMk: 1 },
                ];
                const incomingItemIds = (nodeData?.incomingItems as string[]) || [];
                const availableItems = items.filter(i => incomingItemIds.includes(i.id));
                const output = splitOutputs[index] || { item: null, conveyorMk: 1 };
                const selectedItem = output.item ? items.find(i => i.id === output.item) : null;
                return (
                  <Box key={`filter-${label}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: '#9ca3af', width: 50 }}>
                      {label}
                    </Typography>
                    <Autocomplete
                      size="small"
                      fullWidth
                      options={availableItems}
                      getOptionLabel={(option) => option.name}
                      value={selectedItem || null}
                      onChange={(_, newValue) => {
                        const newOutputs = [...splitOutputs];
                        newOutputs[index] = { ...newOutputs[index], item: newValue?.id || null };
                        dispatchChange('splitOutputs', newOutputs);
                      }}
                      noOptionsText={incomingItemIds.length === 0 ? "Connect items first" : "No matching items"}
                      renderOption={(props, option) => {
                        const { key, ...rest } = props as { key: string } & Record<string, unknown>;
                        const Icon = getIconComponent(option.icon);
                        return (
                          <Box component="li" key={key} {...rest} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Icon sx={{ fontSize: 18, color: '#8b5cf6' }} />
                            {option.name}
                          </Box>
                        );
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder={incomingItemIds.length === 0 ? "No inputs" : "Any"}
                          variant="outlined"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              bgcolor: '#0f172a',
                              color: '#fff',
                            },
                            '& .MuiInputLabel-root': { color: '#9ca3af' },
                          }}
                        />
                      )}
                    />
                  </Box>
                );
              })}
            </Box>
          </>
        )}

        {node?.type === 'building' && (
          <>
            {/* Output/Storage Settings */}
            <Box
              component="fieldset"
              sx={{
                border: '1px solid #1f2937',
                borderRadius: 1,
                p: 1.5,
                m: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Typography component="legend" variant="caption" sx={{ color: '#9ca3af', px: 0.5 }}>
                {selectedBuilding?.category !== 'storage' ? 'Production Output' : 'Storage'}
              </Typography>

              {selectedBuilding?.category !== 'storage' ? (
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
                        '& .MuiOutlinedInput-root': {
                          bgcolor: '#0f172a',
                          color: '#fff',
                        },
                        '& .MuiInputLabel-root': { color: '#9ca3af' },
                      }}
                    />
                  )}
                />
              ) : (
                <Autocomplete
                  size="small"
                  options={items}
                  getOptionLabel={(option) => option.name}
                  value={selectedStoredItem || null}
                  onChange={(_, newValue) => dispatchChange('storedItem', newValue?.id || '')}
                  renderOption={(props, option) => {
                    const { key, ...rest } = props as { key: string } & Record<string, unknown>;
                    const Icon = getIconComponent(option.icon);
                    return (
                      <Box component="li" key={key} {...rest} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Icon sx={{ fontSize: 18, color: '#60a5fa' }} />
                        {option.name}
                      </Box>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Stored Item"
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: '#0f172a',
                          color: '#fff',
                        },
                        '& .MuiInputLabel-root': { color: '#9ca3af' },
                      }}
                    />
                  )}
                />
              )}
            </Box>

            {/* Production Settings */}
            {selectedBuilding?.category !== 'storage' && (
              <Box
                component="fieldset"
                sx={{
                  border: '1px solid #1f2937',
                  borderRadius: 1,
                  p: 1.5,
                  m: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                <Typography component="legend" variant="caption" sx={{ color: '#9ca3af', px: 0.5 }}>
                  Production Settings
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={customProduction}
                      onChange={(e) => dispatchChange('customProduction', e.target.checked)}
                      sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#2ecc71' } }}
                    />
                  }
                  label={<Typography variant="caption" color="#9ca3af">Custom Rate</Typography>}
                />

                {!customProduction ? (
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: '#9ca3af' }}>Production Speed</InputLabel>
                    <Select
                      value={(nodeData?.production as number) || selectedBuilding?.defaultProduction || 0}
                      label="Production Speed"
                      onChange={handleProductionSelect}
                      sx={{
                        bgcolor: '#0f172a',
                        color: '#fff',
                        '& .MuiSelect-icon': { color: '#9ca3af' },
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
                    label="Production Speed (/min)"
                    value={(nodeData?.production as number) || 0}
                    onChange={handleCustomProductionChange}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: '#0f172a',
                        color: '#fff',
                      },
                      '& .MuiInputLabel-root': { color: '#9ca3af' },
                    }}
                  />
                )}
              </Box>
            )}

            {/* Belt & Pipe Settings */}
            <Box
              component="fieldset"
              sx={{
                border: '1px solid #1f2937',
                borderRadius: 1,
                p: 1.5,
                m: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Typography component="legend" variant="caption" sx={{ color: '#9ca3af', px: 0.5 }}>
                Belt & Pipe Settings
              </Typography>

              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#9ca3af' }}>Conveyor</InputLabel>
                <Select
                  value={(nodeData?.conveyorMk as number) || 1}
                  label="Conveyor"
                  onChange={handleConveyorMkChange}
                  sx={{
                    bgcolor: '#0f172a',
                    color: '#fff',
                    '& .MuiSelect-icon': { color: '#9ca3af' },
                  }}
                >
                  <MenuItem value={1}>Mk.1 (60/min)</MenuItem>
                  <MenuItem value={2}>Mk.2 (120/min)</MenuItem>
                  <MenuItem value={3}>Mk.3 (270/min)</MenuItem>
                  <MenuItem value={4}>Mk.4 (480/min)</MenuItem>
                  <MenuItem value={5}>Mk.5 (780/min)</MenuItem>
                  <MenuItem value={6}>Mk.6 (1200/min)</MenuItem>
                </Select>
              </FormControl>

              {hasPipe && (
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: '#9ca3af' }}>Pipe</InputLabel>
                  <Select
                    value={(nodeData?.pipeMk as number) || 1}
                    label="Pipe"
                    onChange={handlePipeMkChange}
                    sx={{
                      bgcolor: '#0f172a',
                      color: '#fff',
                      '& .MuiSelect-icon': { color: '#9ca3af' },
                    }}
                  >
                    <MenuItem value={1}>Mk.1 (300 m³/min)</MenuItem>
                    <MenuItem value={2}>Mk.2 (600 m³/min)</MenuItem>
                    <MenuItem value={3}>Mk.3 (900 m³/min)</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>

            {/* Building Type */}
            <Box
              component="fieldset"
              sx={{
                border: '1px solid #1f2937',
                borderRadius: 1,
                p: 1.5,
                m: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Typography component="legend" variant="caption" sx={{ color: '#9ca3af', px: 0.5 }}>
                Building Type
              </Typography>

              <Autocomplete
                size="small"
                options={buildingTypeOptions}
                getOptionLabel={(option) => option.name}
                value={selectedBuilding || null}
                onChange={handleBuildingChange}
                disabled={!selectedBuilding?.id.startsWith('miner_')}
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
                    label="Building Type"
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: '#0f172a',
                        color: '#fff',
                      },
                      '& .MuiInputLabel-root': { color: '#9ca3af' },
                    }}
                  />
                )}
              />
            </Box>

            {/* Energy */}
            {selectedBuilding?.category !== 'storage' && (
              <Box
                component="fieldset"
                sx={{
                  border: '1px solid #1f2937',
                  borderRadius: 1,
                  p: 1.5,
                  m: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                <Typography component="legend" variant="caption" sx={{ color: '#9ca3af', px: 0.5 }}>
                  Energy
                </Typography>

                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Power consumption (MW)"
                  value={(nodeData?.powerUsage as number) || 0}
                  onChange={handlePowerChange}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#0f172a',
                      color: '#fff',
                    },
                    '& .MuiInputLabel-root': { color: '#9ca3af' },
                  }}
                />
              </Box>
            )}
          </>
        )}

        {/* Goal Node Settings */}
        {node?.type === 'goal' && (
          <>
            <Box
              component="fieldset"
              sx={{
                border: '2px solid #eab308',
                borderRadius: 2,
                p: 1.5,
                m: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                bgcolor: 'rgba(234, 179, 8, 0.05)',
              }}
            >
              <Typography component="legend" variant="caption" sx={{ color: '#eab308', px: 0.5, fontWeight: 700 }}>
                🎯 Goal Settings
              </Typography>

              <Autocomplete
                size="small"
                options={items.filter(i => PROJECT_ASSEMBLY_ITEM_IDS.includes(i.id))}
                getOptionLabel={(option) => option.name}
                value={items.find(i => i.id === (nodeData?.itemId as string)) || null}
                onChange={(_, newValue) => {
                  dispatchChange('itemId', newValue?.id || '');
                  if (newValue?.defaultProduction) {
                    dispatchChange('targetRate', newValue.defaultProduction);
                  }
                }}
                renderOption={(props, option) => {
                  const { key, ...rest } = props as { key: string } & Record<string, unknown>;
                  const Icon = getIconComponent(option.icon);
                  return (
                    <Box component="li" key={key} {...rest} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Icon sx={{ fontSize: 18, color: '#eab308' }} />
                      {option.name}
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Target Item"
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: '#0f172a',
                        color: '#fff',
                      },
                      '& .MuiInputLabel-root': { color: '#9ca3af' },
                    }}
                  />
                )}
              />

              <TextField
                fullWidth
                size="small"
                type="number"
                label="Target Rate (/min)"
                value={(nodeData?.targetRate as number) || 1}
                onChange={(e) => dispatchChange('targetRate', parseFloat(e.target.value) || 1)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#0f172a',
                    color: '#fff',
                  },
                  '& .MuiInputLabel-root': { color: '#9ca3af' },
                }}
              />

              <TextField
                fullWidth
                size="small"
                label="Custom Label"
                value={(nodeData?.customLabel as string) || ''}
                onChange={(e) => dispatchChange('customLabel', e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#0f172a',
                    color: '#fff',
                  },
                  '& .MuiInputLabel-root': { color: '#9ca3af' },
                }}
              />
            </Box>
          </>
        )}

        {/* Conveyor Lift Settings */}
        {node?.type === 'conveyorLift' && (
          <>
            <Box
              component="fieldset"
              sx={{
                border: '2px solid #06b6d4',
                borderRadius: 2,
                p: 1.5,
                m: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                bgcolor: 'rgba(6, 182, 212, 0.05)',
              }}
            >
              <Typography component="legend" variant="caption" sx={{ color: '#06b6d4', px: 0.5, fontWeight: 700 }}>
                Lift Settings
              </Typography>

              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#9ca3af' }}>Direction</InputLabel>
                <Select
                  value={(nodeData?.direction as string) || 'up'}
                  label="Direction"
                  onChange={(e) => {
                    const newDirection = e.target.value as 'up' | 'down';
                    dispatchChange('direction', newDirection);
                    // Update target layer based on direction
                    const currentLayer = (nodeData?.layer as number) || 1;
                    const newTargetLayer = newDirection === 'up' ? currentLayer + 1 : Math.max(1, currentLayer - 1);
                    dispatchChange('targetLayer', newTargetLayer);
                  }}
                  sx={{
                    bgcolor: '#0f172a',
                    color: '#fff',
                    '& .MuiSelect-icon': { color: '#9ca3af' },
                  }}
                >
                  <MenuItem value="up">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MuiIcons.ArrowUpward sx={{ fontSize: 18, color: '#22c55e' }} />
                      Up (to higher floor)
                    </Box>
                  </MenuItem>
                  <MenuItem value="down">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MuiIcons.ArrowDownward sx={{ fontSize: 18, color: '#f59e0b' }} />
                      Down (to lower floor)
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#9ca3af' }}>Lift Tier</InputLabel>
                <Select
                  value={(nodeData?.liftMk as number) || 1}
                  label="Lift Tier"
                  onChange={(e) => dispatchChange('liftMk', Number(e.target.value))}
                  sx={{
                    bgcolor: '#0f172a',
                    color: '#fff',
                    '& .MuiSelect-icon': { color: '#9ca3af' },
                  }}
                >
                  <MenuItem value={1}>Mk.1 (60/min)</MenuItem>
                  <MenuItem value={2}>Mk.2 (120/min)</MenuItem>
                  <MenuItem value={3}>Mk.3 (270/min)</MenuItem>
                  <MenuItem value={4}>Mk.4 (480/min)</MenuItem>
                  <MenuItem value={5}>Mk.5 (780/min)</MenuItem>
                  <MenuItem value={6}>Mk.6 (1200/min)</MenuItem>
                </Select>
              </FormControl>

              <Box
                sx={{
                  p: 1.5,
                  bgcolor: '#16213e',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography variant="caption" color="#9ca3af">
                  Current Floor
                </Typography>
                <Typography variant="body2" color="#06b6d4" fontWeight={700}>
                  {(nodeData?.layer as number) || 1}
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 1.5,
                  bgcolor: (nodeData?.direction === 'up') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: (nodeData?.direction === 'up') ? '1px solid #22c55e' : '1px solid #f59e0b',
                }}
              >
                <Typography variant="caption" color="#9ca3af">
                  Target Floor
                </Typography>
                <Typography
                  variant="body2"
                  color={(nodeData?.direction === 'up') ? '#22c55e' : '#f59e0b'}
                  fontWeight={700}
                >
                  {(nodeData?.targetLayer as number) || ((nodeData?.layer as number || 1) + ((nodeData?.direction === 'up') ? 1 : -1))}
                </Typography>
              </Box>
            </Box>
          </>
        )}
      </Box>

      <Box sx={{ mt: 'auto', p: 1.5, borderTop: '1px solid #1f2937', display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          fullWidth
          onClick={() => {
            if (node && onDuplicate) onDuplicate(node.id);
          }}
          sx={{ borderColor: '#374151', color: '#d1d5db' }}
        >
          Duplicate
        </Button>
        <Button
          variant="contained"
          size="small"
          fullWidth
          onClick={() => {
            if (node && onDelete) onDelete(node.id);
          }}
          sx={{ bgcolor: '#b91c1c', '&:hover': { bgcolor: '#dc2626' } }}
        >
          Delete
        </Button>
      </Box>
    </Drawer>
  );
}

export default memo(NodeEditorPanel);
