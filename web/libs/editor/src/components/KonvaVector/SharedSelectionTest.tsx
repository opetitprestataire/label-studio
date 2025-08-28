import React, { useState } from "react";
import { KonvaVector } from "./KonvaVector";
import type { BezierPoint } from "./types";
import { VectorSelectionTracker } from "./VectorSelectionTracker";

export const SharedSelectionTest: React.FC = () => {
    const [points1, setPoints1] = useState<BezierPoint[]>([
        { id: "p1-1", x: 100, y: 100, isBezier: false, prevPointId: undefined },
        { id: "p1-2", x: 200, y: 150, isBezier: false, prevPointId: "p1-1" },
        { id: "p1-3", x: 300, y: 100, isBezier: false, prevPointId: "p1-2" },
    ]);

    const [points2, setPoints2] = useState<BezierPoint[]>([
        { id: "p2-1", x: 400, y: 200, isBezier: false, prevPointId: undefined },
        { id: "p2-2", x: 500, y: 250, isBezier: false, prevPointId: "p2-1" },
        { id: "p2-3", x: 600, y: 200, isBezier: false, prevPointId: "p2-2" },
    ]);

    const [globalSelection, setGlobalSelection] = useState<any>(null);

    // Subscribe to global selection changes
    React.useEffect(() => {
        const tracker = VectorSelectionTracker.getInstance();
        const unsubscribe = tracker.subscribe((state) => {
            setGlobalSelection(state);
            console.log("🔍 Global selection changed:", state);
        });

        return unsubscribe;
    }, []);

    return (
        <div style={{ padding: "20px" }}>
            <h2>Shared Selection Tracker Test</h2>

            <div style={{ marginBottom: "20px" }}>
                <h3>Global Selection State:</h3>
                <p><strong>Active Instance:</strong> {globalSelection?.activeInstanceId || 'None'}</p>
                <p><strong>Selected Instances:</strong> {globalSelection?.selectedInstances ? Array.from(globalSelection.selectedInstances.keys()).join(', ') : 'None'}</p>
                <p><strong>Is Transforming:</strong> {globalSelection?.isTransforming ? 'Yes' : 'No'}</p>
                <details>
                    <summary>Full State (JSON)</summary>
                    <pre style={{ background: "#f5f5f5", padding: "10px", borderRadius: "4px" }}>
                        {JSON.stringify(globalSelection, null, 2)}
                    </pre>
                </details>
            </div>

            <div style={{ display: "flex", gap: "20px" }}>
                <div style={{ border: "1px solid #ccc", padding: "10px", borderRadius: "4px" }}>
                    <h4>Vector Instance 1</h4>
                    <KonvaVector
                        initialPoints={points1}
                        onPointsChange={setPoints1}
                        width={400}
                        height={300}
                        allowClose={false}
                        allowBezier={true}
                        isDrawingMode={false}
                        stroke="#3b82f6"
                    />
                </div>

                <div style={{ border: "1px solid #ccc", padding: "10px", borderRadius: "4px" }}>
                    <h4>Vector Instance 2</h4>
                    <KonvaVector
                        initialPoints={points2}
                        onPointsChange={setPoints2}
                        width={400}
                        height={300}
                        allowClose={false}
                        allowBezier={true}
                        isDrawingMode={false}
                        stroke="#ef4444"
                    />
                </div>
            </div>

            <div style={{ marginTop: "20px" }}>
                <h3>Instructions:</h3>
                <ul>
                    <li>Click on points in either vector to select them</li>
                    <li>Use Cmd/Ctrl+click to select multiple points</li>
                    <li>Watch the global selection state update above</li>
                    <li>Try selecting points across both instances</li>
                </ul>
            </div>
        </div>
    );
};
