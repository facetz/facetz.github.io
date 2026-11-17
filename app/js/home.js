(function(){
'use strict';
const __realDoc = window.document;
const __root = __realDoc.getElementById('view-home');
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
const homeRoot = document.getElementById('view-home');



    let mediaStream = null;
    let mediaRecorder = null;
    let recordedChunks = [];

    function makeDraggable(element, header) {
      let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

      header.onmousedown = dragMouseDown;

      function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
      }

      function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
      }

      function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
      }
    }

    function createFloatingWindow(title, content, iframeOnly = false) {
      const windowId = 'window-' + Math.random().toString(36).substr(2, 9);
      const window = document.createElement('div');
      window.className = 'floating-window';
      window.id = windowId;

      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        window.style.top = '5vh';
        window.style.left = '2.5vw';
      } else {
        window.style.top = '100px';
        window.style.left = '100px';
      }


      const isIframeOnly = iframeOnly || (content.trim().startsWith('<iframe') && content.trim().endsWith('></iframe>'));
      const contentClass = isIframeOnly ? 'window-content iframe-only' : 'window-content';

      window.innerHTML = `
        <div class="window-header">
          <div class="window-title">${title}</div>
          <button class="window-close">&times;</button>
        </div>
        <div class="${contentClass}">${content}</div>
      `;

      homeRoot.appendChild(window);

      if (!isMobile) {
        const header = window.querySelector('.window-header');
        makeDraggable(window, header);
      }

      const closeBtn = window.querySelector('.window-close');
      closeBtn.addEventListener('click', () => {
        homeRoot.removeChild(window);
      });

      return window;
    }

    function createTallFloatingWindow(title, iframeSrc) {
      const windowId = 'window-' + Math.random().toString(36).substr(2, 9);
      const window = document.createElement('div');
      window.className = 'floating-window tall';
      window.id = windowId;

      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        window.style.top = '2vh';
        window.style.left = '5vw';
      } else {
        window.style.top = '50px';
        window.style.left = '200px';
      }

      const content = `<iframe src="${iframeSrc}" style="width:100%; height:100%; border:none;"></iframe>`;

      window.innerHTML = `
        <div class="window-header">
          <div class="window-title">${title}</div>
          <button class="window-close">&times;</button>
        </div>
        <div class="window-content iframe-only">${content}</div>
      `;

      homeRoot.appendChild(window);

      if (!isMobile) {
        const header = window.querySelector('.window-header');
        makeDraggable(window, header);
      }

      const closeBtn = window.querySelector('.window-close');
      closeBtn.addEventListener('click', () => {
        homeRoot.removeChild(window);
      });

      return window;
    }

    function createClipboardWindow() {
      const windowId = 'clipboard-window-' + Math.random().toString(36).substr(2, 9);
      const window = document.createElement('div');
      window.className = 'floating-window';
      window.id = windowId;
      window.style.width = '500px';
      window.style.height = '400px';

      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        window.style.top = '5vh';
        window.style.left = '2.5vw';
      } else {
        window.style.top = '100px';
        window.style.left = '100px';
      }

      const content = `
        <div style="padding: 20px; height: 100%; display: flex; flex-direction: column;">
          <h3 style="margin-top: 0; color: #e8e8e8; text-align: center; background: linear-gradient(90deg, #2e2e2e, #2a2a2a); padding: 10px; border-radius: 10px; border: 1px solid #444343;">Clipboard</h3>
          <div style="flex: 1; display: flex; flex-direction: column; gap: 15px; margin-top: 15px;">
            <div style="display: flex; gap: 10px;">
              <input type="text" id="clipboard-input" placeholder="Enter text to save" style="flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #3a3939; background: #2f2e2e; color: #e8e8e8;">
              <button id="copy-btn" style="background: linear-gradient(45deg, #ff6b39, #ff8c5a); border: none; color: white; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-weight: bold;">Save</button>
            </div>
            <div style="display: flex; gap: 10px;">
              <input type="text" id="note-input" placeholder="Add a note (optional)" style="flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #3a3939; background: #2f2e2e; color: #e8e8e8;">
            </div>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="margin: 0; color: #e8e8e8;">Clipboard History</h4>
                <button id="clear-history-btn" style="background: #2f2e2e; border: 1px solid #3a3939; color: #e8e8e8; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 0.8rem;">Clear</button>
              </div>
              <div id="clipboard-history" style="flex: 1; background: #2f2e2e; border: 1px solid #3a3939; border-radius: 8px; padding: 10px; overflow-y: auto; min-height: 150px;"></div>
            </div>
          </div>
        </div>
      `;

      window.innerHTML = `
        <div class="window-header">
          <div class="window-title">Clipboard Manager</div>
          <button class="window-close">&times;</button>
        </div>
        <div class="window-content">${content}</div>
      `;

      homeRoot.appendChild(window);

      if (!isMobile) {
        const header = window.querySelector('.window-header');
        makeDraggable(window, header);
      }

      const closeBtn = window.querySelector('.window-close');
      closeBtn.addEventListener('click', () => {
        homeRoot.removeChild(window);
      });

      initializeClipboard(window);

      return window;
    }

    function initializeClipboard(windowElement) {
      const copyBtn = windowElement.querySelector('#copy-btn');
      const clipboardInput = windowElement.querySelector('#clipboard-input');
      const noteInput = windowElement.querySelector('#note-input');
      const clipboardHistory = windowElement.querySelector('#clipboard-history');
      const clearHistoryBtn = windowElement.querySelector('#clear-history-btn');

      let clipboardItems = JSON.parse(localStorage.getItem('clipboardHistory') || '[]');

      function renderClipboardHistory() {
        clipboardHistory.innerHTML = '';
        if (clipboardItems.length === 0) {
          clipboardHistory.innerHTML = '<p style="color: #aaa; text-align: center; margin: 20px 0;">No clipboard history</p>';
          return;
        }

        clipboardItems.slice().reverse().forEach((item, index) => {
          const itemElement = document.createElement('div');
          itemElement.style.cssText = `
            background: linear-gradient(145deg, #262525, #212020);
            border: 1px solid #3a3939;
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
          `;

          const timestamp = new Date(item.timestamp).toLocaleString();
          const noteDisplay = item.note ? `<div style="font-size: 0.75rem; color: #ff8c5a; margin-top: 3px;">Note: ${item.note}</div>` : '';

          itemElement.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #e8e8e8;">${item.text}</div>
              <button class="copy-history-item" data-text="${item.text}" data-note="${item.note || ''}" style="background: linear-gradient(45deg, #ff6b39, #ff8c5a); border: none; color: white; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 0.8rem; margin-left: 10px;">Copy</button>
            </div>
            ${noteDisplay}
            <div style="font-size: 0.7rem; color: #aaa; margin-top: 5px;">${timestamp}</div>
          `;

          itemElement.addEventListener('click', (e) => {
            if (!e.target.classList.contains('copy-history-item')) {
              clipboardInput.value = item.text;
              if (item.note) {
                noteInput.value = item.note;
              }
            }
          });

          clipboardHistory.appendChild(itemElement);
        });

        windowElement.querySelectorAll('.copy-history-item').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const text = btn.getAttribute('data-text');
            const note = btn.getAttribute('data-note');
            copyToClipboard(text, note || null);
          });
        });
      }

      function copyToClipboard(text, note = null) {
        if (!text) return;

        navigator.clipboard.writeText(text).then(() => {
          const existingIndex = clipboardItems.findIndex(item => item.text === text);

          if (existingIndex !== -1) {
            const existingItem = clipboardItems[existingIndex];
            clipboardItems.splice(existingIndex, 1);
            clipboardItems.unshift(existingItem);
          } else {
            const newItem = {
              text: text,
              timestamp: new Date().toISOString()
            };

            if (note !== null) {
              newItem.note = note;
            } else if (noteInput.value.trim()) {
              newItem.note = noteInput.value.trim();
            }

            clipboardItems.unshift(newItem);
          }

          if (clipboardItems.length > 20) {
            clipboardItems = clipboardItems.slice(0, 20);
          }

          localStorage.setItem('clipboardHistory', JSON.stringify(clipboardItems));

          renderClipboardHistory();

          const originalText = copyBtn.textContent;
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.textContent = originalText;
          }, 1500);
        }).catch(err => {
          console.error('Failed to copy: ', err);
          alert('Failed to copy text to clipboard');
        });
      }

      function saveItem() {
        const text = clipboardInput.value.trim();
        const note = noteInput.value.trim();

        if (!text) {
          alert('Please enter some text to save');
          return;
        }

        clipboardItems.unshift({
          text: text,
          note: note,
          timestamp: new Date().toISOString()
        });

        if (clipboardItems.length > 20) {
          clipboardItems = clipboardItems.slice(0, 20);
        }

        localStorage.setItem('clipboardHistory', JSON.stringify(clipboardItems));

        renderClipboardHistory();

        clipboardInput.value = '';
        noteInput.value = '';

        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Saved!';
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 1500);
      }

      copyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (clipboardInput.value.trim()) {
          saveItem();
        } else {
          alert('Please enter some text to save');
        }
      });

      clearHistoryBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clipboardItems = [];
        localStorage.removeItem('clipboardHistory');
        renderClipboardHistory();
      });

      renderClipboardHistory();
    }

    document.querySelectorAll('.big-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.dataset.url;
        const iframe = document.querySelector('.fullscreen-frame');
        iframe.src = url;
        iframe.style.display = 'block';
        document.getElementById('home-main').style.display = 'none';
      });
    });

    const modal = document.getElementById('popupModal');
    const openBtn = document.getElementById('menupopBtn');
    const closeBtn = document.getElementById('close-btn');
    const metricsBtn = document.getElementById('metrics-btn');

    if (openBtn) openBtn.addEventListener('click', () => modal.style.display = 'flex');
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.style.display = 'none';
    });

    document.querySelectorAll('.modal-item').forEach(item => {
      if (item.id && item.id !== 'close-btn' && item.id !== 'record-btn' && item.id !== 'ai-assistant-btn' && item.id !== 'clipboard-btn' && item.id !== 'close-session-btn') {
        item.style.cursor = 'pointer';
        item.addEventListener('click', (e) => {
          if (item.id === 'metrics-btn') {
            metrics();
            return;
          }

          if (item.id === 'dark-mode-btn') {
            homeRoot.classList.toggle('dark-mode');
            darkModeOverlay.style.display = homeRoot.classList.contains('dark-mode') ? 'block' : 'none';
            return;
          }

          const title = item.querySelector('.modal-title').textContent;
          const icon = item.querySelector('.modal-icon').innerHTML;
          let content = '';

          if (item.dataset.url) {
            window.FacetTools.open('cords');
          } else {
            content = `
              <div style="text-align:center; padding:20px;">
                <div style="font-size:2rem; margin-bottom:15px;">${icon}</div>
                <h3>${title}</h3>
                <p>${item.querySelector('.modal-desc').textContent}</p>
              </div>
            `;
            createFloatingWindow(title, content);
          }
          modal.style.display = 'none';
        });
      }
    });

    const aiAssistantBtn = document.getElementById('ai-assistant-btn');
    if (aiAssistantBtn) {
      aiAssistantBtn.style.cursor = 'pointer';
      aiAssistantBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        window.FacetTools.open('ai-assistant');

        modal.style.display = 'none';
      });
    }

    const clipboardBtn = document.getElementById('clipboard-btn');
    if (clipboardBtn) {
      clipboardBtn.style.cursor = 'pointer';
      clipboardBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        createClipboardWindow();
        modal.style.display = 'none';
      });
    }

    const closeSessionBtn = document.getElementById('close-session-btn');
    if (closeSessionBtn) {
      closeSessionBtn.style.cursor = 'pointer';
      closeSessionBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const iframe = document.querySelector('.fullscreen-frame');
        iframe.style.display = 'none';
        iframe.src = '';
        document.getElementById('home-main').style.display = 'flex';
        modal.style.display = 'none';
      });
    }

    const fpsPingDisplay = document.getElementById('fps-ping-display');
    const fpsDisplay = document.getElementById('fps-display');
    const pingDisplay = document.getElementById('ping-display');
    let showFpsPing = false, lastFrameTime = performance.now(), frameCount = 0;

    function updateFPS() {
      const fakeFPS = Math.floor(Math.random() * 3) + 3;
      fpsDisplay.textContent = `Lost FPS: ${fakeFPS}`;
      if (showFpsPing) setTimeout(updateFPS, 1000);
    }

    function updatePing() {
      const img = new Image();
      const start = performance.now();
      img.onload = () => pingDisplay.textContent = `Ping: ${Math.round(performance.now() - start)} ms`;
      img.onerror = () => pingDisplay.textContent = 'Ping: Error';
      img.src = "https://bloxd.io/favicon.ico?" + Math.random();
      if (showFpsPing) setTimeout(updatePing, 1000);
    }

    const darkModeOverlay = document.createElement('div');
    darkModeOverlay.className = 'darkmode-overlay';
    homeRoot.appendChild(darkModeOverlay);

    function metrics() {
      if (!fpsPingDisplay || !fpsDisplay || !pingDisplay) return;

      showFpsPing = !showFpsPing;
      fpsPingDisplay.style.display = showFpsPing ? 'block' : 'none';

      if (showFpsPing) {
        updateFPS();
        updatePing();
      }

      if (modal) modal.style.display = 'none';
    }

    if (metricsBtn) {
      metricsBtn.addEventListener('click', metrics);
    }

    document.addEventListener('DOMContentLoaded', () => {
      const savedFilter = localStorage.getItem('gameFilter');
      if (savedFilter) {
        const filterButton = document.querySelector(`.filter-option[onclick*="'${savedFilter}'"]`);
        if (filterButton) {
          filterButton.click();
        }
      }
    });

    function openModal(link) {
      const modal = document.getElementById('modal');
      if (!modal) return;

      modal.innerHTML = `<iframe src="${link}" style="width:100%; height:100%; border:none;"></iframe>
                        <button onclick="closeModal()" style="position:absolute; top:10px; right:10px; background:transparent; border:none; color:white; cursor:pointer; font-size:1.5rem;">×</button>`;
      modal.style.display = 'flex';
    }

    function closeModal() {
      const modal = document.getElementById('modal');
      if (modal) modal.style.display = 'none';
      modal.innerHTML = '';
    }

    function openSidebar() {
      document.getElementById('sidebar').classList.add('open');
      document.getElementById('overlay').classList.add('show');
    }

    function closeSidebar() {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('overlay').classList.remove('show');
    }

    function openFilterMenu() {
      document.getElementById('filterPopup').classList.add('show');
      document.getElementById('overlay').classList.add('show');
      closeSidebar();
    }

    function closeFilterMenu() {
      document.getElementById('filterPopup').classList.remove('show');
      document.getElementById('overlay').classList.remove('show');
    }

    function filters() {
      const filterContent = `
        <div style="padding: 20px;">
          <h3>Filters</h3>
          <p>Select a filter to apply:</p>
          <div style="display: grid; gap: 10px; margin-top: 15px;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 25px; margin-bottom: 25px;">
              <button onclick="toggleFilter(this, 'none')" class="filter-option">No Filter</button>
              <button onclick="toggleFilter(this, 'grayscale')" class="filter-option">Grayscale</button>
              <button onclick="toggleFilter(this, 'sepia')" class="filter-option">Sepia</button>
              <button onclick="toggleFilter(this, 'saturate')" class="filter-option">Saturate</button>
              <button onclick="toggleFilter(this, 'brightness')" class="filter-option">Brightness</button>
              <button onclick="toggleFilter(this, 'contrast')" class="filter-option">Contrast</button>
          </div>
        </div>
      `;

      createFloatingWindow('Filters', filterContent);
    }

    function toggleFilter(button, filterValue) {
      const gameIframe = document.querySelector('.fullscreen-frame');
      if (!gameIframe) return;

      document.querySelectorAll('.filter-option').forEach(btn => {
        btn.classList.remove('active');
      });

      if (button) {
        button.classList.add('active');
      }

      switch (filterValue) {
        case 'blur':
          gameIframe.style.filter = 'blur(3px)';
          break;
        case 'grayscale':
          gameIframe.style.filter = 'grayscale(100%)';
          break;
        case 'sepia':
          gameIframe.style.filter = 'sepia(100%)';
          break;
        case 'saturate':
          gameIframe.style.filter = 'saturate(100%)';
          break;
        case 'brightness':
          gameIframe.style.filter = 'brightness(150%)';
          break;
        case 'contrast':
          gameIframe.style.filter = 'contrast(150%)';
          break;
        case 'none':
        default:
          gameIframe.style.filter = 'none';
          break;
      }

      localStorage.setItem('gameFilter', filterValue);
    }
    async function startStream() {
      try {
        const recordMic = document.getElementById('mic-toggle')?.checked || false;

        if (recordMic) {
          console.log('Getting screen stream with audio');
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
          });

          console.log('Getting microphone stream');
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              sampleRate: 44100
            }
          });

          mediaStream = new MediaStream();

          screenStream.getVideoTracks().forEach(track => {
            mediaStream.addTrack(track);
          });

          screenStream.getAudioTracks().forEach(track => {
            mediaStream.addTrack(track);
          });

          micStream.getAudioTracks().forEach(track => {
            mediaStream.addTrack(track);
          });

          console.log('Combined stream tracks:', mediaStream.getTracks().length);
        } else {
          console.log('Getting screen stream only');
          mediaStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
          });
        }

        console.log('Media stream tracks:', mediaStream.getTracks());
        mediaStream.getTracks().forEach((track, index) => {
          console.log(`Track ${index}:`, {
            kind: track.kind,
            label: track.label,
            readyState: track.readyState
          });
        });

        document.getElementById('recordingbt').disabled = false;

        mediaStream.getVideoTracks()[0].onended = () => {
          stopRecording();
        };
      } catch (err) {
        console.error('Error capturing media:', err);
        if (err.name === 'NotAllowedError') {
          alert('Failed to start screen sharing. Please ensure permissions are granted for both screen and microphone access.');
        } else {
          alert('Failed to start screen sharing: ' + err.message);
        }
      }
    }

    function startRecording() {
      if (!mediaStream) {
        console.error('No media stream available');
        return;
      }
      if (typeof mediaStream.active !== "undefined" && !mediaStream.active) {
        alert('The screen share has ended or is inactive. Please start screen sharing again.');
        console.error('MediaStream is inactive');
        return;
      }
      try {
        const hasVideo = mediaStream.getVideoTracks().length > 0;
        const hasAudio = mediaStream.getAudioTracks().length > 0;

        console.log('Stream tracks:', {
          video: hasVideo,
          audio: hasAudio,
          audioTracks: mediaStream.getAudioTracks().length
        });

        let mimeType = '';

        if (hasVideo && hasAudio) {
          const mimeTypes = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm'
          ];

          for (const type of mimeTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
              mimeType = type;
              console.log('Selected MIME type for video+audio:', mimeType);
              break;
            }
          }
        } else if (hasVideo) {
          const mimeTypes = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm'
          ];

          for (const type of mimeTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
              mimeType = type;
              console.log('Selected MIME type for video only:', mimeType);
              break;
            }
          }
        } else if (hasAudio) {
          const mimeTypes = [
            'audio/webm;codecs=opus',
            'audio/webm'
          ];

          for (const type of mimeTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
              mimeType = type;
              console.log('Selected MIME type for audio only:', mimeType);
              break;
            }
          }
        }

        if (!mimeType) {
          console.warn('No supported MIME type found, using default');
          mimeType = '';
        }

        const options = { mimeType };
        console.log('MediaRecorder options:', options);

        mediaRecorder = new MediaRecorder(mediaStream, options);
        recordedChunks = [];
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunks.push(event.data);
          }
        };
        mediaRecorder.onstop = () => {
          saveRecording(mimeType);
          cleanup();
        };
        mediaRecorder.onerror = (event) => {
          console.error('Recorder error:', event.error);
          alert('Recorder error: ' + event.error.message);
        };
        mediaRecorder.start(1000);
        updateUI(true);
      } catch (err) {
        console.error('Error starting recording:', err);
        alert('Recording failed to start: ' + err.message);
      }
    }

    function stopRecording() {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    }

    function saveRecording(mimeType) {
      console.log('Saving recording with MIME type:', mimeType);
      console.log('Recorded chunks:', recordedChunks.length);

      if (recordedChunks.length === 0) {
        console.warn('No recorded data to save');
        return;
      }

      try {
        const fileExtension = mimeType.includes('mp4') ? 'mp4' : 'webm';
        console.log('File extension:', fileExtension);

        const blob = new Blob(recordedChunks, { type: mimeType || 'video/webm' });
        console.log('Blob size:', blob.size, 'bytes');

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `recording_${new Date().toISOString().replace(/[:.]/g, '-')}.${fileExtension}`;
        homeRoot.appendChild(a);
        a.click();
        setTimeout(() => {
          homeRoot.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      } catch (err) {
        console.error('Error saving recording:', err);
        alert('Failed to save recording: ' + err.message);
      }
    }

    function cleanup() {
      recordedChunks = [];
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
      }
      mediaRecorder = null;
      updateUI(false);
    }

    function updateUI(isRecording) {
      const recordingBtn = document.getElementById('recordingbt');
      const recordingIndicator = document.getElementById('recordingIndicator');
      const streamingBtn = document.getElementById('streamingbt');

      if (recordingBtn && recordingIndicator && streamingBtn) {
        streamingBtn.disabled = isRecording;
        recordingBtn.textContent = isRecording ? 'Stop Recording' : 'Start Recording';
        recordingBtn.style.backgroundColor = isRecording ? '#ff4d4d' : '#ff8c00';
        recordingIndicator.style.display = isRecording ? 'block' : 'none';
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      const tooltip = document.getElementById('menuTooltip');
      const menuBtn = document.getElementById('menupopBtn');
      const modal = document.getElementById('popupModal');

      const hasSeenTooltip = localStorage.getItem('hasSeenMenuTooltip');

      if (!hasSeenTooltip && tooltip) {
        setTimeout(() => {
          if (tooltip) tooltip.style.display = 'block';
        }, 1000);
      }

      if (menuBtn) menuBtn.addEventListener('click', () => {
        if (tooltip && tooltip.style.display === 'block') {
          tooltip.style.display = 'none';
          localStorage.setItem('hasSeenMenuTooltip', 'true');
        }
      });

      if (modal) {
        const observer = new MutationObserver(() => {
          if (modal.style.display === 'flex') {
            if (tooltip) tooltip.style.display = 'none';
            localStorage.setItem('hasSeenMenuTooltip', 'true');
          }
        });

        observer.observe(modal, { attributes: true, attributeFilter: ['style'] });
      }

      const recordBtn = document.getElementById('record-btn');
      const recordingWindow = document.getElementById('recording-window');
      const closeRecordingBtn = document.getElementById('close-recording');
      const streamingBtn = document.getElementById('streamingbt');
      const recordingBtn = document.getElementById('recordingbt');

      if (recordingWindow) {
        makeDraggable(recordingWindow, document.getElementById('recording-drag-handle'));
      }

      if (recordBtn) {
        recordBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const popupModal = document.getElementById('popupModal');
          if (popupModal) {
            popupModal.style.display = 'none';
          }
          if (recordingWindow) {
            recordingWindow.style.display = recordingWindow.style.display === 'block' ? 'none' : 'block';
          }
        });
      }

      if (closeRecordingBtn) {
        closeRecordingBtn.addEventListener('click', () => {
          recordingWindow.style.display = 'none';
          stopRecording();
        });
      }

      if (streamingBtn) {
        streamingBtn.addEventListener('click', startStream);
      }
      if (recordingBtn) {
        recordingBtn.addEventListener('click', () => {
          if (!mediaRecorder || mediaRecorder.state === 'inactive') {
            startRecording();
          } else if (mediaRecorder.state === 'recording') {
            stopRecording();
          }
        });
      }

      const micToggle = document.getElementById('mic-toggle');
      const micIndicator = document.getElementById('mic-indicator');
      if (micToggle && micIndicator) {
        micToggle.addEventListener('change', function () {
          if (this.checked) {
            micIndicator.classList.add('show');
          } else {
            micIndicator.classList.remove('show');
          }
        });
      }
    });

    const worldsData = [
      {
        id: 1,
        title: "This menu is in works",
        description: "PLACEHOLDER",
        banner: "https://placehold.co/300x100/262525/ffffff?text=PLACEHOLDER",
        url: "https://bloxd.io/world/placeholder"
      },
      {
        id: 2,
        title: "PLACEHOLDER",
        description: "PLACEHOLDER",
        banner: "https://placehold.co/300x100/262525/ffffff?text=PLACEHOLDER",
        url: "https://bloxd.io/world/placeholder"
      },
      {
        id: 3,
        title: "PLACEHOLDER",
        description: "PLACEHOLDER",
        banner: "https://placehold.co/300x100/262525/ffffff?text=PLACEHOLDER",
        url: "https://bloxd.io/world/placeholder"
      },
      {
        id: 4,
        title: "PLACEHOLDER",
        description: "PLACEHOLDER",
        banner: "https://placehold.co/300x100/262525/ffffff?text=PLACEHOLDER",
        url: "https://bloxd.io/world/placeholder"
      },
      {
        id: 5,
        title: "PLACEHOLDER",
        description: "PLACEHOLDER",
        banner: "https://placehold.co/300x100/262525/ffffff?text=PLACEHOLDER",
        url: "https://bloxd.io/world/placeholder"
      },
      {
        id: 6,
        title: "PLACEHOLDER",
        description: "PLACEHOLDER",
        banner: "https://placehold.co/300x100/262525/ffffff?text=PLACEHOLDER",
        url: "https://bloxd.io/world/placeholder"
      }
    ];

    function populateWorldCards() {
      const container = document.getElementById('worldsContainer');
      container.innerHTML = '';

      worldsData.forEach(world => {
        const card = document.createElement('div');
        card.className = 'world-card';
        card.style.cssText = `
          background: linear-gradient(145deg, #262525, #212020);
          border: 1px solid #3a3939;
          border-radius: 15px;
          overflow: hidden;
          display: flex;
          height: 120px;
          transition: all 0.3s ease;
        `;

        card.innerHTML = `
          <div style="width: 40%; height: 100%; overflow: hidden;">
            <img src="${world.banner}" alt="${world.title}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
          <div style="width: 60%; padding: 15px; display: flex; flex-direction: column;">
            <h3 style="margin: 0 0 8px 0; color: #e8e8e8; font-size: 1.1rem;">${world.title}</h3>
            <p style="margin: 0; color: #bbb; font-size: 0.85rem; flex-grow: 1; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${world.description}</p>
            <div style="margin-top: 10px; text-align: right;">
              <button class="try-world-btn" data-url="${world.url}" style="
                background: linear-gradient(45deg, #ff6b39, #ff8c5a);
                border: none;
                color: white;
                padding: 8px 15px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.3s ease;
              ">Try</button>
            </div>
          </div>
        `;

        container.appendChild(card);
      });

      document.querySelectorAll('.try-world-btn').forEach(button => {
        button.addEventListener('click', function () {
          const url = this.getAttribute('data-url');
          const iframe = document.querySelector('.fullscreen-frame');
          iframe.src = url;
          iframe.style.display = 'block';
          document.getElementById('home-main').style.display = 'none';
          document.getElementById('worldsModal').style.display = 'none';
        });
      });
    }

    document.getElementById('trySomethingNewBtn').addEventListener('click', function () {
      const games = [
        { url: 'https://bloxd.io/play/classic/!coin-clicker!', name: 'Coin Clicker' },
        { url: 'https://bloxd.io/play/classic/towers_of_hell', name: 'Towers of Hell' },
        { url: 'https://bloxd.io/play/classic/citdel_of_void', name: 'Citadel of Void' },
        { url: 'https://bloxd.io/play/classic/thecoolcodelobby', name: 'The Cool Code Lobby' },
        { url: 'https://bloxd.io/play/classic/-maplecity-', name: 'Maple City' },
        { url: 'https://bloxd.io/play/classic/hypixel_1v1', name: 'Hypixel 1v1' },
        { url: 'https://bloxd.io/play/classic/wildsurvivalwrld', name: 'Wild Survival' }
      ];

      const randomGame = games[Math.floor(Math.random() * games.length)];

      const iframe = document.querySelector('.fullscreen-frame');
      iframe.src = randomGame.url;
      iframe.style.display = 'block';
      document.getElementById('home-main').style.display = 'none';

      showGameNotification(randomGame.name);
    });

    function showGameNotification(gameName) {
      const notification = document.createElement('div');
      notification.id = 'game-notification';
      notification.textContent = `Opened: ${gameName}`;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(145deg, #262525, #212020);
        border: 1px solid #3a3939;
        border-radius: 12px;
        padding: 15px 25px;
        color: #e8e8e8;
        font-weight: bold;
        font-size: 1.1rem;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        z-index: 10001;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;

      homeRoot.appendChild(notification);

      setTimeout(() => {
        notification.style.opacity = '1';
      }, 100);

      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }, 3000);
    }

    document.getElementById('closeWorldsModal').addEventListener('click', function () {
      document.getElementById('worldsModal').style.display = 'none';
    });

    document.getElementById('worldsModal').addEventListener('click', function (e) {
      if (e.target === this) {
        this.style.display = 'none';
      }
    });



window.metrics = metrics;
window.filters = filters;
window.closeModal = closeModal;
window.toggleFilter = toggleFilter;
})();
