import { memo } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import * as Icons from '@mui/icons-material';

interface LayerPanelProps {
  currentLayer: number;
  maxLayer: number;
  onLayerChange: (layer: number) => void;
}

export const LayerPanel = memo(function LayerPanel({
  currentLayer,
  maxLayer,
  onLayerChange,
}: LayerPanelProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: 'rgba(26, 26, 46, 0.95)',
        borderRadius: 2,
        px: 2,
        py: 1,
        border: '1px solid rgba(250, 149, 73, 0.3)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      <Tooltip title="Previous Floor">
        <IconButton
          size="small"
          onClick={() => onLayerChange(Math.max(1, currentLayer - 1))}
          disabled={currentLayer <= 1}
          sx={{
            color: currentLayer <= 1 ? '#4b5563' : '#94a3b8',
            '&:hover': { color: '#fff', bgcolor: 'rgba(250,149,73,0.2)' },
            '&.Mui-disabled': { color: '#374151' },
          }}
        >
          <Icons.KeyboardArrowDown sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 80, justifyContent: 'center' }}>
        <Icons.Layers sx={{ fontSize: 16, color: '#fa9549' }} />
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>
          Floor {currentLayer}
        </Typography>
      </Box>

      <Tooltip title="Next Floor">
        <IconButton
          size="small"
          onClick={() => onLayerChange(currentLayer + 1)}
          sx={{
            color: '#94a3b8',
            '&:hover': { color: '#fff', bgcolor: 'rgba(250,149,73,0.2)' },
          }}
        >
          <Icons.KeyboardArrowUp sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>

      {maxLayer > 1 && (
        <Typography sx={{ fontSize: 10, color: '#6b7280', ml: 1 }}>
          (1-{maxLayer})
        </Typography>
      )}
    </Box>
  );
});
