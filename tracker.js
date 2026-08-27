// ============================================
// Math Games - Student Tracking Module
// Shared across all 28 games + hub page
// ============================================

const GameTracker = {
    _guest: { id: 'guest', first_name: 'Player', class_code: 'PLAY' },

    getStudent() {
        return this._guest;
    },

    setStudent(student) {},

    logout() {},

    isLoggedIn() {
        return true;
    },

    async login(firstName, classCode) {
        return this._guest;
    },

    async saveResult() { return null; },

    // Auto-save: tracks questionsAnswered and saves every N questions
    // Call GameTracker.startAutoSave({ gameFile, interval }) after login
    _autoSaveState: null,

    startAutoSave() {},

    _questionBuffer: [],
    _flushTimer: null,

    recordQuestion() {},

    _flushQuestions() {},

    checkAutoSave() {},

    startIdleTimer() {},

    requireLogin() {
        return Promise.resolve(this._guest);
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
