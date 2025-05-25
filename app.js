const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggleSidebar');
const toolButtons = document.querySelectorAll('.tool-btn');
const toolPanel = document.getElementById('toolPanel');
const canvas = document.getElementById('editorCanvas');
const ctx = canvas.getContext('2d');
const imageLoader = document.getElementById('imageLoader');

let currentTool = 'crop';
let image = new Image();
let imageLoaded = false;

// Sidebar toggle
toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('closed');
});

// Tool selection
toolButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    toolButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTool = btn.dataset.tool;
    renderToolPanel(currentTool);
  });
});

// Load image on canvas
imageLoader.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    image.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

// When image loads, draw on canvas and fit
image.onload = () => {
  imageLoaded = true;
  fitImageToCanvas();
};

// Fit image in canvas while keeping aspect ratio
function fitImageToCanvas() {
  const cw = canvas.width;
  const ch = canvas.height;
  const iw = image.width;
  const ih = image.height;

  ctx.clearRect(0, 0, cw, ch);

  let scale = Math.min(cw / iw, ch / ih);
  let x = (cw - iw * scale) / 2;
  let y = (ch - ih * scale) / 2;

  ctx.drawImage(image, x, y, iw * scale, ih * scale);
}

// Basic tool panel content placeholder
function renderToolPanel(tool) {
  toolPanel.innerHTML = '';
  switch (tool) {
    case 'crop':
      toolPanel.innerHTML = `
        <h3>Crop Tool</h3>
        <p>Drag to select area (coming soon)</p>
      `;
      break;
    case 'resize':
      toolPanel.innerHTML = `
        <h3>Resize Tool</h3>
        <p>Width and height inputs (coming soon)</p>
      `;
      break;
    case 'rotate':
      toolPanel.innerHTML = `
        <h3>Rotate Tool</h3>
        <p>Rotate controls (coming soon)</p>
      `;
      break;
    case 'color':
      toolPanel.innerHTML = `
        <h3>Color Adjustments</h3>
        <p>Brightness, contrast, saturation sliders (coming soon)</p>
      `;
      break;
    case 'layers':
      toolPanel.innerHTML = `
        <h3>Layers</h3>
        <p>Layer management (coming soon)</p>
      `;
      break;
    case 'filters':
      toolPanel.innerHTML = `
        <h3>Filters</h3>
        <p>Blur, sharpen, vignette (coming soon)</p>
      `;
      break;
    case 'export':
      toolPanel.innerHTML = `
        <h3>Export</h3>
        <button id="exportBtn">Export PNG</button>
      `;
      document.getElementById('exportBtn').addEventListener('click', exportImage);
      break;
    default:
      toolPanel.innerHTML = `<p>No tool selected.</p>`;
  }
}

// Export canvas as PNG
function exportImage() {
  if (!imageLoaded) {
    alert('Load an image first!');
    return;
  }
  const dataURL = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = 'flay-edited-image.png';
  link.href = dataURL;
  link.click();
}

// Initial render of crop tool panel
renderToolPanel(currentTool);