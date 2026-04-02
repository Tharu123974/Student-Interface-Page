const app = {
    currentUser: null,

    REP_ASK: 5,
    REP_ANSWER: 10,
    REP_UPVOTE: 2,
    REP_DOWNVOTE: -1,

    init() {
        this.initTheme();
        this.initData();
        this.initAuth();
        this.updateUserNav();
    },

    initData() {

        if (!localStorage.getItem('sc_users')) {
            const initialUsers = [
                { id: 'u1', name: 'Alex', email: 'alex@test.com', password: '123', avatar: 'A', rep: 50 },
                { id: 'u2', name: 'Sam', email: 'sam@test.com', password: '123', avatar: 'S', rep: 120 },
                { id: 'u3', name: 'DatabaseGuru', email: 'db@test.com', password: '123', avatar: 'D', rep: 250 }
            ];
            localStorage.setItem('sc_users', JSON.stringify(initialUsers));
        }

        if (!localStorage.getItem('sc_questions')) {
            const initialQuestions = [
                {
                    id: 'q1',
                    title: 'How to implement a binary search tree in Vanilla JS?',
                    body: 'I am struggling with implementing the insert method for a BST. Can someone explain the recursive approach?',
                    topic: 'dsa',
                    author: { id: 'u1', name: 'Alex', avatar: 'A' },
                    votes: 4,
                    userVotes: {},
                    answers: [],
                    timestamp: new Date(Date.now() - 86400000).toISOString()
                },
                {
                    id: 'q2',
                    title: 'What is the exact difference between inner join and left join?',
                    body: 'I keep getting confused when to use which in my SQL queries. Help appreciated.',
                    topic: 'dbms',
                    author: { id: 'u2', name: 'Sam', avatar: 'S' },
                    votes: 12,
                    userVotes: {},
                    answers: [
                        {
                            id: 'a1',
                            body: 'Inner join returns only the matching rows from both tables. Left join returns all rows from the left table, and matching rows from the right table. If no match, it returns NULL for right table columns.',
                            author: { id: 'u3', name: 'DatabaseGuru', avatar: 'D' },
                            votes: 8,
                            userVotes: {},
                            timestamp: new Date().toISOString()
                        }
                    ],
                    timestamp: new Date(Date.now() - 172800000).toISOString()
                }
            ];
            localStorage.setItem('sc_questions', JSON.stringify(initialQuestions));
        }

        localStorage.removeItem('sc_user_rep');
    },

    initAuth() {
        const storedUser = localStorage.getItem('sc_currentUser');
        if (storedUser) {
            this.currentUser = JSON.parse(storedUser);
        } else {
            this.currentUser = null;
        }
    },

    getUsers() {
        return JSON.parse(localStorage.getItem('sc_users') || '[]');
    },

    saveUsers(users) {
        localStorage.setItem('sc_users', JSON.stringify(users));
    },

    login(email, password) {
        const users = this.getUsers();
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            this.currentUser = user;
            localStorage.setItem('sc_currentUser', JSON.stringify(user));
            return true;
        }
        return false;
    },

    signup(name, email, password) {
        const users = this.getUsers();
        if (users.find(u => u.email === email)) {
            return false; // Email exists
        }
        const newUser = {
            id: 'u_' + Date.now(),
            name,
            email,
            password,
            avatar: name.charAt(0).toUpperCase(),
            rep: 0
        };
        users.push(newUser);
        this.saveUsers(users);
        this.currentUser = newUser;
        localStorage.setItem('sc_currentUser', JSON.stringify(newUser));
        return true;
    },

    logout() {
        this.currentUser = null;
        localStorage.removeItem('sc_currentUser');
    },

    getQuestions() {
        // [BACKEND_API] GET /api/questions
        return JSON.parse(localStorage.getItem('sc_questions') || '[]');
    },

    getQuestionById(id) {
        // [BACKEND_API] GET /api/questions/:id
        const questions = this.getQuestions();
        return questions.find(q => q.id === id);
    },

    saveQuestion(title, body, topic) {
        if (!this.currentUser) return null;
        const questions = this.getQuestions();
        const newQuestion = {
            id: 'q_' + Date.now(),
            title,
            body,
            topic,
            author: { id: this.currentUser.id, name: this.currentUser.name, avatar: this.currentUser.avatar },
            votes: 0,
            userVotes: {},
            answers: [],
            timestamp: new Date().toISOString()
        };
        questions.unshift(newQuestion);
        localStorage.setItem('sc_questions', JSON.stringify(questions));
        this.addReputation(this.REP_ASK, this.currentUser.id);
        return newQuestion;
    },

    saveAnswer(questionId, body) {
        if (!this.currentUser) return null;
        const questions = this.getQuestions();
        const qIndex = questions.findIndex(q => q.id === questionId);
        if (qIndex > -1) {
            const newAnswer = {
                id: 'a_' + Date.now(),
                body,
                author: { id: this.currentUser.id, name: this.currentUser.name, avatar: this.currentUser.avatar },
                votes: 0,
                userVotes: {},
                timestamp: new Date().toISOString()
            };
            questions[qIndex].answers.push(newAnswer);
            localStorage.setItem('sc_questions', JSON.stringify(questions));
            this.addReputation(this.REP_ANSWER, this.currentUser.id);
            return newAnswer;
        }
        return null;
    },

    voteQuestion(questionId, value) {
        if (!this.currentUser) return;
        const questions = this.getQuestions();
        const qIndex = questions.findIndex(q => q.id === questionId);
        if (qIndex > -1) {
            const q = questions[qIndex];
            if (!q.userVotes) q.userVotes = {};
            const currentVote = q.userVotes[this.currentUser.id] || 0;

            if (currentVote === value) return; // Prevent double vote

            // Revert old vote if applicable
            q.votes -= currentVote;

            // Apply new vote
            q.votes += value;
            q.userVotes[this.currentUser.id] = value;

            localStorage.setItem('sc_questions', JSON.stringify(questions));

            // Adjust author's reputation
            const points = value > 0 ? this.REP_UPVOTE : this.REP_DOWNVOTE;
            if (currentVote !== 0) {
                // Changing vote (e.g., from +1 to -1)
                const revertPoints = currentVote > 0 ? -this.REP_UPVOTE : -this.REP_DOWNVOTE;
                this.addReputation(revertPoints + points, q.author.id);
            } else {
                this.addReputation(points, q.author.id);
            }
        }
    },

    voteAnswer(questionId, answerId, value) {
        if (!this.currentUser) return;
        const questions = this.getQuestions();
        const qIndex = questions.findIndex(q => q.id === questionId);
        if (qIndex > -1) {
            const aIndex = questions[qIndex].answers.findIndex(a => a.id === answerId);
            if (aIndex > -1) {
                const a = questions[qIndex].answers[aIndex];
                if (!a.userVotes) a.userVotes = {};
                const currentVote = a.userVotes[this.currentUser.id] || 0;

                if (currentVote === value) return;

                a.votes -= currentVote;
                a.votes += value;
                a.userVotes[this.currentUser.id] = value;

                localStorage.setItem('sc_questions', JSON.stringify(questions));

                const points = value > 0 ? this.REP_UPVOTE : this.REP_DOWNVOTE;
                if (currentVote !== 0) {
                    const revertPoints = currentVote > 0 ? -this.REP_UPVOTE : -this.REP_DOWNVOTE;
                    this.addReputation(revertPoints + points, a.author.id);
                } else {
                    this.addReputation(points, a.author.id);
                }
            }
        }
    },

    addReputation(points, userId) {
        if (!userId) return;
        const users = this.getUsers();
        const uIndex = users.findIndex(u => u.id === userId);
        if (uIndex > -1) {
            let newRep = users[uIndex].rep + points;
            users[uIndex].rep = Math.max(0, newRep); // Reputation min 0
            this.saveUsers(users);

            // Sync if it's the current user
            if (this.currentUser && this.currentUser.id === userId) {
                this.currentUser.rep = users[uIndex].rep;
                localStorage.setItem('sc_currentUser', JSON.stringify(this.currentUser));
                this.updateUserNav();
            }
        }
    },

    updateUserNav() {
        const userStatsContainers = document.querySelectorAll('.user-stats');
        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        userStatsContainers.forEach(container => {
            if (this.currentUser) {
                container.innerHTML = `
                    <span class="rep-badge">
                        <span class="rep-icon">🏆</span>
                        <span id="nav-rep-score">${this.currentUser.rep}</span>
                    </span>
                    <button class="theme-toggle" id="theme-toggle" aria-label="Toggle dark mode">
                        <span class="sun-icon" style="${theme === 'dark' ? 'display:none;' : 'display:inline;'}">☀️</span>
                        <span class="moon-icon" style="${theme === 'dark' ? 'display:inline;' : 'display:none;'}">🌙</span>
                    </button>
                    <div class="avatar">${this.currentUser.avatar}</div>
                    <button class="btn btn-icon-small logout-btn" title="Logout" style="margin-left: 8px;">🚪</button>
                `;
                const logoutBtn = container.querySelector('.logout-btn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', () => {
                        this.logout();
                        window.location.reload();
                    });
                }
            } else {
                container.innerHTML = `
                    <button class="theme-toggle" id="theme-toggle" aria-label="Toggle dark mode">
                        <span class="sun-icon" style="${theme === 'dark' ? 'display:none;' : 'display:inline;'}">☀️</span>
                        <span class="moon-icon" style="${theme === 'dark' ? 'display:inline;' : 'display:none;'}">🌙</span>
                    </button>
                    <a href="index.html#login-section" class="nav-link" style="margin-left: 16px;">Log in / Sign up</a>
                `;
            }

            // Must re-attach listener for dynamically inserted theme toggle
            const themeToggle = container.querySelector('.theme-toggle');
            if (themeToggle) {
                themeToggle.addEventListener('click', () => this.toggleTheme());
            }
        });
    },

    /**
     * UI & THEMING
     */
    initTheme() {
        const savedTheme = localStorage.getItem('sc_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcons(savedTheme);
    },

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('sc_theme', newTheme);
        this.updateThemeIcons(newTheme);
    },

    updateThemeIcons(theme) {
        const btns = document.querySelectorAll('.theme-toggle');
        btns.forEach(btn => {
            const sun = btn.querySelector('.sun-icon');
            const moon = btn.querySelector('.moon-icon');
            if (theme === 'dark') {
                if (sun) sun.style.display = 'none';
                if (moon) moon.style.display = 'inline';
            } else {
                if (sun) sun.style.display = 'inline';
                if (moon) moon.style.display = 'none';
            }
        });
    },

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'success' ? '✅' : '❌';
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

        container.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300); // Wait for transition
        }, 3000);
    },

    getTopicLabel(topic) {
        const topics = {
            'dsa': 'DSA',
            'dbms': 'DBMS',
            'os': 'OS',
            'math': 'Math',
            'general': 'General'
        };
        return topics[topic] || 'General';
    },

    createQuestionCardHTML(q) {
        const answersCount = q.answers ? q.answers.length : 0;
        return `
            <a href="question.html?id=${q.id}" class="question-card glass">
                <h3 class="card-title">${app.escapeHTML(q.title)}</h3>
                <p class="card-preview">${app.escapeHTML(q.body)}</p>
                <div class="card-footer">
                    <span class="topic-tag topic-${q.topic}">${app.getTopicLabel(q.topic)}</span>
                    <div class="card-metrics">
                        <span class="metric" title="Upvotes">👍 ${q.votes}</span>
                        <span class="metric" title="Answers">💬 ${answersCount}</span>
                    </div>
                </div>
            </a>
        `;
    },

    escapeHTML(str) {
        return str.replace(/[&<>'"]/g,
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    },

    /**
     * PAGE SPECIFIC INIT
     */
    initHomePage() {
        const container = document.getElementById('featured-questions-container');

        // Login / Signup Form Handlers
        const loginSection = document.getElementById('login-section');
        const showSignupBtn = document.getElementById('home-show-signup');
        const showLoginBtn = document.getElementById('home-show-login');
        const loginForm = document.getElementById('home-login-form');
        const signupForm = document.getElementById('home-signup-form');

        if (!this.currentUser && loginSection) {
            loginSection.style.display = 'block';

            showSignupBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                loginForm.style.display = 'none';
                signupForm.style.display = 'block';
            });

            showLoginBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                signupForm.style.display = 'none';
                loginForm.style.display = 'block';
            });

            loginForm?.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('home-login-email').value;
                const pass = document.getElementById('home-login-password').value;
                if (this.login(email, pass)) {
                    this.showToast('Logged in successfully!');
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    this.showToast('Invalid email or password', 'error');
                }
            });

            signupForm?.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('home-signup-name').value;
                const email = document.getElementById('home-signup-email').value;
                const pass = document.getElementById('home-signup-password').value;
                if (this.signup(name, email, pass)) {
                    this.showToast('Account created!');
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    this.showToast('Email already in use', 'error');
                }
            });
        }

        if (!container) return;

        // Simulate network delay for effect
        setTimeout(() => {
            const questions = this.getQuestions().slice(0, 3); // Get latest 3
            if (questions.length === 0) {
                container.innerHTML = '<p class="text-muted">No questions asked yet. Be the first!</p>';
                return;
            }
            container.innerHTML = questions.map(q => this.createQuestionCardHTML(q)).join('');
        }, 800);
    },

    initAskPage() {
        if (!this.currentUser) {
            window.location.href = 'index.html#login-section';
            return;
        }
        const form = document.getElementById('ask-form');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const btn = form.querySelector('button[type="submit"]');
            btn.innerHTML = '<span class="spinner"></span> Posting...';
            btn.disabled = true;

            const title = document.getElementById('q-title').value;
            const topic = document.getElementById('q-topic').value;
            const body = document.getElementById('q-body').value;

            // Simulate slight delay
            setTimeout(() => {
                const newQ = this.saveQuestion(title, body, topic);
                this.showToast(`Question posted successfully! +${this.REP_ASK} rep`);

                // Redirect after short delay
                setTimeout(() => {
                    window.location.href = `question.html?id=${newQ.id}`;
                }, 1500);
            }, 600);
        });
    },

    initQuestionsPage() {
        const container = document.getElementById('all-questions-container');
        const searchInput = document.getElementById('search-input');
        const filterBtns = document.querySelectorAll('.filter-btn');
        let currentFilter = 'all';

        const render = (searchQuery = '') => {
            let questions = this.getQuestions();

            if (currentFilter !== 'all') {
                questions = questions.filter(q => q.topic === currentFilter);
            }

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                questions = questions.filter(quest =>
                    quest.title.toLowerCase().includes(q) ||
                    quest.body.toLowerCase().includes(q)
                );
            }

            if (questions.length === 0) {
                container.innerHTML = '<div class="glass p-4 text-center">No questions found matching your criteria.</div>';
                return;
            }

            container.innerHTML = questions.map(q => this.createQuestionCardHTML(q)).join('');
        };

        // Network simulation
        setTimeout(() => render(), 500);

        // Search Listener
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                render(e.target.value);
            });
        }

        // Filter Listeners
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.topic;
                render(searchInput ? searchInput.value : '');
            });
        });
    },

    initQuestionDetailPage() {
        const urlParams = new URLSearchParams(window.location.search);
        const qId = urlParams.get('id');

        if (!qId) {
            window.location.href = 'index.html';
            return;
        }

        const q = this.getQuestionById(qId);
        const container = document.getElementById('question-detail-container');

        if (!q || !container) {
            if (container) container.innerHTML = '<h2>Question not found</h2><a href="questions.html">Back to questions</a>';
            return;
        }

        const qVote = (this.currentUser && q.userVotes) ? (q.userVotes[this.currentUser.id] || 0) : 0;

        // Render Question
        container.innerHTML = `
            <div class="q-detail-header" style="display:flex; gap: 20px;">
                <div class="vote-controls">
                    <button class="vote-btn upvote ${qVote === 1 ? 'active' : ''}" data-q-vote="1" title="Upvote this question">▲</button>
                    <span class="vote-count">${q.votes}</span>
                    <button class="vote-btn downvote ${qVote === -1 ? 'active' : ''}" data-q-vote="-1" title="Downvote this question">▼</button>
                </div>
                <div style="flex: 1;">
                    <h1 class="q-detail-title" style="margin-bottom: 16px;">${this.escapeHTML(q.title)}</h1>
                    <div class="q-meta">
                        <span class="topic-tag topic-${q.topic}">${this.getTopicLabel(q.topic)}</span>
                        <span>Asked on ${new Date(q.timestamp).toLocaleDateString()}</span>
                        <div class="q-author">
                            <div class="avatar-sm">${q.author.avatar}</div>
                            ${q.author.name}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="q-body">${this.escapeHTML(q.body)}</div>

            <div class="answers-section">
                <h2 class="answers-title">💬 ${q.answers.length} Answer${q.answers.length !== 1 ? 's' : ''}</h2>
                <div class="answers-list" id="answers-list">
                    ${q.answers.map(a => this.createAnswerHTML(a, q.id)).join('')}
                </div>
            </div>

            ${this.currentUser ? `
            <div class="glass" style="padding: 24px; margin-top: 40px; border-radius: var(--radius-lg);">
                <h3 style="margin-bottom: 16px;">Your Answer</h3>
                <form id="answer-form">
                    <div class="form-group">
                        <textarea id="answer-body" class="form-control" required placeholder="Write your detailed answer here..."></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">Post Answer</button>
                </form>
            </div>
            ` : `
            <div class="glass" style="padding: 24px; margin-top: 40px; border-radius: var(--radius-lg); text-align: center;">
                <p>Please <a href="index.html#login-section">log in</a> to answer this question.</p>
            </div>
            `}
        `;

        // Answer specific interactions wait for rendering
        const answerForm = document.getElementById('answer-form');
        if (answerForm) {
            answerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const body = document.getElementById('answer-body').value;

                const btn = answerForm.querySelector('button[type="submit"]');
                btn.innerHTML = 'Posting...';
                btn.disabled = true;

                setTimeout(() => {
                    this.saveAnswer(qId, body);
                    this.showToast(`Answer posted! +${this.REP_ANSWER} rep`);
                    setTimeout(() => window.location.reload(), 1000);
                }, 600);
            });
        }

        // Delegate voting events
        container.addEventListener('click', (e) => {
            const voteBtn = e.target.closest('.vote-btn');
            if (voteBtn) {
                if (!this.currentUser) {
                    this.showToast('Please log in to vote', 'error');
                    return;
                }
                const aId = voteBtn.dataset.answerId;
                const value = parseInt(voteBtn.dataset.val);
                const isQVote = voteBtn.hasAttribute('data-q-vote');

                if (isQVote) {
                    const qVal = parseInt(voteBtn.dataset.qVote);
                    this.voteQuestion(qId, qVal);
                    setTimeout(() => window.location.reload(), 200);
                } else if (aId) {
                    this.voteAnswer(qId, aId, value);
                    setTimeout(() => window.location.reload(), 200);
                }
            }
        });
    },

    createAnswerHTML(a, qId) {
        const aVote = (this.currentUser && a.userVotes) ? (a.userVotes[this.currentUser.id] || 0) : 0;
        return `
            <div class="answer-card glass">
                <div class="vote-controls">
                    <button class="vote-btn upvote ${aVote === 1 ? 'active' : ''}" data-answer-id="${a.id}" data-val="1" title="Upvote this answer">▲</button>
                    <span class="vote-count">${a.votes}</span>
                    <button class="vote-btn downvote ${aVote === -1 ? 'active' : ''}" data-answer-id="${a.id}" data-val="-1" title="Downvote this answer">▼</button>
                </div>
                <div class="answer-content">
                    <div class="answer-body">${this.escapeHTML(a.body)}</div>
                    <div class="answer-meta">
                        <div class="author-card">
                            <span>Answered on ${new Date(a.timestamp).toLocaleDateString()}</span>
                            <div class="author-info">
                                <div class="avatar-sm">${a.author.avatar}</div>
                                <strong>${a.author.name}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};

// Global App Initialization
app.init();
