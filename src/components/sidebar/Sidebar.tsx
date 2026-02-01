import { useState, useMemo, memo, useCallback, useEffect } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Chip,
  Collapse,
  Checkbox,
  IconButton,
} from "@mui/material";
import { Node, Edge } from "@xyflow/react";
import * as Icons from "@mui/icons-material";
import { SidebarTab, Building, Item } from "../../types";
import buildingsData from "../../data/buildings.json";
import itemsData from "../../data/items.json";

const buildings: Building[] = buildingsData.buildings as Building[];
const items: Item[] = itemsData.items;

const buildingImageMap = import.meta.glob("../../assets/building/*", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

const buildingIconById: Record<string, string> = {
  miner_mk1: "Miner_Mk",
  miner_mk2: "Miner_Mk",
  miner_mk3: "Miner_Mk",
};

const getBuildingIconUrl = (buildingId: string): string => {
  const key = buildingIconById[buildingId];
  if (!key || typeof key !== "string") return "";
  const entry = Object.entries(buildingImageMap).find(([path]) =>
    path.toLowerCase().includes(key.toLowerCase()),
  );
  return entry ? entry[1] : "";
};

interface TabPanelProps {
  children?: React.ReactNode;
  value: SidebarTab;
  index: SidebarTab;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      sx={{
        flexGrow: 1,
        overflow: "auto",
        display: value === index ? "block" : "none",
      }}
    >
      {value === index && children}
    </Box>
  );
}

interface SidebarProps {
  onAddNode: (
    type:
      | "building"
      | "group"
      | "splitter"
      | "smartSplitter"
      | "goal"
      | "conveyorLift",
    data?: Partial<Record<string, unknown>>,
  ) => void;
  onSelectNodesByItems: (itemIds: string[]) => void;
  nodes: Node[];
  edges: Edge[];
}

const getIconComponent = (
  iconName: string,
): React.ComponentType<{ sx?: object }> => {
  const pascalCase = iconName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
  return (
    (Icons as Record<string, React.ComponentType<{ sx?: object }>>)[
      pascalCase
    ] || Icons.Category
  );
};

