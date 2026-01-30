import { memo } from 'react';
import { IconButton, Tooltip, Box } from '@mui/material';
import * as Icons from '@mui/icons-material';
import { ReactFlowInstance } from '@xyflow/react';

interface ZoomControlsProps {
  reactFlowInstance: ReactFlowInstance | null;
  interactionLocked: boolean;
  setInteractionLocked: (locked: boolean) => void;
}

export const ZoomControls = memo(function ZoomControls({
  reactFlowInstance,
  interactionLocked,
  setInteractionLocked,
}: ZoomControlsProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        bgcolor: 'rgba(26, 26, 46, 0.9)',
        borderRadius: 2,
        p: 0.5,
        border: '1px solid rgba(250, 149, 73, 0.3)',
      }}
    >
      <Tooltip title="Zoom In" placement="left">
        <IconButton
          size="small"
          onClick={() => reactFlowInstance?.zoomIn()}
          sx={{ color: '#94a3b8', '&:hover': { color: '#fff', bgcolor: 'rgba(250,149,73,0.2)' } }}
        >
          <Icons.Add sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Zoom Out" placement="left">
        <IconButton
          size="small"
          onClick={() => reactFlowInstance?.zoomOut()}
          sx={{ color: '#94a3b8', '&:hover': { color: '#fff', bgcolor: 'rgba(250,149,73,0.2)' } }}
        >
          <Icons.Remove sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Fit View" placement="left">
        <IconButton
          size="small"
          onClick={() => reactFlowInstance?.fitView({ padding: 0.2 })}
          sx={{ color: '#94a3b8', '&:hover': { color: '#fff', bgcolor: 'rgba(250,149,73,0.2)' } }}
        >
          <Icons.FitScreen sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title={interactionLocked ? 'Unlock Interaction' : 'Lock Interaction'} placement="left">
        <IconButton
          size="small"
          onClick={() => setInteractionLocked(!interactionLocked)}
          sx={{
            color: interactionLocked ? '#ef4444' : '#94a3b8',
            '&:hover': { color: '#fff', bgcolor: 'rgba(250,149,73,0.2)' },
          }}
        >
          {interactionLocked ? <Icons.Lock sx={{ fontSize: 18 }} /> : <Icons.LockOpen sx={{ fontSize: 18 }} />}
        </IconButton>
      </Tooltip>
    </Box>
  );
});
