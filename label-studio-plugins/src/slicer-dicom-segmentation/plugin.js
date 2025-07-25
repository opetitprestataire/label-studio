/**
 * Slicer DICOM Segmentation Plugin for Label Studio
 * 
 * This plugin integrates 3D Slicer for medical image segmentation
 * of DICOM files within Label Studio Enterprise.
 */

// Plugin configuration
const SLICER_CONFIG = {
  // Slicer server endpoint (will be running in headless mode)
  serverUrl: window.SLICER_SERVER_URL || 'http://localhost:8080',
  // WebSocket endpoint for real-time updates
  wsUrl: window.SLICER_WS_URL || 'ws://localhost:8080/ws',
  // Default window/level settings
  defaultWindowLevel: {
    window: 400,
    level: 40
  },
  // Segmentation tools available
  tools: [
    'paint', 'erase', 'threshold', 'grow-from-seeds', 
    'fill-between-slices', 'watershed', 'fast-marching'
  ]
};

// Slicer interface component
class SlicerDICOMInterface extends HTMLElement {
  constructor() {
    super();
    this.slicerFrame = null;
    this.wsConnection = null;
    this.currentTask = null;
    this.segmentations = {};
    this.isDirty = false;
  }

  connectedCallback() {
    this.innerHTML = `
      <div class="slicer-dicom-container" style="width: 100%; height: 600px; position: relative;">
        <div class="slicer-toolbar" style="height: 50px; background: #f0f0f0; padding: 10px; box-sizing: border-box;">
          <button id="load-dicom" class="btn">Load DICOM</button>
          <button id="save-segmentation" class="btn">Save Segmentation</button>
          <select id="segmentation-tool" class="tool-select">
            ${SLICER_CONFIG.tools.map(tool => 
              `<option value="${tool}">${tool.replace(/-/g, ' ').toUpperCase()}</option>`
            ).join('')}
          </select>
          <button id="clear-segmentation" class="btn">Clear</button>
          <button id="undo" class="btn">Undo</button>
          <button id="redo" class="btn">Redo</button>
          <span class="status" style="float: right;">Status: <span id="status-text">Disconnected</span></span>
        </div>
        <div class="slicer-viewport" style="height: calc(100% - 50px); background: #000;">
          <iframe 
            id="slicer-frame" 
            src="${SLICER_CONFIG.serverUrl}/slicerWidget"
            style="width: 100%; height: 100%; border: none;"
            sandbox="allow-same-origin allow-scripts allow-forms"
          ></iframe>
        </div>
        <div class="loading-overlay" id="loading" style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); color: white; display: flex; align-items: center; justify-content: center;">
          <div>Loading DICOM data...</div>
        </div>
      </div>
    `;

    this.setupEventListeners();
    this.connectToSlicer();
  }

  setupEventListeners() {
    // Load DICOM button
    this.querySelector('#load-dicom').addEventListener('click', () => {
      this.loadDICOMData();
    });

    // Save segmentation button
    this.querySelector('#save-segmentation').addEventListener('click', () => {
      this.saveSegmentation();
    });

    // Tool selection
    this.querySelector('#segmentation-tool').addEventListener('change', (e) => {
      this.setActiveTool(e.target.value);
    });

    // Clear segmentation
    this.querySelector('#clear-segmentation').addEventListener('click', () => {
      this.clearSegmentation();
    });

    // Undo/Redo
    this.querySelector('#undo').addEventListener('click', () => {
      this.sendCommand('undo');
    });

    this.querySelector('#redo').addEventListener('click', () => {
      this.sendCommand('redo');
    });

    // Listen for task data from Label Studio
    window.addEventListener('message', (event) => {
      if (event.data.type === 'task-data') {
        this.currentTask = event.data.task;
        this.loadDICOMData();
      }
    });
  }

  connectToSlicer() {
    this.updateStatus('Connecting...');
    
    // Create WebSocket connection to Slicer
    this.wsConnection = new WebSocket(SLICER_CONFIG.wsUrl);
    
    this.wsConnection.onopen = () => {
      this.updateStatus('Connected');
      console.log('Connected to Slicer server');
      
      // Initialize Slicer with current task if available
      if (this.currentTask) {
        this.loadDICOMData();
      }
    };

    this.wsConnection.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleSlicerMessage(message);
    };