function Sidebar({
  onAddNode,
  onSelectNodesByItems,
  nodes,
  edges,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("production");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [projectAssemblyOpen, setProjectAssemblyOpen] = useState(true);
  const [itemFlowOpen, setItemFlowOpen] = useState(true);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Section collapse states
  const [specialOpen, setSpecialOpen] = useState(true);
  const [extractorsOpen, setExtractorsOpen] = useState(true);
  const [smeltersOpen, setSmeltersOpen] = useState(true);
  const [manufacturersOpen, setManufacturersOpen] = useState(true);
  const [storageOpen, setStorageOpen] = useState(true);

  const handleTabChange = (_: React.SyntheticEvent, newValue: SidebarTab) => {
    setActiveTab(newValue);
  };

  // Calculate energy stats
  const energyStats = useMemo(() => {
    let totalPower = 0;
    const buildingPowers: { name: string; power: number }[] = [];
    const layerTotals = new Map<number, number>();

    nodes.forEach((node) => {
      if (node.type === "building" && node.data) {
        const data = node.data as {
          buildingId?: string;
          powerUsage?: number;
          layer?: number;
          stackCount?: number;
          isStacked?: boolean;
        };
        if (data.isStacked) return;
        const building = buildings.find((b) => b.id === data.buildingId);
        if (building && building.category !== "storage") {
          const stackCount = data.stackCount || 1;
          const power = (data.powerUsage || building.defaultPower) * stackCount;
          const layer = data.layer || 1;
          totalPower += power;
          buildingPowers.push({
            name: stackCount > 1 ? `${building.name} x${stackCount}` : building.name,
            power,
          });
          layerTotals.set(layer, (layerTotals.get(layer) || 0) + power);
        }
      }
    });

    const layerPowers = Array.from(layerTotals.entries())
      .filter(([, power]) => power > 0)
      .sort((a, b) => a[0] - b[0])
      .map(([layer, power]) => ({ layer, power }));

    return { totalPower, buildingPowers, layerPowers };
  }, [nodes]);

  // Calculate item flow stats
  const itemStats = useMemo(() => {
    const map = new Map<string, { item: Item; rate: number }>();
    nodes.forEach((node) => {
      if (node.type === "building" && node.data) {
        const data = node.data as { outputItem?: string; production?: number };
        if (data.outputItem) {
          const item = items.find((i) => i.id === data.outputItem);
          if (item) {
            const current = map.get(item.id);
            const rate = data.production || 0;
            map.set(item.id, {
              item,
              rate: (current?.rate || 0) + rate,
            });
          }
        }
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.item.name.localeCompare(b.item.name),
    );
  }, [nodes]);

  const handleToggleItemSelect = useCallback((itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  }, []);

  useEffect(() => {
    onSelectNodesByItems(selectedItemIds);
  }, [selectedItemIds, onSelectNodesByItems]);

  const projectAssemblyItems = [
    "Smart Plating",
    "Automated Wiring",
    "Versatile Framework",
    "Adaptive Control Unit",
    "Modular Engine",
    "Assembly Director System",
    "Magnetic Field Generator",
    "Nuclear Pasta",
    "Thermal Propulsion Rocket",
  ];

  const handleAddBuildingNode = (building: Building) => {
    const hasPurity = [
      "miner_mk1",
      "miner_mk2",
      "miner_mk3",
      "oil_extractor",
      "resource_well_extractor",
    ].includes(building.id);
    const defaultOutput =
      building.fixedOutput ||
      (building.category === "extraction" ? building.outputs?.[0] ?? "" : "");
    onAddNode("building", {
      buildingId: building.id,
      production: building.defaultProduction,
      powerUsage: building.category === "storage" ? 0 : building.defaultPower,
      iconUrl: getBuildingIconUrl(building.id),
      outputItem: defaultOutput,
      purity: hasPurity ? "normal" : "",
      inputCount: building.inputs ?? 0,
    });
  };

  return (
    <Paper
      elevation={4}
      sx={{
        width: isCollapsed ? 56 : 300,
        height: "100%",
        bgcolor: "#1a1a2e",
        display: "flex",
        flexDirection: "column",
        borderRadius: 0,
        position: "relative",
        overflow: "visible",
        transition: "width 200ms ease",
      }}
    >
      <IconButton
        size="small"
        onClick={() => setIsCollapsed((prev) => !prev)}
        sx={{
          position: "absolute",
          right: -14,
          top: "50%",
          transform: "translateY(-50%)",
          bgcolor: "#111827",
          border: "1px solid #374151",
          color: "#e5e7eb",
          width: 28,
          height: 28,
          zIndex: 20,
          boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
          "&:hover": { bgcolor: "#1f2937" },
        }}
      >
        {isCollapsed ? (
          <Icons.ChevronRight fontSize="small" />
        ) : (
          <Icons.ChevronLeft fontSize="small" />
        )}
      </IconButton>
      <Box sx={{ borderBottom: 1, borderColor: "#333" }}>
        {!isCollapsed && (
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              "& .MuiTab-root": {
                color: "#888",
                minHeight: 48,
                "&.Mui-selected": {
                  color: "#3498db",
                },
              },
              "& .MuiTabs-indicator": {
                bgcolor: "#3498db",
              },
            }}
          >
            <Tab
              value="production"
              icon={<Icons.Factory sx={{ fontSize: 20 }} />}
              label="Production"
              sx={{ fontSize: "0.7rem" }}
            />
            <Tab
              value="items"
              icon={<Icons.Inventory sx={{ fontSize: 20 }} />}
              label="Items"
              sx={{ fontSize: "0.7rem" }}
            />
            <Tab
              value="energy"
              icon={<Icons.Bolt sx={{ fontSize: 20 }} />}
              label="Energy"
              sx={{ fontSize: "0.7rem" }}
            />
          </Tabs>
        )}
      </Box>

      {isCollapsed && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            py: 1,
          }}
        >
          <IconButton
            size="small"
            onClick={() => {
              setActiveTab("production");
              setIsCollapsed(false);
            }}
            sx={{ color: activeTab === "production" ? "#3498db" : "#888" }}
          >
            <Icons.Factory sx={{ fontSize: 20 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              setActiveTab("items");
              setIsCollapsed(false);
            }}
            sx={{ color: activeTab === "items" ? "#3498db" : "#888" }}
          >
            <Icons.Inventory sx={{ fontSize: 20 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              setActiveTab("energy");
              setIsCollapsed(false);
            }}
            sx={{ color: activeTab === "energy" ? "#3498db" : "#888" }}
          >
            <Icons.Bolt sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
      )}

      {/* Production Tab */}
      {!isCollapsed && (
        <TabPanel value={activeTab} index="production">
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="#888" gutterBottom>
              Add Nodes
            </Typography>
          </Box>

          <List dense>
            <Box sx={{ px: 2, pb: 1 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  mb: 0.5,
                }}
                onClick={() => setSpecialOpen((v) => !v)}
              >
                <Typography variant="subtitle2" color="#888">
                  Special
                </Typography>
                <IconButton size="small" sx={{ color: "#888", p: 0.5 }}>
                  {specialOpen ? (
                    <Icons.ExpandLess fontSize="small" />
                  ) : (
                    <Icons.ExpandMore fontSize="small" />
                  )}
                </IconButton>
              </Box>
              <Collapse in={specialOpen} timeout={300}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 1,
                  }}
                >
                  <Paper
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/satisplanner",
                        JSON.stringify({
                          type: "group",
                          data: {
                            label: "Production line",
                            theme: "orange",
                          },
                        }),
                      );
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() =>
                      onAddNode("group", {
                        label: "Production line",
                        theme: "orange",
                      })
                    }
                    sx={{
                      p: 1,
                      bgcolor: "#16213e",
                      cursor: "grab",
                      border: "1px solid #1f2937",
                      "&:hover": { bgcolor: "#1b2a4a" },
                      "&:active": { cursor: "grabbing" },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Icons.Grid4x4 sx={{ color: "#60a5fa", fontSize: 20 }} />
                      <Typography
                        variant="body2"
                        sx={{ color: "#fff", fontSize: "0.75rem" }}
                      >
                        Prod. line
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: "#666" }}>
                      Group nodes
                    </Typography>
                  </Paper>
                  <Paper
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/satisplanner",
                        JSON.stringify({
                          type: "splitter",
                          data: {
                            label: "Splitter",
                          },
                        }),
                      );
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() =>
                      onAddNode("splitter", {
                        label: "Splitter",
                      })
                    }
                    sx={{
                      p: 1,
                      bgcolor: "#16213e",
                      cursor: "grab",
                      border: "1px solid #1f2937",
                      "&:hover": { bgcolor: "#1b2a4a" },
                      "&:active": { cursor: "grabbing" },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Icons.CallSplit
                        sx={{ color: "#38bdf8", fontSize: 20 }}
                      />
                      <Typography
                        variant="body2"
                        sx={{ color: "#fff", fontSize: "0.75rem" }}
                      >
                        Splitter
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: "#666" }}>
                      Pass-through
                    </Typography>
                  </Paper>
                  <Paper
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/satisplanner",
                        JSON.stringify({
                          type: "smartSplitter",
                          data: {
                            label: "Smart Splitter",
                            splitOutputs: [
                              { item: null, conveyorMk: 1 },
                              { item: null, conveyorMk: 1 },
                              { item: null, conveyorMk: 1 },
                            ],
                          },
                        }),
                      );
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() =>
                      onAddNode("smartSplitter", {
                        label: "Smart Splitter",
                        splitOutputs: [
                          { item: null, conveyorMk: 1 },
                          { item: null, conveyorMk: 1 },
                          { item: null, conveyorMk: 1 },
                        ],
                      })
                    }
                    sx={{
                      p: 1,
                      bgcolor: "#16213e",
                      cursor: "grab",
                      border: "1px solid #1f2937",
                      "&:hover": { bgcolor: "#1b2a4a" },
                      "&:active": { cursor: "grabbing" },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Icons.CallSplit
                        sx={{ color: "#8b5cf6", fontSize: 20 }}
                      />
                      <Typography
                        variant="body2"
                        sx={{ color: "#fff", fontSize: "0.75rem" }}
                      >
                        Smart Splitter
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: "#666" }}>
                      Sort items
                    </Typography>
                  </Paper>
                  <Paper
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/satisplanner",
                        JSON.stringify({
                          type: "conveyorLift",
                          data: {
                            liftMk: 1,
                            direction: "up",
                          },
                        }),
                      );
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() =>
                      onAddNode("conveyorLift", {
                        liftMk: 1,
                        direction: "up",
                      })
                    }
                    sx={{
                      p: 1,
                      bgcolor: "#16213e",
                      cursor: "grab",
                      border: "1px solid #1f2937",
                      "&:hover": { bgcolor: "#1b2a4a" },
                      "&:active": { cursor: "grabbing" },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Icons.SwapVert sx={{ color: "#60a5fa", fontSize: 20 }} />
                      <Typography
                        variant="body2"
                        sx={{ color: "#fff", fontSize: "0.75rem" }}
                      >
                        Lift
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: "#666" }}>
                      Between floors
                    </Typography>
                  </Paper>
                  <Paper
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/satisplanner",
                        JSON.stringify({
                          type: "goal",
                          data: {
                            itemId: "smart_plating",
                            targetRate: 2,
                          },
                        }),
                      );
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() =>
                      onAddNode("goal", {
                        itemId: "smart_plating",
                        targetRate: 2,
                      })
                    }
                    sx={{
                      p: 1,
                      bgcolor: "rgba(234, 179, 8, 0.15)",
                      cursor: "grab",
                      border: "2px solid #eab308",
                      borderRadius: 2,
                      "&:hover": { bgcolor: "rgba(234, 179, 8, 0.25)" },
                      "&:active": { cursor: "grabbing" },
                      gridColumn: "span 2",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "#eab308",
                          fontSize: "0.85rem",
                          fontWeight: 700,
                        }}
                      >
                        Project Parts
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: "#9ca3af" }}>
                      Set a target item to produce - validates when all inputs
                      connected
                    </Typography>
                  </Paper>
                </Box>
              </Collapse>
            </Box>

            {(() => {
              const buildingById = new Map(buildings.map((b) => [b.id, b]));
              const groups = [
                {
                  title: "Extractors",
                  ids: [
                    "miner_mk1",
                    "miner_mk2",
                    "miner_mk3",
                    "water_extractor",
                    "oil_extractor",
                    "resource_well_extractor",
                  ],
                  isOpen: extractorsOpen,
                  setOpen: setExtractorsOpen,
                },
                {
                  title: "Smelters",
                  ids: ["smelter", "foundry"],
                  isOpen: smeltersOpen,
                  setOpen: setSmeltersOpen,
                },
                {
                  title: "Manufacturers",
                  ids: [
                    "assembler",
                    "constructor",
                    "manufacturer",
                    "quantum_encoder",
                    "packager",
                    "refinery",
                    "blender",
                  ],
                  isOpen: manufacturersOpen,
                  setOpen: setManufacturersOpen,
                },
                {
                  title: "Storage",
                  ids: [
                    "fluid_buffer",
                    "industrial_fluid_buffer",
                    "storage_container",
                    "industrial_storage",
                  ],
                  isOpen: storageOpen,
                  setOpen: setStorageOpen,
                },
              ];

              return groups.map((group) => (
                <Box key={group.title} sx={{ px: 2, pb: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      mb: 0.5,
                    }}
                    onClick={() => group.setOpen((v: boolean) => !v)}
                  >
                    <Typography variant="subtitle2" color="#888">
                      {group.title}
                    </Typography>
                    <IconButton size="small" sx={{ color: "#888", p: 0.5 }}>
                      {group.isOpen ? (
                        <Icons.ExpandLess fontSize="small" />
                      ) : (
                        <Icons.ExpandMore fontSize="small" />
                      )}
                    </IconButton>
                  </Box>
                  <Collapse in={group.isOpen} timeout={300}>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 1,
                      }}
                    >
                      {group.ids.map((id) => {
                        const building = buildingById.get(id);
                        if (!building) return null;
                        const IconComp = getIconComponent(building.icon);
                        const isStorage = building.category === "storage";
                        return (
                          <Paper
                            key={building.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData(
                                "application/satisplanner",
                                JSON.stringify({
                                  type: "building",
                                  data: {
                                    buildingId: building.id,
                                    production: building.defaultProduction,
                                    powerUsage: isStorage
                                      ? 0
                                      : building.defaultPower,
                                    iconUrl: getBuildingIconUrl(building.id),
                                  },
                                }),
                              );
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onClick={() => handleAddBuildingNode(building)}
                            sx={{
                              p: 1,
                              bgcolor: "#16213e",
                              cursor: "grab",
                              border: "1px solid #1f2937",
                              "&:hover": { bgcolor: "#1b2a4a" },
                              "&:active": { cursor: "grabbing" },
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <IconComp
                                sx={{ color: "#3498db", fontSize: 20 }}
                              />
                              <Typography
                                variant="body2"
                                sx={{ color: "#fff", fontSize: "0.75rem" }}
                              >
                                {building.name}
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                mt: 0.5,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{ color: "#666" }}
                              >
                                {isStorage
                                  ? "-"
                                  : `${building.defaultPower} MW`}
                              </Typography>
                              {!isStorage && (
                                <Chip
                                  label={`${building.defaultProduction}/min`}
                                  size="small"
                                  sx={{
                                    bgcolor: "#0f172a",
                                    color: "#2ecc71",
                                    fontSize: "0.65rem",
                                    height: 18,
                                  }}
                                />
                              )}
                            </Box>
                          </Paper>
                        );
                      })}
                    </Box>
                  </Collapse>
                </Box>
              ));
            })()}
          </List>
        </TabPanel>
      )}

      {/* Items Tab */}
      {!isCollapsed && (
        <TabPanel value={activeTab} index="items">
          <Box sx={{ p: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="subtitle2" color="#888">
                Project Assembly Phases
              </Typography>
              <IconButton
                size="small"
                onClick={() => setProjectAssemblyOpen((v) => !v)}
                sx={{ color: "#888" }}
              >
                {projectAssemblyOpen ? (
                  <Icons.ExpandLess />
                ) : (
                  <Icons.ExpandMore />
                )}
              </IconButton>
            </Box>
            <Collapse in={projectAssemblyOpen}>
              <List dense>
                {projectAssemblyItems.map((name) => (
                  <ListItem key={name} sx={{ py: 0.25 }}>
                    <ListItemText
                      primary={name}
                      primaryTypographyProps={{
                        color: "#cbd5f5",
                        fontSize: "0.8rem",
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </Box>

          <Divider sx={{ borderColor: "#333" }} />

          <Box sx={{ p: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="subtitle2" color="#888">
                Item Flow Summary
              </Typography>
              <IconButton
                size="small"
                onClick={() => setItemFlowOpen((v) => !v)}
                sx={{ color: "#888" }}
              >
                {itemFlowOpen ? <Icons.ExpandLess /> : <Icons.ExpandMore />}
              </IconButton>
            </Box>

            <Collapse in={itemFlowOpen}>
              {itemStats.length === 0 ? (
                <Typography
                  variant="body2"
                  color="#555"
                  sx={{ mt: 2, textAlign: "center" }}
                >
                  No items being produced yet.
                  <br />
                  Add buildings to see item flow.
                </Typography>
              ) : (
                <List dense>
                  {itemStats.map((stat) => {
                    const IconComp = getIconComponent(stat.item.icon);
                    const isChecked = selectedItemIds.includes(stat.item.id);
                    return (
                      <ListItem key={stat.item.id} sx={{ py: 0.5 }}>
                        <Checkbox
                          size="small"
                          checked={isChecked}
                          onChange={() => handleToggleItemSelect(stat.item.id)}
                          sx={{
                            color: "#555",
                            "&.Mui-checked": { color: "#fff" },
                          }}
                        />
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <IconComp sx={{ color: "#2ecc71", fontSize: 20 }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={stat.item.name}
                          primaryTypographyProps={{
                            color: "#fff",
                            fontSize: "0.85rem",
                          }}
                        />
                        <Typography variant="body2" sx={{ color: "#2ecc71" }}>
                          +{stat.rate}/min
                        </Typography>
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Collapse>
          </Box>
        </TabPanel>
      )}

      {/* Energy Tab */}
      {!isCollapsed && (
        <TabPanel value={activeTab} index="energy">
          <Box sx={{ p: 2 }}>
            <Paper
              sx={{
                p: 2,
                bgcolor: "#16213e",
                textAlign: "center",
                mb: 2,
              }}
            >
              <Icons.Bolt sx={{ fontSize: 40, color: "#f1c40f" }} />
              <Typography variant="h4" color="#f1c40f" fontWeight="bold">
                {energyStats.totalPower.toFixed(1)} MW
              </Typography>
              <Typography variant="body2" color="#888">
                Total Power Consumption
              </Typography>
            </Paper>

            <Typography variant="subtitle2" color="#888" gutterBottom>
              Power Breakdown
            </Typography>

            {energyStats.layerPowers.length > 1 && (
              <>
                <Typography variant="subtitle2" color="#888" gutterBottom>
                  Power by Layer
                </Typography>
                <List dense sx={{ mb: 2 }}>
                  {energyStats.layerPowers.map((lp) => (
                    <ListItem key={`layer-${lp.layer}`} sx={{ py: 0.5 }}>
                      <ListItemText
                        primary={`Layer ${lp.layer}`}
                        primaryTypographyProps={{
                          color: "#fff",
                          fontSize: "0.85rem",
                        }}
                      />
                      <Typography variant="body2" color="#f1c40f">
                        {lp.power.toFixed(1)} MW
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {energyStats.buildingPowers.length === 0 ? (
              <Typography
                variant="body2"
                color="#555"
                sx={{ mt: 2, textAlign: "center" }}
              >
                No buildings placed yet.
              </Typography>
            ) : (
              <List dense>
                {energyStats.buildingPowers.map((bp, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Icons.ElectricBolt
                        sx={{ color: "#e74c3c", fontSize: 20 }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={bp.name}
                      primaryTypographyProps={{
                        color: "#fff",
                        fontSize: "0.85rem",
                      }}
                    />
                    <Typography variant="body2" color="#e74c3c">
                      {bp.power} MW
                    </Typography>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </TabPanel>
      )}

      {/* Stats Footer */}
      {!isCollapsed && (
        <Box
          sx={{
            mt: "auto",
            p: 1.5,
            bgcolor: "#16213e",
            borderTop: "1px solid #333",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Box textAlign="center">
              <Typography variant="h6" color="#3498db">
                {nodes.length}
              </Typography>
              <Typography variant="caption" color="#666">
                Nodes
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h6" color="#2ecc71">
                {edges.length}
              </Typography>
              <Typography variant="caption" color="#666">
                Connections
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h6" color="#f1c40f">
                {energyStats.totalPower.toFixed(0)}
              </Typography>
              <Typography variant="caption" color="#666">
                MW
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  );
}

// Custom comparison - only re-render when node DATA changes, not positions
function arePropsEqual(
  prevProps: SidebarProps,
  nextProps: SidebarProps,
): boolean {
  // Always re-render if edges count changes
  if (prevProps.edges.length !== nextProps.edges.length) return false;

  // Always re-render if nodes count changes
  if (prevProps.nodes.length !== nextProps.nodes.length) return false;

  // Only compare relevant node data, not positions
  for (let i = 0; i < prevProps.nodes.length; i++) {
    const prevData = prevProps.nodes[i].data as Record<string, unknown>;
    const nextData = nextProps.nodes[i].data as Record<string, unknown>;

    // Check if relevant data changed
    if (
      prevData.buildingId !== nextData.buildingId ||
      prevData.powerUsage !== nextData.powerUsage ||
      prevData.outputItem !== nextData.outputItem ||
      prevData.production !== nextData.production
    ) {
      return false;
    }
  }

  return true;
}

export default memo(Sidebar, arePropsEqual);
