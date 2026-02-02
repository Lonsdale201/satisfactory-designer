import { memo, useMemo, useState, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import * as Icons from "@mui/icons-material";
import SettingsMenu, { UiSettings } from "./SettingsMenu";
import ReactMarkdown from "react-markdown";
import changelogRaw from "../../../CHANGELOG.md?raw";

interface HeaderProps {
  nodesCount: number;
  calcEnabled: boolean;
  setCalcEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  handleCalculate: () => void;
  clearCalculation: () => void;
  canStack: boolean;
  canUnstack: boolean;
  handleStack: () => void;
  handleUnstack: () => void;
  allCollapsed: boolean;
  handleToggleAllCollapse: (collapsed: boolean) => void;
  handleImport: () => void;
  handleExport: () => void;
  handleClearAll: () => void;
  handleClearCurrent: () => void;
  uiSettings: UiSettings;
  setUiSettings: React.Dispatch<React.SetStateAction<UiSettings>>;
  repoUrl: string;
}

const Header = memo(
  ({
    nodesCount,
    calcEnabled,
    setCalcEnabled,
    handleCalculate,
    clearCalculation,
    canStack,
    canUnstack,
    handleStack,
    handleUnstack,
    allCollapsed,
    handleToggleAllCollapse,
    handleImport,
    handleExport,
    handleClearAll,
    handleClearCurrent,
    uiSettings,
    setUiSettings,
    repoUrl,
  }: HeaderProps) => {
    const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(
      null,
    );
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [changelogOpen, setChangelogOpen] = useState(false);
    const [howToOpen, setHowToOpen] = useState(false);
    const [changelogPage, setChangelogPage] = useState(0);
    const [hasNewChangelog, setHasNewChangelog] = useState(false);

    const CHANGELOG_SEEN_KEY = "satisplanner_changelog_seen";

    const changelogBlocks = useMemo(() => {
      const blocks = changelogRaw
        .split(/\n(?=##\s)/g)
        .map((block) => block.trim())
        .filter((block) => block.startsWith("## "));
      return blocks;
    }, []);

    const appVersion = useMemo(() => {
      const first = changelogBlocks[0] || "";
      const match = first.match(/^##\s+\[(.+?)\]/m);
      return match ? match[1].trim() : "0.2.0";
    }, [changelogBlocks]);

    const totalPages = Math.max(1, Math.ceil(changelogBlocks.length / 2));
    const pageStart = changelogPage * 2;
    const pageBlocks = changelogBlocks.slice(pageStart, pageStart + 2);

    useEffect(() => {
      if (changelogOpen) {
        setChangelogPage(0);
        try {
          localStorage.setItem(CHANGELOG_SEEN_KEY, appVersion);
        } catch {
          // ignore storage errors
        }
        setHasNewChangelog(false);
      }
    }, [changelogOpen]);

    useEffect(() => {
      try {
        const seen = localStorage.getItem(CHANGELOG_SEEN_KEY);
        setHasNewChangelog(seen !== appVersion);
      } catch {
        setHasNewChangelog(false);
      }
    }, [appVersion]);

    const openSettings = (event: React.MouseEvent<HTMLElement>) => {
      setSettingsAnchor(event.currentTarget);
    };

    const closeSettings = () => {
      setSettingsAnchor(null);
    };

    return (
      <>
      <Box
        sx={{
          position: "absolute",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          bgcolor: "rgba(15, 23, 42, 0.85)",
          px: 2,
          py: 1,
          borderRadius: "8px",
          border: "1px solid rgba(148, 163, 184, 0.2)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: "#fff",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 0.5,
          }}
        >
          <span style={{ color: "#fa9549" }}>Satisfactory</span>
          <span style={{ color: "#e2e8f0" }}>
            Designer
            <span
              style={{
                color: "#fa9549",
                fontSize: 10,
                fontWeight: 700,
                marginLeft: 4,
                verticalAlign: "sub",
                letterSpacing: "0.2px",
              }}
            >
              v{appVersion}
            </span>
          </span>
        </Typography>

        {/* Action group */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            px: 1,
            py: 0.5,
            borderRadius: 8,
            border: "1px solid rgba(148, 163, 184, 0.2)",
            bgcolor: "rgba(15, 23, 42, 0.6)",
          }}
        >
          {nodesCount > 0 && (
            <Tooltip
              title={
                calcEnabled
                  ? "Hide calculation results"
                  : "Calculate production line efficiency"
              }
            >
              <IconButton
                size="small"
                onClick={() => {
                  if (calcEnabled) {
                    setCalcEnabled(false);
                    clearCalculation();
                  } else {
                    setCalcEnabled(true);
                    handleCalculate();
                  }
                }}
                sx={{
                  color: calcEnabled ? "#10b981" : "#94a3b8",
                  bgcolor: calcEnabled
                    ? "rgba(16,185,129,0.18)"
                    : "transparent",
                  border: calcEnabled
                    ? "1px solid rgba(16,185,129,0.4)"
                    : "1px solid transparent",
                  "&:hover": { color: "#fff", bgcolor: "rgba(16,185,129,0.2)" },
                }}
              >
                <Icons.Calculate sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}

          {/* Stack / Unstack buttons */}
          {canStack && (
            <Tooltip title="Stack selected nodes">
              <IconButton
                size="small"
                onClick={handleStack}
                sx={{
                  color: "#60a5fa",
                  "&:hover": { color: "#fff", bgcolor: "rgba(96,165,250,0.2)" },
                }}
              >
                <Icons.Layers sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
          {canUnstack && (
            <Tooltip title="Unstack node">
              <IconButton
                size="small"
                onClick={handleUnstack}
                sx={{
                  color: "#f97316",
                  "&:hover": { color: "#fff", bgcolor: "rgba(249,115,22,0.2)" },
                }}
              >
                <Icons.LayersClear sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}

          {/* Global collapse/expand toggle */}
          {nodesCount > 0 && (
            <Tooltip title={allCollapsed ? "Expand All" : "Collapse All"}>
              <IconButton
                size="small"
                onClick={() => handleToggleAllCollapse(!allCollapsed)}
                sx={{
                  color: "#94a3b8",
                  "&:hover": {
                    color: "#fff",
                    bgcolor: "rgba(255,255,255,0.1)",
                  },
                }}
              >
                {allCollapsed ? (
                  <Icons.Expand sx={{ fontSize: 18 }} />
                ) : (
                  <Icons.Compress sx={{ fontSize: 18 }} />
                )}
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* File group */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            px: 1,
            py: 0.5,
            borderRadius: 8,
            border: "1px solid rgba(148, 163, 184, 0.2)",
            bgcolor: "rgba(15, 23, 42, 0.6)",
          }}
        >
          <Tooltip title="Import from file">
            <IconButton
              size="small"
              onClick={handleImport}
              sx={{
                color: "#94a3b8",
                "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.1)" },
              }}
            >
              <Icons.FileUpload sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Export to file">
            <IconButton
              size="small"
              onClick={handleExport}
              sx={{
                color: "#94a3b8",
                "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.1)" },
              }}
            >
              <Icons.FileDownload sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Clear all (delete everything)">
            <IconButton
              size="small"
              onClick={() => setConfirmOpen(true)}
              sx={{
                color: "#f87171",
                "&:hover": { color: "#fff", bgcolor: "rgba(248,113,113,0.2)" },
              }}
            >
              <Icons.DeleteForever sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Settings */}
        <Tooltip title="View Settings">
          <IconButton
            size="small"
            onClick={openSettings}
            sx={{
              color: "#94a3b8",
              "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.1)" },
            }}
          >
            <Icons.Tune sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <SettingsMenu
          anchorEl={settingsAnchor}
          open={Boolean(settingsAnchor)}
          onClose={closeSettings}
          uiSettings={uiSettings}
          setUiSettings={setUiSettings}
        />
      </Box>

      {/* Top-left Info/Changelog bar */}
      <Box
        sx={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1,
          py: 0.5,
          borderRadius: "8px",
          bgcolor: "rgba(15, 23, 42, 0.75)",
          border: "1px solid rgba(148, 163, 184, 0.25)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          backdropFilter: "blur(8px)",
        }}
      >
        <Button
          size="small"
          variant="text"
          onClick={() => setChangelogOpen(true)}
          sx={{
            position: "relative",
            color: "#e2e8f0",
            textTransform: "uppercase",
            fontSize: 12,
            fontWeight: 700,
            px: 1,
            borderRadius: 6,
            border: "1px solid rgba(148, 163, 184, 0.25)",
            "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
            "@keyframes changelog-pulse": {
              "0%": { transform: "scale(0.9)", opacity: 0.6 },
              "70%": { transform: "scale(1.6)", opacity: 0 },
              "100%": { transform: "scale(1.6)", opacity: 0 },
            },
          }}
        >
          Changelog
          {hasNewChangelog && (
            <Box
              sx={{
                position: "absolute",
                top: -4,
                right: -4,
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#ef4444",
                boxShadow: "0 0 6px rgba(239,68,68,0.9)",
                "&::after": {
                  content: '""',
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  backgroundColor: "rgba(239,68,68,0.6)",
                  animation: "changelog-pulse 1.6s ease-out infinite",
                },
              }}
            />
          )}
        </Button>
        <Button
          size="small"
          variant="text"
          onClick={() => window.open(repoUrl, "_blank", "noopener,noreferrer")}
          sx={{
            color: "#e2e8f0",
            textTransform: "uppercase",
            fontSize: 12,
            fontWeight: 700,
            px: 1,
            borderRadius: 6,
            border: "1px solid rgba(148, 163, 184, 0.25)",
            "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
          }}
        >
          Info
        </Button>
        <Button
          size="small"
          variant="text"
          onClick={() => setHowToOpen(true)}
          startIcon={<Icons.Add sx={{ fontSize: 16 }} />}
          sx={{
            color: "#e2e8f0",
            textTransform: "uppercase",
            fontSize: 12,
            fontWeight: 700,
            px: 1,
            borderRadius: 6,
            border: "1px solid rgba(148, 163, 184, 0.25)",
            "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
          }}
        >
          How To
        </Button>
      </Box>

      {/* Confirm delete modal */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        PaperProps={{ sx: { bgcolor: "#111827", color: "#e5e7eb" } }}
      >
        <DialogTitle>Delete everything?</DialogTitle>
        <DialogContent sx={{ color: "#cbd5f5" }}>
          This will remove all nodes, edges, and saved data. This cannot be
          undone.
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            sx={{ color: "#e2e8f0" }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              setConfirmOpen(false);
              handleClearCurrent();
            }}
            sx={{ color: "#fbbf24" }}
          >
            Current Floor
          </Button>
          <Button
            onClick={() => {
              setConfirmOpen(false);
              handleClearAll();
            }}
            variant="contained"
            sx={{ bgcolor: "#b91c1c", "&:hover": { bgcolor: "#dc2626" } }}
          >
            All Floors
          </Button>
        </DialogActions>
      </Dialog>

      {/* Changelog modal */}
      <Dialog
        open={changelogOpen}
        onClose={() => setChangelogOpen(false)}
        PaperProps={{ sx: { bgcolor: "#111827", color: "#e5e7eb", minWidth: 360 } }}
      >
        <DialogTitle>Changelog v{appVersion}</DialogTitle>
        <DialogContent sx={{ maxHeight: 320, overflowY: "auto" }}>
          {changelogOpen &&
            pageBlocks.map((block, index) => (
              <Box
                key={`changelog-${pageStart}-${index}`}
                sx={{
                  mb: 1.5,
                  "& h2": {
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#e2e8f0",
                    margin: "6px 0",
                  },
                  "& h3": {
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#93c5fd",
                    margin: "6px 0 4px",
                  },
                  "& ul": {
                    margin: "4px 0 8px 16px",
                    padding: 0,
                  },
                  "& li": {
                    fontSize: 12,
                    color: "#cbd5f5",
                    marginBottom: "2px",
                  },
                  "& strong": {
                    color: "#e2e8f0",
                  },
                }}
              >
                <ReactMarkdown>{block}</ReactMarkdown>
              </Box>
            ))}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, display: "flex", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              onClick={() => setChangelogPage((p) => Math.max(0, p - 1))}
              disabled={changelogPage === 0}
              sx={{ color: "#e2e8f0" }}
            >
              Prev
            </Button>
            <Button
              onClick={() => setChangelogPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={changelogPage >= totalPages - 1}
              sx={{ color: "#e2e8f0" }}
            >
              Next
            </Button>
          </Box>
          <Button onClick={() => setChangelogOpen(false)} sx={{ color: "#e2e8f0" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* How To modal */}
      <Dialog
        open={howToOpen}
        onClose={() => setHowToOpen(false)}
        PaperProps={{ sx: { bgcolor: "#111827", color: "#e5e7eb", minWidth: 420 } }}
      >
        <DialogTitle>How To</DialogTitle>
        <DialogContent sx={{ maxHeight: 420, overflowY: "auto", color: "#cbd5f5" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ color: "#e2e8f0", fontWeight: 700 }}>
                What is this?
              </Typography>
              <Typography variant="body2">
                This is a visual factory planning tool for Satisfactory. The dataset is still
                in progress, so some data may be missing and calculations can be inaccurate.
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ color: "#e2e8f0", fontWeight: 700 }}>
                Left sidebar
              </Typography>
              <Typography variant="body2">
                <strong>Buildings:</strong> Find all relevant buildings here. Click or drag them
                onto the canvas to start planning.
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                <strong>Items:</strong> Shows the total output of your factory. Only items you set
                are counted (levels are not separated here).
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                <strong>Energy:</strong> Displays total power usage and a list of power-consuming
                buildings.
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ color: "#e2e8f0", fontWeight: 700 }}>
                Controls
              </Typography>
              <Typography variant="body2">
                Nodes use the same input/output layout and colors as in-game.
              </Typography>
              <Box component="ul" sx={{ mt: 1, pl: 2, mb: 0 }}>
                <Typography component="li" variant="body2" sx={{ mb: 0.6 }}>
                  Left click or drag to place buildings onto the canvas.
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.6 }}>
                  Right mouse button (or middle mouse) pans the editor; mouse wheel zooms.
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.6 }}>
                  Hold <strong>Ctrl</strong> to multi-select and move/delete together.
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.6 }}>
                  Copy &amp; paste: <strong>Ctrl+C</strong> / <strong>Ctrl+V</strong> (single or multiple nodes).
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.6 }}>
                  Delete selected nodes with <strong>Del</strong>; undo with <strong>Ctrl+Z</strong>.
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.6 }}>
                  To delete a connection, select the dashed line and press <strong>Del</strong>.
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.6 }}>
                  Select a node and press <strong>R</strong> to rotate handles 90 degrees per press.
                </Typography>
                <Typography component="li" variant="body2">
                  Stack identical buildings: select them and click{" "}
                  <Icons.Layers sx={{ fontSize: 16, color: "#60a5fa", verticalAlign: "text-bottom" }} />.
                  Unstack with{" "}
                  <Icons.LayersClear sx={{ fontSize: 16, color: "#f97316", verticalAlign: "text-bottom" }} />.
                </Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ color: "#e2e8f0", fontWeight: 700 }}>
                Reports
              </Typography>
              <Typography variant="body2">
                The system tracks production efficiency and shows status indicators:
              </Typography>
              <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 0.6 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      bgcolor: "#ef4444",
                      boxShadow: "0 0 6px rgba(239,68,68,0.6)",
                    }}
                  />
                  <Typography variant="body2">
                    <strong>Inefficient:</strong> not enough input for the connected demand. Shows
                    supply vs. required rate.
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      bgcolor: "#10b981",
                      boxShadow: "0 0 6px rgba(16,185,129,0.6)",
                    }}
                  />
                  <Typography variant="body2">
                    <strong>Optimal:</strong> production matches demand.
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      bgcolor: "#eab308",
                      boxShadow: "0 0 6px rgba(234,179,8,0.6)",
                    }}
                  />
                  <Typography variant="body2">
                    <strong>Overproduction:</strong> producing more than downstream can consume.
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ color: "#e2e8f0", fontWeight: 700 }}>
                Too much on screen?
              </Typography>
              <Typography variant="body2">
                Click{" "}
                <Icons.Tune sx={{ fontSize: 16, color: "#94a3b8", verticalAlign: "text-bottom" }} />{" "}
                to toggle UI elements if you want a cleaner view.
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ color: "#e2e8f0", fontWeight: 700 }}>
                Smart connections
              </Typography>
              <Typography variant="body2">
                In many cases the system auto-assigns recipes and outputs. If a recipe is missing,
                it simply hasn’t been added to the database yet. Expect some gaps for now.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setHowToOpen(false)} sx={{ color: "#e2e8f0" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      </>
    );
  },
);

Header.displayName = "Header";

export default Header;
