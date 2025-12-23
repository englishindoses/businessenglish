// ===== Sentence Ordering Activity =====
// Handles drag-and-drop word reordering exercises

import { 
    saveFieldDebounced, 
    loadLessonData,
    getCurrentUser 
} from './lesson-utils.js';

// Get lesson ID from body data attribute
const LESSON_NUMBER = document.body.dataset.lesson || '2';
const LESSON_ID = `lesson${LESSON_NUMBER}`;

// Store original word orders for reset
const originalOrders = new Map();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initSentenceOrdering();
});

function initSentenceOrdering() {
    const exercises = document.querySelectorAll('.sentence-exercise');
    if (exercises.length === 0) return;
    
    console.log('Initializing sentence ordering activity...');
    
    exercises.forEach((exercise, index) => {
        const wordBank = exercise.querySelector('.word-bank');
        const words = wordBank.querySelectorAll('.draggable-word');
        
        // Store original order for reset
        originalOrders.set(index, Array.from(words).map(w => w.textContent));
        
        // Add drag handlers to each word
        words.forEach(word => {
            word.addEventListener('dragstart', handleWordDragStart);
            word.addEventListener('dragend', handleWordDragEnd);
            word.addEventListener('dragover', handleWordDragOver);
            word.addEventListener('drop', handleWordDrop);
            
            // Touch support
            word.addEventListener('touchstart', handleWordTouchStart, { passive: false });
            word.addEventListener('touchmove', handleWordTouchMove, { passive: false });
            word.addEventListener('touchend', handleWordTouchEnd);
        });
    });
    
    // Load saved state
    loadSavedSentenceState();
}

// ===== Drag and Drop Handlers =====

let draggedWord = null;

function handleWordDragStart(e) {
    draggedWord = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.textContent);
    
    // Add visual feedback to siblings
    setTimeout(() => {
        this.style.opacity = '0.4';
    }, 0);
}

function handleWordDragEnd(e) {
    this.classList.remove('dragging');
    this.style.opacity = '1';
    
    // Remove any drag-over styling
    document.querySelectorAll('.draggable-word').forEach(word => {
        word.classList.remove('drag-over-left', 'drag-over-right');
    });
    
    // Save state after reordering
    saveSentenceState();
}

function handleWordDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (this === draggedWord) return;
    
    // Determine if we're on the left or right half
    const rect = this.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    
    // Remove previous indicators
    this.classList.remove('drag-over-left', 'drag-over-right');
    
    if (e.clientX < midpoint) {
        this.classList.add('drag-over-left');
    } else {
        this.classList.add('drag-over-right');
    }
}

function handleWordDrop(e) {
    e.preventDefault();
    
    if (this === draggedWord || !draggedWord) return;
    
    const wordBank = this.parentElement;
    const words = Array.from(wordBank.querySelectorAll('.draggable-word'));
    const draggedIndex = words.indexOf(draggedWord);
    const targetIndex = words.indexOf(this);
    
    // Determine insertion position based on cursor position
    const rect = this.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    const insertBefore = e.clientX < midpoint;
    
    // Remove dragged word from current position
    wordBank.removeChild(draggedWord);
    
    // Insert at new position
    if (insertBefore) {
        wordBank.insertBefore(draggedWord, this);
    } else {
        wordBank.insertBefore(draggedWord, this.nextSibling);
    }
    
    // Clear indicators
    this.classList.remove('drag-over-left', 'drag-over-right');
}

// ===== Touch Support =====

let touchStartX, touchStartY;
let touchClone = null;
let currentDropTarget = null;

function handleWordTouchStart(e) {
    e.preventDefault();
    draggedWord = this;
    this.classList.add('dragging');
    
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    
    // Create visual clone for dragging
    touchClone = this.cloneNode(true);
    touchClone.classList.add('touch-clone-word');
    touchClone.style.position = 'fixed';
    touchClone.style.left = (touch.clientX - 40) + 'px';
    touchClone.style.top = (touch.clientY - 20) + 'px';
    touchClone.style.zIndex = '1000';
    touchClone.style.pointerEvents = 'none';
    document.body.appendChild(touchClone);
    
    this.style.opacity = '0.4';
}

function handleWordTouchMove(e) {
    e.preventDefault();
    if (!touchClone || !draggedWord) return;
    
    const touch = e.touches[0];
    touchClone.style.left = (touch.clientX - 40) + 'px';
    touchClone.style.top = (touch.clientY - 20) + 'px';
    
    // Find element under touch point
    touchClone.style.display = 'none';
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    touchClone.style.display = '';
    
    // Clear previous drop target styling
    document.querySelectorAll('.draggable-word').forEach(word => {
        word.classList.remove('drag-over-left', 'drag-over-right');
    });
    
    if (elementBelow && elementBelow.classList.contains('draggable-word') && elementBelow !== draggedWord) {
        currentDropTarget = elementBelow;
        const rect = elementBelow.getBoundingClientRect();
        const midpoint = rect.left + rect.width / 2;
        
        if (touch.clientX < midpoint) {
            elementBelow.classList.add('drag-over-left');
        } else {
            elementBelow.classList.add('drag-over-right');
        }
    } else {
        currentDropTarget = null;
    }
}

