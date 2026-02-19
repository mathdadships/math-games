// ============================================
// Math Games - Student Tracking Module
// Shared across all 28 games + hub page
// ============================================

const SUPABASE_URL = 'https://pnarndrlkkrzqvbnmahh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_8ZmsmQ2JV7m3cwGOUbGiIg_UM6gw17d';

const GameTracker = {
    // Get current student from sessionStorage
    getStudent() {
        const data = sessionStorage.getItem('mathgames_student');
        return data ? JSON.parse(data) : null;
    },

    // Save student to sessionStorage
    setStudent(student) {
        sessionStorage.setItem('mathgames_student', JSON.stringify(student));
    },

    // Clear student session
    logout() {
        sessionStorage.removeItem('mathgames_student');
    },

    // Check if student is logged in
    isLoggedIn() {
        return this.getStudent() !== null;
    },

    // Register or find student, returns student object
    async login(firstName, classCode) {
        const trimmedName = firstName.trim();
        const trimmedCode = classCode.trim().toUpperCase();

        if (!trimmedName || !trimmedCode) {
            throw new Error('Please enter both your name and class code.');
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
    async saveResult({ gameFile, gameTitle, score, questionsAnswered, bestStreak, timeSeconds }) {
        const student = this.getStudent();
        if (!student) {
            console.warn('GameTracker: No student logged in, skipping save.');
            return null;
        }

        const payload = {
            student_id: student.id,
            game_file: gameFile,
            game_title: gameTitle || null,
            score: score || 0,
            questions_answered: questionsAnswered || 0,
            best_streak: bestStreak || 0,
            time_seconds: timeSeconds || null
        };

        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/game_results`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                console.error('GameTracker: Failed to save result', await res.text());
                return null;
            }

            const saved = (await res.json())[0];
            console.log('GameTracker: Result saved', saved);
            return saved;
        } catch (err) {
            console.error('GameTracker: Error saving result', err);
            return null;
        }
    },

    // Inject the login overlay into any page if not logged in
    // Call this at the top of any game file
    requireLogin() {
        if (this.isLoggedIn()) return Promise.resolve(this.getStudent());

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.id = 'tracker-login-overlay';
            overlay.innerHTML = `
                <div id="tracker-login-box">
                    <div id="tracker-login-emoji">🎮</div>
                    <h2 id="tracker-login-title">Welcome, Mathematician!</h2>
                    <p id="tracker-login-subtitle">Enter your info to start playing</p>
                    <input type="text" id="tracker-class-code" placeholder="Class Code (e.g. MR-S)" maxlength="20" autocomplete="off" />
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
    }
};
