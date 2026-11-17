(function(){
'use strict';
const __realDoc = window.document;
const __root = __realDoc.getElementById('view-wiki');
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

    let itemsData = [];

    const grid = document.getElementById('itemGrid');
    grid.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Loading wiki data...</p></div>';

    fetch('assets/data/wiki.json')
      .then(response => response.json())
      .then(data => {
        itemsData = data;

        setTimeout(() => {
          renderItems(itemsData);
          initArticleOfTheDay();

          const searchInput = document.getElementById('searchInput');
          let searchTimeout;

          searchInput.addEventListener('input', e => {
            const searchTerm = e.target.value;


            clearTimeout(searchTimeout);


            searchTimeout = setTimeout(() => {
              const filteredItems = performSearch(searchTerm);
              renderItems(filteredItems, searchTerm);
            }, 150);
          });


          let searchCache = {};


          function performSearch(searchTerm) {
            if (!searchTerm) return itemsData;

            const term = searchTerm.toLowerCase().trim();
            if (!term) return itemsData;


            if (searchCache[term]) {
              return searchCache[term];
            }


            const scoredItems = itemsData.map(item => {
              let score = 0;


              if (item.title) {
                const titleMatch = fuzzyMatch(item.title.toLowerCase(), term);
                if (titleMatch.score > 0) score += titleMatch.score * 3;
              }


              if (item.tag) {
                const tagMatch = fuzzyMatch(item.tag.toLowerCase(), term);
                if (tagMatch.score > 0) score += tagMatch.score * 2;
              }


              if (item.description) {
                const descMatch = fuzzyMatch(item.description.toLowerCase(), term);
                if (descMatch.score > 0) score += descMatch.score;
              }


              if (item.content) {

                const contentToSearch = item.content.length > 500 ? item.content.substring(0, 500) : item.content;
                const contentMatch = fuzzyMatch(contentToSearch.toLowerCase(), term);
                if (contentMatch.score > 0) score += contentMatch.score * 0.5;
              }

              return { item, score };
            });


            const results = scoredItems
              .filter(result => result.score > 0)
              .sort((a, b) => b.score - a.score)
              .map(result => result.item);


            if (Object.keys(searchCache).length > 50) {

              searchCache = {};
            }
            searchCache[term] = results;

            return results;
          }


          function fuzzyMatch(str, pattern) {
            if (!pattern || !str) return { score: 0, matchedIndices: [] };

            let score = 0;
            let patternIdx = 0;
            let strIdx = 0;
            let matches = [];
            let consecutiveMatches = 0;

            while (strIdx < str.length && patternIdx < pattern.length) {
              const strChar = str[strIdx];
              const patternChar = pattern[patternIdx];

              if (strChar === patternChar) {
                matches.push(strIdx);
                score += 1 + consecutiveMatches;
                consecutiveMatches++;
                patternIdx++;
              } else {
                consecutiveMatches = 0;
              }

              strIdx++;
            }


            return patternIdx === pattern.length
              ? { score: score, matchedIndices: matches }
              : { score: 0, matchedIndices: [] };
          }
        }, 500);
      });

    function updateStats() {
      const articlesCount = itemsData.length;
      const guidesCount = itemsData.filter(item => item.tag.toLowerCase().includes('guide') || item.title.toLowerCase().includes('guide')).length;
      const categories = [...new Set(itemsData.map(item => item.tag))];
      const categoriesCount = categories.length;

      document.getElementById('articlesCount').textContent = articlesCount;
      document.getElementById('guidesCount').textContent = guidesCount;
      document.getElementById('categoriesCount').textContent = categoriesCount;

      const statItems = document.querySelectorAll('.stat-item');
      statItems.forEach((item, index) => {
        setTimeout(() => {
          item.classList.add('animate-in');
        }, 200 * index);
      });
    }

    function renderItems(items, searchTerm = '') {
      const grid = document.getElementById('itemGrid');

      if (!items || items.length === 0) {
        grid.innerHTML = '<div class="no-results"><i class="fas fa-search" style="font-size: 3rem; margin-bottom: 16px;"></i><h3>No results found</h3><p>Try a different search term or category</p></div>';
        return;
      }

      grid.innerHTML = '';

      items.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'item-card';
        itemElement.style.animationDelay = `${index * 0.1}s`;


        let shortContent = item.content;
        if (item.content.length > 200) {
          shortContent = item.content.substring(0, 200) + '...';
        }


        let highlightedTitle = item.title;
        let highlightedDescription = item.description;
        let highlightedContent = shortContent;

        if (searchTerm) {
          highlightedTitle = highlightSearchTerms(item.title, searchTerm);
          highlightedDescription = highlightSearchTerms(item.description, searchTerm);
          highlightedContent = highlightSearchTerms(shortContent, searchTerm);
        }

        itemElement.innerHTML = `
          <div class="item-header">
            <h3 class="item-title">${highlightedTitle}</h3>
            <span class="item-tag">${item.tag}</span>
          </div>
          <p class="item-description">${highlightedDescription}</p>
          <div class="item-content-limited">${highlightedContent}</div>
          <div class="read-more">Read more</div>
        `;

        itemElement.addEventListener('click', function(e) {
          if (!e.target.classList.contains('read-more')) {
            openArticleModal(item, searchTerm);
          }
        });

        const readMore = itemElement.querySelector('.read-more');
        if (readMore) {
          readMore.addEventListener('click', function() {
            openArticleModal(item, searchTerm);
          });
        }

        grid.appendChild(itemElement);
      });

      updateStats();
    }

    function formatContent(content) {
      const lines = content.split('\n');

      let formattedContent = '';
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line === '') {
          continue;
        }

        if (line.includes(':') && /^[A-Z]/.test(line)) {
          const colonIndex = line.indexOf(':');
          const header = line.substring(0, colonIndex);
          const value = line.substring(colonIndex + 1).trim();

          formattedContent += `<div class="item-property"><span class="property-key">${header}:</span> <span class="property-value">${value}</span></div>`;
        } else {
          formattedContent += `<p>${line}</p>`;
        }
      }

      return formattedContent;
    }


    function highlightSearchTerms(text, searchTerm) {
      if (!searchTerm || !text) return text;


      const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\$&');


      const regex = new RegExp(`(${escapedTerm})`, 'gi');


      return text.replace(regex, '<span class="highlight-search">$1</span>');
    }

    function openArticleModal(item, searchTerm = '') {

      const modalTitle = searchTerm ? highlightSearchTerms(item.title, searchTerm) : item.title;
      const modalDescription = searchTerm ? highlightSearchTerms(item.description, searchTerm) : item.description;
      const modalContent = searchTerm ? highlightSearchTerms(formatContent(item.content), searchTerm) : formatContent(item.content);

      document.getElementById('modalTitle').innerHTML = modalTitle;
      document.getElementById('modalCategory').textContent = item.tag;
      document.getElementById('modalDescription').innerHTML = modalDescription;
      document.getElementById('modalContent').innerHTML = modalContent;

      const imageContainer = document.getElementById('modalImageContainer');
      const imageElement = document.getElementById('modalImage');

      if (item.image) {
        imageElement.src = item.image;
        imageContainer.style.display = 'block';
      } else {
        imageContainer.style.display = 'none';
      }

      document.getElementById('articleModal').style.display = 'block';
    }

    document.getElementById('closeArticleModal').addEventListener('click', function() {
      const modal = document.getElementById('articleModal');
      modal.style.display = 'none';
      modal.classList.remove('display-flex');
    });

    document.getElementById('closeGuidesModal').addEventListener('click', function() {
      const modal = document.getElementById('guidesModal');
      modal.style.display = 'none';
      modal.classList.remove('display-flex');
    });




    window.addEventListener('click', function(event) {
      const articleModal = document.getElementById('articleModal');
      const guidesModal = document.getElementById('guidesModal');
      const aiAssistantModal = document.getElementById('aiAssistantModal');

      if (event.target === articleModal) {
        articleModal.style.display = 'none';
        articleModal.classList.remove('display-flex');
      }

      if (event.target === guidesModal) {
        guidesModal.style.display = 'none';
        guidesModal.classList.remove('display-flex');
      }

      if (event.target === aiAssistantModal) {
        aiAssistantModal.style.display = 'none';
        aiAssistantModal.classList.remove('display-flex');
      }
    });

    document.addEventListener('DOMContentLoaded', function() {
      const exploreBtn = document.getElementById('exploreBtn');
      const guidesBtn = document.getElementById('guidesBtn');

      if (exploreBtn) {
        exploreBtn.addEventListener('click', function() {
          window.FacetTools.open('ai-assistant');
        });
      }

      if (guidesBtn) {
        guidesBtn.addEventListener('click', function() {
          showGuidesModal();
        });
      }
    });

    function showGuidesModal() {
      const guidesContent = document.getElementById('guidesContent');

      guidesContent.innerHTML = '<div style="text-align: center; padding: 40px 20px;"><h3 style="color: #f78c5a; margin-bottom: 20px;">Coming Soon</h3><p style="color: #bbb; font-size: 1.1rem;">Guides section will be available in a future update.</p></div>';

      document.getElementById('guidesModal').style.display = 'block';
    }

    function getArticleOfTheDay(items) {
      if (!items || items.length === 0) return null;

      const today = new Date();
      const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

      let hash = 0;
      for (let i = 0; i < dateStr.length; i++) {
        const char = dateStr.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }


      const index = Math.abs(hash) % items.length;
      return items[index];
    }

    function displayArticleOfTheDay() {
      const articleOfTheDayContent = document.getElementById('articleOfTheDayContent');

      if (itemsData && itemsData.length > 0) {
        const articleOfTheDay = getArticleOfTheDay(itemsData);

        if (articleOfTheDay) {
          let shortContent = articleOfTheDay.content;
          if (articleOfTheDay.content.length > 150) {
            shortContent = articleOfTheDay.content.substring(0, 150) + '...';
          }

          articleOfTheDayContent.innerHTML = `
            <div class="aot-item">
              <div class="aot-header">
                <h3 class="aot-title-item">${articleOfTheDay.title}</h3>
                <span class="aot-tag">${articleOfTheDay.tag}</span>
              </div>
              <p class="aot-description">${articleOfTheDay.description}</p>
              <div class="aot-content">${shortContent}</div>
            </div>
          `;
        }
      } else {
        articleOfTheDayContent.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">No articles available.</p>';
      }
    }

    function initArticleOfTheDay() {
      if (itemsData && itemsData.length > 0) {
        displayArticleOfTheDay();
      } else {
        const checkData = setInterval(() => {
          if (itemsData && itemsData.length > 0) {
            clearInterval(checkData);
            displayArticleOfTheDay();
          }
        }, 100);
      }
    }


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

    document.addEventListener('DOMContentLoaded', initArticleOfTheDay);


})();
