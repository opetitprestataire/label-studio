const assert = require("assert");
const Asserts = require("../utils/asserts");
const Helpers = require("./helpers");

Feature("Image pixel snapping");

const IMAGE = "https://data.heartex.net/open-images/train_0/mini/0030019819f25b28.jpg";

const annotationEmpty = {
  id: "1000",
  result: [],
};

// Helper function to check if coordinates are snapped to pixel boundaries
const isSnappedToPixel = (coord, imageSize, expectedCoord) => {
  // Convert percentage coordinate to canvas pixel
  const pixelCoord = (coord * imageSize) / 100.0;
  // Log the coordinate snapping calculation for debugging
  console.log(`Checking snapped coordinate ${coord}% on image size ${imageSize}: pixel coord = ${pixelCoord}, expected coord = ${expectedCoord}, diff = ${Math.abs(pixelCoord - expectedCoord)}`);
  // Check if it's close to a whole number (within 0.1 pixel tolerance)
  return Math.abs(pixelCoord - expectedCoord) < 0.001;
};

// Helper function to verify all coordinates in a region are snapped
const verifyPixelSnapping = (regionValue, canvasSize, drawCoords) => {
  const { width, height } = canvasSize;
  
  if (regionValue.x !== undefined) {
    assert(isSnappedToPixel(regionValue.x, width, drawCoords.x), 
           `X coordinate ${regionValue.x} is not snapped to pixel boundary. Canvas width: ${width}`);
  }
  if (regionValue.y !== undefined) {
    assert(isSnappedToPixel(regionValue.y, height, drawCoords.y), 
           `Y coordinate ${regionValue.y} is not snapped to pixel boundary. Canvas height: ${height}`);
  }
  if (regionValue.width !== undefined) {
    assert(isSnappedToPixel(regionValue.width, width, drawCoords.width), 
           `Width ${regionValue.width} is not snapped to pixel boundary. Canvas width: ${width}`);
  }
  if (regionValue.height !== undefined) {
    assert(isSnappedToPixel(regionValue.height, height, drawCoords.height), 
           `Height ${regionValue.height} is not snapped to pixel boundary. Canvas height: ${height}`);
  }
};

// Test configurations for different shapes with snap enabled
const getSnapConfig = (shape, params = "") => ({
  config: `
  <View>
    <Image name="img" value="$image" />
    <${shape} ${params} name="tag" toName="img" />
  </View>`,
  data: { image: IMAGE },
  annotations: [annotationEmpty],
});

const getSnapLabelsConfig = (shape) => ({
  config: `
  <View>
    <Image name="img" value="$image" smoothing="false" />
    <${shape} name="tag" toName="img" snap="pixel">
      <Label value="TestLabel" background="orange"/>
    </${shape}>
  </View>`,
  data: { image: IMAGE },
  annotations: [annotationEmpty],
});

// Test configurations without snap for comparison
const getNoSnapConfig = (shape, params = "") => ({
  config: `
  <View>
    <Image name="img" value="$image" />
    <${shape} ${params} snap="none" name="tag" toName="img" />
  </View>`,
  data: { image: IMAGE },
  annotations: [annotationEmpty],
});

// Scenario("Rectangle snap to pixel during drawing", async ({ I, LabelStudio, AtImageView, AtOutliner, AtPanels }) => {
//   const AtDetailsPanel = AtPanels.usePanel(AtPanels.PANEL.DETAILS);

//   I.amOnPage("/");
//   LabelStudio.init(getSnapLabelsConfig("RectangleLabels"));
//   AtDetailsPanel.collapsePanel();
//   LabelStudio.waitForObjectsReady();
//   AtOutliner.seeRegions(0);
//   await AtImageView.lookForStage();

//   const canvasSize = await AtImageView.getCanvasSize();
  
//   // Draw a rectangle with non-integer pixel coordinates
//   I.pressKey("r");
//   AtImageView.drawByDrag(50.3, 75.7, 120.6, 150.9);
//   AtOutliner.seeRegions(1);

