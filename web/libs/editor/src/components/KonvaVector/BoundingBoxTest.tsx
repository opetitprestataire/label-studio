import React, { useRef, useState, useEffect } from "react";
import { KonvaVector } from "./KonvaVector";
import type { BezierPoint, KonvaVectorRef } from "./types";

export const BoundingBoxTest: React.FC = () => {
    const vectorRef = useRef<KonvaVectorRef>(null);
    const [points, setPoints] = useState<BezierPoint[]>([
        { id: "p1", x: 100, y: 100, isBezier: false, prevPointId: undefined },
        { id: "p2", x: 200, y: 150, isBezier: false, prevPointId: "p1" },
        { id: "p3", x: 300, y: 100, isBezier: true, prevPointId: "p2", controlPoint1: { x: 280, y: 180 }, controlPoint2: { x: 220, y: 220 } },
        { id: "p4", x: 250, y: 200, isBezier: false, prevPointId: "p3" },
    ]);
    const [boundingBox, setBoundingBox] = useState<{ left: number; top: number; right: number; bottom: number } | null>(null);

    const updateBoundingBox = () => {
        const bbox = vectorRef.current?.getShapeBoundingBox();
        setBoundingBox(bbox || null);
    };

    useEffect(() => {
        updateBoundingBox();
    }, [points]);

    const handleGetBoundingBox = () => {
        updateBoundingBox();
    };

    const addBezierCurve = () => {
        const newPoints = [...points];
        newPoints.push({
            id: `p${newPoints.length + 1}`,
            x: 350,
            y: 150,
            isBezier: true,
            prevPointId: newPoints[newPoints.length - 1].id,
            controlPoint1: { x: 380, y: 120 },
            controlPoint2: { x: 320, y: 180 },
        });
        setPoints(newPoints);
    };

    const addSimplePoint = () => {
        const newPoints = [...points];
        newPoints.push({
            id: `p${newPoints.length + 1}`,
            x: 400,
            y: 100,
            isBezier: false,
            prevPointId: newPoints[newPoints.length - 1].id,
        });
        setPoints(newPoints);
    };

    return (
        <div style={{ padding: "20px" }}>
            <h2>Shape Bounding Box Test</h2>

            <div style={{ marginBottom: "20px" }}>
                <button onClick={handleGetBoundingBox} style={{ marginRight: "10px" }}>
                    Get Bounding Box
                </button>
                <button onClick={addBezierCurve} style={{ marginRight: "10px" }}>
                    Add Bezier Curve
                </button>
                <button onClick={addSimplePoint}>
                    Add Simple Point
                </button>
            </div>

            {boundingBox && (
                <div style={{ marginBottom: "20px", padding: "10px", backgroundColor: "#f0f0f0", borderRadius: "5px" }}>
                    <h3>Bounding Box:</h3>
                    <pre>{JSON.stringify(boundingBox, null, 2)}</pre>
                    <div>
                        <strong>Dimensions:</strong> Width: {boundingBox.right - boundingBox.left.toFixed(2)}, Height: {boundingBox.bottom - boundingBox.top.toFixed(2)}
                    </div>
                </div>
            )}

            <KonvaVector
                ref={vectorRef}
                initialPoints={points}
                onPointsChange={setPoints}
                width={500}
                height={400}
                allowClose={false}
                allowBezier={true}
                isDrawingMode={false}
                stroke="#3b82f6"
            />

            <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
                <h3>Instructions:</h3>
                <ul>
                    <li>Click "Get Bounding Box" to calculate the current shape's bounding box</li>
                    <li>Add bezier curves or simple points to see how the bounding box changes</li>
                    <li>The bounding box includes the extrema of bezier curves, not just control points</li>
                    <li>Try dragging points to see real-time bounding box updates</li>
                </ul>
            </div>
        </div>
    );
};
