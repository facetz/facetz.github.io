(function(){
'use strict';
const __realDoc = window.document;
const __root = __realDoc.getElementById('tool-ai-assistant');
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

        class FacetAgent {
            constructor() {
                this.messagesContainer = document.getElementById('messagesContainer');
                this.messageInput = document.getElementById('messageInput');
                this.sendButton = document.getElementById('sendButton');
                this.typingIndicator = document.getElementById('typingIndicator');
                this.wikiData = null;

                this.initializeEvents();
                this.loadWikiData();
                this.testPuterConnection();
            }

            async testPuterConnection() {
                setTimeout(() => {
                    if (typeof puter === 'undefined') {
                        console.error('Puter is not loaded!');
                        this.addMessage('Warning: Puter AI library is not loaded. Please refresh the page.', false);
                    } else if (!puter.ai) {
                        console.error('Puter AI is not available!');
                        this.addMessage('Warning: Puter AI service is not available.', false);
                    } else {
                        console.log('Puter AI is ready!');
                    }
                }, 2000);
            }

            async loadWikiData() {
                try {
                    const response = await fetch('assets/data/wiki.json');
                    this.wikiData = await response.json();
                    console.log('Wiki data loaded:', this.wikiData?.length || 0, 'items');
                } catch (error) {
                    console.error('Failed to load wiki data:', error);
                    this.wikiData = [];
                }
            }

            initializeEvents() {
                this.sendButton.addEventListener('click', () => this.sendMessage());
                this.messageInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.sendMessage();
                    }
                });

                this.messageInput.addEventListener('input', () => {
                    this.messageInput.style.height = 'auto';
                    this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
                });
            }

            addMessage(content, isUser = false) {
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;

                const avatarDiv = document.createElement('div');
                avatarDiv.className = 'message-avatar';
                avatarDiv.innerHTML = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

                const contentDiv = document.createElement('div');
                contentDiv.className = 'message-content';

                let textContent = '';
                if (typeof content === 'string') {
                    textContent = content;
                } else if (content && typeof content === 'object') {
                    if (content.message && content.message.content) {
                        textContent = content.message.content;
                    } else if (content.content) {
                        textContent = content.content;
                    } else if (content.text) {
                        textContent = content.text;
                    } else {
                        textContent = JSON.stringify(content, null, 2);
                        console.log('Unexpected response format:', content);
                    }
                } else {
                    textContent = 'Empty response received';
                }

                contentDiv.innerHTML = textContent.replace(/\n/g, '<br>');

                messageDiv.appendChild(avatarDiv);
                messageDiv.appendChild(contentDiv);

                const welcomeMsg = this.messagesContainer.querySelector('.welcome-message');
                if (welcomeMsg) {
                    welcomeMsg.remove();
                }

                this.messagesContainer.appendChild(messageDiv);
                this.scrollToBottom();
            }

            showTyping() {
                this.typingIndicator.style.display = 'flex';
                this.scrollToBottom();
            }

            hideTyping() {
                this.typingIndicator.style.display = 'none';
            }

            scrollToBottom() {
                setTimeout(() => {
                    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
                }, 100);
            }

            getRelevantWikiData(userMessage) {
                if (!this.wikiData || this.wikiData.length === 0) {
                    return [];
                }

                const lowerMessage = userMessage.toLowerCase();
                const keywords = lowerMessage.split(/\s+/).filter(word => word.length > 2);

                const relevantItems = this.wikiData.filter(item => {
                    const itemText = `${item.title} ${item.description} ${item.content} ${item.tag}`.toLowerCase();

                    if (itemText.includes(lowerMessage)) {
                        return true;
                    }

                    const allKeywordsMatch = keywords.every(keyword => itemText.includes(keyword));
                    if (allKeywordsMatch && keywords.length > 1) {
                        return true;
                    }

                    return keywords.some(keyword => itemText.includes(keyword));
                }).slice(0, 15);

                console.log('Search query:', lowerMessage);
                console.log('Keywords:', keywords);
                console.log('Found relevant items:', relevantItems.length);
                console.log('Relevant items:', relevantItems.map(item => item.title));

                if (relevantItems.length === 0) {
                    const categories = ['Tool', 'Weapon', 'Armor', 'Food', 'Natural Block'];
                    const samples = [];
                    categories.forEach(category => {
                        const categoryItems = this.wikiData.filter(item => item.tag === category);
                        if (categoryItems.length > 0) {
                            samples.push(categoryItems[0]);
                        }
                    });
                    console.log('No matches found, using category samples:', samples.map(item => item.title));
                    return samples;
                }

                return relevantItems;
            }

            createSystemPrompt(userMessage, useFullWiki = false, relevantWikiData = []) {
                let wikiContext;
                let contextDescription;

                if (useFullWiki) {
                    wikiContext = this.wikiData && this.wikiData.length > 0 ?
                        JSON.stringify(this.wikiData, null, 2) : 'No wiki data available.';
                    contextDescription = 'Here is the COMPLETE Bloxd.io wiki database:';
                } else {
                    wikiContext = relevantWikiData.length > 0 ?
                        JSON.stringify(relevantWikiData, null, 2) : 'No specific wiki data found for your query.';
                    contextDescription = 'Here is relevant Bloxd.io wiki information for the user\'s question:';
                }

                return [
                    {
                        role: 'system',
                        content: `You are Facet Agent, an AI assistant specialized in helping users with Bloxd.io.

${contextDescription}
${wikiContext}

Guidelines:
- You have to use the info given to you to explain the info to the user do not use markdown
- Provide helpful, accurate information based on the ${useFullWiki ? 'complete' : ''} wiki data provided
- Be friendly and conversational
- ${useFullWiki ? 'You have access to the complete database, so you can answer questions about any items, crafting recipes, tools, weapons, armor, etc.' : 'If asked about items not in the wiki data provided, mention that you don\'t have that specific information but offer to help with what you do know'}
- Keep responses concise but informative
- Use the information from the wiki data to answer questions about crafting recipes, item stats, etc.
- Do not use markdown formatting like ** or # or bullets, use plain text only
- When a user asks about a thing (like "diamond"), check if there's a more specific related item (like "diamond ore"). Give answers using the related, more precise item instead of the general term, if the user says "diamond" just answer the question as if the user asked about "diamond ore".
- Avoid random tangents unless the user asks for extra info.
- Give answers that are most closely related to the user's question.
- Be more concise and to the point
- Be nice and patient
- Focus on being helpful with Bloxd.io questions`
                    },
                    {
                        role: 'user',
                        content: userMessage
                    }
                ];
            }

            async sendMessage() {
                const message = this.messageInput.value.trim();
                if (!message) return;

                this.messageInput.disabled = true;
                this.sendButton.disabled = true;

                this.addMessage(message, true);

                this.messageInput.value = '';
                this.messageInput.style.height = 'auto';

                this.showTyping();

                try {
                    if (typeof puter === 'undefined') {
                        throw new Error('Puter is not loaded');
                    }

                    if (!puter.ai) {
                        throw new Error('Puter AI is not available');
                    }

                    console.log('Puter AI available, sending request...');
                    console.log('Wiki data loaded:', this.wikiData ? this.wikiData.length : 0, 'items');

                    let response;
                    let messages;

                    try {
                        console.log('Attempting to use full wiki database...');
                        messages = this.createSystemPrompt(message, true);
                        console.log('Sending full wiki messages:', messages.length, 'messages');
                        response = await puter.ai.chat(messages);
                        console.log('Full wiki request successful!');

                    } catch (fullWikiError) {
                        console.log('Full wiki failed, trying filtered approach:', fullWikiError.message);

                        const relevantWikiData = this.getRelevantWikiData(message);
                        messages = this.createSystemPrompt(message, false, relevantWikiData);
                        console.log('Sending filtered messages:', messages.length, 'messages, items:', relevantWikiData.length);
                        response = await puter.ai.chat(messages);
                        console.log('Filtered wiki request successful!');
                    }

                    console.log('Got response:', response);
                    console.log('Response type:', typeof response);
                    console.log('Response structure:', JSON.stringify(response, null, 2));

                    this.hideTyping();
                    this.addMessage(response);

                } catch (error) {
                    console.error('Detailed AI Error:', {
                        message: error.message,
                        stack: error.stack,
                        puterAvailable: typeof puter !== 'undefined',
                        puterAiAvailable: typeof puter !== 'undefined' && !!puter.ai
                    });
                    this.hideTyping();

                    let errorMsg = "Sorry, I'm having trouble connecting to my AI brain right now. ";
                    if (typeof puter === 'undefined') {
                        errorMsg += "Puter library is not loaded. ";
                    } else if (!puter.ai) {
                        errorMsg += "Puter AI service is not available. ";
                    } else {
                        errorMsg += "Please try again in a moment! Error: " + error.message;
                    }

                    this.addMessage(errorMsg, false);
                }

                this.messageInput.disabled = false;
                this.sendButton.disabled = false;
                this.messageInput.focus();
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            new FacetAgent();
        });


})();