//   // Verify the rectangle was created and coordinates are snapped
//   const result = await LabelStudio.serialize();
//   assert.strictEqual(result.length, 1);
//   assert.strictEqual(result[0].type, "rectanglelabels");
  
//   verifyPixelSnapping(result[0].value, canvasSize);
// });

Scenario("RectangleLabels snap to pixel during drawing", async ({ I, LabelStudio, AtImageView, AtOutliner, AtLabels, AtPanels }) => {
  const AtDetailsPanel = AtPanels.usePanel(AtPanels.PANEL.DETAILS);

  I.amOnPage("/");
  LabelStudio.init(getSnapLabelsConfig("RectangleLabels"));
  AtDetailsPanel.collapsePanel();
  LabelStudio.waitForObjectsReady();
  AtOutliner.seeRegions(0);
  await AtImageView.lookForStage();

  const canvasSize = await AtImageView.getCanvasSize();
  const imageSize = await AtImageView.getNaturalSize();
  console.log("imageSize", imageSize);
  console.log("canvasSize", canvasSize);
  
  // Select label and draw rectangle with non-integer coordinates
  AtLabels.clickLabel("TestLabel");
  const drawCoords = {
    x: 50,
    y: 50,
    width: 100,
    height: 100,
  }
  AtImageView.drawByDrag(drawCoords.x, drawCoords.y, drawCoords.x + drawCoords.width, drawCoords.y + drawCoords.height);
  AtOutliner.seeRegions(1);

  // Verify coordinates are snapped
  const result = await LabelStudio.serialize();
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].type, "rectanglelabels");

  const expectedCoords = {
    x: 49,
    y: 49,
    width: 100,
    height: 100,
  }
  
  verifyPixelSnapping(result[0].value, imageSize, expectedCoords);
});

// Scenario("Rectangle transformation snaps to pixel", async ({ I, LabelStudio, AtImageView, AtOutliner, AtPanels }) => {
//   const AtDetailsPanel = AtPanels.usePanel(AtPanels.PANEL.DETAILS);

//   I.amOnPage("/");
//   LabelStudio.init(getSnapConfig("Rectangle"));
//   AtDetailsPanel.collapsePanel();
//   LabelStudio.waitForObjectsReady();
//   AtOutliner.seeRegions(0);
//   await AtImageView.lookForStage();

//   const canvasSize = await AtImageView.getCanvasSize();
  
//   // Draw initial rectangle
//   I.pressKey("r");
//   AtImageView.drawByDrag(50, 50, 100, 100);
//   AtOutliner.seeRegions(1);

//   // Select the rectangle
//   AtImageView.clickAt(100, 100);
//   AtOutliner.seeSelectedRegion();

//   // Switch to move tool to show transformer
//   I.pressKey("v");
//   const isTransformerExist = await AtImageView.isTransformerExist();
//   assert.strictEqual(isTransformerExist, true);

//   // Resize the rectangle by dragging one of the transform handles
//   // This should result in snapped coordinates
//   AtImageView.drawByDrag(150, 100, 25.7, 30.3); // Drag right edge to non-integer position
  
//   // Verify the resized rectangle coordinates are snapped
//   const result = await LabelStudio.serialize();
//   assert.strictEqual(result.length, 1);
  
//   verifyPixelSnapping(result[0].value, canvasSize);
// });

// Scenario("Rectangle dragging snaps to pixel", async ({ I, LabelStudio, AtImageView, AtOutliner, AtPanels }) => {
//   const AtDetailsPanel = AtPanels.usePanel(AtPanels.PANEL.DETAILS);

//   I.amOnPage("/");
//   LabelStudio.init(getSnapConfig("Rectangle"));
//   AtDetailsPanel.collapsePanel();
//   LabelStudio.waitForObjectsReady();
//   AtOutliner.seeRegions(0);
//   await AtImageView.lookForStage();

//   const canvasSize = await AtImageView.getCanvasSize();
  
//   // Draw initial rectangle
//   I.pressKey("r");
//   AtImageView.drawByDrag(50, 50, 100, 100);
//   AtOutliner.seeRegions(1);

