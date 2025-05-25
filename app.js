// main.js
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    const app = new ImageEditor();
    app.init();
});

class ImageEditor {
    constructor() {
        // Canvas elements
        this.canvas = document.getElementById('main-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // State variables
        this.image = null;
        this.currentTool = null;
        this.history = [];
        this.historyIndex = -1;
        this.layers = [];
        this.activeLayerIndex = 0;
        
        // Adjustment values
        this.adjustments = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            exposure: 0
        };
        
        // Tool states
        this.cropState = {
            active: false,
            startX: 0,
            startY: 0,
            endX: 0,
            endY: 0
        };
    }
    
    init() {
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize canvas size
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Draw initial canvas
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Create default layer
        this.addLayer('Background');
        
        // Add initial state to history
        this.addToHistory('Initial State');
    }
    
    setupEventListeners() {
        // File actions
        document.getElementById('open-file').addEventListener('click', () => this.openFile());
        document.getElementById('save-file').addEventListener('click', () => this.saveFile());
        document.getElementById('undo').addEventListener('click', () => this.undo());
        document.getElementById('redo').addEventListener('click', () => this.redo());
        
        // Basic tools
        document.getElementById('crop-tool').addEventListener('click', () => this.activateTool('crop'));
        document.getElementById('resize-tool').addEventListener('click', () => this.activateTool('resize'));
        document.getElementById('rotate-tool').addEventListener('click', () => this.activateTool('rotate'));
        document.getElementById('flip-tool').addEventListener('click', () => this.activateTool('flip'));
        
        // Color adjustments
        document.getElementById('brightness').addEventListener('input', (e) => this.adjustBrightness(e.target.value));
        document.getElementById('contrast').addEventListener('input', (e) => this.adjustContrast(e.target.value));
        document.getElementById('saturation').addEventListener('input', (e) => this.adjustSaturation(e.target.value));
        document.getElementById('exposure').addEventListener('input', (e) => this.adjustExposure(e.target.value));
        
        // Filters
        document.getElementById('blur-filter').addEventListener('click', () => this.applyFilter('blur'));
        document.getElementById('sharpen-filter').addEventListener('click', () => this.applyFilter('sharpen'));
        document.getElementById('grayscale-filter').addEventListener('click', () => this.applyFilter('grayscale'));
        document.getElementById('sepia-filter').addEventListener('click', () => this.applyFilter('sepia'));
        
        // Layers
        document.getElementById('add-layer').addEventListener('click', () => this.addLayer(`Layer ${this.layers.length}`));
        
        // Tool-specific buttons
        document.getElementById('apply-crop').addEventListener('click', () => this.applyCrop());
        document.getElementById('cancel-crop').addEventListener('click', () => this.cancelCrop());
        document.getElementById('apply-resize').addEventListener('click', () => this.applyResize());
        document.getElementById('cancel-resize').addEventListener('click', () => this.cancelResize());
        document.getElementById('rotate-left').addEventListener('click', () => this.rotateImage(-90));
        document.getElementById('rotate-right').addEventListener('click', () => this.rotateImage(90));
        document.getElementById('apply-rotation').addEventListener('click', () => this.applyRotation());
        document.getElementById('cancel-rotation').addEventListener('click', () => this.cancelRotation());
        
        // Canvas events for crop tool
        this.canvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleCanvasMouseUp());
    }
    
    openFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        // Resize canvas to fit image
                        this.canvas.width = img.width;
                        this.canvas.height = img.height;
                        
                        // Draw image on canvas
                        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                        this.ctx.drawImage(img, 0, 0);
                        
                        // Store the image
                        this.image = img;
                        
                        // Reset layers and create new background layer
                        this.layers = [];
                        this.addLayer('Background');
                        
                        // Add to history
                        this.addToHistory('Open Image');
                    };
                    img.src = event.target.result;
                };
                
                reader.readAsDataURL(file);
            }
        };
        
        input.click();
    }
    
    saveFile() {
        // Create a temporary link element
        const link = document.createElement('a');
        link.download = 'edited-image.png';
        link.href = this.canvas.toDataURL('image/png');
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    addToHistory(actionName) {
        // Remove any future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        // Add current canvas state to history
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.history.push({
            name: actionName,
            imageData: imageData,
            adjustments: {...this.adjustments}
        });
        
        this.historyIndex = this.history.length - 1;
        
        // Update history panel
        this.updateHistoryPanel();
    }
    
    updateHistoryPanel() {
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';
        
        this.history.forEach((item, index) => {
            const li = document.createElement('li');
            li.textContent = item.name;
            
            if (index === this.historyIndex) {
                li.classList.add('active');
            }
            
            li.addEventListener('click', () => this.goToHistoryState(index));
            historyList.appendChild(li);
        });
    }
    
    goToHistoryState(index) {
        if (index >= 0 && index < this.history.length) {
            this.historyIndex = index;
            
            // Restore canvas state
            const state = this.history[index];
            this.ctx.putImageData(state.imageData, 0, 0);
            
            // Restore adjustments
            this.adjustments = {...state.adjustments};
            
            // Update UI
            document.getElementById('brightness').value = this.adjustments.brightness;
            document.getElementById('contrast').value = this.adjustments.contrast;
            document.getElementById('saturation').value = this.adjustments.saturation;
            document.getElementById('exposure').value = this.adjustments.exposure;
            
            this.updateHistoryPanel();
        }
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.goToHistoryState(this.historyIndex - 1);
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.goToHistoryState(this.historyIndex + 1);
        }
    }
    
    activateTool(toolName) {
        // Deactivate current tool
        if (this.currentTool) {
            document.getElementById(`${this.currentTool}-tool`).classList.remove('active');
            document.getElementById(`${this.currentTool}-properties`).classList.add('hidden');
        }
        
        // Activate new tool
        this.currentTool = toolName;
        document.getElementById(`${toolName}-tool`).classList.add('active');
        
        // Show tool properties
        document.getElementById('default-properties').classList.add('hidden');
        const propertiesPanel = document.getElementById(`${toolName}-properties`);
        
        if (propertiesPanel) {
            propertiesPanel.classList.remove('hidden');
        } else {
            document.getElementById('default-properties').classList.remove('hidden');
        }
        
        // Tool-specific initialization
        if (toolName === 'crop') {
            this.initCropTool();
        } else if (toolName === 'resize') {
            this.initResizeTool();
        } else if (toolName === 'rotate') {
            this.initRotateTool();
        }
    }
    
    // Crop Tool Methods
    initCropTool() {
        this.cropState.active = true;
        
        // Show crop overlay
        const cropOverlay = document.getElementById('crop-overlay');
        cropOverlay.classList.remove('hidden');
        cropOverlay.style.width = '0px';
        cropOverlay.style.height = '0px';
        
        // Set initial crop dimensions in the UI
        document.getElementById('crop-width').value = this.canvas.width;
        document.getElementById('crop-height').value = this.canvas.height;
    }
    
    handleCanvasMouseDown(e) {
        if (this.currentTool === 'crop' && this.cropState.active) {
            const rect = this.canvas.getBoundingClientRect();
            this.cropState.startX = e.clientX - rect.left;
            this.cropState.startY = e.clientY - rect.top;
            
            // Position crop overlay
            const cropOverlay = document.getElementById('crop-overlay');
            cropOverlay.style.left = `${this.cropState.startX}px`;
            cropOverlay.style.top = `${this.cropState.startY}px`;
            cropOverlay.style.width = '0px';
            cropOverlay.style.height = '0px';
        }
    }
    
    handleCanvasMouseMove(e) {
        if (this.currentTool === 'crop' && this.cropState.active && e.buttons === 1) {
            const rect = this.canvas.getBoundingClientRect();
            this.cropState.endX = e.clientX - rect.left;
            this.cropState.endY = e.clientY - rect.top;
            
            // Update crop overlay
            const cropOverlay = document.getElementById('crop-overlay');
            const width = Math.abs(this.cropState.endX - this.cropState.startX);
            const height = Math.abs(this.cropState.endY - this.cropState.startY);
            
            cropOverlay.style.width = `${width}px`;
            cropOverlay.style.height = `${height}px`;
            
            // Update crop dimensions in the UI
            document.getElementById('crop-width').value = width;
            document.getElementById('crop-height').value = height;
        }
    }
    
    handleCanvasMouseUp() {
        if (this.currentTool === 'crop' && this.cropState.active) {
            // Finalize crop selection
            const width = Math.abs(this.cropState.endX - this.cropState.startX);
            const height = Math.abs(this.cropState.endY - this.cropState.startY);
            
            if (width > 0 && height > 0) {
                // Update crop dimensions in the UI
                document.getElementById('crop-width').value = width;
                document.getElementById('crop-height').value = height;
            }
        }
    }
    
    applyCrop() {
        if (this.currentTool === 'crop') {
            // Get crop dimensions
            const width = parseInt(document.getElementById('crop-width').value);
            const height = parseInt(document.getElementById('crop-height').value);
            
            // Calculate crop coordinates
            const startX = Math.min(this.cropState.startX, this.cropState.endX);
            const startY = Math.min(this.cropState.startY, this.cropState.endY);
            
            // Create temporary canvas for cropped image
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Draw cropped portion
            tempCtx.drawImage(
                this.canvas,
                startX, startY, width, height,
                0, 0, width, height
            );
            
            // Resize main canvas
            this.canvas.width = width;
            this.canvas.height = height;
            
            // Draw cropped image back to main canvas
            this.ctx.drawImage(tempCanvas, 0, 0);
            
            // Add to history
            this.addToHistory('Crop Image');
            
            // Reset crop state
            this.cancelCrop();
        }
    }
    
    cancelCrop() {
        this.cropState.active = false;
        document.getElementById('crop-overlay').classList.add('hidden');
        this.activateTool(null);
    }
    
    // Resize Tool Methods
    initResizeTool() {
        document.getElementById('resize-width').value = this.canvas.width;
        document.getElementById('resize-height').value = this.canvas.height;
    }
    
    applyResize() {
        const width = parseInt(document.getElementById('resize-width').value);
        const height = parseInt(document.getElementById('resize-height').value);
        
        if (width > 0 && height > 0) {
            // Create temporary canvas for resized image
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Draw resized image
            tempCtx.drawImage(this.canvas, 0, 0, width, height);
            
            // Resize main canvas
            this.canvas.width = width;
            this.canvas.height = height;
            
            // Draw resized image back to main canvas
            this.ctx.drawImage(tempCanvas, 0, 0);
            
            // Add to history
            this.addToHistory('Resize Image');
        }
        
        this.activateTool(null);
    }
    
    cancelResize() {
        this.activateTool(null);
    }
    
    // Rotate Tool Methods
    initRotateTool() {
        document.getElementById('rotation-angle').value = 0;
    }
    
    rotateImage(degrees) {
        document.getElementById('rotation-angle').value = degrees;
    }
    
    applyRotation() {
        const angle = parseInt(document.getElementById('rotation-angle').value);
        
        if (angle !== 0) {
            // Convert degrees to radians
            const radians = (angle * Math.PI) / 180;
            
            // Create temporary canvas for rotated image
            const tempCanvas = document.createElement('canvas');
            
            // Calculate new dimensions
            let width = this.canvas.width;
            let height = this.canvas.height;
            
            if (angle === 90 || angle === -90 || angle === 270 || angle === -270) {
                // Swap dimensions for 90-degree rotations
                tempCanvas.width = height;
                tempCanvas.height = width;
            } else if (angle === 180 || angle === -180) {
                // Keep dimensions for 180-degree rotations
                tempCanvas.width = width;
                tempCanvas.height = height;
            } else {
                // Calculate dimensions for arbitrary angles
                const absCos = Math.abs(Math.cos(radians));
                const absSin = Math.abs(Math.sin(radians));
                
                const newWidth = height * absSin + width * absCos;
                const newHeight = height * absCos + width * absSin;
                
                tempCanvas.width = newWidth;
                tempCanvas.height = newHeight;
            }
            
            const tempCtx = tempCanvas.getContext('2d');
            
            // Translate and rotate
            tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
            tempCtx.rotate(radians);
            tempCtx.drawImage(this.canvas, -width / 2, -height / 2);
            
            // Resize main canvas
            this.canvas.width = tempCanvas.width;
            this.canvas.height = tempCanvas.height;
            
            // Draw rotated image back to main canvas
            this.ctx.drawImage(tempCanvas, 0, 0);
            
            // Add to history
            this.addToHistory(`Rotate Image ${angle}°`);
        }
        
        this.activateTool(null);
    }
    
    cancelRotation() {
        this.activateTool(null);
    }
    
    // Adjustment Methods
    adjustBrightness(value) {
        this.adjustments.brightness = parseInt(value);
        this.applyAdjustments();
    }
    
    adjustContrast(value) {
        this.adjustments.contrast = parseInt(value);
        this.applyAdjustments();
    }
    
    adjustSaturation(value) {
        this.adjustments.saturation = parseInt(value);
        this.applyAdjustments();
    }
    
    adjustExposure(value) {
        this.adjustments.exposure = parseInt(value);
        this.applyAdjustments();
    }
    
    applyAdjustments() {
        // This is a simplified implementation
        // In a real application, you would apply these adjustments to the image data
        
        // For demonstration purposes, we'll just add to history
        this.addToHistory('Adjust Image');
    }
    
    // Filter Methods
    applyFilter(filterName) {
        // This is a simplified implementation
        // In a real application, you would apply these filters to the image data
        
        if (filterName === 'grayscale') {
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = avg;     // Red
                data[i + 1] = avg; // Green
                data[i + 2] = avg; // Blue
            }
            
            this.ctx.putImageData(imageData, 0, 0);
        } else if (filterName === 'sepia') {
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
            }
            
            this.ctx.putImageData(imageData, 0, 0);
        }
        
        // Add to history
        this.addToHistory(`Apply ${filterName} Filter`);
    }
    
    // Layer Methods
    addLayer(name) {
        this.layers.push({
            name: name,
            visible: true,
            canvas: document.createElement('canvas')
        });
        
        this.activeLayerIndex = this.layers.length - 1;
        this.updateLayersPanel();
    }
    
    updateLayersPanel() {
        const layersPanel = document.getElementById('layers-panel');
        layersPanel.innerHTML = '';
        
        this.layers.forEach((layer, index) => {
            const layerDiv = document.createElement('div');
            layerDiv.className = 'layer';
            
            if (index === this.activeLayerIndex) {
                layerDiv.classList.add('active');
            }
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = layer.name;
            
            const visibilityBtn = document.createElement('button');
            visibilityBtn.className = 'visibility-toggle';
            visibilityBtn.innerHTML = layer.visible ? 
                '<i class="fas fa-eye"></i>' : 
                '<i class="fas fa-eye-slash"></i>';
            
            layerDiv.appendChild(nameSpan);
            layerDiv.appendChild(visibilityBtn);
            
            layerDiv.addEventListener('click', () => this.setActiveLayer(index));
            visibilityBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLayerVisibility(index);
            });
            
            layersPanel.appendChild(layerDiv);
        });
    }
    
    setActiveLayer(index) {
        this.activeLayerIndex = index;
        this.updateLayersPanel();
    }
    
    toggleLayerVisibility(index) {
        this.layers[index].visible = !this.layers[index].visible;
        this.updateLayersPanel();
    }
}