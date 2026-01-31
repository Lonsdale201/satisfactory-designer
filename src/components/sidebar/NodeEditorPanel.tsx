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
import { Building, Item } from '../../types';
import buildingsData from '../../data/buildings.json';
import itemsData from '../../data/items.json';
import { PROJECT_ASSEMBLY_ITEM_IDS } from '../nodes/GoalNode';
import { themeMap } from '../../constants/themeMap';

const buildings: Building[] = buildingsData.buildings as Building[];
const items: Item[] = itemsData.items;
const EXTRACTOR_PURITY_RATES: Record<
  string,
  { impure: number; normal: number; pure: number }
> = {
  miner_mk1: { impure: 30, normal: 60, pure: 120 },
  miner_mk2: { impure: 60, normal: 120, pure: 240 },
  miner_mk3: { impure: 120, normal: 240, pure: 480 },
  oil_extractor: { impure: 60, normal: 120, pure: 240 },
  resource_well_extractor: { impure: 45, normal: 90, pure: 180 },
};

const PURITY_OPTIONS = [
  { id: 'impure', label: 'Impure' },
  { id: 'normal', label: 'Normal' },
  { id: 'pure', label: 'Pure' },
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

  const storageItems = useMemo(() => {
    if (
      selectedBuilding?.id === 'fluid_buffer' ||
      selectedBuilding?.id === 'industrial_fluid_buffer'
    ) {
      return items.filter((item) => item.category === 'fluid');
    }
    return items;
  }, [selectedBuilding?.id]);

  const legacyGroupColor = nodeData?.color as string | undefined;
  const legacyGroupTheme =
    legacyGroupColor &&
    Object.entries(themeMap).find(
      ([, theme]) => theme.header.toLowerCase() === legacyGroupColor.toLowerCase(),
    )?.[0];
  const groupThemeValue =
    (nodeData?.theme as string) || legacyGroupTheme || '';
  const groupThemeColors =
    themeMap[groupThemeValue as keyof typeof themeMap] || themeMap.orange;
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

  const availableOutputs = useMemo(() => {
    if (!selectedBuilding) return [];
    if (selectedBuilding.fixedOutput) {
      return items.filter((item) => item.id === selectedBuilding.fixedOutput);
    }
    return items.filter((item) => {
      const buildingId = selectedBuilding.id;
      if (item.defaultProducer === buildingId) return true;
      if (item.alternateProducers?.includes(buildingId)) return true;
      if (item.producers?.includes(buildingId)) return true;
      if (selectedBuilding.outputs?.includes(item.id)) return true;
      return false;
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

  const isCollapsed = Boolean(nodeData?.collapsed);
  const customProduction = Boolean(nodeData?.customProduction);
  const extractorPurityRates = selectedBuilding
    ? EXTRACTOR_PURITY_RATES[selectedBuilding.id]
    : undefined;
  const hasExtractorPurity = Boolean(extractorPurityRates);
  const selectedPurity = (nodeData?.purity as string) || 'normal';
  const hasPipe = Boolean(
    selectedBuilding?.inputTypes?.includes('pipe') ||
    selectedBuilding?.outputTypes?.includes('pipe'),
  );
  const hasConveyor = Boolean(
    selectedBuilding?.inputTypes?.includes('conveyor') ||
    selectedBuilding?.outputTypes?.includes('conveyor'),
  );
  const showOutputSelector =
    selectedBuilding?.category !== 'storage' &&
    !(selectedBuilding?.category === 'extraction' && selectedBuilding?.fixedOutput);

  const handleExtractorPurityChange = useCallback(
    (event: SelectChangeEvent) => {
      const value = event.target.value as string;
      dispatchChange('purity', value);
      if (!selectedBuilding) return;
      const rates = EXTRACTOR_PURITY_RATES[selectedBuilding.id];
      if (!rates) return;
      if (!customProduction) {
        dispatchChange('production', rates[value as keyof typeof rates]);
      }
    },
    [dispatchChange, selectedBuilding, customProduction],
  );

  const handleBuildingChange = useCallback((_: unknown, newValue: Building | null) => {
    if (!newValue) return;
    const isFromMiner = selectedBuilding?.id.startsWith('miner_');
    const isToMiner = newValue.id.startsWith('miner_');

    dispatchChange('buildingId', newValue.id);
    const purityRate =
      EXTRACTOR_PURITY_RATES[newValue.id]?.[
        ((nodeData?.purity as string) || 'normal') as 'impure' | 'normal' | 'pure'
      ];

    dispatchChange('production', purityRate ?? newValue.defaultProduction);
    dispatchChange('powerUsage', newValue.defaultPower);
    if (EXTRACTOR_PURITY_RATES[newValue.id]) {
      dispatchChange('purity', (nodeData?.purity as string) || 'normal');
    } else {
      dispatchChange('purity', '');
    }

    // Don't reset outputItem when switching between miners
    if (!(isFromMiner && isToMiner)) {
      dispatchChange('outputItem', newValue.fixedOutput || '');
    }

    dispatchChange('inputCount', newValue.inputs ?? 0);
  }, [dispatchChange, selectedBuilding, nodeData?.purity]);

  const handleProductionRateChange = useCallback(
    (_: unknown, newValue: number | null) => {
      if (newValue === null || Number.isNaN(newValue)) return;
      dispatchChange('production', Number(newValue));
    },
    [dispatchChange],
  );

  const handleCustomProductionChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10) || 0;
    dispatchChange('production', value);
  }, [dispatchChange]);

  const handleOutputChange = useCallback((_: unknown, newValue: Item | null) => {
    dispatchChange('outputItem', newValue?.id || '');
    if (newValue?.recipes && newValue.recipes.length > 0) {
      const buildingId = selectedBuilding?.id;
      const recipeEntries = newValue.recipes
        .map((recipe, index) => ({ recipe, index }))
        .filter(({ recipe }) => {
          const producer = recipe.producer;
          const producers = recipe.producers;
          if (!producer && !producers) return true;
          if (!buildingId) return true;
          if (producer && producer === buildingId) return true;
          if (producers && producers.includes(buildingId)) return true;
          return false;
        });
      const eligibleEntries =
        recipeEntries.length > 0
          ? recipeEntries
          : newValue.recipes.map((recipe, index) => ({ recipe, index }));
      const desiredIndex = newValue.defaultRecipeIndex ?? 0;
      const hasDesired = eligibleEntries.some(
        (entry) => entry.index === desiredIndex,
      );
      const nextRecipeIndex = hasDesired
        ? desiredIndex
        : eligibleEntries[0]?.index ?? 0;
      const recipeOutput = newValue.recipes[nextRecipeIndex]?.output;
      dispatchChange('selectedRecipeIndex', nextRecipeIndex);
      if (recipeOutput) {
        dispatchChange('production', recipeOutput);
      } else if (newValue?.defaultProduction) {
        dispatchChange('production', newValue.defaultProduction);
      }
    } else {
      dispatchChange('selectedRecipeIndex', 0);
      if (newValue?.defaultProduction) {
        dispatchChange('production', newValue.defaultProduction);
      }
    }
    dispatchChange('selectedAltIndex', null);
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
            {node?.type === 'building' && (selectedBuilding?.name || 'Building')}
            {node?.type === 'group' && ((nodeData?.label as string) || 'Production line')}
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
                <InputLabel sx={{ color: '#aaa' }}>Theme</InputLabel>
                <Select
                  value={groupThemeValue}
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
              <TextField
                size="small"
                label="Comment"
                value={(nodeData?.comment as string) || ''}
                onChange={(e) => dispatchChange('comment', e.target.value)}
                multiline
                minRows={3}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#0f172a',
                    color: '#fff',
                  },
                  '& .MuiInputLabel-root': { color: '#9ca3af' },
                }}
              />
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
        {node?.type === 'group' && (
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
              Goals
            </Typography>
            <TextField
              size="small"
              type="number"
              label="Target Power (MW)"
              value={Number(nodeData?.targetPower || 0)}
              onChange={(e) =>
                dispatchChange('targetPower', parseFloat(e.target.value) || 0)
              }
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#0f172a',
                  color: '#fff',
                },
                '& .MuiInputLabel-root': { color: '#9ca3af' },
              }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                const custom = new CustomEvent('groupSummary', { detail: { nodeId: node.id } });
                window.dispatchEvent(custom);
              }}
              sx={{
                borderColor: groupThemeColors.header,
                color: groupThemeColors.header,
                '&:hover': { borderColor: groupThemeColors.header, bgcolor: `${groupThemeColors.header}22` },
              }}
            >
              Get Summary
            </Button>
          </Box>
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
              <Typography variant="caption" sx={{ color: '#666', fontSize: 10 }}>
                Applies to all outgoing conveyors
              </Typography>

              {(() => {
                const splitOutputs = (nodeData?.splitOutputs as Array<{ item: string | null; conveyorMk: number }>) || [
                  { item: null, conveyorMk: 1 },
                  { item: null, conveyorMk: 1 },
                  { item: null, conveyorMk: 1 },
                ];
                const selectedMk = splitOutputs[0]?.conveyorMk ?? 1;
                return (
                  <FormControl fullWidth size="small">
                    <Select
                      value={selectedMk}
                      onChange={(e) => {
                        const nextMk = Number(e.target.value);
                        const newOutputs = splitOutputs.map((out) => ({
                          ...out,
                          conveyorMk: nextMk,
                        }));
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
                );
              })()}
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
            {(selectedBuilding?.category === 'storage' || showOutputSelector) && (
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
                    options={storageItems}
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
            )}

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

                {hasExtractorPurity && (
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: '#9ca3af' }}>Purity</InputLabel>
                    <Select
                      value={selectedPurity}
                      label="Purity"
                      onChange={handleExtractorPurityChange}
                      sx={{
                        bgcolor: '#0f172a',
                        color: '#fff',
                        '& .MuiSelect-icon': { color: '#9ca3af' },
                      }}
                    >
                      {PURITY_OPTIONS.map((purity) => (
                        <MenuItem key={purity.id} value={purity.id}>
                          {purity.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {!customProduction ? (
                  <Autocomplete
                    size="small"
                    options={selectedBuilding?.productionOptions || []}
                    getOptionLabel={(option) => `${option}/min`}
                    value={
                      (nodeData?.production as number) ||
                      selectedBuilding?.defaultProduction ||
                      null
                    }
                    onChange={handleProductionRateChange}
                    renderOption={(props, option) => {
                      const { key, ...rest } = props as { key: string } &
                        Record<string, unknown>;
                      return (
                        <Box
                          component="li"
                          key={key}
                          {...rest}
                          sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
                        >
                          {option}/min
                        </Box>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Production Speed"
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
            {(hasConveyor || hasPipe) && (
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

                {hasConveyor && (
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
                )}

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
                    </Select>
                  </FormControl>
                )}
              </Box>
            )}

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
