import { memo } from 'react';
import { Box, IconButton, Tooltip, Typography, Button } from '@mui/material';
import * as Icons from '@mui/icons-material';

interface LayerPanelProps {
  currentLayer: number;
  maxLayer: number;
  floorName?: string;
  onOpenManager?: () => void;
  onLayerChange: (layer: number) => void;
}

export const LayerPanel = memo(function LayerPanel({
  currentLayer,
  maxLayer,
  floorName,
  onOpenManager,
  onLayerChange,
}: LayerPanelProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 0.4,
        bgcolor: 'rgba(26, 26, 46, 0.95)',
        borderRadius: 2,
        px: 1.2,
        py: 0.6,
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
          <Icons.KeyboardArrowLeft sx={{ fontSize: 22 }} />
        </IconButton>
      </Tooltip>

      <Tooltip title={floorName || `Floor ${currentLayer}`}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.4,
            minWidth: 96,
            justifyContent: 'center',
          }}
        >
          <Icons.Layers sx={{ fontSize: 18, color: '#fa9549' }} />
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 600,
              color: '#e5e7eb',
              maxWidth: 120,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {(floorName || `Floor ${currentLayer}`).slice(0, 18)}
          </Typography>
        </Box>
      </Tooltip>

      {maxLayer > 1 && (
        <Typography sx={{ fontSize: 10, color: '#6b7280' }}>
          (1-{maxLayer})
        </Typography>
      )}

      <Tooltip title="Next Floor">
        <IconButton
          size="small"
          onClick={() => onLayerChange(currentLayer + 1)}
          sx={{
            color: '#94a3b8',
            '&:hover': { color: '#fff', bgcolor: 'rgba(250,149,73,0.2)' },
          }}
        >
          <Icons.KeyboardArrowRight sx={{ fontSize: 22 }} />
        </IconButton>
      </Tooltip>

      {onOpenManager && (
        <Button
          size="small"
          onClick={onOpenManager}
          startIcon={<Icons.ViewList sx={{ fontSize: 18 }} />}
          sx={{
            color: '#fa9549',
            textTransform: 'none',
            fontSize: 12,
            fontWeight: 700,
            px: 1,
            minWidth: 0,
            borderRadius: 6,
            border: '1px solid rgba(250,149,73,0.4)',
            '&:hover': { bgcolor: 'rgba(250,149,73,0.12)', color: '#fff' },
          }}
        >
          Floor Manager
        </Button>
      )}
    </Box>
  );
});
