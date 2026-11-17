(function(){
'use strict';
const __realDoc = window.document;
const __root = __realDoc.getElementById('tool-imgtobloxd');
const document = new Proxy(__realDoc, {
  get(t, p) {
    if (p === 'body' || p === 'documentElement') return __root;
    if (p === 'querySelector') return (s) => __root.querySelector(s);
    if (p === 'querySelectorAll') return (s) => __root.querySelectorAll(s);
    if (p === 'getElementById') return (id) => __root.querySelector('#' + CSS.escape(id)) || __realDoc.getElementById(id);
    const v = t[p];
    return typeof v === 'function' ? v.bind(t) : v;
  }
});

    const tileSize = 8;
    let tileImages = [];
    let tileColors = [];
    let tileFileNames = [];
    let tilesLoaded = false;

    async function loadTilesFromZip() {
      const res = await fetch('assets/data/iframes/data/packs.zip');
      const zipData = new Uint8Array(await res.arrayBuffer());
      const files = fflate.unzipSync(zipData);

      const loadPromises = [];

      for (const fileName in files) {
        if (!fileName.endsWith('.jpg') && !fileName.endsWith('.png')) continue;
        const blob = new Blob([files[fileName]], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.src = url;
        img.style.imageRendering = 'pixelated';

        loadPromises.push(new Promise(resolve => {
          img.onload = () => {
            const avg = getAverageColor(img);
            tileImages.push(img);
            tileColors.push(avg);
            tileFileNames.push(fileName);
            resolve();
          };
        }));
      }

      await Promise.all(loadPromises);
      tilesLoaded = true;
      document.getElementById('loadingOverlay').style.display = 'none';
    }

    function getAverageColor(img) {
      const canvas = document.createElement('canvas');
      canvas.width = tileSize;
      canvas.height = tileSize;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, tileSize, tileSize);
      const data = ctx.getImageData(0, 0, tileSize, tileSize).data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      const count = data.length / 4;
      return [r / count, g / count, b / count];
    }

    function closestTileColor(rgb) {
      let minDist = Infinity, best = 0;
      for (let i = 0; i < tileColors.length; i++) {
        const [r2, g2, b2] = tileColors[i];
        const dist = Math.hypot(rgb[0] - r2, rgb[1] - g2, rgb[2] - b2);
        if (dist < minDist) {
          minDist = dist;
          best = i;
        }
      }
      return best;
    }

    let mosaicTileIndices = [];
    let currentGridX = 0;
    let currentGridY = 0;

    async function generateMosaic() {
      if (!tilesLoaded) {
        document.getElementById('loadingOverlay').style.display = 'flex';
        await loadTilesFromZip();
      }

      const fileInput = document.getElementById('upload');
      const gridX = parseInt(document.getElementById('gridX').value);
      const gridY = parseInt(document.getElementById('gridY').value);
      if (!fileInput.files[0]) return alert("Upload an image first.");

      currentGridX = gridX;
      currentGridY = gridY;
      mosaicTileIndices = new Array(gridY);
      for (let y = 0; y < gridY; y++) mosaicTileIndices[y] = new Array(gridX);

      const img = new Image();
      img.src = URL.createObjectURL(fileInput.files[0]);
      img.onload = () => {
        const canvas = document.getElementById('mainCanvas');
        canvas.width = gridX * tileSize;
        canvas.height = gridY * tileSize;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        const temp = document.createElement('canvas');
        temp.width = gridX;
        temp.height = gridY;
        const tempCtx = temp.getContext('2d');
        tempCtx.imageSmoothingEnabled = false;
        tempCtx.drawImage(img, 0, 0, gridX, gridY);

        const imageData = tempCtx.getImageData(0, 0, gridX, gridY).data;

        for (let y = 0; y < gridY; y++) {
          for (let x = 0; x < gridX; x++) {
            const i = (y * gridX + x) * 4;
            const rgb = [imageData[i], imageData[i + 1], imageData[i + 2]];
            const bestMatch = closestTileColor(rgb);
            mosaicTileIndices[y][x] = bestMatch;
            ctx.drawImage(tileImages[bestMatch], x * tileSize, y * tileSize, tileSize, tileSize);
          }
        }
      };
    }

    const tooltip = document.getElementById('tooltip');
    const canvas = document.getElementById('mainCanvas');

    canvas.addEventListener('mousemove', e => {
      if (!tilesLoaded || mosaicTileIndices.length === 0) {
        tooltip.style.display = 'none';
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const tileX = Math.floor(mouseX / tileSize);
      const tileY = Math.floor(mouseY / tileSize);

      if (tileX < 0 || tileY < 0 || tileX >= currentGridX || tileY >= currentGridY) {
        tooltip.style.display = 'none';
        return;
      }

      const tileIndex = mosaicTileIndices[tileY][tileX];
      const fileName = tileFileNames[tileIndex] || 'Unknown';

      tooltip.textContent = fileName;
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY + 12) + 'px';
      tooltip.style.display = 'block';
    });

    canvas.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });


    window.addEventListener('load', loadTilesFromZip);



window.generateMosaic = generateMosaic;
})();
