// Verification test for Wainscoting Calculator Core Logic
// Run with: node test_calculator.js

function calculatePictureFrameSpacing(params) {
  const {
    wallLength,
    marginSides, // can be fixed or 'equal'
    targetPanelWidth,
    panelCount,
    spacingBetween, // can be fixed or 'auto'
  } = params;

  let count = panelCount;
  let spacing = spacingBetween;
  let margin = marginSides;

  if (count && count > 0) {
    if (margin === 'equal') {
      // All spaces (margins + gaps) are equal: (count + 1) spaces
      if (spacing !== 'auto' && spacing > 0) {
        // spacing is given, compute panel width
        const totalSpacing = (count + 1) * spacing;
        const panelWidth = (wallLength - totalSpacing) / count;
        return { count, panelWidth, spacing, margin: spacing, valid: panelWidth > 0 };
      } else {
        // default spacing or compute from targetPanelWidth
        if (targetPanelWidth) {
          spacing = (wallLength - count * targetPanelWidth) / (count + 1);
          return { count, panelWidth: targetPanelWidth, spacing, margin: spacing, valid: spacing > 0 };
        }
      }
    } else {
      // Fixed margin sides, equal spacing between panels
      const sideMargin = typeof margin === 'number' ? margin : 100;
      const availableSpan = wallLength - (2 * sideMargin);
      if (spacing !== 'auto' && typeof spacing === 'number') {
        const totalInteriorSpacing = (count - 1) * spacing;
        const panelWidth = (availableSpan - totalInteriorSpacing) / count;
        return { count, panelWidth, spacing, margin: sideMargin, valid: panelWidth > 0 };
      } else {
        // Auto spacing: make spacing equal to side margin or distribute evenly
        const numSpaces = count - 1;
        if (targetPanelWidth) {
          const remaining = availableSpan - (count * targetPanelWidth);
          spacing = numSpaces > 0 ? remaining / numSpaces : 0;
          return { count, panelWidth: targetPanelWidth, spacing, margin: sideMargin, valid: spacing >= 0 };
        }
      }
    }
  }

  // Automatic panel count derivation based on target panel width
  if (targetPanelWidth && targetPanelWidth > 0) {
    const assumedSpacing = typeof spacing === 'number' ? spacing : 100;
    // (wallLength - assumedSpacing) / (targetPanelWidth + assumedSpacing)
    let approxCount = Math.round((wallLength - assumedSpacing) / (targetPanelWidth + assumedSpacing));
    approxCount = Math.max(1, approxCount);
    const calculatedSpacing = (wallLength - (approxCount * targetPanelWidth)) / (approxCount + 1);
    return {
      count: approxCount,
      panelWidth: targetPanelWidth,
      spacing: calculatedSpacing,
      margin: calculatedSpacing,
      valid: calculatedSpacing > 0
    };
  }

  return { valid: false };
}

// 1D Cutting Stock Bin-Packing Optimizer (Best-Fit Decreasing)
function optimizeCuttingStock(cuts, stockLength, kerf = 3) {
  // cuts is array of lengths
  // Sort descending
  const sortedCuts = [...cuts].sort((a, b) => b - a);
  const boards = []; // each board: { remaining: stockLength, cuts: [] }

  for (const cut of sortedCuts) {
    if (cut > stockLength) {
      throw new Error(`Cut of length ${cut} exceeds stock board length ${stockLength}`);
    }

    // Best-fit: find board with least remaining space that can still fit the cut
    let bestBoardIndex = -1;
    let minRemainingAfter = Infinity;

    for (let i = 0; i < boards.length; i++) {
      const spaceNeeded = boards[i].cuts.length > 0 ? cut + kerf : cut;
      if (boards[i].remaining >= spaceNeeded) {
        const rem = boards[i].remaining - spaceNeeded;
        if (rem < minRemainingAfter) {
          minRemainingAfter = rem;
          bestBoardIndex = i;
        }
      }
    }

    if (bestBoardIndex !== -1) {
      const spaceNeeded = boards[bestBoardIndex].cuts.length > 0 ? cut + kerf : cut;
      boards[bestBoardIndex].remaining -= spaceNeeded;
      boards[bestBoardIndex].cuts.push(cut);
    } else {
      // Need a new board
      boards.push({
        remaining: stockLength - cut,
        cuts: [cut]
      });
    }
  }

  const totalUsedStockLength = boards.length * stockLength;
  const totalCutLength = cuts.reduce((acc, c) => acc + c, 0);
  const wasteLength = totalUsedStockLength - totalCutLength;
  const wastePercentage = (wasteLength / totalUsedStockLength) * 100;

  return {
    boardCount: boards.length,
    boards,
    totalCutLength,
    totalUsedStockLength,
    wastePercentage: wastePercentage.toFixed(1)
  };
}

