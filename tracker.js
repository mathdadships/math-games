// ============================================
// Math Games - Student Tracking Module
// Shared across all 28 games + hub page
// ============================================

const SUPABASE_URL = 'https://pnarndrlkkrzqvbnmahh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_8ZmsmQ2JV7m3cwGOUbGiIg_UM6gw17d';

const GameTracker = {
    // Get current student from localStorage (persists across tabs/sessions)
    getStudent() {
        const data = localStorage.getItem('mathgames_student');
        return data ? JSON.parse(data) : null;
    },

    // Save student to localStorage
    setStudent(student) {
        localStorage.setItem('mathgames_student', JSON.stringify(student));
    },

    // Clear student session
    logout() {
        localStorage.removeItem('mathgames_student');
    },

    // Check if student is logged in
    isLoggedIn() {
        return this.getStudent() !== null;
    },

    // Register or find student, returns student object
    async login(firstName, classCode) {
        // Sanitize: strip HTML/scripts, allow only letters, numbers, spaces, hyphens
        const trimmedName = firstName.trim().replace(/<[^>]*>/g, '').replace(/[^a-zA-Z0-9\s\-']/g, '').substring(0, 30);
        const trimmedCode = classCode.trim().toUpperCase().replace(/<[^>]*>/g, '').replace(/[^A-Z0-9\-]/g, '').substring(0, 10);

        if (!trimmedName || !trimmedCode) {
            throw new Error('Please enter both your name and class code.');
        }

        if (trimmedName.length < 2) {
            throw new Error('Name must be at least 2 characters.');
        }

        if (trimmedCode.length < 2) {
            throw new Error('Class code must be at least 2 characters.');
        }

        // Check if student already exists
        const existing = await fetch(
            `${SUPABASE_URL}/rest/v1/students?first_name=eq.${encodeURIComponent(trimmedName)}&class_code=eq.${encodeURIComponent(trimmedCode)}&limit=1`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            }
        );

        const existingData = await existing.json();

        if (existingData.length > 0) {
            const student = existingData[0];
            this.setStudent(student);
            return student;
        }

        // Create new student
        const res = await fetch(`${SUPABASE_URL}/rest/v1/students`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                first_name: trimmedName,
                class_code: trimmedCode
            })
        });

        if (!res.ok) {
            throw new Error('Could not sign in. Please try again.');
        }

        const newStudent = (await res.json())[0];
        this.setStudent(newStudent);
        return newStudent;
    },

    // Send game result to Supabase
    async saveResult({ gameFile, gameTitle, score, questionsAnswered, bestStreak, timeSeconds, sessionId: explicitSessionId }) {
        const student = this.getStudent();
        if (!student) {
            console.warn('GameTracker: No student logged in, skipping save.');
            return null;
        }

        const sessionId = explicitSessionId || this._autoSaveState?.sessionId || null;
        const payload = {
            student_id: student.id,
            game_file: gameFile,
            game_title: gameTitle || null,
            score: score || 0,
            questions_answered: questionsAnswered || 0,
            best_streak: bestStreak || 0,
            time_seconds: timeSeconds || null,
            session_id: sessionId
        };

        // Use upsert if we have a session_id (merge-duplicates on the unique constraint)
        const preferHeader = sessionId
            ? 'resolution=merge-duplicates,return=representation'
            : 'return=representation';

        // Add on_conflict so PostgREST knows which unique constraint to use for upsert
        const url = sessionId
            ? `${SUPABASE_URL}/rest/v1/game_results?on_conflict=student_id,game_file,session_id`
            : `${SUPABASE_URL}/rest/v1/game_results`;

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': preferHeader
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                console.error('GameTracker: Failed to save result', await res.text());
                return null;
            }

            const saved = (await res.json())[0];
            console.log('GameTracker: Result saved (upsert)', saved);
            return saved;
        } catch (err) {
            console.error('GameTracker: Error saving result', err);
            return null;
        }
    },

    // Auto-save: tracks questionsAnswered and saves every N questions
    // Call GameTracker.startAutoSave({ gameFile, interval }) after login
    _autoSaveState: null,

    startAutoSave({ gameFile, gameTitle, interval = 3 }) {
        this._autoSaveState = {
            gameFile,
            gameTitle: gameTitle || document.title,
            interval,
            lastSavedAt: 0,
            sessionId: Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
        };

        // Also save when student leaves the page (navigate away or close tab)
        let _exitSaved = false;
        const saveOnExit = () => {
            if (_exitSaved) return;
            _exitSaved = true;
            clearTimeout(GameTracker._flushTimer);
            GameTracker._flushTimer = null;
            const s = this._autoSaveState;
            if (!s || !this.isLoggedIn()) return;
            const currentQ = typeof questionsAnswered !== 'undefined' ? questionsAnswered :
                             typeof questionNumber !== 'undefined' ? questionNumber : 0;
            if (currentQ > s.lastSavedAt) {
                const data = {
                    gameFile: s.gameFile,
                    gameTitle: s.gameTitle,
                    score: typeof score !== 'undefined' ? score : 0,
                    questionsAnswered: currentQ,
                    bestStreak: typeof bestStreak !== 'undefined' ? bestStreak : (typeof streak !== 'undefined' ? streak : 0)
                };
                // Use fetch with keepalive for reliable save on page exit (supports headers unlike sendBeacon)
                const payload = JSON.stringify({
                    student_id: this.getStudent().id,
                    game_file: data.gameFile,
                    game_title: data.gameTitle,
                    score: data.score || 0,
                    questions_answered: data.questionsAnswered || 0,
                    best_streak: data.bestStreak || 0,
                    session_id: s.sessionId || null
                });
                try {
                    fetch(`${SUPABASE_URL}/rest/v1/game_results?on_conflict=student_id,game_file,session_id`, {
                        method: 'POST',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': `Bearer ${SUPABASE_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'resolution=merge-duplicates'
                        },
                        body: payload,
                        keepalive: true
                    });
                } catch(e) {}
                console.log('GameTracker: Saved on exit', data);
            }
            // Also flush any buffered question responses
            if (GameTracker._questionBuffer.length > 0) {
                const qPayload = JSON.stringify(GameTracker._questionBuffer);
                navigator.sendBeacon(
                    `${SUPABASE_URL}/rest/v1/question_responses?apikey=${SUPABASE_KEY}`,
                    new Blob([qPayload], { type: 'application/json' })
                );
                GameTracker._questionBuffer = [];
                console.log('GameTracker: Flushed question buffer on exit');
            }
        };
        window.addEventListener('beforeunload', saveOnExit);
        window.addEventListener('pagehide', saveOnExit);

        console.log(`GameTracker: Auto-save enabled every ${interval} questions`);
    },

    // Per-question tracking: buffer and batch-send to Supabase
    _questionBuffer: [],
    _flushTimer: null,

    recordQuestion({ questionText, studentAnswer, correctAnswer, isCorrect, attemptNumber }) {
        const student = this.getStudent();
        if (!student) return;

        const gameFile = this._autoSaveState?.gameFile ||
                         location.pathname.split('/').pop() || 'unknown.html';

        // Deduplicate: skip if last buffered entry is identical (prevents double-click duplicates)
        const last = this._questionBuffer[this._questionBuffer.length - 1];
        if (last && last.question_text === String(questionText || '').substring(0, 500)
            && last.student_answer === String(studentAnswer ?? '').substring(0, 200)
            && last.is_correct === !!isCorrect) {
            return;
        }

        this._questionBuffer.push({
            student_id: student.id,
            game_file: gameFile,
            question_text: String(questionText || '').substring(0, 500) || '?',
            student_answer: String(studentAnswer ?? '').substring(0, 200) || '?',
            correct_answer: String(correctAnswer ?? '').substring(0, 200) || '?',
            is_correct: !!isCorrect,
            attempt_number: (attemptNumber && Number.isInteger(attemptNumber) && attemptNumber >= 1) ? attemptNumber : 1
        });

        // Flush when buffer reaches 5, or set a 5-second timer
        if (this._questionBuffer.length >= 5) {
            this._flushQuestions();
        } else if (!this._flushTimer) {
            this._flushTimer = setTimeout(() => this._flushQuestions(), 5000);
        }
    },

    _flushQuestions() {
        clearTimeout(this._flushTimer);
        this._flushTimer = null;

        if (this._questionBuffer.length === 0) return;

        const batch = this._questionBuffer.splice(0);

        fetch(`${SUPABASE_URL}/rest/v1/question_responses`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(batch)
        }).then(res => {
            if (!res.ok) console.error('GameTracker: Failed to flush questions', res.status);
            else console.log('GameTracker: Flushed', batch.length, 'questions');
        }).catch(err => {
            console.error('GameTracker: Flush error', err);
            // Re-add to buffer for retry
            this._questionBuffer.unshift(...batch);
        });
    },

    // Call this from the game whenever a question is answered
    checkAutoSave() {
        const s = this._autoSaveState;
        if (!s || !this.isLoggedIn()) return;

        const currentQ = typeof questionsAnswered !== 'undefined' ? questionsAnswered :
                         typeof questionNumber !== 'undefined' ? questionNumber : 0;

        if (currentQ > 0 && currentQ - s.lastSavedAt >= s.interval) {
            s.lastSavedAt = currentQ;
            this.saveResult({
                gameFile: s.gameFile,
                gameTitle: s.gameTitle,
                score: typeof score !== 'undefined' ? score : 0,
                questionsAnswered: currentQ,
                bestStreak: typeof bestStreak !== 'undefined' ? bestStreak : (typeof streak !== 'undefined' ? streak : 0)
            });
        }
    },

    // Idle timeout: log out after 10 minutes of no interaction
    _idleTimer: null,
    IDLE_TIMEOUT: 10 * 60 * 1000, // 10 minutes

    startIdleTimer() {
        const resetTimer = () => {
            clearTimeout(this._idleTimer);
            this._idleTimer = setTimeout(() => {
                if (this.isLoggedIn()) {
                    console.log('GameTracker: Idle timeout — logging out');
                    this.logout();
                    location.reload();
                }
            }, this.IDLE_TIMEOUT);
        };

        // Reset on any user interaction
        ['touchstart', 'click', 'keydown', 'scroll'].forEach(evt => {
            document.addEventListener(evt, resetTimer, { passive: true });
        });

        resetTimer(); // Start the timer
    },

    // Inject the login overlay into any page if not logged in
    // Call this at the top of any game file
    requireLogin() {
        if (this.isLoggedIn()) {
            this.startIdleTimer();
            return Promise.resolve(this.getStudent());
        }

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.id = 'tracker-login-overlay';
            overlay.innerHTML = `
                <div id="tracker-login-box">
                    <div id="tracker-login-emoji">🎮</div>
                    <h2 id="tracker-login-title">Welcome, Mathematician!</h2>
                    <p id="tracker-login-subtitle">Enter your info to start playing</p>
                    <input type="text" id="tracker-class-code" placeholder="Class Code (e.g. MATH-3A)" maxlength="20" autocomplete="off" />
                    <input type="text" id="tracker-first-name" placeholder="Your First Name" maxlength="30" autocomplete="off" />
                    <button id="tracker-login-btn">Let's Go!</button>
                    <p id="tracker-login-error"></p>
                </div>
            `;

            const style = document.createElement('style');
            style.textContent = `
                #tracker-login-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 99999; font-family: 'Segoe UI', system-ui, sans-serif;
                }
                #tracker-login-box {
                    background: white; border-radius: 24px; padding: 40px 36px;
                    max-width: 360px; width: 90%; text-align: center;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                }
                #tracker-login-emoji { font-size: 3rem; margin-bottom: 8px; }
                #tracker-login-title {
                    font-size: 1.4rem; color: #333; margin: 0 0 4px;
                }
                #tracker-login-subtitle {
                    font-size: 0.9rem; color: #888; margin: 0 0 24px;
                }
                #tracker-class-code, #tracker-first-name {
                    display: block; width: 100%; padding: 14px 16px;
                    border: 2px solid #e0e0e0; border-radius: 12px;
                    font-size: 1.05rem; margin-bottom: 12px;
                    outline: none; transition: border-color 0.2s;
                    text-align: center; font-family: inherit;
                }
                #tracker-class-code:focus, #tracker-first-name:focus {
                    border-color: #667eea;
                }
                #tracker-class-code { text-transform: uppercase; }
                #tracker-login-btn {
                    display: block; width: 100%; padding: 14px;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white; border: none; border-radius: 12px;
                    font-size: 1.1rem; font-weight: 700; cursor: pointer;
                    margin-top: 8px; transition: transform 0.15s, box-shadow 0.15s;
                    font-family: inherit;
                }
                #tracker-login-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102,126,234,0.4); }
                #tracker-login-btn:active { transform: translateY(0); }
                #tracker-login-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
                #tracker-login-error {
                    color: #e53935; font-size: 0.85rem; margin-top: 12px;
                    min-height: 1.2em;
                }
            `;
            document.head.appendChild(style);
            document.body.appendChild(overlay);

            const btn = document.getElementById('tracker-login-btn');
            const nameInput = document.getElementById('tracker-first-name');
            const codeInput = document.getElementById('tracker-class-code');
            const errorEl = document.getElementById('tracker-login-error');

            const doLogin = async () => {
                errorEl.textContent = '';
                btn.disabled = true;
                btn.textContent = 'Signing in...';
                try {
                    const student = await GameTracker.login(nameInput.value, codeInput.value);
                    GameTracker.startIdleTimer();
                    overlay.remove();
                    style.remove();
                    resolve(student);
                } catch (err) {
                    errorEl.textContent = err.message;
                    btn.disabled = false;
                    btn.textContent = "Let's Go!";
                }
            };

            btn.addEventListener('click', doLogin);
            nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
            codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') nameInput.focus(); });

            // Auto-focus class code
            setTimeout(() => codeInput.focus(), 100);
        });
    },

    // ============================================
    // Adaptive Replay — re-test missed problems
    // In-memory only, resets each session/page load
    // ============================================
    _missedPool: [],

    // Store a missed problem's params so it can be replayed later
    // params = game-specific object (e.g. {a: 3, tens: 4} or full mission object)
    markMissed(params) {
        const key = JSON.stringify(params);
        if (!this._missedPool.some(m => JSON.stringify(m.params) === key)) {
            this._missedPool.push({ params, attempts: 0 });
        }
    },

    // Returns missed problem params to replay, or null (generate fresh).
    // Probability scales with number of misses: 30% base + 5% per miss, cap 60%.
    getMissedProblem() {
        if (this._missedPool.length === 0) return null;
        const prob = Math.min(0.6, 0.3 + this._missedPool.length * 0.05);
        if (Math.random() > prob) return null;
        // Prefer problems with fewer retry attempts
        const sorted = [...this._missedPool].sort((a, b) => a.attempts - b.attempts);
        const pick = sorted[0];
        pick.attempts++;
        return pick.params;
    },

    // Remove a problem from the missed pool (student got it right on replay)
    markCorrected(params) {
        const key = JSON.stringify(params);
        this._missedPool = this._missedPool.filter(m => JSON.stringify(m.params) !== key);
    }
};