//   // Select and drag the rectangle to a non-integer position
//   I.pressKey("v"); // Move tool
//   AtImageView.drawByDrag(100, 100, 25.3, 37.8); // Drag center to non-integer position
  
//   // Verify the moved rectangle coordinates are snapped
//   const result = await LabelStudio.serialize();
//   assert.strictEqual(result.length, 1);
  
//   verifyPixelSnapping(result[0].value, canvasSize);
// });

// Scenario("Compare snap vs no-snap behavior", async ({ I, LabelStudio, AtImageView, AtOutliner, AtPanels }) => {
//   const AtDetailsPanel = AtPanels.usePanel(AtPanels.PANEL.DETAILS);

//   // Test with snap disabled first
//   I.amOnPage("/");
//   LabelStudio.init(getNoSnapConfig("Rectangle"));
//   AtDetailsPanel.collapsePanel();
//   LabelStudio.waitForObjectsReady();
//   await AtImageView.lookForStage();

//   const canvasSize = await AtImageView.getCanvasSize();
  
//   // Draw rectangle with precise non-integer coordinates
//   I.pressKey("r");
//   AtImageView.drawByDrag(50.3, 75.7, 100.6, 100.9);
//   AtOutliner.seeRegions(1);

//   const noSnapResult = await LabelStudio.serialize();
  
//   // Now test with snap enabled
//   I.amOnPage("/");
//   LabelStudio.init(getSnapConfig("Rectangle"));
//   AtDetailsPanel.collapsePanel();
//   LabelStudio.waitForObjectsReady();
//   await AtImageView.lookForStage();

//   // Draw rectangle with same non-integer coordinates
//   I.pressKey("r");
//   AtImageView.drawByDrag(50.3, 75.7, 100.6, 100.9);
//   AtOutliner.seeRegions(1);

//   const snapResult = await LabelStudio.serialize();
  
//   // Verify snap result has different (snapped) coordinates
//   verifyPixelSnapping(snapResult[0].value, canvasSize);
  
//   // Verify non-snap and snap results are different
//   const snapCoords = snapResult[0].value;
//   const noSnapCoords = noSnapResult[0].value;
  
//   // At least one coordinate should be different due to snapping
//   const coordsDifferent = 
//     snapCoords.x !== noSnapCoords.x ||
//     snapCoords.y !== noSnapCoords.y ||
//     snapCoords.width !== noSnapCoords.width ||
//     snapCoords.height !== noSnapCoords.height;
  
//   assert(coordsDifferent, "Snap and no-snap should produce different coordinates");
// });

// Scenario("Multi-selection with snap maintains pixel boundaries", async ({ I, LabelStudio, AtImageView, AtOutliner, AtPanels }) => {
//   const AtDetailsPanel = AtPanels.usePanel(AtPanels.PANEL.DETAILS);

//   I.amOnPage("/");
//   LabelStudio.init(getSnapConfig("Rectangle"));
//   AtDetailsPanel.collapsePanel();
//   LabelStudio.waitForObjectsReady();
//   AtOutliner.seeRegions(0);
//   await AtImageView.lookForStage();

//   const canvasSize = await AtImageView.getCanvasSize();
  
//   // Draw two rectangles
//   I.pressKey("r");
//   AtImageView.drawByDrag(50, 50, 100, 100);
//   AtOutliner.seeRegions(1);
  
//   I.pressKey("r");
//   AtImageView.drawByDrag(200, 150, 100, 100);
//   AtOutliner.seeRegions(2);

//   // Select both rectangles using multi-selection
//   I.pressKey("v"); // Move tool
//   AtImageView.drawThroughPoints([
//     [30, 30],
//     [320, 270]
//   ], "steps", 10);
//   AtOutliner.seeSelectedRegion();

//   // Move both rectangles to non-integer positions
//   AtImageView.drawByDrag(150, 150, 25.7, 35.3);
  
//   // Verify both rectangles maintain snapped coordinates
//   const result = await LabelStudio.serialize();
//   assert.strictEqual(result.length, 2);
  
//   result.forEach(region => {
//     verifyPixelSnapping(region.value, canvasSize);
//   });
// });

