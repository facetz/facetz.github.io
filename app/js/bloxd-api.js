(function(){
'use strict';
const __realDoc = window.document;
const __root = __realDoc.getElementById('tool-bloxd-api');
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

    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const tabName = tab.dataset.tab;
        loadContent(tabName);
      });
    });

    const searchInput = document.getElementById('apiSearchInput');
    const searchStats = document.getElementById('search-stats');
    let allFilesContent = {};

    async function loadAllFiles() {
      const files = [
        {name: 'main', file: 'main.md'},
        {name: 'callbacks', file: 'CALLBACKS.md'},
        {name: 'client-options', file: 'CLIENT_OPTIONS.md'},
        {name: 'entities', file: 'ENTITY_SETTINGS.md'},
        {name: 'mobs', file: 'MOB_SETTINGS.md'},
        {name: 'particles', file: 'PARTICLES.md'},
        {name: 'sounds', file: 'SOUND_NAMES.md'}
      ];

      for (const fileInfo of files) {
        try {
          const response = await fetch(`assets/data/Bloxd API/${fileInfo.file}`);
          const content = await response.text();
          allFilesContent[fileInfo.name] = content;
        } catch (error) {
          console.error(`Failed to load ${fileInfo.file}:`, error);
        }
      }
    }

    loadAllFiles();

    searchInput.addEventListener('input', debounce(function() {
      const searchTerm = this.value.trim();
      if (searchTerm.length === 0) {
        searchStats.style.display = 'none';
      }
    }, 300));

    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && this.value.trim().length > 0) {
        e.preventDefault();
        showSearchModal(this.value.trim());
      }
    });

    function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }

    async function loadContent(tabName) {
      const container = document.getElementById('content-container');
      container.innerHTML = '<div class="no-results">Loading...</div>';

      try {
        let fileName;
        switch(tabName) {
          case 'main':
            fileName = 'main.md';
            break;
          case 'callbacks':
            fileName = 'CALLBACKS.md';
            break;
          case 'client-options':
            fileName = 'CLIENT_OPTIONS.md';
            break;
          case 'entities':
            fileName = 'ENTITY_SETTINGS.md';
            break;
          case 'mobs':
            fileName = 'MOB_SETTINGS.md';
            break;
          case 'particles':
            fileName = 'PARTICLES.md';
            break;
          case 'sounds':
            fileName = 'SOUND_NAMES.md';
            break;
          default:
            fileName = 'main.md';
        }

        const response = await fetch(`assets/data/Bloxd API/${fileName}`);
        const markdown = await response.text();
        const html = convertMarkdownToHTML(markdown);
        container.innerHTML = html;

        container.dataset.originalContent = html;
      } catch (error) {
        container.innerHTML = `<div class="no-results">Failed to load content: ${error.message}</div>`;
      }
    }

    function convertMarkdownToHTML(markdown) {
      let html = markdown;

      html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
      html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
      html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

      html = html.replace(/```js([\s\S]*?)```/g, '<pre><code class="language-js">$1</code></pre>');
      html = html.replace(/```text([\s\S]*?)```/g, '<pre><code class="language-text">$1</code></pre>');
      html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

      html = html.replace(/`(.*?)`/g, '<code>$1</code>');

      html = html.replace(/^\* (.*$)/gm, '<li>$1</li>');
      html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

      html = html.replace(/^\n/gm, '</p><p>');
      html = '<p>' + html + '</p>';
      html = html.replace(/<p><\/p>/g, '');

      html = html.replace(/\n/g, '<br>');

      return `<div class="api-content">${html}</div>`;
    }

    function searchAcrossFiles(searchTerm) {
      const container = document.getElementById('content-container');
      const results = [];
      const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);

      Object.keys(allFilesContent).forEach(fileName => {
        const content = allFilesContent[fileName];
        if (!content) return;

        const lines = content.split('\n');
        lines.forEach((line, lineNumber) => {
          const lineLower = line.toLowerCase();
          const matchesAllTerms = searchTerms.every(term => lineLower.includes(term));

          if (matchesAllTerms && line.trim().length > 0) {
            results.push({
              fileName: fileName,
              lineNumber: lineNumber + 1,
              content: line.trim(),
              fullLine: line
            });
          }
        });
      });

      displaySearchResults(results, searchTerm);

      searchStats.textContent = `Found ${results.length} matches across all files`;
      searchStats.style.display = results.length > 0 ? 'block' : 'block';
    }

    function displaySearchResults(results, searchTerm) {
      const container = document.getElementById('content-container');
      const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);

      if (results.length === 0) {
        container.innerHTML = `
          <div class="no-results">
            <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 20px; color: #ff6b39;"></i>
            <div>No results found for "${searchTerm}"</div>
            <div style="font-size: 0.9rem; margin-top: 10px; color: #777;">Try different keywords or check your spelling</div>
          </div>
        `;
        return;
      }

      const groupedResults = {};
      results.forEach(result => {
        if (!groupedResults[result.fileName]) {
          groupedResults[result.fileName] = [];
        }
        groupedResults[result.fileName].push(result);
      });

      let html = `
        <div class="api-content">
          <h1><i class="fas fa-search"></i> Search Results for "${searchTerm}"</h1>
          <p style="color: #a0a0a0; margin-bottom: 25px;">${results.length} matches found across ${Object.keys(groupedResults).length} files</p>
      `;

      Object.keys(groupedResults).forEach(fileName => {
        const fileResults = groupedResults[fileName];
        const tabName = getTabDisplayName(fileName);

        html += `
          <div class="method-card" style="margin-bottom: 30px;">
            <h2 style="color: #ff8c5a; display: flex; align-items: center; gap: 10px;">
              <i class="fas ${getTabIcon(fileName)}"></i>
              ${tabName}
              <span style="font-size: 1rem; color: #a0a0a0; font-weight: normal;">(${fileResults.length} matches)</span>
            </h2>
        `;

        fileResults.forEach(result => {
          let highlightedContent = result.content;
          searchTerms.forEach(term => {
            const regex = new RegExp(`(${term})`, 'gi');
            highlightedContent = highlightedContent.replace(regex, '<mark style="background: #ff6b39; color: white; padding: 2px 4px; border-radius: 3px;">$1</mark>');
          });

          html += `
            <div class="method-card" style="margin: 15px 0; background: rgba(255,255,255,0.03); border-left: 3px solid #ff6b39;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span class="param-name">Line ${result.lineNumber}</span>
                <button onclick="switchToFile('${fileName}')"
                        style="background: #ff6b39; border: none; color: white; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 0.8rem;">
                  View in ${tabName}
                </button>
              </div>
              <div style="font-family: 'Courier New', monospace; font-size: 0.9rem; color: #e8e8e8; line-height: 1.4;">
                ${highlightedContent}
              </div>
            </div>
          `;
        });

        html += `</div>`;
      });

      html += `</div>`;
      container.innerHTML = html;
    }

    function getTabDisplayName(fileName) {
      const names = {
        'main': 'Main API',
        'callbacks': 'Callbacks',
        'client-options': 'Client Options',
        'entities': 'Entity Settings',
        'mobs': 'Mob Settings',
        'particles': 'Particles',
        'sounds': 'Sounds'
      };
      return names[fileName] || fileName;
    }

    function getTabIcon(fileName) {
      const icons = {
        'main': 'fa-book',
        'callbacks': 'fa-plug',
        'client-options': 'fa-cogs',
        'entities': 'fa-users',
        'mobs': 'fa-paw',
        'particles': 'fa-sparkles',
        'sounds': 'fa-volume-up'
      };
      return icons[fileName] || 'fa-file';
    }

    function switchToFile(fileName) {
      document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === fileName) {
          tab.classList.add('active');
        }
      });

      loadContent(fileName);

      searchInput.value = '';
      searchStats.style.display = 'none';
    }

    window.switchToFile = switchToFile;

    window.searchAcrossFiles = searchAcrossFiles;

    const modal = document.getElementById('searchModal');
    const modalClose = document.getElementById('modalClose');
    const modalContent = document.getElementById('apiModalContent');
    const modalTitle = document.getElementById('apiModalTitle');
    const modalFooter = document.getElementById('modalFooter');

    function showSearchModal(searchTerm) {
      const results = searchAcrossFilesInternal(searchTerm);
      displayModalResults(results, searchTerm);
      modal.classList.add('active');

      modal.addEventListener('keydown', handleModalKeydown);
      document.getElementById('tool-bloxd-api').style.overflow = 'hidden';
    }

    function closeModal() {
      modal.classList.remove('active');
      modal.removeEventListener('keydown', handleModalKeydown);
      document.getElementById('tool-bloxd-api').style.overflow = '';
      searchInput.focus();
    }

    function handleModalKeydown(e) {
      if (e.key === 'Escape') {
        closeModal();
      }
    }

    function searchAcrossFilesInternal(searchTerm) {
      const results = [];
      const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);

      Object.keys(allFilesContent).forEach(fileName => {
        const content = allFilesContent[fileName];
        if (!content) return;

        const lines = content.split('\n');
        lines.forEach((line, lineNumber) => {
          const lineLower = line.toLowerCase();
          const matchesAllTerms = searchTerms.every(term => lineLower.includes(term));

          if (matchesAllTerms && line.trim().length > 0) {
            results.push({
              fileName: fileName,
              lineNumber: lineNumber + 1,
              content: line.trim(),
              fullLine: line
            });
          }
        });
      });

      return results;
    }

    function displayModalResults(results, searchTerm) {
      const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);

      if (results.length === 0) {
        modalTitle.innerHTML = `<i class="fas fa-search"></i> No Results Found`;
        modalContent.innerHTML = `
          <div class="no-results" style="padding: 40px;">
            <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 20px; color: #ff6b39;"></i>
            <div>No results found for "${searchTerm}"</div>
            <div style="font-size: 0.9rem; margin-top: 10px; color: #777;">Try different keywords or check your spelling</div>
          </div>
        `;
        modalFooter.innerHTML = '';
        return;
      }

      const groupedResults = {};
      results.forEach(result => {
        if (!groupedResults[result.fileName]) {
          groupedResults[result.fileName] = [];
        }
        groupedResults[result.fileName].push(result);
      });

      modalTitle.innerHTML = `<i class="fas fa-search"></i> Search Results for "${searchTerm}"`;

      let html = '';

      Object.keys(groupedResults).forEach(fileName => {
        const fileResults = groupedResults[fileName];
        const tabName = getTabDisplayName(fileName);
        const iconClass = getTabIcon(fileName);

        html += `
          <div style="margin-bottom: 25px;">
            <h3 style="color: #ff8c5a; display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #3a3939;">
              <i class="fas ${iconClass}"></i>
              ${tabName}
              <span style="font-size: 1rem; color: #a0a0a0; font-weight: normal;">(${fileResults.length} matches)</span>
            </h3>
        `;

        fileResults.forEach(result => {
          let highlightedContent = result.content;
          searchTerms.forEach(term => {
            const regex = new RegExp(`(${term})`, 'gi');
            highlightedContent = highlightedContent.replace(regex, '<mark style="background: #ff6b39; color: white; padding: 2px 4px; border-radius: 3px;">$1</mark>');
          });

          html += `
            <div class="search-result-item">
              <div class="result-header">
                <div class="result-file">
                  <i class="fas ${iconClass}"></i>
                  ${tabName}
                </div>
                <div class="result-line">Line ${result.lineNumber}</div>
              </div>
              <div class="result-content">
                ${highlightedContent}
              </div>
              <div style="margin-top: 12px; text-align: right;">
                <button class="view-button" onclick="viewResultInTab('${fileName}')">
                  <i class="fas fa-external-link-alt"></i>
                  View in ${tabName}
                </button>
              </div>
            </div>
          `;
        });

        html += `</div>`;
      });

      modalContent.innerHTML = html;
      modalFooter.innerHTML = `${results.length} matches found across ${Object.keys(groupedResults).length} files`;
    }

    function viewResultInTab(fileName) {
      closeModal();
      switchToFile(fileName);
    }

    window.showSearchModal = showSearchModal;
    window.viewResultInTab = viewResultInTab;

    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeModal();
      }
    });

    loadContent('main');


window.switchToFile = switchToFile;
window.viewResultInTab = viewResultInTab;
})();
