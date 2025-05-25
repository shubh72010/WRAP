document.addEventListener('DOMContentLoaded', () => {
    // Main Canvas (for drawing layers)
    const imageCanvas = document.getElementById('imageCanvas');
    const imageCtx = imageCanvas.getContext('2d');

    // Selection Canvas (for drawing selection rectangle)
    const selectionCanvas = document.getElementById('selectionCanvas');
    const selectionCtx = selectionCanvas.getContext('2d');
    const canvasContainer = document.querySelector('.canvas-container');


    // UI Elements
    const imageLoader = document.getElementById('imageLoader');
    const layerListUI = document.getElementById('layerList');
    const exportButton = document.getElementById('exportImage');
    const brightnessSlider = document.getElementById('brightness');
    const applyBrightnessBtn = document.getElementById('applyBrightness');
    const contrastSlider = document.getElementById('contrast');
    const applyContrastBtn = document.getElementById('applyContrast');
    const applySharpenBtn = document.getElementById('applySharpen');
    const deleteActiveLayerBtn = document.getElementById('deleteActiveLayer');
    const moveLayerUpBtn = document.getElementById('moveLayerUp');
    const moveLayerDownBtn = document.getElementById('moveLayerDown');
    const layerOpacitySlider = document.getElementById('layerOpacity');

    const toolSelectRectBtn = document.getElementById('toolSelectRect');
    const toolCropSelectedBtn = document.getElementById('toolCropSelected');
    const clearSelectionBtn = document.getElementById('clearSelection');
    const rotateActiveLayerBtn = document.getElementById('btnRotate');

    const undoBtn = document.getElementById('undoAction');
    const historyStatusUI = document.getElementById('historyStatus');


    // App State
    let layers = []; // Each layer: { id, image, originalImage, x, y, width, height, opacity, isVisible, history: [] }
    let activeLayerId = null;
    let nextLayerId = 0;
    let canvasWidth = 800; // Default canvas dimensions
    let canvasHeight = 600;

    let isSelecting = false;
    let selectionRect = null; // { startX, startY, endX, endY } or null
    let currentTool = null; // 'selectRect', null


    // --- Initialization ---
    function initCanvas() {
        imageCanvas.width = canvasWidth;
        imageCanvas.height = canvasHeight;
        selectionCanvas.width = canvasWidth;
        selectionCanvas.height = canvasHeight;
        imageCtx.fillStyle = '#ccc'; // Default background for empty canvas
        imageCtx.fillRect(0,0,canvasWidth,canvasHeight);
        renderAllLayers();
    }

    // --- Layer Management ---
    imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const newLayer = {
                    id: nextLayerId++,
                    name: `Layer ${nextLayerId} (${file.name.substring(0,10)}...)`,
                    image: img, // This will hold the currently transformed image data for the layer
                    originalImage: img, // Keep a pristine copy
                    x: (canvasWidth - img.width) / 2, // Center image initially
                    y: (canvasHeight - img.height) / 2,
                    width: img.width,
                    height: img.height,
                    opacity: 1.0,
                    isVisible: true,
                    history: [img.src] // Store initial state as dataURL for simplicity
                };
                layers.push(newLayer);
                setActiveLayer(newLayer.id);
                renderAllLayers();
                updateLayerListUI();
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(file);
        e.target.value = null; // Reset file input
    });

    function setActiveLayer(layerId) {
        activeLayerId = layerId;
        const activeLayer = getActiveLayer();
        if (activeLayer) {
            layerOpacitySlider.value = activeLayer.opacity * 100;
            brightnessSlider.value = 100; // Reset sliders for the new layer
            contrastSlider.value = 100;
            updateHistoryStatusUI();
        }
        updateLayerListUI(); // To highlight active layer
        console.log("Active layer set to:", activeLayerId);
    }

    function getActiveLayer() {
        if (activeLayerId === null) return null;
        return layers.find(l => l.id === activeLayerId);
    }

    function deleteActiveLayer() {
        if (activeLayerId === null) return;
        layers = layers.filter(l => l.id !== activeLayerId);
        if (layers.length > 0) {
            setActiveLayer(layers[layers.length - 1].id); // Activate the last layer
        } else {
            activeLayerId = null;
        }
        renderAllLayers();
        updateLayerListUI();
    }

    function moveLayer(direction) {
        if (activeLayerId === null) return;
        const index = layers.findIndex(l => l.id === activeLayerId);
        if (index === -1) return;

        if (direction === 'up' && index < layers.length - 1) {
            [layers[index], layers[index + 1]] = [layers[index + 1], layers[index]];
        } else if (direction === 'down' && index > 0) {
            [layers[index], layers[index - 1]] = [layers[index - 1], layers[index]];
        }
        renderAllLayers();
        updateLayerListUI();
    }


    layerOpacitySlider.addEventListener('input', (e) => {
        const activeLayer = getActiveLayer();
        if (activeLayer) {
            activeLayer.opacity = parseInt(e.target.value) / 100;
            renderAllLayers();
        }
    });


    // --- Rendering ---
    function renderAllLayers() {
        imageCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        imageCtx.fillStyle = '#ccc'; // Draw checkerboard or background if needed
        imageCtx.fillRect(0,0,canvasWidth,canvasHeight);


        layers.forEach(layer => {
            if (layer.isVisible && layer.image) {
                imageCtx.globalAlpha = layer.opacity;
                // Create a temporary canvas for the layer's current state if its not an Image object
                // or if its image property already holds an ImageData or modified Image object
                if (layer.image instanceof Image) {
                    imageCtx.drawImage(layer.image, layer.x, layer.y, layer.width, layer.height);
                } else if (layer.image instanceof ImageData) { // If we store ImageData
                    // This part needs a proper way to draw ImageData.
                    // For now, assume layer.image is always an Image object after processing.
                    // To draw ImageData: create an offscreen canvas, putImageData, then drawImage.
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = layer.width;
                    tempCanvas.height = layer.height;
                    tempCanvas.getContext('2d').putImageData(layer.image, 0, 0);
                    imageCtx.drawImage(tempCanvas, layer.x, layer.y, layer.width, layer.height);
                }
            }
        });
        imageCtx.globalAlpha = 1.0; // Reset global alpha
        drawSelectionRectangle(); // Draw selection on top of layers
    }

    function updateLayerListUI() {
        layerListUI.innerHTML = '';
        [...layers].reverse().forEach(layer => { // Show top layer first
            const li = document.createElement('li');
            li.className = layer.id === activeLayerId ? 'active' : '';
            li.dataset.layerId = layer.id;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'layer-name';
            nameSpan.textContent = layer.name + (layer.isVisible ? '' : ' (Hidden)');
            li.appendChild(nameSpan);

            const visibilityToggle = document.createElement('button');
            visibilityToggle.className = 'visibility-toggle';
            visibilityToggle.textContent = layer.isVisible ? 'Hide' : 'Show';
            visibilityToggle.onclick = (e) => {
                e.stopPropagation();
                layer.isVisible = !layer.isVisible;
                renderAllLayers();
                updateLayerListUI();
            };
            li.appendChild(visibilityToggle);

            li.onclick = () => setActiveLayer(layer.id);
            layerListUI.appendChild(li);
        });
    }

    // --- Image Adjustments (Filter examples) ---
    function applyFilterToActiveLayer(filterFunction, ...args) {
        const layer = getActiveLayer();
        if (!layer || !(layer.image instanceof Image)) {
            alert('Please select a layer with an image.');
            return;
        }
        // Save current state for undo
        saveLayerState(layer);

        // Create a temporary canvas to apply filter
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = layer.width;
        tempCanvas.height = layer.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(layer.image, 0, 0, layer.width, layer.height);

        filterFunction(tempCtx, layer.width, layer.height, ...args);

        // Update the layer's image with the filtered result
        const newImage = new Image();
        newImage.onload = () => {
            layer.image = newImage; // Replace layer's image content
            renderAllLayers();
            updateHistoryStatusUI();
        };
        newImage.src = tempCanvas.toDataURL();
    }


    applyBrightnessBtn.addEventListener('click', () => {
        const brightnessValue = parseInt(brightnessSlider.value);
        applyFilterToActiveLayer(applyBrightnessToContext, brightnessValue);
    });

    function applyBrightnessToContext(ctx, width, height, value) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const adjustment = (value - 100) * 1.5; // Adjusted factor
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.max(0, Math.min(255, data[i] + adjustment));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + adjustment));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + adjustment));
        }
        ctx.putImageData(imageData, 0, 0);
    }

    applyContrastBtn.addEventListener('click', () => {
        const contrastValue = parseInt(contrastSlider.value);
        applyFilterToActiveLayer(applyContrastToContext, contrastValue);
    });

    function applyContrastToContext(ctx, width, height, value) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const factor = (259 * (value + 255)) / (255 * (259 - value));
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
            data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
            data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
        }
        ctx.putImageData(imageData, 0, 0);
    }


    applySharpenBtn.addEventListener('click', () => {
        applyFilterToActiveLayer(applySharpenToContext);
    });

    function applySharpenToContext(ctx, width, height) {
        const weights = [
            0, -1,  0,
           -1,  5, -1,
            0, -1,  0
        ]; // Sharpen kernel
        applyConvolutionFilter(ctx, width, height, weights);
    }

    function applyConvolutionFilter(ctx, width, height, weights, opaque = false) {
        const srcImageData = ctx.getImageData(0, 0, width, height);
        const srcData = srcImageData.data;
        const dstImageData = ctx.createImageData(width, height); // Use createImageData for new buffer
        const dstData = dstImageData.data;

        const side = Math.round(Math.sqrt(weights.length));
        const halfSide = Math.floor(side / 2);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0;
                for (let cy = 0; cy < side; cy++) {
                    for (let cx = 0; cx < side; cx++) {
                        const scy = Math.min(height - 1, Math.max(0, y + cy - halfSide));
                        const scx = Math.min(width - 1, Math.max(0, x + cx - halfSide));
                        
                        const srcOffset = (scy * width + scx) * 4;
                        const wt = weights[cy * side + cx];
                        
                        r += srcData[srcOffset] * wt;
                        g += srcData[srcOffset + 1] * wt;
                        b += srcData[srcOffset + 2] * wt;
                        // Alpha is typically not part of convolution or handled differently
                        if (!opaque) a += srcData[srcOffset + 3] * wt; else a = srcData[(y * width + x) * 4 + 3];
                    }
                }
                const dstOffset = (y * width + x) * 4;
                dstData[dstOffset] = Math.max(0, Math.min(255, r));
                dstData[dstOffset + 1] = Math.max(0, Math.min(255, g));
                dstData[dstOffset + 2] = Math.max(0, Math.min(255, b));
                dstData[dstOffset + 3] = opaque ? a : Math.max(0, Math.min(255, a)); // Keep original alpha if opaque
            }
        }
        ctx.putImageData(dstImageData, 0, 0);
    }

    // --- Selection Tool ---
    toolSelectRectBtn.addEventListener('click', () => {
        currentTool = 'selectRect';
        isSelecting = false; // Reset state
        selectionRect = null;
        canvasContainer.classList.add('selecting'); // For cursor style
        selectionCanvas.style.pointerEvents = 'auto'; // Allow selection canvas to capture mouse
        console.log('Selection tool activated');
    });

    clearSelectionBtn.addEventListener('click', () => {
        selectionRect = null;
        currentTool = null;
        canvasContainer.classList.remove('selecting');
        selectionCanvas.style.pointerEvents = 'none';
        drawSelectionRectangle(); // Clears the visual selection
    });

    selectionCanvas.addEventListener('mousedown', (e) => {
        if (currentTool !== 'selectRect') return;
        isSelecting = true;
        // Adjust mouse coordinates to be relative to the canvas, not the window
        const rect = selectionCanvas.getBoundingClientRect();
        const scaleX = selectionCanvas.width / rect.width;
        const scaleY = selectionCanvas.height / rect.height;

        selectionRect = {
            startX: (e.clientX - rect.left) * scaleX,
            startY: (e.clientY - rect.top) * scaleY,
            endX: (e.clientX - rect.left) * scaleX,
            endY: (e.clientY - rect.top) * scaleY,
        };
    });

    selectionCanvas.addEventListener('mousemove', (e) => {
        if (!isSelecting || !selectionRect || currentTool !== 'selectRect') return;
        const rect = selectionCanvas.getBoundingClientRect();
        const scaleX = selectionCanvas.width / rect.width;
        const scaleY = selectionCanvas.height / rect.height;

        selectionRect.endX = (e.clientX - rect.left) * scaleX;
        selectionRect.endY = (e.clientY - rect.top) * scaleY;
        drawSelectionRectangle();
    });

    selectionCanvas.addEventListener('mouseup', () => {
        if (currentTool !== 'selectRect') return;
        isSelecting = false;
        // Optional: normalize selectionRect (startX < endX, etc.)
        if (selectionRect) {
           const {startX, startY, endX, endY} = selectionRect;
           selectionRect.x = Math.min(startX, endX);
           selectionRect.y = Math.min(startY, endY);
           selectionRect.width = Math.abs(startX - endX);
           selectionRect.height = Math.abs(startY - endY);
        }
        console.log('Selection made:', selectionRect);
        // Don't turn off selection tool automatically, user might want to adjust or crop
        // canvasContainer.classList.remove('selecting');
        // selectionCanvas.style.pointerEvents = 'none';
    });
    selectionCanvas.addEventListener('mouseleave', () => { // If mouse leaves canvas while selecting
        if (isSelecting && currentTool === 'selectRect') {
             isSelecting = false; // Finalize selection
        }
    });


    function drawSelectionRectangle() {
        selectionCtx.clearRect(0, 0, selectionCanvas.width, selectionCanvas.height);
        if (selectionRect && (selectionRect.width > 0 || selectionRect.height > 0 || isSelecting)) { // Draw if valid or currently drawing
            selectionCtx.strokeStyle = 'rgba(0, 123, 255, 0.7)';
            selectionCtx.lineWidth = 2;
            selectionCtx.setLineDash([4, 2]); // Dashed line
            let x, y, w, h;
            if (isSelecting) { // Use start/end while drawing
                 x = selectionRect.startX;
                 y = selectionRect.startY;
                 w = selectionRect.endX - selectionRect.startX;
                 h = selectionRect.endY - selectionRect.startY;
            } else { // Use calculated x,y,w,h after mouseup
                 x = selectionRect.x;
                 y = selectionRect.y;
                 w = selectionRect.width;
                 h = selectionRect.height;
            }
            selectionCtx.strokeRect(x, y, w, h);
            selectionCtx.setLineDash([]); // Reset line dash
        }
    }

    // --- Crop Tool ---
    toolCropSelectedBtn.addEventListener('click', () => {
        const layer = getActiveLayer();
        if (!layer || !(layer.image instanceof Image)) {
            alert('Please select a layer with an image to crop.');
            return;
        }
        if (!selectionRect || selectionRect.width === 0 || selectionRect.height === 0) {
            alert('Please make a selection first.');
            return;
        }

        saveLayerState(layer); // Save state before crop

        const tempCanvas = document.createElement('canvas');
        // Crop coordinates are relative to the main canvas.
        // We need to map them to the layer's local coordinates.
        const cropXonLayer = selectionRect.x - layer.x;
        const cropYonLayer = selectionRect.y - layer.y;
        
        // Ensure crop area is within the layer bounds
        const actualCropX = Math.max(0, cropXonLayer);
        const actualCropY = Math.max(0, cropYonLayer);
        const actualCropWidth = Math.min(selectionRect.width - (actualCropX - cropXonLayer), layer.width - actualCropX);
        const actualCropHeight = Math.min(selectionRect.height - (actualCropY - cropYonLayer), layer.height - actualCropY);

        if (actualCropWidth <=0 || actualCropHeight <=0) {
            alert("Selection is outside the active layer's bounds or results in an empty crop.");
            return;
        }

        tempCanvas.width = actualCropWidth;
        tempCanvas.height = actualCropHeight;
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.drawImage(
            layer.image,
            actualCropX, actualCropY, actualCropWidth, actualCropHeight, // Source rectangle (from layer's image)
            0, 0, actualCropWidth, actualCropHeight                     // Destination rectangle (on tempCanvas)
        );

        const newImage = new Image();
        newImage.onload = () => {
            layer.image = newImage;
            layer.width = newImage.width; // Update layer dimensions
            layer.height = newImage.height;
            // Position the new cropped layer where the selection started
            layer.x = selectionRect.x;
            layer.y = selectionRect.y;
            
            selectionRect = null; // Clear selection after crop
            currentTool = null;
            canvasContainer.classList.remove('selecting');
            selectionCanvas.style.pointerEvents = 'none';
            drawSelectionRectangle();

     