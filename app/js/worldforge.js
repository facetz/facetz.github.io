(function(){
'use strict';
const __realDoc = window.document;
const __root = __realDoc.getElementById('view-worldforge');
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

    const gridItems = document.querySelectorAll('.grid-item');
    const copyNotification = document.getElementById('copyNotification');

    gridItems.forEach(item => {
      item.addEventListener('click', () => {
        const textToCopy = item.getAttribute('data-text');
        navigator.clipboard.writeText(textToCopy)
          .then(() => {
            showNotification();
          })
          .catch(err => {
            console.error('Failed to copy text: ', err);
          });
      });
    });

    function showNotification() {
      copyNotification.classList.add('show');
      setTimeout(() => {
        copyNotification.classList.remove('show');
      }, 2000);
    }

    const openUploadBtn = document.getElementById('openUploadBtn');
    const openClipboardBtn = document.getElementById('openClipboardBtn');
    const uploadPopup = document.getElementById('uploadPopup');
    const clipboardPopup = document.getElementById('clipboardPopup');
    const closeButtons = document.querySelectorAll('.popup-close');

    openUploadBtn.addEventListener('click', () => {
      uploadPopup.classList.add('active');
      positionPopup(uploadPopup);
    });

    openClipboardBtn.addEventListener('click', () => {
      clipboardPopup.classList.add('active');
      positionPopup(clipboardPopup);
    });

    closeButtons.forEach(button => {
      button.addEventListener('click', () => {
        button.closest('.popup-window').classList.remove('active');
      });
    });

    function positionPopup(popup) {
      popup.style.transform = 'none';

      const container = document.querySelector('.container');
      const containerRect = container.getBoundingClientRect();

      const left = (containerRect.width / 2 - popup.offsetWidth / 2) + containerRect.left;
      const top = (containerRect.height / 2 - popup.offsetHeight / 2) + containerRect.top;

      popup.style.left = left + 'px';
      popup.style.top = top + 'px';
    }

    let draggedElement = null;
    let offsetX, offsetY;
    let isDragging = false;

    document.querySelectorAll('.popup-header').forEach(header => {
      header.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('popup-close')) return;
        draggedElement = header.parentElement;
        const rect = draggedElement.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        draggedElement.style.zIndex = 1000;
        isDragging = true;
        e.preventDefault();
      });
    });

    document.addEventListener('mousemove', (e) => {
      if (draggedElement && isDragging) {
        const container = document.querySelector('.container');
        const containerRect = container.getBoundingClientRect();

        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;

        newX = Math.max(containerRect.left, Math.min(newX, containerRect.right - draggedElement.offsetWidth));
        newY = Math.max(containerRect.top, Math.min(newY, containerRect.bottom - draggedElement.offsetHeight));

        draggedElement.style.left = newX + 'px';
        draggedElement.style.top = newY + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      if (draggedElement) {
        draggedElement.style.zIndex = 100;
        draggedElement = null;
        isDragging = false;
      }
    });

    function setCookie(name, value, days) {
      const compressedValue = encodeURIComponent(JSON.stringify(value));

      if (compressedValue.length > 3000) {
        const chunkSize = 3000;
        const chunks = [];
        for (let i = 0; i < compressedValue.length; i += chunkSize) {
          chunks.push(compressedValue.substr(i, chunkSize));
        }

        document.cookie = name + '_chunks=' + chunks.length + ';path=/;max-age=' + (days * 24 * 60 * 60);

        for (let i = 0; i < chunks.length; i++) {
          document.cookie = name + '_chunk_' + i + '=' + chunks[i] + ';path=/;max-age=' + (days * 24 * 60 * 60);
        }

        document.cookie = name + '=;path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT';
      } else {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = name + '=' + compressedValue + ';expires=' + expires.toUTCString() + ';path=/';

        const chunkCount = getCookie(name + '_chunks');
        if (chunkCount) {
          for (let i = 0; i < parseInt(chunkCount); i++) {
            document.cookie = name + '_chunk_' + i + '=;path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT';
          }
          document.cookie = name + '_chunks=;path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT';
        }
      }
    }

    function getCookie(name) {
      const chunkCount = getCookieSimple(name + '_chunks');
      if (chunkCount) {
        let compressedValue = '';
        for (let i = 0; i < parseInt(chunkCount); i++) {
          const chunk = getCookieSimple(name + '_chunk_' + i);
          if (chunk) {
            compressedValue += chunk;
          } else {
            return null;
          }
        }

        try {
          return JSON.parse(decodeURIComponent(compressedValue));
        } catch (e) {
          console.error('Failed to parse chunked cookie:', e);
          return null;
        }
      }

      const value = getCookieSimple(name);
      if (value) {
        try {
          return JSON.parse(decodeURIComponent(value));
        } catch (e) {
          console.error('Failed to parse cookie:', e);
          return null;
        }
      }

      return null;
    }

    function getCookieSimple(name) {
      const nameEQ = name + "=";
      const ca = document.cookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
      }
      return null;
    }

    let uploadedFiles = [];

    try {
      const uploadedFilesData = getCookie('worldforgeUploadedFiles');
      if (uploadedFilesData) {
        uploadedFiles = uploadedFilesData;
        renderUploadedFiles();
      }
    } catch (e) {
      console.error('Failed to load uploaded files:', e);
    }

    function renderUploadedFiles() {
      const uploadedFilesContainer = document.getElementById('uploadedFiles');
      if (uploadedFilesContainer && uploadedFiles) {
        uploadedFilesContainer.innerHTML = '';

        uploadedFiles.forEach(file => {
          const fileItem = document.createElement('div');
          fileItem.className = 'file-item';
          fileItem.draggable = true;
          fileItem.setAttribute('data-file', file.name);

          fileItem.innerHTML = `
                        <span class="file-icon">📄</span>
                        <span>${file.name}</span>
                        <span style="margin-left: auto; font-size: 0.8rem; color: #a0a0a0;">${formatFileSize(file.size)}</span>
                    `;

          fileItem.addEventListener('dragstart', handleDragStart);

          uploadedFilesContainer.appendChild(fileItem);
        });
      }
    }

    document.addEventListener('change', function (e) {
      if (e.target.id === 'fileInput') {
        const fileInput = e.target;

        if (fileInput.files.length > 0) {
          for (let i = 0; i < fileInput.files.length; i++) {
            const file = fileInput.files[i];
            uploadedFiles.unshift({
              name: file.name,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified,
              id: Date.now() + i
            });
          }

          if (uploadedFiles.length > 20) {
            uploadedFiles = uploadedFiles.slice(0, 20);
          }

          try {
            setCookie('worldforgeUploadedFiles', uploadedFiles, 30);
          } catch (e) {
            console.error('Failed to save files to cookies:', e);
          }

          renderUploadedFiles();

          fileInput.value = '';
        }
      }
    });

    function formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function handleDragStart(e) {
      e.dataTransfer.setData('text/plain', e.target.getAttribute('data-file'));
      e.dataTransfer.effectAllowed = 'copy';
    }

    document.addEventListener('focus', function (e) {
      if (e.target.id === 'textEditor') {
        if (e.target.textContent === 'Type or paste formatted text here...') {
          e.target.textContent = '';
        }
      }
    }, true);

    document.addEventListener('blur', function (e) {
      if (e.target.id === 'textEditor') {
        if (e.target.textContent === '') {
          e.target.textContent = 'Type or paste formatted text here...';
        }
      }
    }, true);

    let savedTexts = [];

    try {
      const savedTextsData = getCookie('worldforgeSavedTexts');
      if (savedTextsData) {
        savedTexts = savedTextsData;
        renderSavedTexts();
      }
    } catch (e) {
      console.error('Failed to load saved texts:', e);
    }

    document.addEventListener('click', function (e) {
      if (e.target.id === 'saveTextBtn') {
        const textEditor = document.getElementById('textEditor');
        if (textEditor && textEditor.textContent !== 'Type or paste formatted text here...') {
          const textContent = textEditor.textContent.trim();
          if (textContent) {
            savedTexts.unshift({
              id: Date.now(),
              content: textContent,
              timestamp: new Date().toLocaleString()
            });

            if (savedTexts.length > 20) {
              savedTexts = savedTexts.slice(0, 20);
            }

            try {
              setCookie('worldforgeSavedTexts', savedTexts, 30);
            } catch (e) {
              console.error('Failed to save texts to cookies:', e);
            }

            renderSavedTexts();

            showNotification();
          }
        }
      }

      if (e.target.classList.contains('saved-text-copy-btn')) {
        const textId = e.target.getAttribute('data-text-id');
        const savedText = savedTexts.find(t => t.id == textId);
        if (savedText) {
          navigator.clipboard.writeText(savedText.content)
            .then(() => {
              showNotification();
            })
            .catch(err => {
              console.error('Failed to copy text: ', err);
            });
        }
      }

      if (e.target.classList.contains('saved-text-delete-btn')) {
        const textId = e.target.getAttribute('data-text-id');
        savedTexts = savedTexts.filter(t => t.id != textId);

        try {
          setCookie('worldforgeSavedTexts', savedTexts, 30);
        } catch (e) {
          console.error('Failed to save texts to cookies:', e);
        }

        renderSavedTexts();
      }

      if (e.target.classList.contains('saved-text-expand-btn')) {
        const contentElement = e.target.closest('.saved-text-item').querySelector('.saved-text-content');
        contentElement.classList.toggle('expanded');
        e.target.textContent = contentElement.classList.contains('expanded') ? 'Collapse' : 'Expand';
      }
    });

    function renderSavedTexts() {
      const container = document.getElementById('savedTextsContainer');
      const noSavedTexts = document.getElementById('noSavedTexts');

      if (savedTexts.length === 0) {
        noSavedTexts.style.display = 'block';
        container.innerHTML = '';
        container.appendChild(noSavedTexts);
        return;
      }

      noSavedTexts.style.display = 'none';
      container.innerHTML = '';

      savedTexts.forEach(text => {
        const textItem = document.createElement('div');
        textItem.className = 'saved-text-item';

        const truncatedContent = text.content.length > 100 ?
          text.content.substring(0, 100) + '...' :
          text.content;

        textItem.innerHTML = `
                    <div class="saved-text-content" title="${text.content}">
                        ${truncatedContent}
                    </div>
                    <div class="saved-text-actions">
                        <button class="saved-text-expand-btn" data-text-id="${text.id}">Expand</button>
                        <button class="saved-text-copy-btn" data-text-id="${text.id}">Copy</button>
                        <button class="saved-text-delete-btn" data-text-id="${text.id}">Delete</button>
                    </div>
                `;

        container.appendChild(textItem);
      });
    }

    const gridContainer = document.querySelector('.grid-container');
    let isGridDragging = false;
    let startX;
    let startY;
    let scrollLeft;
    let scrollTop;

    let animationId;

    gridContainer.addEventListener('mousedown', (e) => {
      isGridDragging = true;
      startX = e.pageX - gridContainer.offsetLeft;
      startY = e.pageY - gridContainer.offsetTop;
      scrollLeft = gridContainer.scrollLeft;
      scrollTop = gridContainer.scrollTop;
      gridContainer.style.cursor = 'grabbing';
      e.preventDefault();

      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    });

    gridContainer.addEventListener('mouseleave', () => {
      isGridDragging = false;
      gridContainer.style.cursor = 'default';
    });

    gridContainer.addEventListener('mouseup', () => {
      isGridDragging = false;
      gridContainer.style.cursor = 'default';
    });

    gridContainer.addEventListener('mousemove', (e) => {
      if (!isGridDragging) return;

      if (animationId) {
        cancelAnimationFrame(animationId);
      }

      animationId = requestAnimationFrame(() => {
        const x = e.pageX - gridContainer.offsetLeft;
        const y = e.pageY - gridContainer.offsetTop;
        const walkX = (x - startX) * 2;
        const walkY = (y - startY) * 2;
        gridContainer.scrollLeft = scrollLeft - walkX;
        gridContainer.scrollTop = scrollTop - walkY;
      });
    });

    gridContainer.addEventListener('selectstart', (e) => {
      if (isGridDragging) {
        e.preventDefault();
      }
    });

    const dragInfoPopup = document.getElementById('dragInfoPopup');
    const closeInfoPopup = document.getElementById('closeInfoPopup');

    const hasSeenDragInfo = localStorage.getItem('hasSeenDragInfo');
    if (!hasSeenDragInfo) {
      setTimeout(() => {
        dragInfoPopup.classList.add('show');
      }, 2000);

      localStorage.setItem('hasSeenDragInfo', 'true');
    }

    closeInfoPopup.addEventListener('click', () => {
      dragInfoPopup.classList.remove('show');
    });

    dragInfoPopup.addEventListener('click', () => {
      dragInfoPopup.classList.remove('show');
    });


})();
