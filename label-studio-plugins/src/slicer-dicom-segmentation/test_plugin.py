#!/usr/bin/env python3
"""
Test script for the Slicer DICOM Segmentation plugin
"""

import asyncio
import websockets
import json
import sys
import os

async def test_slicer_connection():
    """Test WebSocket connection to Slicer server"""
    uri = "ws://localhost:8080/ws"
    
    try:
        async with websockets.connect(uri) as websocket:
            print(f"✓ Connected to Slicer server at {uri}")
            
            # Wait for connection message
            response = await websocket.recv()
            data = json.loads(response)
            print(f"✓ Server response: {data}")
            
            if data['type'] == 'connection' and data['status'] == 'connected':
                print(f"✓ Slicer available: {data.get('slicer_available', False)}")
            
            # Test loading DICOM
            print("\nTesting DICOM load...")
            test_data = {
                "command": "load-dicom",
                "urls": [
                    "test-data/slice_000.dcm",
                    "test-data/slice_001.dcm",
                    "test-data/slice_002.dcm"
                ],
                "taskId": "test-task-001"
            }
            
            await websocket.send(json.dumps(test_data))
            response = await websocket.recv()
            data = json.loads(response)
            
            if data['type'] == 'dicom-loaded':
                print(f"✓ DICOM loaded successfully")
                print(f"  Volume info: {data.get('volumeInfo', {})}")
            else:
                print(f"✗ Failed to load DICOM: {data}")
            
            # Test tool change
            print("\nTesting tool change...")
            await websocket.send(json.dumps({
                "command": "set-tool",
                "tool": "paint"
            }))
            
            response = await websocket.recv()
            data = json.loads(response)
            
            if data['type'] == 'tool-changed':
                print(f"✓ Tool changed to: {data['tool']}")
            
            print("\n✓ All tests passed!")
            
    except (OSError, ConnectionRefusedError) as e:
        print(f"✗ Failed to connect to Slicer server at {uri}")
        print("  Make sure the server is running: python slicer_server.py")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        sys.exit(1)

async def test_label_studio_format():
    """Test Label Studio annotation format generation"""
    print("\nTesting Label Studio format generation...")
    
    # Simulate segmentation data
    segmentation_data = {
        "segmentations": {
            "Liver": {
                "color": [0.8, 0.2, 0.2],
                "label_value": 1
            },
            "Kidney_Right": {
                "color": [0.2, 0.8, 0.2],
                "label_value": 2
            }
        }
    }
    
    # Create Label Studio annotation format
    annotation = {
        "value": {
            "format": "slicer-segmentation",
            "segmentations": segmentation_data["segmentations"],
            "metadata": {
                "tool_version": "1.0.0",
                "timestamp": "2024-07-25T10:00:00Z"
            }
        },
        "type": "segmentation",
        "from_name": "segmentation",
        "to_name": "dicom"
    }
    
    print(f"✓ Generated annotation format:")
    print(json.dumps(annotation, indent=2))

def check_test_data():
    """Check if test DICOM data exists"""
    test_dir = "test-data"
    if not os.path.exists(test_dir):
        print(f"✗ Test data directory '{test_dir}' not found")
        print("  Run 'python create_test_dicom.py' to generate test data")
        return False
    
    dicom_files = [f for f in os.listdir(test_dir) if f.endswith('.dcm')]
    if not dicom_files:
        print(f"✗ No DICOM files found in '{test_dir}'")
        print("  Run 'python create_test_dicom.py' to generate test data")
        return False
    
    print(f"✓ Found {len(dicom_files)} DICOM files in test-data/")
    return True

async def main():
    """Run all tests"""
    print("=== Slicer DICOM Segmentation Plugin Test ===\n")
    
    # Check test data
    if not check_test_data():
        sys.exit(1)
    
    # Test Slicer connection
    await test_slicer_connection()
    
    # Test Label Studio format
    await test_label_studio_format()
    
    print("\n=== All tests completed successfully! ===")

if __name__ == "__main__":
    # Check for websockets module
    try:
        import websockets
    except ImportError:
        print("websockets module not found. Installing...")
        import subprocess
        subprocess.run([sys.executable, "-m", "pip", "install", "websockets"], check=True)
        import websockets
    
    asyncio.run(main())