(function(){
'use strict';
const __realDoc = window.document;
const __root = __realDoc.getElementById('view-creator');
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

    document.querySelectorAll('.big-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.url.split('/').pop().replace('.html', '');
        window.FacetTools.open(tool);
      });
    });



    document.addEventListener('DOMContentLoaded', function () {
      const welcomeMessage = document.getElementById('welcome-message');
      const hasVisited = localStorage.getItem('hasVisitedCreator');

      if (!hasVisited) {
        welcomeMessage.textContent = "You seem like a new one huh.";
        localStorage.setItem('hasVisitedCreator', 'true');
      } else {
        const random = Math.random();
        if (random < 0.2) {
          const hour = new Date().getHours();
          const minute = new Date().getMinutes().toString().padStart(2, '0');
          welcomeMessage.textContent = `Is it ${hour}:${minute}?`;
        } else {
          const spookyMessages = [
            "You've been here before",
            "I see you again...",
            "Back for more creation?",
            "The creator awakens...",
            "Your presence is noted.",
            "Another session of creation?",
            "The tools await your command.",
            "We've been expecting you.",
            "Im not alive or anything.",
            "Welcome back, creator.",
          ];
          const randomMessage = spookyMessages[Math.floor(Math.random() * spookyMessages.length)];
          welcomeMessage.textContent = randomMessage;
        }
      }
      const carouselSlides = document.querySelectorAll('.carousel-slide');
      const indicators = document.querySelectorAll('.indicator');
      const prevBtn = document.querySelector('.prev-btn');
      const nextBtn = document.querySelector('.next-btn');
      let currentIndex = 0;

      function showSlide(index) {
        carouselSlides.forEach((slide, i) => {
          if (i === index) {
            slide.style.opacity = '0';
            slide.style.transform = 'translateX(100%)';
            slide.classList.add('active');

            setTimeout(() => {
              slide.style.opacity = '1';
              slide.style.transform = 'translateX(0)';
            }, 10);
          } else {
            slide.classList.remove('active');
            slide.style.opacity = '0';
            slide.style.transform = 'translateX(-100%)';
          }
        });

        indicators.forEach((indicator, i) => {
          if (i === index) {
            indicator.classList.add('active');
          } else {
            indicator.classList.remove('active');
          }
        });

        currentIndex = index;
      }

      nextBtn.addEventListener('click', function () {
        const nextIndex = (currentIndex + 1) % carouselSlides.length;
        showSlide(nextIndex);
      });

      prevBtn.addEventListener('click', function () {
        const prevIndex = (currentIndex - 1 + carouselSlides.length) % carouselSlides.length;
        showSlide(prevIndex);
      });

      indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', function () {
          showSlide(index);
        });
      });

      setInterval(() => {
        const nextIndex = (currentIndex + 1) % carouselSlides.length;
        showSlide(nextIndex);
      }, 5000);
    });


    function handleEscapeKey() {
      window.FacetTools.close();
      return false;
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleEscapeKey();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleEscapeKey();
      }
    });



})();
