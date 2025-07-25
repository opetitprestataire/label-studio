#!/usr/bin/env python3
"""
3D Slicer Server for Label Studio Integration

This script runs 3D Slicer in headless mode and provides a WebSocket
interface for the Label Studio plugin to communicate with Slicer.
"""

import sys
import os
import json
import asyncio
import websockets
import logging
from pathlib import Path
import base64
import tempfile
import shutil

# Try to import Slicer modules
try:
    import slicer
    import vtk
    import qt
    SLICER_AVAILABLE = True
except ImportError:
    SLICER_AVAILABLE = False
    print("Warning: Slicer modules not available. Running in mock mode.")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SlicerSegmentationServer:
    """WebSocket server for Slicer segmentation operations"""
    
    def __init__(self, host='localhost', port=8080):
        self.host = host
        self.port = port
        self.clients = set()
        self.current_volume = None
        self.segmentation_node = None
        self.temp_dir = tempfile.mkdtemp(prefix='slicer_ls_')
        
        if SLICER_AVAILABLE:
            self.setup_slicer()
    
    def setup_slicer(self):
        """Initialize Slicer environment"""
        # Set up the scene
        slicer.mrmlScene.Clear(0)
        
        # Create default segmentation node
        self.segmentation_node = slicer.mrmlScene.AddNewNodeByClass("vtkMRMLSegmentationNode")
        self.segmentation_node.CreateDefaultDisplayNodes()
        
        # Set up segment editor
        self.segment_editor_widget = slicer.qMRMLSegmentEditorWidget()
        self.segment_editor_widget.setMRMLScene(slicer.mrmlScene)
        self.segment_editor_widget.setSegmentationNode(self.segmentation_node)
        
        logger.info("Slicer environment initialized")
    
    async def handle_client(self, websocket, path):
        """Handle WebSocket client connections"""
        self.clients.add(websocket)
        logger.info(f"Client connected: {websocket.remote_address}")
        
        try:
            await websocket.send(json.dumps({
                'type': 'connection',
                'status': 'connected',
                'slicer_available': SLICER_AVAILABLE
            }))
            
            async for message in websocket:
                await self.process_message(websocket, message)
                
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Client disconnected: {websocket.remote_address}")
        finally:
            self.clients.remove(websocket)
    
    async def process_message(self, websocket, message):
        """Process incoming WebSocket messages"""
        try:
            data = json.loads(message)
            command = data.get('command')
            
            logger.info(f"Received command: {command}")
            
            if command == 'load-dicom':
                await self.load_dicom(websocket, data)
            elif command == 'set-tool':
                await self.set_tool(websocket, data)
            elif command == 'export-segmentation':
                await self.export_segmentation(websocket, data)
            elif command == 'clear-segmentation':
                await self.clear_segmentation(websocket)
            elif command == 'undo':
                await self.undo_segmentation(websocket)
            elif command == 'redo':
                await self.redo_segmentation(websocket)
            else:
                await websocket.send(json.dumps({
                    'type': 'error',
                    'error': f'Unknown command: {command}'
                }))
                
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            await websocket.send(json.dumps({
                'type': 'error',
                'error': str(e)
            }))
    
    async def load_dicom(self, websocket, data):
        """Load DICOM files into Slicer"""
        urls = data.get('urls', [])
        task_id = data.get('taskId')
        
        if not SLICER_AVAILABLE:
            # Mock response
            await websocket.send(json.dumps({
                'type': 'dicom-loaded',
                'taskId': task_id,
                'volumeInfo': {
                    'dimensions': [256, 256, 10],
                    'spacing': [1.0, 1.0, 5.0],
                    'origin': [0, 0, 0]
                }
            }))
            return
        
        try:
            # Download DICOM files to temp directory
            dicom_dir = Path(self.temp_dir) / f"task_{task_id}"
            dicom_dir.mkdir(exist_ok=True)
            
            # In real implementation, download files from URLs
            # For now, we'll assume local files
            for i, url in enumerate(urls):
                # Copy test files (in real implementation, download from URL)
                src_path = Path(url)
                if src_path.exists():
                    shutil.copy(str(src_path), str(dicom_dir / f"slice_{i:03d}.dcm"))
            
            # Load DICOM series using Slicer's DICOM module
            from DICOMLib import DICOMUtils
            loadedNodeIDs = DICOMUtils.loadPatientByUID(dicom_dir)
            
            if loadedNodeIDs:
                # Get the loaded volume
                self.current_volume = slicer.mrmlScene.GetNodeByID(loadedNodeIDs[0])
                
                # Set up segmentation for this volume
                self.segment_editor_widget.setMasterVolumeNode(self.current_volume)
                
                # Get volume information
                imageData = self.current_volume.GetImageData()
                dimensions = imageData.GetDimensions()
                spacing = self.current_volume.GetSpacing()
                origin = self.current_volume.GetOrigin()
                
                await websocket.send(json.dumps({
                    'type': 'dicom-loaded',
                    'taskId': task_id,
                    'volumeInfo': {
                        'dimensions': list(dimensions),
                        'spacing': list(spacing),
                        'origin': list(origin)
                    }
                }))
            else:
                raise Exception("Failed to load DICOM series")
                
        except Exception as e:
            logger.error(f"Error loading DICOM: {str(e)}")
            await websocket.send(json.dumps({
                'type': 'error',
                'error': f'Failed to load DICOM: {str(e)}'
            }))
    
    async def set_tool(self, websocket, data):
        """Set the active segmentation tool"""
        tool_name = data.get('tool')
        
        if not SLICER_AVAILABLE:
            await websocket.send(json.dumps({
                'type': 'tool-changed',
                'tool': tool_name
            }))
            return
        
        # Map tool names to Slicer effect names
        tool_mapping = {
            'paint': 'Paint',
            'erase': 'Erase',
            'threshold': 'Threshold',
            'grow-from-seeds': 'GrowFromSeeds',
            'fill-between-slices': 'FillBetweenSlices',
            'watershed': 'Watershed',
            'fast-marching': 'FastMarching'
        }
        
        slicer_effect = tool_mapping.get(tool_name)
        if slicer_effect:
            self.segment_editor_widget.setActiveEffectByName(slicer_effect)
            
            await websocket.send(json.dumps({
                'type': 'tool-changed',
                'tool': tool_name
            }))
        else:
            await websocket.send(json.dumps({
                'type': 'error',
                'error': f'Unknown tool: {tool_name}'
            }))
    
    async def export_segmentation(self, websocket, data):
        """Export segmentation data"""
        format_type = data.get('format', 'nrrd')
        
        if not SLICER_AVAILABLE:
            # Mock segmentation data
            await websocket.send(json.dumps({
                'type': 'segmentation-exported',
                'format': format_type,
                'data': base64.b64encode(b'mock_segmentation_data').decode('utf-8')
            }))
            return
        
        try:
            # Export segmentation to file
            export_path = Path(self.temp_dir) / f"segmentation.{format_type}"
            
            if format_type == 'nrrd':
                slicer.util.saveNode(self.segmentation_node, str(export_path))
            elif format_type == 'nifti':
                # Convert to labelmap and save as NIfTI
                labelmapVolumeNode = slicer.mrmlScene.AddNewNodeByClass('vtkMRMLLabelMapVolumeNode')
                slicer.modules.segmentations.logic().ExportVisibleSegmentsToLabelmapNode(
                    self.segmentation_node, labelmapVolumeNode, self.current_volume
                )
                slicer.util.saveNode(labelmapVolumeNode, str(export_path))
                slicer.mrmlScene.RemoveNode(labelmapVolumeNode)
            
            # Read file and encode as base64
            with open(export_path, 'rb') as f:
                segmentation_data = base64.b64encode(f.read()).decode('utf-8')
            
            # Get segment information
            segmentation = self.segmentation_node.GetSegmentation()
            segments = {}
            for i in range(segmentation.GetNumberOfSegments()):
                segment = segmentation.GetNthSegment(i)
                segments[segment.GetName()] = {
                    'color': segment.GetColor(),
                    'label_value': i + 1
                }
            
            await websocket.send(json.dumps({
                'type': 'segmentation-exported',
                'format': format_type,
                'data': segmentation_data,
                'segments': segments
            }))
            
        except Exception as e:
            logger.error(f"Error exporting segmentation: {str(e)}")
            await websocket.send(json.dumps({
                'type': 'error',
                'error': f'Failed to export segmentation: {str(e)}'
            }))
    
    async def clear_segmentation(self, websocket):
        """Clear all segmentation"""
        if SLICER_AVAILABLE:
            self.segmentation_node.GetSegmentation().RemoveAllSegments()
        
        await websocket.send(json.dumps({
            'type': 'segmentation-cleared'
        }))
    
    async def undo_segmentation(self, websocket):
        """Undo last segmentation operation"""
        if SLICER_AVAILABLE:
            # In real implementation, would need to implement undo stack
            pass
        
        await websocket.send(json.dumps({
            'type': 'undo-completed'
        }))
    
    async def redo_segmentation(self, websocket):
        """Redo last undone segmentation operation"""
        if SLICER_AVAILABLE:
            # In real implementation, would need to implement redo stack
            pass
        
        await websocket.send(json.dumps({
            'type': 'redo-completed'
        }))
    
    def cleanup(self):
        """Clean up temporary files"""
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    async def health_check_handler(self, path, request_headers):
        """Simple HTTP handler for health checks"""
        import http
        if path == "/health":
            return http.HTTPStatus.OK, [], b"OK\n"
        return http.HTTPStatus.NOT_FOUND, [], b"Not Found\n"
    
    async def start_server(self):
        """Start the WebSocket server"""
        logger.info(f"Starting Slicer WebSocket server on {self.host}:{self.port}")
        
        async with websockets.serve(
            self.handle_client, 
            self.host, 
            self.port,
            process_request=self.health_check_handler
        ):
            await asyncio.Future()  # Run forever

def main():
    """Main entry point"""
    # Parse command line arguments
    import argparse
    parser = argparse.ArgumentParser(description='3D Slicer Server for Label Studio')
    parser.add_argument('--host', default='localhost', help='Server host')
    parser.add_argument('--port', type=int, default=8080, help='Server port')
    parser.add_argument('--slicer-path', help='Path to 3D Slicer installation')
    
    args = parser.parse_args()
    
    # If Slicer path is provided, add it to Python path
    if args.slicer_path and not SLICER_AVAILABLE:
        sys.path.insert(0, os.path.join(args.slicer_path, 'bin', 'Python', 'slicer'))
        sys.path.insert(0, os.path.join(args.slicer_path, 'lib', 'Slicer-5.0', 'qt-scripted-modules'))
    
    # Create and start server
    server = SlicerSegmentationServer(args.host, args.port)
    
    try:
        asyncio.run(server.start_server())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    finally:
        server.cleanup()

if __name__ == '__main__':
    main()