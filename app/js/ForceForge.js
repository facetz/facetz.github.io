(function(){
'use strict';
const __realDoc = window.document;
const __root = __realDoc.getElementById('tool-ForceForge');
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

    const input = document.getElementById('input');
    const send = document.getElementById('send');
    const messages = document.getElementById('messages');
    const fileCount = document.getElementById('fileCount');
    const runExampleBtn = document.getElementById('runExample');
    const clearChatBtn = document.getElementById('clearChat');
    const reloadContextBtn = document.getElementById('reloadContext');
    const statusIndicator = document.getElementById('status');

    const docs = [];

    const extraInfo = `Application Context:
You are ForceForge coder, your job is to help the user with coding with the bloxd.io api.
Do not use markdown, Try to give the best code. try to Talk less but give a short overview of what you are going to do.
make sure to give the code in one code block.
`;

    async function loadMarkdownFiles() {
      statusIndicator.className = 'status-indicator status-loading';
      statusIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading';

      const fileNames = [
        'assets/data/iframes/md/CALLBACKS.md',
        'assets/data/iframes/md/CLIENT_OPTIONS.md',
        'assets/data/iframes/md/ENTITY_SETTINGS.md',
        'assets/data/iframes/md/MOB_SETTINGS.md',
        'assets/data/iframes/md/EXTRA.md',
        'assets/data/iframes/md/PARTICLES.md'
      ];

      docs.length = 0;

      for (const fileName of fileNames) {
        try {
          const response = await fetch(fileName);
          if (response.ok) {
            const text = await response.text();
            docs.push({
              name: fileName.split('/').pop(),
              text: text
            });
          } else {
            console.warn(`Failed to load ${fileName}: ${response.status}`);
          }
        } catch (err) {
          console.error(`Error loading ${fileName}:`, err);
        }
      }

      statusIndicator.className = 'status-indicator status-loaded';
      statusIndicator.innerHTML = '<i class="fas fa-check-circle"></i> Loaded';
      if (fileCount) fileCount.innerHTML = '<i class="fas fa-file-alt"></i> ' + `${docs.length} files`;
    }

    loadMarkdownFiles();

    function createCodeBlock(code, language = 'javascript') {
      const codeBlock = document.createElement('div');
      codeBlock.className = 'code-block';

      const header = document.createElement('div');
      header.className = 'code-header';

      const langSpan = document.createElement('span');
      langSpan.className = 'code-lang';

      let langIcon = 'fas fa-code';
      if (language === 'javascript' || language === 'js') langIcon = 'fab fa-js';
      else if (language === 'typescript' || language === 'ts') langIcon = 'fab fa-js';
      else if (language === 'python' || language === 'py') langIcon = 'fab fa-python';
      else if (language === 'html') langIcon = 'fab fa-html5';
      else if (language === 'css') langIcon = 'fab fa-css3';
      else if (language === 'json') langIcon = 'fas fa-brackets-curly';

      langSpan.innerHTML = `<i class="${langIcon}"></i> ${language}`;

      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(code);
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
        }, 2000);
      };

      header.appendChild(langSpan);
      header.appendChild(copyBtn);

      const content = document.createElement('div');
      content.className = 'code-content';
      content.textContent = code;

      codeBlock.appendChild(header);
      codeBlock.appendChild(content);

      return codeBlock;
    }

    function formatMessage(text) {
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = codeBlockRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(document.createTextNode(text.substring(lastIndex, match.index)));
        }

        const language = match[1] || 'text';
        const code = match[2].trim();
        parts.push(createCodeBlock(code, language));

        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < text.length) {
        parts.push(document.createTextNode(text.substring(lastIndex)));
      }

      return parts;
    }

    function appendMessage(text, cls = 'ai') {
      const msgEl = document.createElement('div');
      msgEl.className = 'msg ' + cls;

      const formattedContent = formatMessage(text);
      formattedContent.forEach(part => msgEl.appendChild(part));

      messages.appendChild(msgEl);
      messages.scrollTop = messages.scrollHeight;

      return msgEl;
    }

    async function sendPrompt(userText) {
      if (!userText.trim()) return;
      appendMessage(userText, 'user');

      const fileList = docs.map(d => d.name).join(', ');

      const selectorPrompt = `
You are a document selector for Bloxd.io coding docs.
The user asked: "${userText}"
Here is the list of files available: ${fileList}
Which files are likely needed to answer this question? Respond with the file names only, separated by commas.
`;

      const loadingMsg = appendMessage('Analyzing which documentation files are most relevant...', 'ai');
      if (loadingMsg) {
        loadingMsg.classList.add('thinking');
      }

      try {
        const selectionResponse = await puter.ai.chat(selectorPrompt);
        let selectedFilesText = '';

        if (typeof selectionResponse === 'string') {
          selectedFilesText = selectionResponse;
        } else if (selectionResponse && typeof selectionResponse === 'object') {
          if (selectionResponse.message && selectionResponse.message.content) {
            selectedFilesText = selectionResponse.message.content;
          } else if (selectionResponse.text) {
            selectedFilesText = selectionResponse.text;
          } else if (selectionResponse.content) {
            selectedFilesText = selectionResponse.content;
          } else {
            selectedFilesText = JSON.stringify(selectionResponse);
          }
        } else {
          selectedFilesText = String(selectionResponse);
        }

        const selectedFileNames = selectedFilesText
          .split(',')
          .map(name => name.trim())
          .filter(name => name.length > 0);

        const selectedDocs = docs.filter(d =>
          d.name === 'EXTRA.md' ||
          d.name === 'SIMPLES.md' ||
          selectedFileNames.some(selectedName =>
            d.name.toLowerCase() === selectedName.toLowerCase()
          )
        );

        const filesConcat = selectedDocs.map(d => `--- ${d.name} ---\n${d.text}`).join('\n\n');
        const extras = extraInfo || '';
        const promptParts = [];
        if (filesConcat) promptParts.push('CONTEXT:\n' + filesConcat);
        if (extras) promptParts.push('SYSTEM CONTEXT:\n' + extras);
        promptParts.push('USER QUESTION:\n' + userText);
        const prompt = promptParts.join('\n\n');

        if (loadingMsg) {
          loadingMsg.textContent = 'One sec, Melting... Forging... Cooling...';
        }

        const response = await puter.ai.chat(prompt);

        if (loadingMsg) {
          loadingMsg.remove();
        }

        let text = '';
        if (typeof response === 'string') {
          text = response;
        } else if (response && typeof response === 'object') {
          if (response.message && response.message.content) {
            text = response.message.content;
          } else if (response.text) {
            text = response.text;
          } else if (response.content) {
            text = response.content;
          } else {
            text = JSON.stringify(response);
          }
        } else {
          text = String(response);
        }

        appendMessage(text, 'ai');
      } catch (err) {
        const last = messages.querySelectorAll('.msg.ai.thinking'); if (last.length) last[last.length - 1].remove();
        appendMessage('Error: ' + err.message, 'ai');
        console.error(err);
      }
    }

    send.addEventListener('click', () => { sendPrompt(input.value); input.value = ''; input.focus(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send.click(); } });

    runExampleBtn.onclick = () => {
      input.value = 'How can I create an aura effect around the player with particles?'; send.click();
    }

    clearChatBtn.onclick = () => { messages.innerHTML = ''; }

    if (reloadContextBtn) reloadContextBtn.onclick = () => {
      messages.innerHTML = '';
      loadMarkdownFiles();
      appendMessage('Context files reloaded successfully!', 'ai');
    }

    const demoMsg = appendMessage('I have automatically loaded documentation files as context. Ask me anything about the available documentation!', 'ai');
    if (demoMsg) {
      demoMsg.classList.add('thinking');
      setTimeout(() => {
        demoMsg.classList.remove('thinking');
      }, 3000);
    }


})();
