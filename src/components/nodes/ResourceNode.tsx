import { memo, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
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
  IconButton,
  Tooltip,
  Switch,
} from '@mui/material';
import * as Icons from '@mui/icons-material';
import { Resource, PurityType } from '../../types';
import resourcesData from '../../data/resources.json';

const resources: Resource[] = resourcesData.resources;
const purityTypes: PurityType[] = resourcesData.purityTypes;

interface ResourceNodeProps {
  id: string;
  data: {
    label: string;
    resourceId: string;
    purity: string;
    outputRate: number;
    collapsed?: boolean;
    hasInput?: boolean;
    hasOutput?: boolean;
  };
}

const ResourceNodeComponent = memo(({ data, id }: ResourceNodeProps) => {
  const selectedResource = resources.find(r => r.id === data.resourceId);
  const selectedPurity = purityTypes.find(p => p.id === data.purity);
  const isCollapsed = data.collapsed ?? false;
  const hasInput = data.hasInput ?? false;
  const hasOutput = data.hasOutput ?? true;

  const getIconComponent = (iconName: string): React.ComponentType<{ sx?: object }> => {
    const pascalCase = iconName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
    return (Icons as Record<string, React.ComponentType<{ sx?: object }>>)[pascalCase] || Icons.Terrain;
  };

  const IconComponent = selectedResource
    ? getIconComponent(selectedResource.icon)
    : Icons.Terrain;

  const dispatchChange = useCallback((field: string, value: unknown) => {
    const event = new CustomEvent('nodeDataChange', {
      detail: { nodeId: id, field, value }
    });
    window.dispatchEvent(event);
  }, [id]);

  const handleResourceChange = useCallback((_: unknown, newValue: Resource | null) => {
    if (newValue) {
      dispatchChange('resourceId', newValue.id);
      const purity = purityTypes.find(p => p.id === data.purity);
      const baseRate = 60;
      const outputRate = baseRate * (purity?.multiplier || 1);
      dispatchChange('outputRate', outputRate);
    }
  }, [dispatchChange, data.purity]);

  const handlePurityChange = useCallback((event: SelectChangeEvent) => {
    dispatchChange('purity', event.target.value);
    const purity = purityTypes.find(p => p.id === event.target.value);
    const baseRate = 60;
    const outputRate = baseRate * (purity?.multiplier || 1);
    dispatchChange('outputRate', outputRate);
  }, [dispatchChange]);

  const handleToggleCollapse = useCallback(() => {
    dispatchChange('collapsed', !isCollapsed);
  }, [dispatchChange, isCollapsed]);

  const displayRate = selectedPurity
    ? 60 * selectedPurity.multiplier
    : data.outputRate || 60;

  return (
    <Paper
      elevation={3}
      sx={{
        minWidth: isCollapsed ? 180 : 220,
        bgcolor: '#252836',
        border: '2px solid #fa9549',
        borderRadius: 2,
      }}
    >
      {/* Input Handle */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          id="input-0"
          style={{
            background: '#e74c3c',
            width: 12,
            height: 12,
            border: '2px solid #1a1a2e',
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
          {isCollapsed && selectedResource ? selectedResource.name : 'Resource Node'}
        </Typography>
        {isCollapsed && (
          <Typography variant="caption" fontWeight="bold" color="#1a1a2e">
            {displayRate}/min
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

      {/* Body - only visible when not collapsed */}
      {!isCollapsed && (
        <Box sx={{ p: 1.5 }}>
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
                  mb: 1.5,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#1a1a2e',
                    color: '#fff',
                  },
                  '& .MuiInputLabel-root': { color: '#aaa' },
                }}
              />
            )}
            sx={{
              '& .MuiAutocomplete-popupIndicator': { color: '#aaa' },
            }}
          />

          <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
            <InputLabel sx={{ color: '#aaa' }}>Purity</InputLabel>
            <Select
              value={data.purity || 'normal'}
              label="Purity"
              onChange={handlePurityChange}
              sx={{
                bgcolor: '#1a1a2e',
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

          <Box
            sx={{
              p: 1,
              bgcolor: '#1a1a2e',
              borderRadius: 1,
              textAlign: 'center',
            }}
          >
            <Typography variant="caption" color="#aaa">
              Output Rate
            </Typography>
            <Typography variant="h6" color="#fa9549">
              {displayRate}/min
            </Typography>
          </Box>
        </Box>
      )}

      {/* Output Handle */}
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          id="output-0"
          style={{
            background: '#2ecc71',
            width: 12,
            height: 12,
            border: '2px solid #1a1a2e',
          }}
        />
      )}
    </Paper>
  );
});

ResourceNodeComponent.displayName = 'ResourceNode';

export default ResourceNodeComponent;