// Scenario("Zoom level doesn't affect pixel snapping", async ({ I, LabelStudio, AtImageView, AtOutliner, AtPanels }) => {
//   const AtDetailsPanel = AtPanels.usePanel(AtPanels.PANEL.DETAILS);

//   I.amOnPage("/");
//   LabelStudio.init(getSnapConfig("Rectangle"));
//   AtDetailsPanel.collapsePanel();
//   LabelStudio.waitForObjectsReady();
//   AtOutliner.seeRegions(0);
//   await AtImageView.lookForStage();

//   const canvasSize = await AtImageView.getCanvasSize();
  
//   // Zoom in significantly
//   const { maxScale } = await AtImageView.getZoomProps();
//   AtImageView.setZoom(3 * maxScale, 100, 100);
//   await AtImageView.lookForStage();

//   // Draw rectangle at high zoom with non-integer coordinates
//   I.pressKey("r");
//   AtImageView.drawByDrag(75.2, 80.7, 50.4, 60.8);
//   AtOutliner.seeRegions(1);

//   // Verify coordinates are still snapped despite zoom
//   const zoomedResult = await LabelStudio.serialize();
//   assert.strictEqual(zoomedResult.length, 1);
  
//   verifyPixelSnapping(zoomedResult[0].value, canvasSize);

//   // Reset zoom and draw another rectangle
//   AtImageView.setZoom(1, 0, 0);
//   await AtImageView.lookForStage();
  
//   I.pressKey("r");
//   AtImageView.drawByDrag(200.3, 200.7, 50.4, 60.8);
//   AtOutliner.seeRegions(2);

//   // Verify both rectangles have snapped coordinates
//   const normalZoomResult = await LabelStudio.serialize();
//   assert.strictEqual(normalZoomResult.length, 2);
  
//   normalZoomResult.forEach(region => {
//     verifyPixelSnapping(region.value, canvasSize);
//   });
// });

// Scenario("Rotation with snap maintains proper coordinates", async ({ I, LabelStudio, AtImageView, AtOutliner, AtPanels }) => {
//   const AtDetailsPanel = AtPanels.usePanel(AtPanels.PANEL.DETAILS);

//   I.amOnPage("/");
//   LabelStudio.init(getSnapConfig("Rectangle"));
//   AtDetailsPanel.collapsePanel();
//   LabelStudio.waitForObjectsReady();
//   AtOutliner.seeRegions(0);
//   await AtImageView.lookForStage();

//   const canvasSize = await AtImageView.getCanvasSize();
  
//   // Draw rectangle
//   I.pressKey("r");
//   AtImageView.drawByDrag(100, 100, 100, 100);
//   AtOutliner.seeRegions(1);

//   // Select rectangle
//   AtImageView.clickAt(150, 150);
//   AtOutliner.seeSelectedRegion();

//   // Switch to move tool and rotate
//   I.pressKey("v");
//   const isTransformerExist = await AtImageView.isTransformerExist();
//   assert.strictEqual(isTransformerExist, true);

//   // Rotate the rectangle by dragging rotation handle
//   AtImageView.drawThroughPoints([
//     [150, 50], // rotation handle position
//     [200, 100], // rotate 45 degrees
//   ], "steps", 5);

//   // Verify coordinates are still valid after rotation
//   const result = await LabelStudio.serialize();
//   assert.strictEqual(result.length, 1);
  
//   // Position and size should still be snapped, rotation angle can be any value
//   const region = result[0].value;
//   assert(typeof region.x === 'number' && !isNaN(region.x), "X coordinate should be valid after rotation");
//   assert(typeof region.y === 'number' && !isNaN(region.y), "Y coordinate should be valid after rotation");
//   assert(typeof region.width === 'number' && !isNaN(region.width) && region.width > 0, "Width should be valid after rotation");
//   assert(typeof region.height === 'number' && !isNaN(region.height) && region.height > 0, "Height should be valid after rotation");
//   assert(typeof region.rotation === 'number' && !isNaN(region.rotation), "Rotation should be valid");
// }); 