function handleWordTouchEnd(e) {
    if (!draggedWord) return;
    
    const touch = e.changedTouches[0];
    
    // Clean up clone
    if (touchClone && touchClone.parentNode) {
        touchClone.parentNode.removeChild(touchClone);
    }
    touchClone = null;
    
    // Find drop target
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (elementBelow && elementBelow.classList.contains('draggable-word') && elementBelow !== draggedWord) {
        const wordBank = elementBelow.parentElement;
        const rect = elementBelow.getBoundingClientRect();
        const midpoint = rect.left + rect.width / 2;
        
        // Remove and reinsert
        wordBank.removeChild(draggedWord);
        
        if (touch.clientX < midpoint) {
            wordBank.insertBefore(draggedWord, elementBelow);
        } else {
            wordBank.insertBefore(draggedWord, elementBelow.nextSibling);
        }
    }
    
    // Clean up
    draggedWord.classList.remove('dragging');
    draggedWord.style.opacity = '1';
    
    document.querySelectorAll('.draggable-word').forEach(word => {
        word.classList.remove('drag-over-left', 'drag-over-right');
    });
    
    draggedWord = null;
    currentDropTarget = null;
    
    // Save state
    saveSentenceState();
}

// ===== Check and Reset Functions =====

window.checkSentenceOrder = function() {
    const exercises = document.querySelectorAll('.sentence-exercise');
    const feedback = document.getElementById('sentenceFeedback');
    
    let correct = 0;
    const total = exercises.length;
    
    exercises.forEach(exercise => {
        const wordBank = exercise.querySelector('.word-bank');
        const correctAnswer = wordBank.dataset.correct;
        const words = wordBank.querySelectorAll('.draggable-word');
        const currentAnswer = Array.from(words).map(w => w.textContent).join(' ');
        
        // Clear previous states
        words.forEach(word => {
            word.classList.remove('correct', 'incorrect');
        });
        
        if (currentAnswer === correctAnswer) {
            correct++;
            words.forEach(word => word.classList.add('correct'));
            exercise.classList.add('sentence-correct');
            exercise.classList.remove('sentence-incorrect');
        } else {
            words.forEach(word => word.classList.add('incorrect'));
            exercise.classList.add('sentence-incorrect');
            exercise.classList.remove('sentence-correct');
        }
    });
    
    feedback.classList.add('show');
    if (correct === total) {
        feedback.textContent = `Excellent! All ${correct} sentences correct! 🎉`;
        feedback.className = 'feedback show success';
    } else {
        feedback.textContent = `${correct}/${total} correct. Keep trying the red ones!`;
        feedback.className = 'feedback show error';
    }
};

window.resetSentenceOrder = function() {
    const exercises = document.querySelectorAll('.sentence-exercise');
    const feedback = document.getElementById('sentenceFeedback');
    
    exercises.forEach((exercise, index) => {
        const wordBank = exercise.querySelector('.word-bank');
        const originalOrder = originalOrders.get(index);
        
        if (originalOrder) {
            // Clear current words
            const words = wordBank.querySelectorAll('.draggable-word');
            words.forEach(word => {
                word.classList.remove('correct', 'incorrect');
            });
            
            // Reorder based on original shuffled order
            originalOrder.forEach(text => {
                const word = Array.from(words).find(w => w.textContent === text);
                if (word) {
                    wordBank.appendChild(word);
                }
            });
        }
        
        exercise.classList.remove('sentence-correct', 'sentence-incorrect');
    });
    
    feedback.classList.remove('show');
    
    // Clear saved state
    saveSentenceState();
};

// ===== State Persistence =====

function saveSentenceState() {
    const username = getCurrentUser();
    if (!username) return;
    
    const state = {};
    const exercises = document.querySelectorAll('.sentence-exercise');
    
    exercises.forEach((exercise, index) => {
        const wordBank = exercise.querySelector('.word-bank');
        const words = wordBank.querySelectorAll('.draggable-word');
        state[index] = Array.from(words).map(w => w.textContent);
    });
    
    saveFieldDebounced(LESSON_ID, 'sentenceOrdering', state);
}

async function loadSavedSentenceState() {
    const username = getCurrentUser();
    if (!username) return;
    
    try {
        const lessonData = await loadLessonData(LESSON_ID);
        
        if (lessonData.sentenceOrdering) {
            const exercises = document.querySelectorAll('.sentence-exercise');
            
            Object.entries(lessonData.sentenceOrdering).forEach(([index, wordOrder]) => {
                const exercise = exercises[parseInt(index)];
                if (!exercise) return;
                
                const wordBank = exercise.querySelector('.word-bank');
                const words = wordBank.querySelectorAll('.draggable-word');
                
                // Reorder based on saved state
                wordOrder.forEach(text => {
                    const word = Array.from(words).find(w => w.textContent === text);
                    if (word) {
                        wordBank.appendChild(word);
                    }
                });
            });
            
            console.log('Loaded saved sentence ordering state');
        }
    } catch (error) {
        console.error('Error loading sentence state:', error);
    }
}
