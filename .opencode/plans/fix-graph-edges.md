# Fix Graph Rendering — Single SVG Overlay Architecture

## Problem

The current per-row SVG architecture renders each commit row's graph section as an independent 36px SVG. Cross-column edges (merge/branch lines) try to curve between columns within a single row, and pass-through edges are disconnected vertical segments. This creates broken visuals: lines going nowhere, disconnected connections, and an impossible-to-follow graph.

The previous attempt to fix this with "gradual diagonal transitions" (fractional column positions) failed — it created messy zigzag patterns instead of clean lines.

## Root Cause

Per-row SVGs are fundamentally unable to render continuous branch paths. Each row only knows about its own 36px segment, so connections between rows must be "stitched" together — a fragile approach that breaks visually.

## Solution: Single SVG Overlay (VS Code Git Graph approach)

Replace per-row SVGs with a **single absolute-positioned SVG** that overlays the entire virtualized commit list. Branch paths are drawn as continuous `<path>` elements spanning the full graph height.

### Key Architecture

```
CommitGraph (scroll container)
├── GraphSvgOverlay (absolute-positioned SVG, full height)
│   ├── Layer 1: Pass-through lines (vertical continuations)
│   ├── Layer 2: Edge paths (connections between commits)
│   └── Layer 3: Commit nodes (circles)
└── Virtualized rows (GraphRow — text only, no SVG)
```

### Coordinate System

- X: `column * LANE_WIDTH + LANE_WIDTH / 2` (center of lane, where LANE_WIDTH = 24)
- Y: `rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2` (center of row, where ROW_HEIGHT = 36)

### Edge Rendering

Same-column edges: `M x y1 L x y2` (straight vertical line)

Cross-column edges: Cubic Bezier S-curve spanning the full vertical distance:

```
M x1 y1
C x1 (y1 + curveStrength),
  x2 (y2 - curveStrength),
  x2 y2
```

Where `curveStrength = min(dy * 0.4, ROW_HEIGHT * 3)`

### Viewport Culling

Only render SVG elements visible in the viewport (plus 15-row overscan). Use binary search on row indices to find the visible range. Edges from rows above the viewport that extend into it are also included.

---

## Files to Change

### File 1: NEW — `src/renderer/components/graph/GraphSvgOverlay.tsx`

New ~200-line React component that renders the single SVG overlay.

**Props:**

- `graphRows: GraphRow[]`
- `maxColumn: number`
- `totalHeight: number` (from virtualizer)
- `scrollTop: number` (from scroll container)
- `viewportHeight: number` (scroll container height)
- `selectedCommitHash: string | null`

**Rendering layers:**

1. Pass-through paths (vertical lines through intermediate rows)
2. Edge paths (continuous curves/lines connecting commits to parents)
3. Commit nodes (circles with merge indicators)

**Viewport culling:** Only renders elements where Y coordinates overlap `[scrollTop - overscan, scrollTop + viewportHeight + overscan]`.

### File 2: `src/renderer/components/graph/CommitGraph.tsx`

**Changes:**

1. Add scroll tracking: `const [scrollTop, setScrollTop] = useState(0)` and `const [viewportHeight, setViewportHeight] = useState(0)`
2. Add `onScroll` handler on the scroll container to update `scrollTop`
3. Import and render `<GraphSvgOverlay>` as an absolute-positioned element inside the virtualized container
4. Pass scroll state to the overlay

### File 3: `src/renderer/components/graph/GraphRow.tsx`

**Changes:**

- Remove the entire `<svg>` element and all SVG rendering code (edges, nodes, pass-throughs, curved edge helper)
- Remove `renderCurvedEdge` helper function
- Remove `BranchIcon` and `TagIcon` SVG components (keep them — they're for ref badges, not graph)
- Add left padding/margin equal to the graph column width so text doesn't overlap the SVG overlay
- Keep: commit info section (subject, ref badges, author avatar, hash, date)
- Export `LANE_WIDTH` and `ROW_HEIGHT` constants (still needed by CommitGraph and overlay)

### File 4: `src/renderer/graph/lane-algorithm.ts`

**Changes:**

- Update `getMaxColumn()` to consider `edge.toColumn` and `passThroughEdge.column` values, not just `row.column`
- Keep Pass 1 (column assignment), Pass 2 (edge computation), Pass 3 (pass-through computation) unchanged

### File 5: `src/shared/types.ts`

**No changes.** The committed types are correct for the new approach:

- `GraphRow` with `commit`, `column`, `edges`, `passThroughEdges`, `incomingEdges`
- `GraphEdge` with `fromColumn`, `toColumn`, `fromRow`, `toRow`, `color`
- `PassThroughEdge` with `column`, `color`

### File 6: Tests

**`tests/components/graph/GraphRow.test.tsx`:**

- Remove SVG-related assertions (circle positions, line strokes, curved paths)
- Keep: commit message, ref badges, author, hash, date, selected state, click handler tests

**`tests/components/graph/CommitGraph.test.tsx`:**

- Mock `GraphSvgOverlay` component
- Existing toolbar/filter tests should pass unchanged

**NEW: `tests/components/graph/GraphSvgOverlay.test.tsx`:**

- SVG renders with correct dimensions
- Commit nodes at correct positions
- Same-column edges as straight lines
- Cross-column edges as curved paths
- Pass-through lines render correctly
- Selected commit highlight

---

## Implementation Order

1. Create `GraphSvgOverlay.tsx` (new component)
2. Update `CommitGraph.tsx` (add scroll tracking + overlay)
3. Simplify `GraphRow.tsx` (remove SVG, text only)
4. Fix `getMaxColumn()` in `lane-algorithm.ts`
5. Update tests
6. Build verification

## Risk Mitigation

- **Scroll performance:** `requestAnimationFrame` throttling, viewport culling with overscan
- **Large repos:** Binary search for visible row range; edges outside range skipped
- **Virtualizer compatibility:** SVG overlay is independent of `@tanstack/react-virtual`'s transforms
