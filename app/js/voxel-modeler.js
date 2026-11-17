(function(){
'use strict';
const __realDoc = window.document;
const __root = __realDoc.getElementById('tool-voxel-modeler');
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

    class VoxelModeler {
      constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.voxelGrid = null;
        this.currentColor = '#ff6b39';
        this.currentTool = 'paint';
        this.gridSize = 16;
        this.voxelSize = 1;
        this.voxels = new Map();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.cursorPosition = new THREE.Vector3(0, 0, 0);
        this.cursorMesh = null;
        this.isCursorVisible = true;

        this.selectedVoxel = null;


        this.history = [];
        this.maxHistory = 50;

        this.init();
        this.setupEventListeners();
        this.createCursor();
        this.animate();
      }

      init() {
        const canvas = document.getElementById('voxelCanvas');

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);

        this.camera = new THREE.PerspectiveCamera(
          75,
          canvas.clientWidth / canvas.clientHeight,
          0.1,
          1000
        );
        this.camera.position.set(this.gridSize, this.gridSize, this.gridSize);

        this.renderer = new THREE.WebGLRenderer({
          canvas: canvas,
          antialias: true
        });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 15);
        this.scene.add(directionalLight);

        this.createGridHelper();

        window.addEventListener('resize', () => this.onWindowResize());
      }

      createGridHelper() {
        if (this.gridHelper) {
          this.scene.remove(this.gridHelper);
        }

        const size = this.gridSize;
        const divisions = this.gridSize;

        this.gridHelper = new THREE.GridHelper(size, divisions, 0x444444, 0x222222);
        this.gridHelper.position.y = -0.5;

        const offset = (this.voxelSize / 2);
        this.gridHelper.position.x = offset;
        this.gridHelper.position.z = offset;

        this.scene.add(this.gridHelper);
      }

      createCursor() {
        const geometry = new THREE.BoxGeometry(this.voxelSize * 0.9, this.voxelSize * 0.9, this.voxelSize * 0.9);
        const material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          wireframe: true,
          transparent: true,
          opacity: 0.7
        });
        this.cursorMesh = new THREE.Mesh(geometry, material);
        this.cursorMesh.visible = this.isCursorVisible;
        this.scene.add(this.cursorMesh);
        this.updateCursorPosition();
      }

      updateCursorPosition() {
        if (this.cursorMesh) {
          this.cursorMesh.position.copy(this.cursorPosition);
          this.cursorMesh.material.color.setStyle(this.currentColor);
        }
      }

      setupEventListeners() {
        const canvas = this.renderer.domElement;

        document.addEventListener('keydown', (event) => this.onKeyDown(event));

        canvas.addEventListener('contextmenu', (event) => event.preventDefault());

        document.querySelectorAll('.size-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.changeGridSize(parseInt(btn.dataset.size));
          });
        });

        document.querySelectorAll('.color-option').forEach(option => {
          option.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            this.currentColor = option.dataset.color;
            this.updateCursorPosition();
          });
        });

        document.getElementById('addColorBtn').addEventListener('click', () => {
          this.openColorModal();
        });

        document.querySelectorAll('.tool-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.currentTool = btn.dataset.tool;
            document.getElementById('currentTool').textContent =
              btn.dataset.tool.charAt(0).toUpperCase() + btn.dataset.tool.slice(1);
          });
        });

        document.getElementById('exportBtn').addEventListener('click', () => this.exportModel());

        document.querySelectorAll('.control-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            this.handleControlButton(action);
          });
        });

        const confirmBtn = document.getElementById('confirmColorBtn');
        const cancelBtn = document.getElementById('cancelColorBtn');
        const modalColorPicker = document.getElementById('modalColorPicker');
        const hexCodeInput = document.getElementById('hexCodeInput');
        const modal = document.getElementById('colorModal');

        confirmBtn.addEventListener('click', () => {
          this.addCustomColorFromModal();
        });

        cancelBtn.addEventListener('click', () => {
          this.closeColorModal();
        });

        modalColorPicker.addEventListener('input', (e) => {
          const color = e.target.value;
          hexCodeInput.value = color.toUpperCase();
          this.updateColorPreview(color);
        });

        hexCodeInput.addEventListener('input', (e) => {
          let value = e.target.value.trim().toUpperCase();

          if (value && !value.startsWith('#')) {
            value = '#' + value;
            e.target.value = value;
          }

          if (/^#([A-F0-9]{6}|[A-F0-9]{3})$/.test(value)) {
            modalColorPicker.value = value.toLowerCase();
            this.updateColorPreview(value.toLowerCase());
          }
        });

        hexCodeInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.addCustomColorFromModal();
          }
        });

        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            this.closeColorModal();
          }
        });
      }

      changeGridSize(newSize) {
        this.gridSize = newSize;
        this.voxels.clear();
        this.updateStats();
        this.createGridHelper();
        this.cursorPosition.set(0, 0, 0);
        this.updateCursorPosition();
        this.camera.position.set(newSize, newSize, newSize);
        document.getElementById('currentSize').textContent = `${newSize}×${newSize}`;
      }

      onKeyDown(event) {
        const moveAmount = this.voxelSize;
        const halfGrid = this.gridSize / 2 - this.voxelSize / 2;

        const cameraForward = new THREE.Vector3();
        const cameraRight = new THREE.Vector3();

        this.camera.getWorldDirection(cameraForward);
        cameraForward.y = 0;
        cameraForward.normalize();

        cameraRight.crossVectors(cameraForward, new THREE.Vector3(0, 1, 0));

        switch(event.key) {
          case 'ArrowUp':
            const forwardStep = cameraForward.clone().multiplyScalar(moveAmount);
            const targetPosForward = this.cursorPosition.clone().add(forwardStep);

            const snappedForwardX = Math.round(targetPosForward.x / this.voxelSize) * this.voxelSize;
            const snappedForwardZ = Math.round(targetPosForward.z / this.voxelSize) * this.voxelSize;

            if ((snappedForwardX !== this.cursorPosition.x || snappedForwardZ !== this.cursorPosition.z) &&
                Math.abs(snappedForwardX) <= halfGrid && Math.abs(snappedForwardZ) <= halfGrid) {
              this.cursorPosition.x = snappedForwardX;
              this.cursorPosition.z = snappedForwardZ;
            }

            event.preventDefault();
            break;
          case 'ArrowDown':
            const backwardStep = cameraForward.clone().multiplyScalar(moveAmount);
            const targetPosBackward = this.cursorPosition.clone().sub(backwardStep);

            const snappedBackwardX = Math.round(targetPosBackward.x / this.voxelSize) * this.voxelSize;
            const snappedBackwardZ = Math.round(targetPosBackward.z / this.voxelSize) * this.voxelSize;

            if ((snappedBackwardX !== this.cursorPosition.x || snappedBackwardZ !== this.cursorPosition.z) &&
                Math.abs(snappedBackwardX) <= halfGrid && Math.abs(snappedBackwardZ) <= halfGrid) {
              this.cursorPosition.x = snappedBackwardX;
              this.cursorPosition.z = snappedBackwardZ;
            }
            event.preventDefault();
            break;
          case 'ArrowLeft':
            const leftStep = cameraRight.clone().multiplyScalar(moveAmount);
            const targetPosLeft = this.cursorPosition.clone().sub(leftStep);

            const snappedLeftX = Math.round(targetPosLeft.x / this.voxelSize) * this.voxelSize;
            const snappedLeftZ = Math.round(targetPosLeft.z / this.voxelSize) * this.voxelSize;

            if ((snappedLeftX !== this.cursorPosition.x || snappedLeftZ !== this.cursorPosition.z) &&
                Math.abs(snappedLeftX) <= halfGrid && Math.abs(snappedLeftZ) <= halfGrid) {
              this.cursorPosition.x = snappedLeftX;
              this.cursorPosition.z = snappedLeftZ;
            }
            event.preventDefault();
            break;
          case 'ArrowRight':
            const rightStep = cameraRight.clone().multiplyScalar(moveAmount);
            const targetPosRight = this.cursorPosition.clone().add(rightStep);

            const snappedRightX = Math.round(targetPosRight.x / this.voxelSize) * this.voxelSize;
            const snappedRightZ = Math.round(targetPosRight.z / this.voxelSize) * this.voxelSize;

            if ((snappedRightX !== this.cursorPosition.x || snappedRightZ !== this.cursorPosition.z) &&
                Math.abs(snappedRightX) <= halfGrid && Math.abs(snappedRightZ) <= halfGrid) {
              this.cursorPosition.x = snappedRightX;
              this.cursorPosition.z = snappedRightZ;
            }
            event.preventDefault();
            break;
          case 'PageUp':
          case 'w':
          case 'W':
            if (this.cursorPosition.y < halfGrid) {
              this.cursorPosition.y += moveAmount;
            }
            event.preventDefault();
            break;
          case 'PageDown':
          case 's':
          case 'S':
            if (this.cursorPosition.y > -halfGrid) {
              this.cursorPosition.y -= moveAmount;
            }
            event.preventDefault();
            break;
          case ' ':
            if (event.shiftKey) {
              this.eraseVoxelAtCursor();
            } else {
              switch(this.currentTool) {
                case 'paint':
                  this.saveState();
                  this.placeVoxelAtCursor();
                  break;
                case 'erase':
                  this.saveState();
                  this.eraseVoxelAtCursor();
                  break;
                case 'fill':
                  this.saveState();
                  this.fillFromCursor();
                  break;
                case 'undo':
                  this.undo();
                  break;
              }
            }
            event.preventDefault();
            break;
          case 'b':
          case 'B':
            this.moveSelectedVoxel(0, moveAmount, 0);
            event.preventDefault();
            break;
          case 'v':
          case 'V':
            this.moveSelectedVoxel(0, -moveAmount, 0);
            event.preventDefault();
            break;
        }

        this.updateCursorPosition();
        this.updateCompass();
      }

      handleControlButton(action) {
        const moveAmount = this.voxelSize;
        const halfGrid = this.gridSize / 2 - this.voxelSize / 2;

        const cameraForward = new THREE.Vector3();
        const cameraRight = new THREE.Vector3();

        this.camera.getWorldDirection(cameraForward);
        cameraForward.y = 0;
        cameraForward.normalize();

        cameraRight.crossVectors(cameraForward, new THREE.Vector3(0, 1, 0));

        switch(action) {
          case 'up':
            const forwardStep = cameraForward.clone().multiplyScalar(moveAmount);
            const targetPosForward = this.cursorPosition.clone().add(forwardStep);
            const snappedForwardX = Math.round(targetPosForward.x / this.voxelSize) * this.voxelSize;
            const snappedForwardZ = Math.round(targetPosForward.z / this.voxelSize) * this.voxelSize;
            if ((snappedForwardX !== this.cursorPosition.x || snappedForwardZ !== this.cursorPosition.z) &&
                Math.abs(snappedForwardX) <= halfGrid && Math.abs(snappedForwardZ) <= halfGrid) {
              this.cursorPosition.x = snappedForwardX;
              this.cursorPosition.z = snappedForwardZ;
            }
            break;

          case 'down':
            const backwardStep = cameraForward.clone().multiplyScalar(moveAmount);
            const targetPosBackward = this.cursorPosition.clone().sub(backwardStep);
            const snappedBackwardX = Math.round(targetPosBackward.x / this.voxelSize) * this.voxelSize;
            const snappedBackwardZ = Math.round(targetPosBackward.z / this.voxelSize) * this.voxelSize;
            if ((snappedBackwardX !== this.cursorPosition.x || snappedBackwardZ !== this.cursorPosition.z) &&
                Math.abs(snappedBackwardX) <= halfGrid && Math.abs(snappedBackwardZ) <= halfGrid) {
              this.cursorPosition.x = snappedBackwardX;
              this.cursorPosition.z = snappedBackwardZ;
            }
            break;

          case 'left':
            const leftStep = cameraRight.clone().multiplyScalar(moveAmount);
            const targetPosLeft = this.cursorPosition.clone().sub(leftStep);
            const snappedLeftX = Math.round(targetPosLeft.x / this.voxelSize) * this.voxelSize;
            const snappedLeftZ = Math.round(targetPosLeft.z / this.voxelSize) * this.voxelSize;
            if ((snappedLeftX !== this.cursorPosition.x || snappedLeftZ !== this.cursorPosition.z) &&
                Math.abs(snappedLeftX) <= halfGrid && Math.abs(snappedLeftZ) <= halfGrid) {
              this.cursorPosition.x = snappedLeftX;
              this.cursorPosition.z = snappedLeftZ;
            }
            break;

          case 'right':
            const rightStep = cameraRight.clone().multiplyScalar(moveAmount);
            const targetPosRight = this.cursorPosition.clone().add(rightStep);
            const snappedRightX = Math.round(targetPosRight.x / this.voxelSize) * this.voxelSize;
            const snappedRightZ = Math.round(targetPosRight.z / this.voxelSize) * this.voxelSize;
            if ((snappedRightX !== this.cursorPosition.x || snappedRightZ !== this.cursorPosition.z) &&
                Math.abs(snappedRightX) <= halfGrid && Math.abs(snappedRightZ) <= halfGrid) {
              this.cursorPosition.x = snappedRightX;
              this.cursorPosition.z = snappedRightZ;
            }
            break;

          case 'pgup':
            if (this.cursorPosition.y < halfGrid) {
              this.cursorPosition.y += moveAmount;
            }
            break;

          case 'pgdown':
            if (this.cursorPosition.y > -halfGrid) {
              this.cursorPosition.y -= moveAmount;
            }
            break;
        }

        this.updateCursorPosition();
        this.updateCompass();
      }

      placeVoxelAtCursor() {
        const x = this.cursorPosition.x;
        const y = this.cursorPosition.y;
        const z = this.cursorPosition.z;
        const key = `${x},${y},${z}`;

        if (this.voxels.has(key)) {
          this.scene.remove(this.voxels.get(key));
          this.voxels.delete(key);
        }

        const geometry = new THREE.BoxGeometry(this.voxelSize, this.voxelSize, this.voxelSize);
        const material = new THREE.MeshLambertMaterial({
          color: new THREE.Color(this.currentColor)
        });
        const voxel = new THREE.Mesh(geometry, material);

        voxel.position.set(x, y, z);
        voxel.userData = { x, y, z, color: this.currentColor };

        this.scene.add(voxel);
        this.voxels.set(key, voxel);

        this.updateStats();
      }

      eraseVoxelAtCursor() {
        const x = this.cursorPosition.x;
        const y = this.cursorPosition.y;
        const z = this.cursorPosition.z;
        const key = `${x},${y},${z}`;

        if (this.voxels.has(key)) {
          this.scene.remove(this.voxels.get(key));
          this.voxels.delete(key);
          this.updateStats();
        }
      }

      fillFromCursor() {
        const x = this.cursorPosition.x;
        const y = this.cursorPosition.y;
        const z = this.cursorPosition.z;
        const key = `${x},${y},${z}`;


        if (!this.voxels.has(key)) {

          this.floodFill(x, y, z);
          return;
        }


        const clickedVoxel = this.voxels.get(key);
        const targetColor = clickedVoxel.userData.color;


        if (targetColor === this.currentColor) {
          console.log("Voxel is already the selected color");
          return;
        }


        this.replaceConnectedVoxels(x, y, z, targetColor);
      }

      floodFill(startX, startY, startZ) {
        const queue = [[startX, startY, startZ]];
        const visited = new Set();

        while (queue.length > 0 && this.voxels.size < this.gridSize * this.gridSize * this.gridSize) {
          const [x, y, z] = queue.shift();
          const key = `${x},${y},${z}`;

          if (visited.has(key) || this.voxels.has(key)) continue;

          const halfGrid = this.gridSize / 2;
          if (Math.abs(x) > halfGrid || Math.abs(y) > halfGrid || Math.abs(z) > halfGrid) continue;

          visited.add(key);

          const geometry = new THREE.BoxGeometry(this.voxelSize, this.voxelSize, this.voxelSize);
          const material = new THREE.MeshLambertMaterial({
            color: new THREE.Color(this.currentColor)
          });
          const voxel = new THREE.Mesh(geometry, material);

          voxel.position.set(x, y, z);
          voxel.userData = { x, y, z, color: this.currentColor };

          this.scene.add(voxel);
          this.voxels.set(key, voxel);

          queue.push(
            [x + this.voxelSize, y, z],
            [x - this.voxelSize, y, z],
            [x, y + this.voxelSize, z],
            [x, y - this.voxelSize, z],
            [x, y, z + this.voxelSize],
            [x, y, z - this.voxelSize]
          );
        }

        this.updateStats();
      }

      selectVoxelAtCursor() {
        if (this.selectedVoxel) {
          this.deselectVoxel();
        }

        const x = this.cursorPosition.x;
        const y = this.cursorPosition.y;
        const z = this.cursorPosition.z;
        const key = `${x},${y},${z}`;

        if (this.voxels.has(key)) {
          this.selectedVoxel = this.voxels.get(key);

          if (!this.selectedVoxel.userData.originalColor) {
            this.selectedVoxel.userData.originalColor = this.selectedVoxel.material.color.getHex();
          }

          this.selectedVoxel.material.color.setHex(0xffff00);
          this.selectedVoxel.material.emissive.setHex(0x333300);

          console.log(`Selected voxel at ${key}`);
        } else {
          this.selectedVoxel = null;
          console.log("No voxel at cursor position");
        }
      }

      deselectVoxel() {
        if (this.selectedVoxel) {
          if (this.selectedVoxel.userData.originalColor !== undefined) {
            this.selectedVoxel.material.color.setHex(this.selectedVoxel.userData.originalColor);
            this.selectedVoxel.material.emissive.setHex(0x000000);
          }
          this.selectedVoxel = null;
        }
      }

      moveSelectedVoxel(deltaX, deltaY, deltaZ) {
        if (!this.selectedVoxel) {
          console.log("No voxel selected to move");
          return;
        }

        const newX = this.selectedVoxel.position.x + deltaX;
        const newY = this.selectedVoxel.position.y + deltaY;
        const newZ = this.selectedVoxel.position.z + deltaZ;

        const halfGrid = this.gridSize / 2;
        if (Math.abs(newX) > halfGrid || Math.abs(newY) > halfGrid || Math.abs(newZ) > halfGrid) {
          console.log("Movement would be out of bounds");
          return;
        }

        const newKey = `${newX},${newY},${newZ}`;
        if (this.voxels.has(newKey)) {
          console.log("Target position already occupied");
          return;
        }

        const oldKey = `${this.selectedVoxel.userData.x},${this.selectedVoxel.userData.y},${this.selectedVoxel.userData.z}`;
        this.voxels.delete(oldKey);

        this.selectedVoxel.position.set(newX, newY, newZ);
        this.selectedVoxel.userData.x = newX;
        this.selectedVoxel.userData.y = newY;
        this.selectedVoxel.userData.z = newZ;

        this.voxels.set(newKey, this.selectedVoxel);

        console.log(`Moved voxel from ${oldKey} to ${newKey}`);
      }


      updateStats() {
        document.getElementById('voxelCount').textContent = this.voxels.size;
      }

      updateCompass() {
      }


      saveState() {

        const state = {
          voxels: new Map(),
          timestamp: Date.now()
        };


        this.voxels.forEach((voxel, key) => {
          const clonedVoxel = voxel.clone();
          clonedVoxel.userData = { ...voxel.userData };
          state.voxels.set(key, clonedVoxel);
        });


        this.history.push(state);


        if (this.history.length > this.maxHistory) {
          this.history.shift();
        }
      }

      undo() {
        if (this.history.length === 0) {
          console.log("Nothing to undo");
          return;
        }


        const prevState = this.history.pop();


        this.voxels.forEach(voxel => {
          this.scene.remove(voxel);
        });
        this.voxels.clear();


        prevState.voxels.forEach((voxel, key) => {
          this.scene.add(voxel);
          this.voxels.set(key, voxel);
        });

        this.updateStats();
        console.log(`Undid to state from ${new Date(prevState.timestamp).toLocaleTimeString()}`);
      }

      addCustomColor() {
        const colorPicker = document.getElementById('customColorPicker');
        const newColor = colorPicker.value;

        const existingColors = Array.from(document.querySelectorAll('.color-option')).map(el => el.dataset.color);
        if (existingColors.includes(newColor)) {
          alert('This color already exists!');
          return;
        }

        const colorPickerContainer = document.querySelector('.color-picker');
        const newColorOption = document.createElement('div');
        newColorOption.className = 'color-option';
        newColorOption.style.backgroundColor = newColor;
        newColorOption.dataset.color = newColor;

        newColorOption.addEventListener('click', () => {
          document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
          newColorOption.classList.add('selected');
          this.currentColor = newColor;
          this.updateCursorPosition();
        });

        colorPickerContainer.appendChild(newColorOption);

        document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
        newColorOption.classList.add('selected');
        this.currentColor = newColor;
        this.updateCursorPosition();

        console.log(`Added new color: ${newColor}`);
      }

      floodFill(startX, startY, startZ) {
        const queue = [[startX, startY, startZ]];
        const visited = new Set();
        const batchSize = 50;
        let processed = 0;

        const processBatch = () => {
          let batchCount = 0;

          while (queue.length > 0 && batchCount < batchSize && this.voxels.size < this.gridSize * this.gridSize * this.gridSize) {
            const [x, y, z] = queue.shift();
            const key = `${x},${y},${z}`;

            if (visited.has(key) || this.voxels.has(key)) continue;

            const halfGrid = this.gridSize / 2;
            if (Math.abs(x) > halfGrid || Math.abs(y) > halfGrid || Math.abs(z) > halfGrid) continue;

            visited.add(key);

            const geometry = new THREE.BoxGeometry(this.voxelSize, this.voxelSize, this.voxelSize);
            const material = new THREE.MeshLambertMaterial({
              color: new THREE.Color(this.currentColor)
            });
            const voxel = new THREE.Mesh(geometry, material);

            voxel.position.set(x, y, z);
            voxel.userData = { x, y, z, color: this.currentColor };

            this.scene.add(voxel);
            this.voxels.set(key, voxel);

            queue.push(
              [x + this.voxelSize, y, z],
              [x - this.voxelSize, y, z],
              [x, y + this.voxelSize, z],
              [x, y - this.voxelSize, z],
              [x, y, z + this.voxelSize],
              [x, y, z - this.voxelSize]
            );

            batchCount++;
            processed++;
          }

          this.updateStats();

          if (queue.length > 0 && processed < 1000) {
            setTimeout(processBatch, 10);
          }
        };

        processBatch();
      }

      replaceConnectedVoxels(startX, startY, startZ, targetColor) {
        const queue = [[startX, startY, startZ]];
        const visited = new Set();
        const voxelsToReplace = [];


        while (queue.length > 0) {
          const [x, y, z] = queue.shift();
          const key = `${x},${y},${z}`;

          if (visited.has(key)) continue;
          visited.add(key);


          const halfGrid = this.gridSize / 2;
          if (Math.abs(x) > halfGrid || Math.abs(y) > halfGrid || Math.abs(z) > halfGrid) continue;


          if (this.voxels.has(key)) {
            const voxel = this.voxels.get(key);
            if (voxel.userData.color === targetColor) {
              voxelsToReplace.push({ key, voxel, x, y, z });


              queue.push(
                [x + this.voxelSize, y, z],
                [x - this.voxelSize, y, z],
                [x, y + this.voxelSize, z],
                [x, y - this.voxelSize, z],
                [x, y, z + this.voxelSize],
                [x, y, z - this.voxelSize]
              );
            }
          }
        }


        voxelsToReplace.forEach(({ key, voxel, x, y, z }) => {

          this.scene.remove(voxel);
          this.voxels.delete(key);


          const geometry = new THREE.BoxGeometry(this.voxelSize, this.voxelSize, this.voxelSize);
          const material = new THREE.MeshLambertMaterial({
            color: new THREE.Color(this.currentColor)
          });
          const newVoxel = new THREE.Mesh(geometry, material);

          newVoxel.position.set(x, y, z);
          newVoxel.userData = { x, y, z, color: this.currentColor };

          this.scene.add(newVoxel);
          this.voxels.set(key, newVoxel);
        });

        this.updateStats();
        console.log(`Replaced ${voxelsToReplace.length} voxels from ${targetColor} to ${this.currentColor}`);
      }

      openColorModal() {
        const modal = document.getElementById('colorModal');
        const colorPicker = document.getElementById('modalColorPicker');
        const hexInput = document.getElementById('hexCodeInput');

        colorPicker.value = '#ff6b39';
        hexInput.value = '#FF6B39';
        this.updateColorPreview('#ff6b39');

        modal.classList.add('active');

        setTimeout(() => hexInput.focus(), 300);
      }

      closeColorModal() {
        const modal = document.getElementById('colorModal');
        modal.classList.remove('active');
      }

      updateColorPreview(hexColor) {
        const preview = document.getElementById('modalColorPicker');
        if (preview) {
          preview.style.background = hexColor;
        }
      }

      addCustomColorFromModal() {
        const hexInput = document.getElementById('hexCodeInput');
        let newColor = hexInput.value.trim().toLowerCase();

        if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(newColor)) {
          alert('Please enter a valid hex color code (e.g., #FF6B39)');
          return;
        }

        if (newColor.length === 4) {
          newColor = '#' + newColor[1] + newColor[1] + newColor[2] + newColor[2] + newColor[3] + newColor[3];
        }

        const existingColors = Array.from(document.querySelectorAll('.color-option')).map(el => el.dataset.color);
        if (existingColors.includes(newColor)) {
          alert('This color already exists in your palette!');
          return;
        }

        const colorPickerContainer = document.querySelector('.color-picker');
        const newColorOption = document.createElement('div');
        newColorOption.className = 'color-option';
        newColorOption.style.backgroundColor = newColor;
        newColorOption.dataset.color = newColor;

        newColorOption.addEventListener('click', () => {
          document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
          newColorOption.classList.add('selected');
          this.currentColor = newColor;
          this.updateCursorPosition();
        });

        colorPickerContainer.appendChild(newColorOption);

        document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
        newColorOption.classList.add('selected');
        this.currentColor = newColor;
        this.updateCursorPosition();

        this.closeColorModal();

        console.log(`Added new color: ${newColor}`);
      }

      exportModel() {
        if (this.voxels.size === 0) {
          alert('No voxels to export!');
          return;
        }

        console.log(`Starting export of ${this.voxels.size} voxels`);


        const exportGroup = new THREE.Group();


        let successfulExports = 0;
        let failedExports = 0;


        this.voxels.forEach((originalVoxel, key) => {
          try {

            const geometry = new THREE.BoxGeometry(
              this.voxelSize,
              this.voxelSize,
              this.voxelSize
            );


            const material = new THREE.MeshLambertMaterial({
              color: originalVoxel.material.color
            });

            const newVoxel = new THREE.Mesh(geometry, material);


            newVoxel.position.copy(originalVoxel.position);


            if (originalVoxel.rotation) {
              newVoxel.rotation.copy(originalVoxel.rotation);
            }


            if (originalVoxel.scale) {
              newVoxel.scale.copy(originalVoxel.scale);
            }


            exportGroup.add(newVoxel);
            successfulExports++;

            console.log(`Exported voxel at ${key}: position=${newVoxel.position.toArray()}`);

          } catch (error) {
            console.error(`Failed to export voxel ${key}:`, error);
            failedExports++;
          }
        });

        console.log(`Export preparation complete:`);
        console.log(`  Successful: ${successfulExports}`);
        console.log(`  Failed: ${failedExports}`);
        console.log(`  Total in map: ${this.voxels.size}`);
        console.log(`  Export group children: ${exportGroup.children.length}`);

        if (exportGroup.children.length === 0) {
          alert('Error: No voxels could be prepared for export!');
          return;
        }

        if (failedExports > 0) {
          console.warn(`${failedExports} voxels failed to export`);
        }


        const exporter = new THREE.GLTFExporter();

        exporter.parse(exportGroup, (result) => {
          try {

            const blob = new Blob([result], { type: 'model/gltf-binary' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `voxel-model-${Date.now()}.glb`;


            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);


            URL.revokeObjectURL(url);

            console.log('Export completed successfully!');
            alert(`Export successful! Exported ${exportGroup.children.length} voxels.`);

          } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed: ' + error.message);
          }
        }, {
          binary: true,
          onlyVisible: false,
          truncateDrawRange: false,
          embedImages: true
        });
      }

      onWindowResize() {
        const canvas = this.renderer.domElement;
        const container = canvas.parentElement;

        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
      }

      animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
      }
    }

    window.addEventListener('load', () => {
      if (!window.__voxelStarted) {
        window.__voxelStarted = true;
        new VoxelModeler();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.FacetTools.close();
      }
    });


})();
