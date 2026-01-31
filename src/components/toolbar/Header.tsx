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
import { Node } from "@xyflow/react";
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
    const [changelogPage, setChangelogPage] = useState(0);

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
      if (changelogOpen) setChangelogPage(0);
    }, [changelogOpen]);

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
          Changelog
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
      </>
    );
  },
);

Header.displayName = "Header";

export default Header;
