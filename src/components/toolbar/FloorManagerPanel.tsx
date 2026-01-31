import { memo, useEffect, useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  Divider,
  Chip,
} from "@mui/material";
import * as Icons from "@mui/icons-material";

export type FloorSummaryItem = { id: string; name: string; rate: number };
export type FloorBuildingItem = { id: string; name: string; count: number };

export interface FloorSummary {
  layer: number;
  name: string;
  totalNodes: number;
  buildingCount: number;
  totalPower: number;
  outputs: FloorSummaryItem[];
  buildings: FloorBuildingItem[];
}

interface FloorManagerPanelProps {
  open: boolean;
  floors: FloorSummary[];
  currentLayer: number;
  onClose: () => void;
  onRename: (layer: number, name: string) => void;
  onSelectLayer: (layer: number) => void;
}

export const FloorManagerPanel = memo(function FloorManagerPanel({
  open,
  floors,
  currentLayer,
  onClose,
  onRename,
  onSelectLayer,
}: FloorManagerPanelProps) {
  const formatRate = (value: number) =>
    value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
  const [editNames, setEditNames] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!open) return;
    const next: Record<number, string> = {};
    floors.forEach((floor) => {
      next[floor.layer] = floor.name;
    });
    if (next[currentLayer] === undefined) {
      next[currentLayer] = `Floor ${currentLayer}`;
    }
    setEditNames(next);
  }, [open, floors, currentLayer]);
  const orderedFloors = [...floors].sort((a, b) => {
    if (a.layer === currentLayer) return -1;
    if (b.layer === currentLayer) return 1;
    return a.layer - b.layer;
  });

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 320,
          bgcolor: "#111827",
          color: "#e5e7eb",
          borderLeft: "1px solid #1f2937",
        },
      }}
    >
      <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
        <Icons.ViewList sx={{ color: "#60a5fa" }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
          Floor Manager
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: "#94a3b8" }}>
          <Icons.Close fontSize="small" />
        </IconButton>
      </Box>
      <Divider sx={{ borderColor: "#1f2937" }} />

      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        {orderedFloors.length === 0 ? (
          <Typography variant="body2" color="#6b7280">
            No floors with nodes yet.
          </Typography>
        ) : (
          orderedFloors.map((floor) => (
            <Box
              key={`floor-${floor.layer}`}
              sx={{
                border: "1px solid #1f2937",
                borderRadius: 2,
                p: 1.5,
                bgcolor:
                  floor.layer === currentLayer
                    ? "rgba(96, 165, 250, 0.12)"
                    : "rgba(15, 23, 42, 0.6)",
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TextField
                  size="small"
                  value={editNames[floor.layer] ?? floor.name}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setEditNames((prev) => ({
                      ...prev,
                      [floor.layer]: nextValue,
                    }));
                    onRename(floor.layer, nextValue);
                  }}
                  variant="outlined"
                  sx={{
                    flex: 1,
                    "& .MuiOutlinedInput-root": {
                      bgcolor: "#0f172a",
                      color: "#fff",
                    },
                    "& .MuiInputLabel-root": { color: "#9ca3af" },
                  }}
                />
                <IconButton
                  size="small"
                  onClick={() => onSelectLayer(floor.layer)}
                  sx={{
                    color: "#94a3b8",
                    "&:hover": { color: "#fff" },
                  }}
                >
                  <Icons.NearMe fontSize="small" />
                </IconButton>
              </Box>

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                <Chip
                  label={`${floor.totalNodes} nodes`}
                  size="small"
                  sx={{ bgcolor: "#1f2937", color: "#e5e7eb" }}
                />
                <Chip
                  label={`${formatRate(floor.totalPower)} MW`}
                  size="small"
                  sx={{ bgcolor: "#0f172a", color: "#f1c40f" }}
                />
              </Box>

              {floor.outputs.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ color: "#9ca3af" }}>
                    Outputs
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                    {floor.outputs.map((out) => (
                      <Chip
                        key={`${floor.layer}-${out.id}`}
                        label={`${out.name} ${formatRate(out.rate)}/min`}
                        size="small"
                        sx={{ bgcolor: "#0f172a", color: "#cbd5f5" }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {floor.buildings.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ color: "#9ca3af" }}>
                    Buildings
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                    {floor.buildings.map((b) => (
                      <Chip
                        key={`${floor.layer}-${b.id}`}
                        label={`${b.name} x${b.count}`}
                        size="small"
                        sx={{ bgcolor: "#111827", color: "#e2e8f0" }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          ))
        )}
      </Box>
    </Drawer>
  );
});