// Obstacle collision detection
function checkObstacleCollisions(panels, obstacles) {
  // panels: [{ id, x, width, y, height }]
  // obstacles: [{ id, name, x, width, y, height }]
  const conflicts = [];
  for (const panel of panels) {
    for (const obs of obstacles) {
      const xOverlap = panel.x < (obs.x + obs.width) && (panel.x + panel.width) > obs.x;
      const yOverlap = panel.y < (obs.y + obs.height) && (panel.y + panel.height) > obs.y;
      if (xOverlap && yOverlap) {
        conflicts.push({
          panelId: panel.id,
          obstacleId: obs.id,
          obstacleName: obs.name,
          details: `Panel ${panel.id} overlaps with ${obs.name}`
        });
      }
    }
  }
  return conflicts;
}

// RUN TESTS
console.log('Testing Wainscoting Spacing Logic...');
const res1 = calculatePictureFrameSpacing({
  wallLength: 3600,
  marginSides: 'equal',
  targetPanelWidth: 600,
  spacingBetween: 'auto',
  panelCount: 4
});
console.log('Result 1 (4 panels on 3600mm wall, equal spacing):', res1);
if (!res1.valid || res1.spacing !== 240) {
  console.error(`FAILED: Expected spacing 240, got ${res1.spacing}`);
  process.exit(1);
}

const res2 = calculatePictureFrameSpacing({
  wallLength: 3600,
  marginSides: 100,
  panelCount: 4,
  spacingBetween: 100
});
console.log('Result 2 (4 panels, fixed 100mm margins and 100mm gaps):', res2);
// wall = 3600. sides = 200. remaining = 3400. 3 gaps of 100 = 300. panel span = 3100. 3100/4 = 775
if (!res2.valid || res2.panelWidth !== 775) {
  console.error(`FAILED: Expected panel width 775, got ${res2.panelWidth}`);
  process.exit(1);
}

console.log('\nTesting Cutting Stock Optimizer...');
const cutsToMake = [900, 900, 900, 900, 600, 600, 600, 600, 750, 750];
const stockRes = optimizeCuttingStock(cutsToMake, 2400, 3);
console.log(`Stock Result: ${stockRes.boardCount} boards required, ${stockRes.wastePercentage}% waste.`);
for (let i = 0; i < stockRes.boards.length; i++) {
  console.log(`  Board ${i + 1}: cuts [${stockRes.boards[i].cuts.join(', ')}], remaining: ${stockRes.boards[i].remaining}mm`);
}
if (stockRes.boardCount <= 0 || stockRes.boards.length > 5) {
  console.error('FAILED: Optimization board count outside expected range');
  process.exit(1);
}

console.log('\nTesting Obstacle Collision Detection...');
const panels = [
  { id: 1, x: 100, width: 600, y: 150, height: 700 },
  { id: 2, x: 800, width: 600, y: 150, height: 700 }
];
const obstacles = [
  { id: 'outlet-1', name: 'Power Outlet', x: 250, width: 80, y: 300, height: 120 },
  { id: 'outlet-2', name: 'Light Switch', x: 750, width: 80, y: 1100, height: 120 }
];
const collisions = checkObstacleCollisions(panels, obstacles);
console.log(`Found ${collisions.length} collision(s):`, collisions);
if (collisions.length !== 1 || collisions[0].panelId !== 1) {
  console.error('FAILED: Expected 1 collision with panel 1');
  process.exit(1);
}

console.log('\nALL MATH TESTS PASSED!');
