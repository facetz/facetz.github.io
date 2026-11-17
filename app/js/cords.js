(function(){
'use strict';
const __realDoc = window.document;
const __root = __realDoc.getElementById('tool-cords');
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

    const saveBtn = document.getElementById('saveBtn');
    const showBtn = document.getElementById('showBtn');
    const modal = document.getElementById('coordsModal');
    const coordsList = document.getElementById('coordsList');
    const closeModal = document.getElementById('closeModal');
    const notification = document.getElementById('notification');


    function showNotification(message, type = 'success') {
      notification.textContent = message;
      notification.className = `notification ${type} show`;

      setTimeout(() => {
        notification.classList.remove('show');
      }, 3000);
    }

    function loadCoords() {
      coordsList.innerHTML = '';
      const coords = JSON.parse(localStorage.getItem('coords') || '[]');

      if (coords.length === 0) {
        coordsList.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-map-pin"></i>
            <h3>No Saved Locations</h3>
            <p>Save your first location using the form above</p>
          </div>
        `;
        return;
      }

      coords.forEach((c, index) => {
        const div = document.createElement('div');
        div.className = 'coord-item';

        div.innerHTML = `
          <div class="coord-info">
            <div class="coord-name">${c.name}</div>
            <div class="coord-values">
              <div class="coord-value"><i class="fas fa-arrows-alt"></i> X: ${c.x}</div>
              <div class="coord-value"><i class="fas fa-arrows-alt-v"></i> Y: ${c.y}</div>
              <div class="coord-value"><i class="fas fa-arrows-alt-h"></i> Z: ${c.z}</div>
            </div>
          </div>
          <div class="action-buttons">
            <button class="action-btn copy-btn" data-clipboard-text="${c.x}, ${c.y}, ${c.z}">Copy</button>
            <button class="action-btn delete-btn">Delete</button>
          </div>
        `;


        div.querySelector('.delete-btn').addEventListener('click', () => {
          coords.splice(index, 1);
          localStorage.setItem('coords', JSON.stringify(coords));
          loadCoords();
          showNotification('Location deleted successfully', 'success');
        });


        div.querySelector('.copy-btn').addEventListener('click', () => {
          const coordsText = `${c.x}, ${c.y}, ${c.z}`;
          navigator.clipboard.writeText(coordsText).then(() => {
            showNotification('Coordinates copied to clipboard', 'success');
          }).catch(err => {
            showNotification('Failed to copy coordinates', 'error');
            console.error('Failed to copy: ', err);
          });
        });

        coordsList.appendChild(div);
      });
    }

    saveBtn.addEventListener('click', () => {
      const name = document.getElementById('coordName').value.trim();
      const x = document.getElementById('coordX').value.trim();
      const y = document.getElementById('coordY').value.trim();
      const z = document.getElementById('coordZ').value.trim();

      if (!name || x === '' || y === '' || z === '') {
        showNotification('Please fill in all fields', 'error');
        return;
      }

      const coords = JSON.parse(localStorage.getItem('coords') || '[]');
      coords.push({ name, x, y, z });
      localStorage.setItem('coords', JSON.stringify(coords));

      document.getElementById('coordName').value = '';
      document.getElementById('coordX').value = '';
      document.getElementById('coordY').value = '';
      document.getElementById('coordZ').value = '';

      showNotification('Location saved successfully', 'success');
    });

    showBtn.addEventListener('click', () => {
      loadCoords();
      document.querySelector('.coords-form-container').style.display = 'none';
      modal.style.display = 'flex';
    });


    closeModal.addEventListener('click', () => {
      modal.style.display = 'none';
      document.querySelector('.coords-form-container').style.display = 'block';
    });


    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        modal.style.display = 'none';
        document.querySelector('.coords-form-container').style.display = 'block';
      }
    });


    modal.addEventListener('click', e => {
      if (e.target === modal) {
        modal.style.display = 'none';
        document.querySelector('.coords-form-container').style.display = 'block';
      }
    });


    document.querySelector('.coords-modal').addEventListener('click', (e) => {
      e.stopPropagation();
    });


})();
