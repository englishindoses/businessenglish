// ===== Question Generator Activity =====
// Reusable component: displays questions one at a time with next/back navigation.
// Reads questions from hidden .qg-item elements inside the generator container.

import { 
    saveFieldDebounced, 
    loadLessonData,
    getCurrentUser 
} from './lesson-utils.js';

const LESSON_NUMBER = document.body.dataset.lesson || '14';
const LESSON_ID = `lesson${LESSON_NUMBER}`;

console.log(`Initializing question generator for ${LESSON_ID}`);

// Store state per generator
const generators = {};

// ===== Initialise on DOM Load =====
document.addEventListener('DOMContentLoaded', function() {
    initQuestionGenerators();
});

// ===== Main Initialisation =====
function initQuestionGenerators() {
    const containers = document.querySelectorAll('.question-generator');
    if (containers.length === 0) {
        console.log('No question generators found');
        return;
    }

    containers.forEach(container => {
        const id = container.id;
        if (!id) return;

        // Read questions from hidden data elements
        const items = container.querySelectorAll('.qg-item');
        const questions = Array.from(items).map(item => item.textContent.trim());

        generators[id] = {
            questions: questions,
            currentIndex: -1 // -1 = not started
        };

        // Wire up buttons
        const nextBtn = container.querySelector('.qg-next-btn');
        const backBtn = container.querySelector('.qg-back-btn');
        const restartBtn = container.querySelector('.qg-restart-btn');

        if (nextBtn) nextBtn.addEventListener('click', () => advance(id));
        if (backBtn) backBtn.addEventListener('click', () => goBack(id));
        if (restartBtn) restartBtn.addEventListener('click', () => restart(id));

        updateUI(id);
    });

    // Load saved positions
    loadSavedState();
}

// ===== Navigation =====

function advance(id) {
    const gen = generators[id];
    if (!gen) return;

    if (gen.currentIndex < gen.questions.length - 1) {
        gen.currentIndex++;
        animateTransition(id);
        saveState();
    } else {
        // Show end state
        showEnd(id);
    }
}

function goBack(id) {
    const gen = generators[id];
    if (!gen || gen.currentIndex <= 0) return;

    gen.currentIndex--;
    animateTransition(id);
    saveState();
}

function restart(id) {
    const gen = generators[id];
    if (!gen) return;

    gen.currentIndex = -1;
    hideEnd(id);
    updateUI(id);
    saveState();
}

// ===== UI Updates =====

function animateTransition(id) {
    const container = document.getElementById(id);
    if (!container) return;

    const textEl = container.querySelector('.qg-question-text');
    if (!textEl) return;

    textEl.classList.add('fade-out');
    setTimeout(() => {
        updateUI(id);
        textEl.classList.remove('fade-out');
    }, 200);
}

function updateUI(id) {
    const container = document.getElementById(id);
    const gen = generators[id];
    if (!container || !gen) return;

    const textEl = container.querySelector('.qg-question-text');
    const counterEl = container.querySelector('.qg-counter');
    const nextBtn = container.querySelector('.qg-next-btn');
    const backBtn = container.querySelector('.qg-back-btn');

    if (gen.currentIndex < 0) {
        // Not started
        if (textEl) {
            textEl.innerHTML = '<span class="qg-placeholder">Press Start to begin.</span>';
        }
        if (counterEl) counterEl.textContent = '';
        if (nextBtn) nextBtn.textContent = 'Start';
        if (backBtn) backBtn.disabled = true;
    } else {
        // Showing a question
        if (textEl) {
            textEl.textContent = gen.questions[gen.currentIndex];
        }
        if (counterEl) {
            counterEl.textContent = `${gen.currentIndex + 1} / ${gen.questions.length}`;
        }
        if (nextBtn) {
            nextBtn.textContent = gen.currentIndex < gen.questions.length - 1 ? 'Next Question' : 'Finish';
        }
        if (backBtn) {
            backBtn.disabled = gen.currentIndex <= 0;
        }
    }
}

function showEnd(id) {
    const container = document.getElementById(id);
    if (!container) return;

    const display = container.querySelector('.qg-display');
    const endMessage = container.querySelector('.qg-end-message');
    const textEl = container.querySelector('.qg-question-text');
    const counterEl = container.querySelector('.qg-counter');
    const nextBtn = container.querySelector('.qg-next-btn');
    const backBtn = container.querySelector('.qg-back-btn');

    if (textEl) textEl.style.display = 'none';
    if (counterEl) counterEl.style.display = 'none';
    if (endMessage) endMessage.classList.add('show');
    if (nextBtn) nextBtn.style.display = 'none';
    if (backBtn) backBtn.style.display = 'none';
}

function hideEnd(id) {
    const container = document.getElementById(id);
    if (!container) return;

    const endMessage = container.querySelector('.qg-end-message');
    const textEl = container.querySelector('.qg-question-text');
    const counterEl = container.querySelector('.qg-counter');
    const nextBtn = container.querySelector('.qg-next-btn');
    const backBtn = container.querySelector('.qg-back-btn');

    if (textEl) textEl.style.display = '';
    if (counterEl) counterEl.style.display = '';
    if (endMessage) endMessage.classList.remove('show');
    if (nextBtn) nextBtn.style.display = '';
    if (backBtn) backBtn.style.display = '';
}

// ===== Persistence =====

function saveState() {
    const state = {};
    for (const [id, gen] of Object.entries(generators)) {
        state[id] = gen.currentIndex;
    }
    saveFieldDebounced(LESSON_ID, 'questionGenerator', state);
}

async function loadSavedState() {
    const username = getCurrentUser();
    if (!username) return;

    try {
        const lessonData = await loadLessonData(LESSON_ID);
        if (lessonData && lessonData.questionGenerator) {
            for (const [id, index] of Object.entries(lessonData.questionGenerator)) {
                if (generators[id]) {
                    generators[id].currentIndex = index;
                    if (index >= generators[id].questions.length) {
                        showEnd(id);
                    } else {
                        updateUI(id);
                    }
                }
            }
            console.log('Loaded question generator state');
        }
    } catch (error) {
        console.error('Error loading question generator state:', error);
    }
}

export { initQuestionGenerators };
