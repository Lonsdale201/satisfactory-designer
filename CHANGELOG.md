# Changelog

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
