# Changelog

## [0.2.0] - 2026-01-30

### Changed

- Removed Resource Node because it complicated the setup
- Moved all related data into the relevant buildings
- Global production speed list applied, and the selector was updated
- Calculator now ignores irrelevant items sent to a node
- Stacked building calculation and connection logic adjusted/fixed

### Added

- New buildings: Refinery, Resource Well Extractor
- Refinery now shows the correct items in its production list
- Alternate recipes support (initial items added, e.g. Screws)
- UI support for buildings that produce two items at once (e.g. Refinery)
- The system now flags irrelevant item connections between nodes
- Liquid Buffer now rejects solid items

## [0.1.2] - 2026-01-30

### Fixed

- Black template fixed for stacked cards
- Indigo color theme layout handling improved

### Added

- Ctrl+Z restores the last deleted node
- Minimap visibility toggle in settings
- Project Parts node ghost layer design added

## [0.1.1] - 2026-01-30

### Added

- GitHub Pages deployment with automated builds
- README documentation with full feature guide

### Changed

- **Water system overhaul:**
  - Water removed from Resource Node (use Water Extractor instead)
  - Water Extractor now has no input, only pipe output
  - Pipeline tiers: Mk.1 (300 m³/min), Mk.2 (600 m³/min)
  - Conveyor selector hidden for pipe-only buildings
- **Fluid Buffer:** 400 m³ capacity with proper volume calculations
- Improved node editor: Belt & Pipe settings only show relevant options

### Fixed

- Calculator now properly handles fluid volumes in m³
