import { PointCreationManager } from './pointCreationManager';

// Simple test to reproduce the issue
function testDuplicatePointCreation() {
  const manager = PointCreationManager.getInstance();
  
  const mockProps = {
    initialPoints: [],
    allowBezier: true,
    pixelSnapping: false,
    constrainToBounds: false,
    width: 800,
    height: 600,
    onPointsChange: (points: any[]) => {
      console.log('Points changed:', points.length, 'points');
    },
    onPointAdded: (point: any, index: number) => {
      console.log('Point added at index:', index);
    },
    onPointEdited: jest.fn(),
    canAddMorePoints: () => true,
    skeletonEnabled: false,
    lastAddedPointId: null,
    activePointId: null,
    setLastAddedPointId: jest.fn(),
    setActivePointId: jest.fn(),
    setVisibleControlPoints: jest.fn(),
    setNewPointDragIndex: jest.fn(),
    setIsDraggingNewBezier: jest.fn(),
  };

  manager.setProps(mockProps);

  console.log('=== Testing sequence: updatePoint -> startPoint -> updatePoint ===');
  
  // Step 1: updatePoint (should return false)
  console.log('Step 1: updatePoint(150, 250)');
  const result1 = manager.updatePoint(150, 250);
  console.log('Result:', result1);
  console.log('Is creating:', manager.isCreating());
  
  // Step 2: startPoint (should work)
  console.log('Step 2: startPoint(100, 200)');
  const result2 = manager.startPoint(100, 200);
  console.log('Result:', result2);
  console.log('Is creating:', manager.isCreating());
  
  // Step 3: updatePoint (should create one point)
  console.log('Step 3: updatePoint(110, 210)');
  const result3 = manager.updatePoint(110, 210);
  console.log('Result:', result3);
  console.log('Is creating:', manager.isCreating());
  
  // Step 4: commitPoint
  console.log('Step 4: commitPoint(115, 215)');
  const result4 = manager.commitPoint(115, 215);
  console.log('Result:', result4);
  console.log('Is creating:', manager.isCreating());
}

// Run the test
testDuplicatePointCreation();
