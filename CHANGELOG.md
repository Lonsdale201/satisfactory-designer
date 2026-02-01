# Changelog

## [0.2.4] - 2026-02-01

### Added

- New setting: hide required item indicators
- New node: Splitter

### Fixed

- Storage manual item selection no longer gets stuck
- Storage now reacts when the connected building's item changes
- Lift reacts to item changes on connected nodes (including disconnects)

### Changed

- Refactor across multiple areas
- Storage systems now enforce a single item type (mixed types later)
- Ghost mode production line design adjusted
- Settings are now persisted (local storage + export)
- New changelog indicator with persistent state
- Storage systems now allow only one connection per handle (more nodes soon)
- Ghost mode connection design clarified for floor separation
- Overproduction text is clearer and easier to understand

## [0.2.3] - 2026-01-31

### Added

- New floor level management

### Fixed

- Calculation system improvements
- Ghost mode group (prod line) color fixing

### Changed

- Clearer overproduction messaging

## [0.2.2] - 2026-01-31

### Fixed

- Fluid storage handling adjusted
- Storage-started production lines now assume 100% full capacity
- Flow calculations corrected
- Production efficiency now accounts for mixed input lines (solid + liquid)
- Cubic meter display issues fixed
- Water Extractor now defaults to Water output
- Items with multiple non-alternate recipes now handled correctly
- Missing Refinery production items restored (recipes still in progress)
- Missing items added back to their producer building lists
- Conveyor Lift no longer gets deleted due to stale cross-layer selection
- Fixed smart splitter so storage flow calculations work when storage is connected through a splitter

### Added

- New items
- New recipes
- Stack sizes added

### Changed

- Production Group upgrades:
  - Target power value
  - Total power display
  - Displays how many item types the group produces
  - Trailing .0 removed when not needed
- UI refactor for building panels and recipe handling
- General performance optimizations (including code-splitting)
- New Prod Line colors and comment field

## [0.2.1] - 2026-01-31

### Added

- Industrial Fluid Buffer (2 pipe inputs, 2 pipe outputs, 2400 m3)
- New item recipes and alternate recipes
- Missing item list made more compact to keep nodes from growing too wide

### Changed

- New item logic: removed hard-coded filters to support flexible alternate recipes
- Storage fill calculations now work for solid and fluid containers
- Hybrid output buildings (e.g. Refinery) output logic fixed
- Transport node removed (distance-based results were unreliable)
- Smart Splitter issues fixed
- Output conveyor type is now unified (single MK for all outputs)

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
  - Pipeline tiers: Mk.1 (300 mÂł/min), Mk.2 (600 mÂł/min)
  - Conveyor selector hidden for pipe-only buildings
- **Fluid Buffer:** 400 mÂł capacity with proper volume calculations
- Improved node editor: Belt & Pipe settings only show relevant options

### Fixed

- Calculator now properly handles fluid volumes in mÂł

