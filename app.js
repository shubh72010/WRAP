document.addEventListener('DOMContentLoaded', () => {
    const imageLoader = document.getElementById('imageLoader');
    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d'); // This is for direct pixel manipulation

    // For more complex scenarios, Fabric.js would manage its own canvas
    // const fabricCanvas = new fabric.Canvas('imageCanvas');

    let currentImage = null;
    let originalImage = null; // To store the unaltered image for resets or reapplying filters

    imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img; // Save the original
                currentImage = img;
                // Set canvas dimensions to image dimensions (or fit to view)
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                // For Fabric.js:
                // fabricCanvas.clear();
                // fabricCanvas.setWidth(img.width);
                // fabricCanvas.setHeight(img.height);
                // const fabricImg = new fabric.Image(img);
                // fabricCanvas.add(fabricImg);
                // fabricCanvas.renderAll();
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(file);
    });

    // --- Basic Brightness Adjustment ---
    const brightnessSlider = document.getElementById('brightness');
    const applyBrightnessBtn = document.getElementById('applyBrightness');

    applyBrightnessBtn.addEventListener('click', () => {
        if (!currentImage) {
            alert('Please load an image first.');
            return;
        }
        const brightnessValue = parseInt(brightnessSlider.value); // 0 to 200, 100 is normal
        applyBrightness(brightnessValue);
    });

    function applyBrightness(value) {
        if (!originalImage) return;

        // Redraw the original image to prevent cumulative filter applications on the same 'currentImage'
        ctx.clearRect(0,0,canvas.width, canvas.height);
        ctx.drawImage(originalImage, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const adjustment = (value - 100) * 2.55; // Map 0-200 to -255 to 255 approx.

        for (let i = 0; i < data.length; i += 4) {
            data[i] += adjustment;     // Red
            data[i + 1] += adjustment; // Green
            data[i + 2] += adjustment; // Blue
        }
        ctx.putImageData(imageData, 0, 0);
        // After applying, this becomes the new 'currentImage' for further operations
        // For more robust non-destructive editing, you'd manage layers or original states better
        const tempImg = new Image();
        tempImg.onload = () => { currentImage = tempImg; }
        tempImg.src = canvas.toDataURL();

        // With Fabric.js, it's much simpler:
        // const activeObject = fabricCanvas.getActiveObject();
        // if (activeObject && activeObject.type === 'image') {
        //     activeObject.filters = activeObject.filters || [];
        //     // Remove previous brightness filter if any
        //     activeObject.filters = activeObject.filters.filter(f => !(f instanceof fabric.Image.filters.Brightness));
        //     activeObject.filters.push(new fabric.Image.filters.Brightness({
        //         brightness: (value - 100) / 100 // Fabric brightness is -1 to 1
        //     }));
        //     activeObject.applyFilters();
        //     fabricCanvas.renderAll();
        // }
    }

    // --- Basic Contrast Adjustment (Conceptual) ---
    const contrastSlider = document.getElementById('contrast');
    const applyContrastBtn = document.getElementById('applyContrast');

    applyContrastBtn.addEventListener('click', () => {
        if (!currentImage) {
            alert('Please load an image first.');
            return;
        }
        const contrastValue = parseInt(contrastSlider.value); // 0-200, 100 is normal
        applyContrast(contrastValue);
    });

    function applyContrast(value) {
        if(!originalImage) return;
        // Redraw the original image before applying a new filter value
        ctx.clearRect(0,0,canvas.width, canvas.height);
        ctx.drawImage(originalImage, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const factor = (259 * (value + 255)) / (255 * (259 - value));

        for (let i = 0; i < data.length; i += 4) {
            data[i] = factor * (data[i] - 128) + 128;
            data[i + 1] = factor * (data[i + 1] - 128) + 128;
            data[i + 2] = factor * (data[i + 2] - 128) + 128;
        }
        ctx.putImageData(imageData, 0, 0);
        // Update currentImage state
        const tempImg = new Image();
        tempImg.onload = () => { currentImage = tempImg; }
        tempImg.src = canvas.toDataURL();
    }


    // --- Export ---
    const exportButton = document.getElementById('exportImage');
    exportButton.addEventListener('click', () => {
        if (!currentImage) {
            alert('No image to export.');
            return;
        }
        const dataURL = canvas.toDataURL('image/png'); // Or 'image/jpeg'
        const link = document.createElement('a');
        link.download = 'edited-image.png';
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });


    // --- Placeholder for other tools ---
    // Example: Crop
    document.getElementById('btnCrop').addEventListener('click', () => {
        alert('Crop tool: Implementation needed! This would involve selecting an area on the canvas.');
        // Using Fabric.js, cropping is more manageable with its object model.
        // For manual canvas, you'd draw a selection rectangle, then use drawImage with source/destination rectangles.
    });

    // Example: Rotate
    document.getElementById('btnRotate').addEventListener('click', () => {
        if (!currentImage) return;
        // Simple rotate example using canvas context transforms
        // This rotates around the canvas origin (0,0) and might clip image.
        // Proper rotation needs translating to image center, rotating, then translating back.
        ctx.clearRect(0,0,canvas.width,canvas.height); // Clear canvas
        ctx.save(); // Save current state
        // Translate to center of where image should be, or its own center
        const newWidth = canvas.height; // For 90 deg
        const newHeight = canvas.width; // For 90 deg
        const Tcx = canvas.width/2;
        const Tcy = canvas.height/2;

        // If rotating image, and canvas size might change:
        // canvas.width = newWidth;
        // canvas.height = newHeight;

        ctx.translate(Tcx, Tcy);
        ctx.rotate(90 * Math.PI / 180); // Rotate 90 degrees
        ctx.drawImage(currentImage, -currentImage.width/2, -currentImage.height/2); // Draw image centered at new origin
        ctx.restore(); // Restore original state

        // Update currentImage from canvas content
        const tempImg = new Image();
        tempImg.onload = () => { currentImage = tempImg; /* Update canvas dimensions if they changed */ }
        tempImg.src = canvas.toDataURL();

        // With Fabric.js:
        // const activeObject = fabricCanvas.getActiveObject();
        // if (activeObject) {
        //     activeObject.rotate(activeObject.angle + 90);
        //     fabricCanvas.renderAll();
        // }
    });

    // Add more event listeners and functions for each feature.
    // This will get very complex very quickly.
});
