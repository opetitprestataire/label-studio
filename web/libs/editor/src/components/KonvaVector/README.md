# KonvaVector Component

## Point Creation Management

The KonvaVector component now uses a **PointCreationManager** as the **single source of truth** for all point creation, whether it's regular points or bezier points. This ensures consistent behavior and centralized point creation logic.

### New Ref Methods

The component exposes three new methods through the ref:

```typescript
interface KonvaVectorRef {
    // ... existing methods ...

    // Programmatic point creation methods
    startPoint: (x: number, y: number) => boolean;
    updatePoint: (x: number, y: number) => boolean;
    commitPoint: (x: number, y: number) => boolean;
}
```

### Usage Example

```tsx
import { useRef } from "react";
import { KonvaVector, type KonvaVectorRef } from "./KonvaVector";

function MyComponent() {
    const vectorRef = useRef<KonvaVectorRef>(null);

    const handleProgrammaticPointCreation = () => {
        if (!vectorRef.current) return;

        // Start creating a point at (100, 200)
        const started = vectorRef.current.startPoint(100, 200);
        if (!started) return;

        // Simulate dragging to create a bezier point
        // Move 10 pixels away from start position
        vectorRef.current.updatePoint(110, 210);

        // Continue dragging
        vectorRef.current.updatePoint(120, 220);

        // Commit the point creation
        vectorRef.current.commitPoint(125, 225);
    };

    const handleSimplePointCreation = () => {
        if (!vectorRef.current) return;

        // Start creating a point
        const started = vectorRef.current.startPoint(150, 250);
        if (!started) return;

        // Small movement (less than 5 pixels) creates a regular point
        vectorRef.current.updatePoint(152, 252);

        // Commit the point
        vectorRef.current.commitPoint(152, 252);
    };

    return (
        <KonvaVector
            ref={vectorRef}
            initialPoints={[]}
            onPointsChange={setPoints}
            allowBezier={true}
            allowClose={false}
            width={800}
            height={600}
        />
    );
}
```

### How It Works

1. **startPoint(x, y)**:
   - Initializes the point creation process
   - Sets a flag that we're about to draw
   - Returns `true` if successful, `false` if already creating or constraints
     not met

2. **updatePoint(x, y)**:
   - Called continuously with current cursor position
   - Creates a bezier point if drag distance exceeds 5 pixels from start
     position
   - Updates control points for bezier curves
   - Returns `true` if successful, `false` if not creating

3. **commitPoint(x, y)**:
   - Finalizes the point creation process
   - Creates a regular point if no point was created during updatePoint
     (regardless of final drag distance)
   - Finalizes bezier point with current control points if one was created
     during updatePoint
   - Resets the creation state
   - Returns `true` if successful, `false` if not creating

### Single Source of Truth

The PointCreationManager is now the **single source of truth** for all point creation:

- **All point creation goes through the manager**: Whether it's manual mouse interactions, programmatic calls, or shift-click operations
- **Consistent behavior**: All point creation follows the same logic and constraints
- **Centralized validation**: All bounds checking, point limits, and bezier settings are handled in one place
- **No conflicts**: The manager prevents duplicate point creation and ensures proper state management

### Integration with Mouse Events

The PointCreationManager is integrated with the existing mouse handlers:

- When the manager is creating a point (`isCreating()` returns `true`), the
  regular click-drag and shift-click-drag behaviors are disabled
- This prevents conflicts between programmatic and manual point creation
- The manager respects all the same constraints as manual creation (bounds
  checking, point limits, etc.)

### Singleton Pattern

The PointCreationManager uses a singleton pattern, ensuring only one instance
exists per KonvaVector component. This prevents multiple point creation
processes from running simultaneously.

### Constraints

The manager respects all the same constraints as manual point creation:

- `maxPoints` limit
- `minPoints` requirement
- `allowBezier` setting
- `constrainToBounds` setting
- `skeletonEnabled` mode
- Canvas bounds when `constrainToBounds` is true

### Skeleton Mode Support

When `skeletonEnabled` is true, new points are connected to the `activePointId`
instead of the last point in the array, allowing for branching path creation.
