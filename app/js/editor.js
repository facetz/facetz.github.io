(function(){
'use strict';
const __realDoc = window.document;
const __root = __realDoc.getElementById('tool-editor');
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

  (() => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const fileList = document.getElementById('file-list');
    const folderInput = document.getElementById('folder-input');
    const uploadFolderBtn = document.getElementById('upload-folder-btn');
    const presetsBtn = document.getElementById('presets-btn');

    const colorPicker = document.getElementById('color-picker');
    const colorTextInput = document.getElementById('color-text-input');
    const customColorsContainer = document.getElementById('custom-colors');
    const addColorBtn = document.getElementById('add-color-btn');

    const undoBtn = document.getElementById('undo-btn');
    const darkenBtn = document.getElementById('darken-tool');
    const lightenBtn = document.getElementById('lighten-tool');
    const eraserBtn = document.getElementById('eraser-tool');
    const eyedropperBtn = document.getElementById('eyedropper-tool');
    const saveBtn = document.getElementById('save-btn');

    const saveModal = document.getElementById('save-modal');
    const saveCurrentBtn = document.getElementById('save-current-btn');
    const saveAllBtn = document.getElementById('save-all-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');

    const fullscreenBtn = document.getElementById('fullscreenBtn');

    let currentTool = 'pencil';
    let selectedColor = '#ff6b39';
    let lastValidColor = '#ff6b39';
    let customColors = [];

    const undoStack = [];
    const MAX_UNDO = 20;

    let currentImage = null;
    let textureSize = 16;
    let currentFileName = null;


    const editedTextures = {};
    const modifiedTextures = new Set();

    const CANVAS_SIZE = 500;
    let pixelPerfectMode = false;
    let pixelScale = CANVAS_SIZE / textureSize;

    ctx.imageSmoothingEnabled = false;

    function drawTexture(imageData) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const off = document.createElement('canvas');
      off.width = textureSize;
      off.height = textureSize;
      const offCtx = off.getContext('2d');
      offCtx.putImageData(imageData, 0, 0);

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, 0, 0, textureSize, textureSize, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }

    function createBlankTexture(size) {
      return ctx.createImageData(size, size);
    }

    function pushUndo() {
      if (!currentImage) return;
      if (undoStack.length >= MAX_UNDO) undoStack.shift();
      undoStack.push(new ImageData(new Uint8ClampedArray(currentImage.data), currentImage.width, currentImage.height));

      if (currentFileName) {
        modifiedTextures.add(currentFileName);
        updateFileListDisplay();
      }
    }

    function undo() {
      if (undoStack.length === 0) return;
      currentImage = undoStack.pop();
      drawTexture(currentImage);
    }

    function setPixel(imageData, x, y, rgba) {
      if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) return;
      const idx = (y * imageData.width + x) * 4;
      imageData.data[idx] = rgba[0];
      imageData.data[idx + 1] = rgba[1];
      imageData.data[idx + 2] = rgba[2];
      imageData.data[idx + 3] = rgba[3];
    }

    function getPixel(imageData, x, y) {
      if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) return [0, 0, 0, 0];
      const idx = (y * imageData.width + x) * 4;
      return [
        imageData.data[idx],
        imageData.data[idx + 1],
        imageData.data[idx + 2],
        imageData.data[idx + 3],
      ];
    }

    function hexToRgba(hex) {
      if (!hex || hex[0] !== '#' || (hex.length !== 7 && hex.length !== 4)) return [0, 0, 0, 255];
      if (hex.length === 7) {
        return [
          parseInt(hex.substr(1, 2), 16),
          parseInt(hex.substr(3, 2), 16),
          parseInt(hex.substr(5, 2), 16),
          255,
        ];
      } else if (hex.length === 4) {
        return [
          parseInt(hex[1] + hex[1], 16),
          parseInt(hex[2] + hex[2], 16),
          parseInt(hex[3] + hex[3], 16),
          255,
        ];
      }
    }

    function rgbaToHex(rgba) {
      const r = rgba[0].toString(16).padStart(2, '0');
      const g = rgba[1].toString(16).padStart(2, '0');
      const b = rgba[2].toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }

    function isValidHex(hex) {
      return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(hex);
    }


    let mouseDown = false;

    function getTextureCoords(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const tx = Math.floor(x / pixelScale);
      const ty = Math.floor(y / pixelScale);
      return { tx, ty };
    }

    function drawAtPixel(x, y) {
      if (!currentImage) return;

      if (pixelPerfectMode) {
        x = Math.floor(x);
        y = Math.floor(y);

        if (x < 0 || y < 0 || x >= textureSize || y >= textureSize) return;
      }

      switch (currentTool) {
        case 'pencil': {
          const rgba = hexToRgba(selectedColor);
          setPixel(currentImage, x, y, rgba);
          break;
        }
        case 'eraser': {
          setPixel(currentImage, x, y, [0, 0, 0, 0]);
          break;
        }
        case 'darken': {
          const px = getPixel(currentImage, x, y);
          const darkened = darkenColor(px, 0.15);
          setPixel(currentImage, x, y, darkened);
          break;
        }
        case 'lighten': {
          const px = getPixel(currentImage, x, y);
          const lightened = lightenColor(px, 0.15);
          setPixel(currentImage, x, y, lightened);
          break;
        }
      }
    }


    function rgbaToHsl(rgba) {
      let r = rgba[0] / 255, g = rgba[1] / 255, b = rgba[2] / 255;
      let max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;

      if (max === min) {
        h = s = 0;
      } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return [h, s, l];
    }

    function hslToRgba(h, s, l, alpha = 255) {
      let r, g, b;

      if (s === 0) {
        r = g = b = l;
      } else {
        function hue2rgb(p, q, t) {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        }
        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), alpha];
    }

    function darkenColor(rgba, amount) {
      if (rgba[3] === 0) return rgba;
      let [h, s, l] = rgbaToHsl(rgba);
      l = Math.max(0, l - amount);
      return hslToRgba(h, s, l, rgba[3]);
    }

    function lightenColor(rgba, amount) {
      if (rgba[3] === 0) return rgba;
      let [h, s, l] = rgbaToHsl(rgba);
      l = Math.min(1, l + amount);
      return hslToRgba(h, s, l, rgba[3]);
    }

    function onPointerDown(e) {
      mouseDown = true;
      const { tx, ty } = getTextureCoords(e.clientX, e.clientY);
      if (tx < 0 || ty < 0 || tx >= textureSize || ty >= textureSize) return;

      if (currentTool === 'eyedropper') {
        const px = getPixel(currentImage, tx, ty);
        if (px[3] !== 0) {
          selectedColor = rgbaToHex(px);
          updateColorInputs(selectedColor);
          updateFileListDisplay();
        }
        setActiveTool('pencil');
        return;
      }

      pushUndo();
      drawAtPixel(tx, ty);
      drawTexture(currentImage);
    }

    function onPointerMove(e) {
      if (!mouseDown) return;
      const { tx, ty } = getTextureCoords(e.clientX, e.clientY);
      if (tx < 0 || ty < 0 || tx >= textureSize || ty >= textureSize) return;

      if (currentTool !== 'eyedropper') {
        drawAtPixel(tx, ty);
        drawTexture(currentImage);
      }
    }

    function onPointerUp(e) {
      mouseDown = false;
    }

    function updateColorInputs(hex) {
      if (isValidHex(hex)) {
        colorPicker.value = hex;
        colorTextInput.value = hex.toUpperCase();
        colorTextInput.classList.remove('invalid');
        lastValidColor = hex;
      } else {
        colorTextInput.classList.add('invalid');
      }
    }

    function addCustomColor(hex) {
      if (!isValidHex(hex)) return;
      if (customColors.includes(hex.toUpperCase())) return;

      customColors.push(hex.toUpperCase());
      renderCustomColors();
    }

    function renderCustomColors() {
      customColorsContainer.innerHTML = '';
      customColors.forEach(color => {
        const div = document.createElement('div');
        div.className = 'color-box';
        div.style.backgroundColor = color;
        div.title = color;
        div.addEventListener('click', () => {
          selectedColor = color;
          updateColorInputs(color);
        });
        customColorsContainer.appendChild(div);
      });
    }

    function loadTexture(img) {
      textureSize = img.width;
      if (textureSize !== 8 && textureSize !== 16) {
        alert('Texture must be 8x8 or 16x16 pixels');
        return;
      }

      pixelScale = CANVAS_SIZE / textureSize;

      const off = document.createElement('canvas');
      off.width = textureSize;
      off.height = textureSize;
      const offCtx = off.getContext('2d');
      offCtx.clearRect(0, 0, textureSize, textureSize);
      offCtx.drawImage(img, 0, 0);

      if (currentFileName && editedTextures[currentFileName]) {
        currentImage = editedTextures[currentFileName].data;
      } else {
        currentImage = offCtx.getImageData(0, 0, textureSize, textureSize);
      }

      undoStack.length = 0;
      drawTexture(currentImage);
    }

    function handleFiles(files) {
      for (const file of files) {
        if (!file.type.startsWith('image/png')) continue;
        const reader = new FileReader();
        reader.onload = function (e) {
          const img = new Image();
          img.onload = () => {
            addFileToList(file.name, img);
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    }

    function addFileToList(name, img) {
      console.log(`Adding file to list: ${name}`);
      const li = document.createElement('li');
      li.textContent = name;
      li.title = `Load ${name}`;
      li.textureImage = img;
      console.log(`Stored image reference for ${name}:`, !!img);

      li.addEventListener('click', () => {
        console.log(`Clicked on texture: ${name}`);
        if (currentFileName && currentImage) {
          editedTextures[currentFileName] = {
            data: new ImageData(new Uint8ClampedArray(currentImage.data), currentImage.width, currentImage.height),
            size: textureSize
          };

          if (!modifiedTextures.has(currentFileName)) {
            modifiedTextures.add(currentFileName);
          }
        }

        currentFileName = name;
        loadTexture(img);
        highlightActiveFile(li);
        updateFileListDisplay();
      });
      fileList.appendChild(li);
      console.log(`Added to file list. Total items: ${fileList.children.length}`);
    }

    function highlightActiveFile(activeLi) {
      [...fileList.children].forEach(li => li.classList.remove('active-btn'));
      activeLi.classList.add('active-btn');
    }

    function updateFileListDisplay() {
      [...fileList.children].forEach(li => {
        const fileName = li.textContent;
        if (modifiedTextures.has(fileName)) {
          if (!li.querySelector('.modified-indicator')) {
            const indicator = document.createElement('span');
            indicator.className = 'modified-indicator';
            indicator.innerHTML = ' <i class="fas fa-edit" style="color: #ff6b39; font-size: 0.8em; margin-left: 5px;"></i>';
            li.appendChild(indicator);
          }
        } else {
          const indicator = li.querySelector('.modified-indicator');
          if (indicator) {
            indicator.remove();
          }
        }
      });

      const noTexturesMessage = document.getElementById('no-textures-message');
      if (fileList.children.length === 0) {
        noTexturesMessage.style.display = 'flex';
      } else {
        noTexturesMessage.style.display = 'none';
      }
    }

    const toolButtons = {
      pencil: null,
      undo: undoBtn,
      darken: darkenBtn,
      lighten: lightenBtn,
      eraser: eraserBtn,
      eyedropper: eyedropperBtn,
      save: saveBtn
    };


    const effectsBtn = document.querySelector('[data-tooltip="Texture Effects & Adjustments"]');
    const effectsModal = document.getElementById('effects-modal');
    const effectsModalContent = document.getElementById('effects-modal-content');
    const modalBodyContainer = document.getElementById('modal-body-container');
    const closeEffectsBtn = document.getElementById('close-effects-btn');
    const applyEffectsBtn = document.getElementById('apply-effects-btn');
    const previewEffectsBtn = document.getElementById('preview-effects-btn');
    const resetEffectsBtn = document.getElementById('reset-effects-btn');
    const previewColumn = document.getElementById('preview-column');
    const controlsColumn = document.getElementById('controls-column');


    const saturationSlider = document.getElementById('saturation-slider');
    const brightnessSlider = document.getElementById('brightness-slider');
    const contrastSlider = document.getElementById('contrast-slider');
    const applyTarget = document.getElementById('apply-target');


    const saturationValue = document.getElementById('saturation-value');
    const brightnessValue = document.getElementById('brightness-value');
    const contrastValue = document.getElementById('contrast-value');


    const previewCanvas = document.getElementById('preview-canvas');
    const previewCtx = previewCanvas.getContext('2d');
    let previewImageData = null;

    function setActiveTool(toolName) {
      currentTool = toolName;

      document.querySelectorAll('.card').forEach(card => {
        if (card.querySelector('.card-title').textContent.toLowerCase().includes(toolName)) {
          card.classList.add('active-card');
        } else {
          card.classList.remove('active-card');
        }
      });

      [undoBtn, darkenBtn, lightenBtn, eraserBtn, eyedropperBtn, saveBtn].forEach(btn => {
        btn.classList.remove('active-btn');
      });

      if (toolName !== 'pencil' && toolName !== 'save' && toolButtons[toolName]) {
        toolButtons[toolName].classList.add('active-btn');
      }
    }

    function saveCurrentTexture() {
      if (!currentImage) return;

      if (currentFileName) {
        editedTextures[currentFileName] = {
          data: new ImageData(new Uint8ClampedArray(currentImage.data), currentImage.width, currentImage.height),
          size: textureSize
        };
        modifiedTextures.add(currentFileName);
        updateFileListDisplay();
      }

      const off = document.createElement('canvas');
      off.width = textureSize;
      off.height = textureSize;
      const offCtx = off.getContext('2d');

      offCtx.putImageData(currentImage, 0, 0);

      off.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFileName || `texture_${textureSize}x${textureSize}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }, 'image/png');
    }

    function saveAllEditedTextures() {
      if (modifiedTextures.size === 0) {
        alert('No textures have been modified to save.');
        return;
      }

      const zip = new JSZip();

      let processedCount = 0;

      modifiedTextures.forEach(filename => {
        if (editedTextures[filename]) {
          const textureData = editedTextures[filename];
          const canvas = document.createElement('canvas');
          canvas.width = textureData.size;
          canvas.height = textureData.size;
          const ctx = canvas.getContext('2d');

          ctx.putImageData(textureData.data, 0, 0);

          canvas.toBlob(blob => {
            zip.file(filename, blob);
            processedCount++;

            if (processedCount === modifiedTextures.size) {
              zip.generateAsync({type: "blob"}).then(function(content) {
                const url = URL.createObjectURL(content);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'edited_textures.zip';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              });
            }
          }, 'image/png');
        }
      });
    }

    fullscreenBtn.addEventListener('click', () => {
      const container = document.querySelector('.canvas-container');
      if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => alert(`Error attempting to enable fullscreen: ${err.message}`));
      } else {
        document.exitFullscreen();
      }
    });

    document.querySelector('.card').addEventListener('click', () => {
      setActiveTool('pencil');
    });


    if (effectsBtn) {
      effectsBtn.addEventListener('click', () => {
        resetEffectSliders();

        previewVisible = false;
        modalBodyContainer.style.display = 'block';
        previewColumn.style.display = 'none';
        effectsModalContent.style.maxWidth = '600px';
        previewEffectsBtn.innerHTML = '<i class="fas fa-eye"></i> Show Preview';
        previewEffectsBtn.classList.remove('active-btn');


        effectsModal.style.display = 'flex';

        void effectsModal.offsetWidth;

        effectsModal.classList.remove('hiding');
        effectsModalContent.classList.remove('hiding');
      });
    }

    closeEffectsBtn.addEventListener('click', () => {

      effectsModal.classList.add('hiding');
      effectsModalContent.classList.add('hiding');


      setTimeout(() => {
        effectsModal.style.display = 'none';
        effectsModal.classList.remove('hiding');
        effectsModalContent.classList.remove('hiding');
      }, 300);
    });

    effectsModal.addEventListener('click', (e) => {
      if (e.target === effectsModal) {

        effectsModal.classList.add('hiding');
        effectsModalContent.classList.add('hiding');


        setTimeout(() => {
          effectsModal.style.display = 'none';
          effectsModal.classList.remove('hiding');
          effectsModalContent.classList.remove('hiding');
        }, 300);
      }
    });


    saturationSlider.addEventListener('input', () => {
      saturationValue.textContent = `${saturationSlider.value}%`;
      updatePreview();
    });

    brightnessSlider.addEventListener('input', () => {
      brightnessValue.textContent = `${brightnessSlider.value}%`;
      updatePreview();
    });

    contrastSlider.addEventListener('input', () => {
      contrastValue.textContent = `${contrastSlider.value}%`;
      updatePreview();
    });


    let previewVisible = false;

    function togglePreview(show) {
      previewVisible = show;

      if (previewVisible) {

        modalBodyContainer.style.display = 'flex';
        modalBodyContainer.style.gap = '30px';
        previewColumn.style.display = 'block';
        effectsModalContent.style.maxWidth = '900px';
        previewEffectsBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Preview';
        previewEffectsBtn.classList.add('active-btn');
        initializePreview();
      } else {

        modalBodyContainer.style.display = 'block';
        previewColumn.style.display = 'none';
        effectsModalContent.style.maxWidth = '600px';
        previewEffectsBtn.innerHTML = '<i class="fas fa-eye"></i> Show Preview';
        previewEffectsBtn.classList.remove('active-btn');
      }
    }

    previewEffectsBtn.addEventListener('click', () => {
      togglePreview(!previewVisible);
    });


    resetEffectsBtn.addEventListener('click', () => {
      resetEffectSliders();
      if (previewVisible) {
        updatePreview();
      }
    });


    applyEffectsBtn.addEventListener('click', () => {
      applyTextureEffects();
    });

    undoBtn.addEventListener('click', () => {
      undo();
    });

    darkenBtn.addEventListener('click', () => {
      setActiveTool('darken');
    });

    lightenBtn.addEventListener('click', () => {
      setActiveTool('lighten');
    });

    eraserBtn.addEventListener('click', () => {
      setActiveTool('eraser');
    });

    eyedropperBtn.addEventListener('click', () => {
      setActiveTool('eyedropper');
    });

    saveBtn.addEventListener('click', () => {
      const saveModalContent = saveModal.querySelector('.modal-content');


      saveModal.style.display = 'flex';

      void saveModal.offsetWidth;

      saveModal.classList.remove('hiding');
      saveModalContent.classList.remove('hiding');
    });

    colorPicker.addEventListener('input', e => {
      const val = e.target.value.toUpperCase();
      selectedColor = val;
      colorTextInput.value = val;
    });

    colorTextInput.addEventListener('input', e => {
      const val = e.target.value;
      if (isValidHex(val)) {
        selectedColor = val.toUpperCase();
        colorPicker.value = selectedColor;
        colorTextInput.classList.remove('invalid');
      } else {
        colorTextInput.classList.add('invalid');
      }
    });

    colorTextInput.addEventListener('blur', e => {
      const val = e.target.value;
      if (!isValidHex(val)) {
        selectedColor = lastValidColor;
        updateColorInputs(lastValidColor);
      }
    });

    addColorBtn.addEventListener('click', () => {
      if (isValidHex(selectedColor)) {
        addCustomColor(selectedColor);
      }
    });

    uploadFolderBtn.addEventListener('click', () => {
      folderInput.click();
    });

    folderInput.addEventListener('change', e => {
      if (e.target.files.length > 0) {
        handleFiles(e.target.files);
        e.target.value = '';
      }
    });

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    function init() {
      currentImage = createBlankTexture(16);
      textureSize = 16;
      pixelScale = CANVAS_SIZE / textureSize;
      drawTexture(currentImage);
      setActiveTool('pencil');
      updateColorInputs(selectedColor);
      renderCustomColors();

      currentFileName = null;

      updateFileListDisplay();
    }

    const presetPalettes = {
      "H31": [
        "#636663", "#87857c", "#bcad9f", "#f2b888", "#eb9661", "#b55945", "#734c44", "#3d3333",
        "#593e47", "#7a5859", "#a57855", "#de9f47", "#fdd179", "#fee1b8", "#d4c692", "#a6b04f",
        "#819447", "#44702d", "#2f4d2f", "#546756", "#89a477", "#a4c5af", "#cae6d9", "#f1f6f0",
        "#d5d6db", "#bbc3d0", "#96a9c1", "#6c81a1", "#405273", "#303843", "#14233a"
      ],
      "Steam Lords": [
        "#213b25", "#3a604a", "#4f7754", "#a19f7c", "#77744f", "#775c4f", "#603b3a", "#3b2137",
        "#170e19", "#2f213b", "#433a60", "#4f5277", "#65738c", "#7c94a1", "#a0b9ba", "#c0d1cc"
      ],
      "Gold Rust": [
        "#f6cd26", "#ac6b26", "#563226", "#331c17", "#bb7f57", "#725956", "#393939", "#202020"
      ],
      "Diao": [
        "#ffffff", "#0ce6f2", "#0098db", "#1e579c", "#203562", "#252446", "#201533"
      ],
      "Ammo": [
        "#040c06", "#112318", "#1e3a29", "#305d42", "#4d8061", "#89a257", "#bedc7f", "#eeffcc"
      ],
      "Pastel": [
        "#FFB3BA", "#FFDFBA", "#FFFFBA", "#BAFFC9", "#BAE1FF", "#DDBDF1", "#F1DDBF", "#BFDDBF"
      ]
    };

    function populatePalettesModal() {
      const container = document.getElementById('palettes-container');
      container.innerHTML = '';

      for (const [groupName, palettes] of Object.entries(presetPalettes)) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'palette-group';

        const groupTitle = document.createElement('h4');
        groupTitle.textContent = groupName;
        groupDiv.appendChild(groupTitle);

        const paletteDiv = document.createElement('div');
        paletteDiv.className = 'palette';

        const colorsContainer = document.createElement('div');
        colorsContainer.className = 'palette-colors';

        for (const color of palettes) {
          const colorBox = document.createElement('div');
          colorBox.className = 'palette-color';
          colorBox.style.backgroundColor = color;
          colorBox.title = color;
          colorBox.addEventListener('click', () => {
            selectedColor = color;
            updateColorInputs(selectedColor);

            palettesModal.classList.add('hiding');
            const palettesModalContent = palettesModal.querySelector('.modal-content');
            palettesModalContent.classList.add('hiding');


            setTimeout(() => {
              palettesModal.style.display = 'none';
              palettesModal.classList.remove('hiding');
              palettesModalContent.classList.remove('hiding');
            }, 300);
          });

          colorsContainer.appendChild(colorBox);
        }

        paletteDiv.appendChild(colorsContainer);
        groupDiv.appendChild(paletteDiv);

        const addToQuickColorsBtn = document.createElement('button');
        addToQuickColorsBtn.className = 'modal-btn';
        addToQuickColorsBtn.style.marginTop = '10px';
        addToQuickColorsBtn.style.width = '100%';
        addToQuickColorsBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Add to Quick Colors';
        addToQuickColorsBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          palettes.forEach(color => {
            if (!customColors.includes(color.toUpperCase())) {
              customColors.push(color.toUpperCase());
            }
          });
          renderCustomColors();

          addToQuickColorsBtn.innerHTML = '<i class="fas fa-check"></i> Added!';
          setTimeout(() => {
            addToQuickColorsBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Add to Quick Colors';
          }, 1500);
        });

        groupDiv.appendChild(addToQuickColorsBtn);

        container.appendChild(groupDiv);
      }
    }

    async function loadAvailablePresets() {
      try {
        const presetPacks = [
          {
            name: 'Blo3D',
            description: 'A 3D-styled texture pack with enhanced depth and lighting effects.',
            path: 'app/assets/data/packs/Blo3D/Blo3D.zip'
          },
          {
            name: 'Burnt16',
            description: 'A dark-themed texture pack with fiery and charred elements.',
            path: 'app/assets/data/packs/Burnt16/Burnt16x.zip'
          },
          {
            name: 'Destiny',
            description: 'A futuristic sci-fi inspired texture pack with sleek designs.',
            path: 'app/assets/data/packs/Destiny/Destiny.zip'
          },
          {
            name: 'FadeFyre',
            description: 'A vibrant pack featuring gradient colors and fire-inspired textures.',
            path: 'app/assets/data/packs/FadeFyre/FadeFyreVX1.zip'
          },
          {
            name: 'golde',
            description: 'Luxurious golden-themed textures with rich metallic finishes.',
            path: 'app/assets/data/packs/golde/Goldev2.zip'
          },
          {
            name: 'HyperXray',
            description: 'High-tech X-ray vision style textures with glowing elements.',
            path: 'app/assets/data/packs/HyperXray/HyperXray.zip'
          },
          {
            name: 'jambloxds Plus',
            description: 'Enhanced version of classic jambloxd textures with improved details.',
            path: 'app/assets/data/packs/jambloxds Plus/jambloxds Plus.zip'
          },
          {
            name: 'Kosmos',
            description: 'Cosmic-themed textures with stars, nebulae, and space elements.',
            path: 'app/assets/data/packs/Kosmos/Kosmos18x.zip'
          },
          {
            name: 'Monochrome',
            description: 'Classic black and white textures with clean, minimalist design.',
            path: 'app/assets/data/packs/Monochrome/Monochrome8x.zip'
          },
          {
            name: 'Sleekslots',
            description: 'Modern casino-themed textures with metallic and shiny surfaces.',
            path: 'app/assets/data/packs/Sleekslots/SleekSlots.zip'
          },
          {
            name: 'Smooth 8',
            description: 'Low-resolution 8x8 pixel art style with smooth gradients.',
            path: 'app/assets/data/packs/Smooth 8/Smooth 8 .zip'
          },
          {
            name: 'Sunset 16x',
            description: 'An intricate and smooth texture pack made for specific gamemodes.',
            path: 'app/assets/data/packs/Sunset 16x/Sunset 16x .zip'
          },
          {
            name: 'tastysoop',
            description: 'Whimsical food-themed textures with colorful and playful designs.',
            path: 'app/assets/data/packs/vaporwave/tastysoop.zip'
          }
        ];

        const availablePacks = [];
        for (const pack of presetPacks) {
          try {
            const response = await fetch(`/${pack.path}`);
            if (response.ok) {
              availablePacks.push(pack);
            }
          } catch (error) {
            console.log(`Pack not available: ${pack.name}`);
          }
        }

        return availablePacks;
      } catch (error) {
        console.error('Error loading presets:', error);
        return [];
      }
    }

    async function populatePresetsModal() {
      const container = document.getElementById('presets-container');
      container.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading presets...</div>';

      try {
        const presets = await loadAvailablePresets();

        if (presets.length === 0) {
          container.innerHTML = '<div style="text-align: center; padding: 20px; color: #777;">No preset packs available.</div>';
          return;
        }

        container.innerHTML = '';

        presets.forEach(preset => {
          const presetCard = document.createElement('div');
          presetCard.className = 'preset-card';
          presetCard.innerHTML = `
            <div style="display: flex; flex-direction: column; height: 100%; padding: 20px; background: linear-gradient(180deg, #262525 0%, #242323 100%); border: 1px solid #3a3939; border-radius: 15px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);">
              <div style="flex: 1; margin-bottom: 20px;">
                <h4 style="margin: 0 0 12px 0; color: #e8e8e8; font-size: 1.3rem;">${preset.name}</h4>
                <p style="margin: 0; color: #a0a0a0; font-size: 0.95rem; line-height: 1.5;">${preset.description}</p>
              </div>
              <button class="load-preset-btn modal-btn" style="padding: 12px; font-size: 1rem; width: 100%;">
                <i class="fas fa-download"></i> Load Pack
              </button>
            </div>
          `;

          const loadBtn = presetCard.querySelector('.load-preset-btn');
          loadBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await loadPresetPack(preset);
          });

          presetCard.addEventListener('mouseenter', () => {
            presetCard.firstElementChild.style.borderColor = '#ff6b39';
            presetCard.firstElementChild.style.boxShadow = '0 5px 15px rgba(255, 107, 57, 0.3)';
          });

          presetCard.addEventListener('mouseleave', () => {
            presetCard.firstElementChild.style.borderColor = '#3a3939';
            presetCard.firstElementChild.style.boxShadow = 'none';
          });

          container.appendChild(presetCard);
        });

      } catch (error) {
        console.error('Error populating presets:', error);
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #ff6b6b;">Failed to load presets.</div>';
      }
    }

    async function loadPresetPack(preset) {
      try {
        const loadBtn = document.querySelector(`[data-preset-path="${preset.path}"]`) ||
                       document.querySelector('.load-preset-btn:not(.loading)');
        if (loadBtn) {
          loadBtn.classList.add('loading');
          loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        }

        console.log(`Loading preset pack: ${preset.name} from ${preset.path}`);

        const response = await fetch(`/${preset.path}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch zip file: ${response.status} ${response.statusText}`);
        }

        const zipData = await response.arrayBuffer();

        const zip = new JSZip();
        const zipContent = await zip.loadAsync(zipData);

        const pngFiles = [];
        for (const [filename, file] of Object.entries(zipContent.files)) {
          if (filename.toLowerCase().endsWith('.png') &&
              !file.dir &&
              filename.toLowerCase().includes('textures')) {
            pngFiles.push({ filename, file });
          }
        }

        if (pngFiles.length === 0) {
          for (const [filename, file] of Object.entries(zipContent.files)) {
            if (filename.toLowerCase().endsWith('.png') && !file.dir) {
              pngFiles.push({ filename, file });
            }
          }
        }

        if (pngFiles.length === 0) {
          throw new Error('No PNG files found in the texture pack');
        }

        let loadedCount = 0;
        for (const { filename, file } of pngFiles) {
          try {
            const imageData = await file.async('arraybuffer');
            const blob = new Blob([imageData], { type: 'image/png' });
            const imageUrl = URL.createObjectURL(blob);

            const img = new Image();
            img.onload = () => {
              const displayName = filename.split('/').pop() || filename;
              addFileToList(displayName, img);
              loadedCount++;
              URL.revokeObjectURL(imageUrl);

              if (loadedCount === pngFiles.length) {
                const presetsModalContent = presetsModal.querySelector('.modal-content');
                presetsModal.classList.add('hiding');
                presetsModalContent.classList.add('hiding');

                setTimeout(() => {
                  presetsModal.style.display = 'none';
                  presetsModal.classList.remove('hiding');
                  presetsModalContent.classList.remove('hiding');
                }, 300);
                alert(`Successfully loaded ${preset.name} (${pngFiles.length} textures)`);
              }
            };

            img.onerror = () => {
              console.error(`Failed to load image: ${filename}`);
              URL.revokeObjectURL(imageUrl);
              loadedCount++;
            };

            img.src = imageUrl;

          } catch (fileError) {
            console.error(`Error processing file ${filename}:`, fileError);
            loadedCount++;
          }
        }

        if (loadedCount === 0) {
          throw new Error('Failed to load any textures from the pack');
        }

      } catch (error) {
        console.error('Error loading preset pack:', error);
        alert(`Failed to load preset pack: ${error.message}`);

        const presetsModalContent = presetsModal.querySelector('.modal-content');
        presetsModal.classList.add('hiding');
        presetsModalContent.classList.add('hiding');

        setTimeout(() => {
          presetsModal.style.display = 'none';
          presetsModal.classList.remove('hiding');
          presetsModalContent.classList.remove('hiding');
        }, 300);
      } finally {
        const loadBtns = document.querySelectorAll('.load-preset-btn.loading');
        loadBtns.forEach(btn => {
          btn.classList.remove('loading');
          btn.innerHTML = '<i class="fas fa-download"></i> Load Pack';
        });
      }
    }



    const palettesModal = document.getElementById('palettes-modal');
    const presetPalettesBtn = document.getElementById('preset-palettes-btn');
    const closePalettesBtn = document.getElementById('close-palettes-btn');

    const presetsModal = document.getElementById('presets-modal');
    const closePresetsBtn = document.getElementById('close-presets-btn');

    presetPalettesBtn.addEventListener('click', () => {
      populatePalettesModal();
      const palettesModalContent = palettesModal.querySelector('.modal-content');

      palettesModal.style.display = 'flex';
      void palettesModal.offsetWidth;
      palettesModal.classList.remove('hiding');
      palettesModalContent.classList.remove('hiding');
    });

    closePalettesBtn.addEventListener('click', () => {
      const palettesModalContent = palettesModal.querySelector('.modal-content');
      palettesModal.classList.add('hiding');
      palettesModalContent.classList.add('hiding');

      setTimeout(() => {
        palettesModal.style.display = 'none';
        palettesModal.classList.remove('hiding');
        palettesModalContent.classList.remove('hiding');
      }, 300);
    });

    palettesModal.addEventListener('click', (e) => {
      if (e.target === palettesModal) {
        const palettesModalContent = palettesModal.querySelector('.modal-content');
        palettesModal.classList.add('hiding');
        palettesModalContent.classList.add('hiding');

        setTimeout(() => {
          palettesModal.style.display = 'none';
          palettesModal.classList.remove('hiding');
          palettesModalContent.classList.remove('hiding');
        }, 300);
      }
    });

    presetsBtn.addEventListener('click', async () => {
      const originalHTML = presetsBtn.innerHTML;
      presetsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading Presets...';
      presetsBtn.disabled = true;
      presetsBtn.style.opacity = '0.7';

      try {
        await populatePresetsModal();
        const presetsModalContent = presetsModal.querySelector('.modal-content');

        presetsModal.style.display = 'flex';
        void presetsModal.offsetWidth;
        presetsModal.classList.remove('hiding');
        presetsModalContent.classList.remove('hiding');
      } catch (error) {
        console.error('Error loading presets:', error);
        alert('Failed to load presets. Please try again.');
      } finally {
        presetsBtn.innerHTML = originalHTML;
        presetsBtn.disabled = false;
        presetsBtn.style.opacity = '1';
      }
    });

    closePresetsBtn.addEventListener('click', () => {
      const presetsModalContent = presetsModal.querySelector('.modal-content');
      presetsModal.classList.add('hiding');
      presetsModalContent.classList.add('hiding');

      setTimeout(() => {
        presetsModal.style.display = 'none';
        presetsModal.classList.remove('hiding');
        presetsModalContent.classList.remove('hiding');
      }, 300);
    });

    presetsModal.addEventListener('click', (e) => {
      if (e.target === presetsModal) {
        const presetsModalContent = presetsModal.querySelector('.modal-content');
        presetsModal.classList.add('hiding');
        presetsModalContent.classList.add('hiding');

        setTimeout(() => {
          presetsModal.style.display = 'none';
          presetsModal.classList.remove('hiding');
          presetsModalContent.classList.remove('hiding');
        }, 300);
      }
    });

    saveCurrentBtn.addEventListener('click', () => {
      saveCurrentTexture();
      const saveModalContent = saveModal.querySelector('.modal-content');
      saveModal.classList.add('hiding');
      saveModalContent.classList.add('hiding');

      setTimeout(() => {
        saveModal.style.display = 'none';
        saveModal.classList.remove('hiding');
        saveModalContent.classList.remove('hiding');
      }, 300);
    });

    saveAllBtn.addEventListener('click', () => {
      saveAllEditedTextures();
      const saveModalContent = saveModal.querySelector('.modal-content');
      saveModal.classList.add('hiding');
      saveModalContent.classList.add('hiding');

      setTimeout(() => {
        saveModal.style.display = 'none';
        saveModal.classList.remove('hiding');
        saveModalContent.classList.remove('hiding');
      }, 300);
    });

    closeModalBtn.addEventListener('click', () => {
      const saveModalContent = saveModal.querySelector('.modal-content');
      saveModal.classList.add('hiding');
      saveModalContent.classList.add('hiding');

      setTimeout(() => {
        saveModal.style.display = 'none';
        saveModal.classList.remove('hiding');
        saveModalContent.classList.remove('hiding');
      }, 300);
    });

    saveModal.addEventListener('click', (e) => {
      if (e.target === saveModal) {
        const saveModalContent = saveModal.querySelector('.modal-content');
        saveModal.classList.add('hiding');
        saveModalContent.classList.add('hiding');

        setTimeout(() => {
          saveModal.style.display = 'none';
          saveModal.classList.remove('hiding');
          saveModalContent.classList.remove('hiding');
        }, 300);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();

        if (saveModal.style.display === 'flex') {
          const saveModalContent = saveModal.querySelector('.modal-content');
          saveModal.classList.add('hiding');
          saveModalContent.classList.add('hiding');

          setTimeout(() => {
            saveModal.style.display = 'none';
            saveModal.classList.remove('hiding');
            saveModalContent.classList.remove('hiding');
          }, 300);
          return;
        }

        if (palettesModal.style.display === 'flex') {
          const palettesModalContent = palettesModal.querySelector('.modal-content');
          palettesModal.classList.add('hiding');
          palettesModalContent.classList.add('hiding');

          setTimeout(() => {
            palettesModal.style.display = 'none';
            palettesModal.classList.remove('hiding');
            palettesModalContent.classList.remove('hiding');
          }, 300);
          return;
        }

        if (presetsModal.style.display === 'flex') {
          const presetsModalContent = presetsModal.querySelector('.modal-content');
          presetsModal.classList.add('hiding');
          presetsModalContent.classList.add('hiding');

          setTimeout(() => {
            presetsModal.style.display = 'none';
            presetsModal.classList.remove('hiding');
            presetsModalContent.classList.remove('hiding');
          }, 300);
          return;
        }

        if (effectsModal.style.display === 'flex') {
          const effectsModalContent = effectsModal.querySelector('.modal-content');
          effectsModal.classList.add('hiding');
          effectsModalContent.classList.add('hiding');

          setTimeout(() => {
            effectsModal.style.display = 'none';
            effectsModal.classList.remove('hiding');
            effectsModalContent.classList.remove('hiding');
          }, 300);
          return;
        }

        window.FacetTools.close();
      }
    });

    function resetEffectSliders() {
      saturationSlider.value = 0;
      brightnessSlider.value = 0;
      contrastSlider.value = 0;
      saturationValue.textContent = '0%';
      brightnessValue.textContent = '0%';
      contrastValue.textContent = '0%';
      applyTarget.value = 'current';

      if (previewVisible) {
        updatePreview();
      }
    }

    function applyTextureEffects() {
      const saturation = parseInt(saturationSlider.value);
      const brightness = parseInt(brightnessSlider.value);
      const contrast = parseInt(contrastSlider.value);
      const target = applyTarget.value;

      if (saturation === 0 && brightness === 0 && contrast === 0) {
        alert('No effects to apply. Please adjust the sliders.');
        return;
      }

      let count = 0;

      if (target === 'current') {
        if (currentFileName) {
          applyEffectsToTexture(currentFileName, saturation, brightness, contrast);
          count = 1;
          alert(`Applied effects to current texture: ${currentFileName}`);
        } else {
          alert('No current texture selected. Please load a texture first.');
          return;
        }
      } else if (target === 'all') {
        const textureFiles = Array.from(fileList.children).map(li => li.textContent);
        console.log('All texture files:', textureFiles);
        console.log('File list children count:', fileList.children.length);

        if (textureFiles.length === 0) {
          alert('No textures loaded. Please upload textures first.');
          return;
        }

        textureFiles.forEach(filename => {
          console.log(`Processing file: ${filename}`);
          applyEffectsToTexture(filename, saturation, brightness, contrast);
          count++;
        });

        alert(`Applied effects to ${count} textures`);
      }

      effectsModal.classList.add('hiding');
      effectsModalContent.classList.add('hiding');

      setTimeout(() => {
        effectsModal.style.display = 'none';
        effectsModal.classList.remove('hiding');
        effectsModalContent.classList.remove('hiding');
      }, 300);
    }

    function applyEffectsToTexture(filename, saturation, brightness, contrast) {
      console.log(`Processing texture: ${filename}`);

      let imageData = null;

      if (filename === currentFileName && currentImage) {
        console.log(`Using current image data for: ${filename}`);
        imageData = currentImage;
      }
      else if (editedTextures[filename]) {
        console.log(`Using edited texture data for: ${filename}`);
        imageData = editedTextures[filename].data;
      }
      else {
        console.log(`Looking for stored image for: ${filename}`);
        const textureItem = Array.from(fileList.children).find(li => li.textContent === filename);
        if (textureItem && textureItem.textureImage) {
          console.log(`Found stored image for: ${filename}`);
          const img = textureItem.textureImage;
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          imageData = ctx.getImageData(0, 0, img.width, img.height);
        } else {
          console.warn(`Could not find image data for ${filename}`);
          console.log('Available file list items:', Array.from(fileList.children).map(li => li.textContent));
          console.log('Texture item found:', !!textureItem);
          console.log('Texture image stored:', textureItem ? !!textureItem.textureImage : 'N/A');
          return;
        }
      }

      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        let a = data[i + 3];

        if (a > 0) {
          if (brightness !== 0) {
            const brightnessValue = 255 * (brightness / 100);
            r = Math.min(255, Math.max(0, r + brightnessValue));
            g = Math.min(255, Math.max(0, g + brightnessValue));
            b = Math.min(255, Math.max(0, b + brightnessValue));
          }

          if (contrast !== 0) {
            const contrastValue = contrast / 100;
            const factor = (259 * (contrastValue * 255 + 255)) / (255 * (259 - contrastValue * 255));
            r = Math.min(255, Math.max(0, factor * (r - 128) + 128));
            g = Math.min(255, Math.max(0, factor * (g - 128) + 128));
            b = Math.min(255, Math.max(0, factor * (b - 128) + 128));
          }

          if (saturation !== 0) {
            const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
            const saturationFactor = 1 + (saturation / 100);
            r = Math.min(255, Math.max(0, gray + saturationFactor * (r - gray)));
            g = Math.min(255, Math.max(0, gray + saturationFactor * (g - gray)));
            b = Math.min(255, Math.max(0, gray + saturationFactor * (b - gray)));
          }
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }

      if (filename === currentFileName) {
        currentImage = new ImageData(new Uint8ClampedArray(data), imageData.width, imageData.height);
        drawTexture(currentImage);
        editedTextures[filename] = {
          data: currentImage,
          size: imageData.width
        };
      } else {
        editedTextures[filename] = {
          data: new ImageData(new Uint8ClampedArray(data), imageData.width, imageData.height),
          size: imageData.width
        };
      }

      modifiedTextures.add(filename);
      updateFileListDisplay();

      console.log(`Applied effects to ${filename}:`, {
        saturation: saturation + '%',
        brightness: brightness + '%',
        contrast: contrast + '%'
      });
    }

    function initializePreview() {
      if (!currentImage) {
        previewCtx.fillStyle = '#2c2b2b';
        previewCtx.fillRect(0, 0, 128, 128);
        previewCtx.fillStyle = '#ff6b39';
        previewCtx.fillRect(32, 32, 64, 64);
        return;
      }

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = currentImage.width;
      tempCanvas.height = currentImage.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.putImageData(currentImage, 0, 0);

      previewCtx.clearRect(0, 0, 128, 128);
      previewCtx.imageSmoothingEnabled = false;
      previewCtx.drawImage(tempCanvas, 0, 0, currentImage.width, currentImage.height, 0, 0, 128, 128);

      previewImageData = previewCtx.getImageData(0, 0, 128, 128);
      updatePreview();
    }

    function updatePreview() {
      if (!previewImageData) return;

      const saturation = parseInt(saturationSlider.value) / 100;
      const brightness = parseInt(brightnessSlider.value) / 100;
      const contrast = parseInt(contrastSlider.value) / 100;

      const imageData = new ImageData(
        new Uint8ClampedArray(previewImageData.data),
        previewImageData.width,
        previewImageData.height
      );

      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        let a = data[i + 3];

        if (a > 0) {

          if (brightness !== 0) {
            r = Math.min(255, Math.max(0, r + (255 * brightness)));
            g = Math.min(255, Math.max(0, g + (255 * brightness)));
            b = Math.min(255, Math.max(0, b + (255 * brightness)));
          }

          if (contrast !== 0) {
            const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
            r = Math.min(255, Math.max(0, factor * (r - 128) + 128));
            g = Math.min(255, Math.max(0, factor * (g - 128) + 128));
            b = Math.min(255, Math.max(0, factor * (b - 128) + 128));
          }

          if (saturation !== 0) {
            const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;

            const saturationFactor = 1 + saturation;
            r = Math.min(255, Math.max(0, gray + saturationFactor * (r - gray)));
            g = Math.min(255, Math.max(0, gray + saturationFactor * (g - gray)));
            b = Math.min(255, Math.max(0, gray + saturationFactor * (b - gray)));
          }
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }

      previewCtx.putImageData(imageData, 0, 0);
    }

    init();

  })();



})();