    this.wsConnection.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.updateStatus('Connection Error');
    };

    this.wsConnection.onclose = () => {
      this.updateStatus('Disconnected');
      // Attempt to reconnect after 5 seconds
      setTimeout(() => this.connectToSlicer(), 5000);
    };
  }

  handleSlicerMessage(message) {
    switch (message.type) {
      case 'dicom-loaded':
        this.querySelector('#loading').style.display = 'none';
        this.updateStatus('DICOM Loaded');
        break;
      
      case 'segmentation-updated':
        this.segmentations = message.segmentations;
        this.isDirty = true;
        break;
      
      case 'error':
        console.error('Slicer error:', message.error);
        this.updateStatus('Error: ' + message.error);
        break;
      
      case 'tool-changed':
        console.log('Active tool:', message.tool);
        break;
    }
  }

  loadDICOMData() {
    if (!this.currentTask || !this.currentTask.data) {
      console.error('No task data available');
      return;
    }

    this.querySelector('#loading').style.display = 'flex';

    // Send DICOM URLs to Slicer
    const dicomUrls = this.currentTask.data.dicom_urls || [];
    
    this.sendCommand('load-dicom', {
      urls: dicomUrls,
      taskId: this.currentTask.id
    });
  }

  saveSegmentation() {
    if (!this.isDirty) {
      console.log('No changes to save');
      return;
    }

    // Request segmentation data from Slicer
    this.sendCommand('export-segmentation', {
      format: 'nrrd' // or 'nifti', 'dicom-seg'
    });
  }

  setActiveTool(toolName) {
    this.sendCommand('set-tool', { tool: toolName });
  }

  clearSegmentation() {
    if (confirm('Clear all segmentations?')) {
      this.sendCommand('clear-segmentation');
      this.segmentations = {};
      this.isDirty = false;
    }
  }

  sendCommand(command, data = {}) {
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify({
        command: command,
        ...data
      }));
    } else {
      console.error('WebSocket not connected');
    }
  }

  updateStatus(status) {
    this.querySelector('#status-text').textContent = status;
  }

  disconnectedCallback() {
    if (this.wsConnection) {
      this.wsConnection.close();
    }
  }
}

// Register the custom element
customElements.define('slicer-dicom-interface', SlicerDICOMInterface);

// Label Studio plugin interface
window.LabelStudioPlugin = {
  name: 'slicer-dicom-segmentation',
  displayName: 'Slicer DICOM Segmentation',
  version: '1.0.0',
  
  // Called when the plugin is loaded
  initialize: function(ls) {
    console.log('Slicer DICOM Segmentation plugin initialized');
    
    // Store Label Studio instance
    this.ls = ls;
    
    // Add custom styles
    const style = document.createElement('style');
    style.textContent = `
      .slicer-dicom-container .btn {
        padding: 5px 10px;
        margin-right: 5px;
        background: #4a90e2;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
      }
      .slicer-dicom-container .btn:hover {
        background: #357abd;
      }
      .slicer-dicom-container .tool-select {
        padding: 5px;
        margin-right: 10px;
      }
      .slicer-dicom-container .status {
        color: #666;
      }
    `;
    document.head.appendChild(style);
  },
  
  // Called when annotation interface is created
  onLabelStudioInit: function(ls) {
    // Listen for task load events
    ls.on('tasks:loaded', (tasks) => {
      console.log('Tasks loaded:', tasks);
    });
    
    ls.on('submitAnnotation', (ls, annotation) => {
      // Add segmentation data to annotation before submission
      const slicerInterface = document.querySelector('slicer-dicom-interface');
      if (slicerInterface && slicerInterface.segmentations) {
        annotation.result = annotation.result || [];
        annotation.result.push({
          value: {
            format: 'slicer-segmentation',
            segmentations: slicerInterface.segmentations
          },
          type: 'segmentation',
          from_name: 'segmentation',
          to_name: 'dicom'
        });
      }
    });
  },
  
  // Export results in Label Studio format
  exportResults: function(slicerData) {
    return {
      value: {
        format: 'slicer-segmentation',
        segmentations: slicerData.segmentations,
        metadata: {
          tool_version: '1.0.0',
          timestamp: new Date().toISOString()
        }
      },
      type: 'segmentation'
    };
  }
};

// Auto-initialize if Label Studio is already loaded
if (window.LabelStudio) {
  window.LabelStudioPlugin.initialize(window.LabelStudio);
}