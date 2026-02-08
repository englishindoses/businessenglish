// ===== Right/Wrong Activity =====
// Activity where students identify if sentences are correct or incorrect

import { 
    saveFieldDebounced, 
    loadLessonData,
    getCurrentUser 
} from './lesson-utils.js';

// Get lesson ID from body data attribute
const LESSON_NUMBER = document.body.dataset.lesson || '5';
const LESSON_ID = `lesson${LESSON_NUMBER}`;

console.log(`Initializing right-wrong activity for ${LESSON_ID}`);

// Store states for multiple activities
let rwStates = {};

// ===== Initialize on DOM Load =====
document.addEventListener('DOMContentLoaded', function() {
    initRightWrongActivity();
});

// ===== Main Initialization =====
function initRightWrongActivity() {
    const activities = document.querySelectorAll('.right-wrong-activity');
    if (activities.length === 0) {
        console.log('No right-wrong activities found');
        return;
    }
    
    console.log(`Found ${activities.length} right-wrong activities`);
    
    activities.forEach(activity => {
        initActivity(activity);
    });
    
    // Load saved states
    loadRWStates();
}

// ===== Initialize Single Activity =====
function initActivity(activity) {
    const buttons = activity.querySelectorAll('.rw-btn');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            handleButtonClick(this);
        });
    });
}

// ===== Handle Button Click =====
function handleButtonClick(btn) {
    const sentence = btn.closest('.rw-sentence');
    const buttons = sentence.querySelectorAll('.rw-btn');
    
    // Clear previous selection
    buttons.forEach(b => b.classList.remove('selected'));
    
    // Select this button
    btn.classList.add('selected');
    
    // Clear any previous feedback
    sentence.classList.remove('correct-answer', 'incorrect-answer', 'show-correction');
    
    // Save state
    const activity = btn.closest('.right-wrong-activity');
    saveActivityState(activity);
}

// ===== Check Answers =====
window.checkRightWrong = function(activityId) {
    const activity = document.getElementById(activityId);
    if (!activity) {
        console.error('Activity not found:', activityId);
        return;
    }
    
    const sentences = activity.querySelectorAll('.rw-sentence');
    const feedback = document.getElementById(activityId + 'Feedback');
    
    let correct = 0;
    let answered = 0;
    const total = sentences.length;
    
    sentences.forEach(sentence => {
        const isCorrectSentence = sentence.dataset.correct === 'true';
        const tickBtn = sentence.querySelector('.rw-btn.tick');
        const crossBtn = sentence.querySelector('.rw-btn.cross');
        
        const tickSelected = tickBtn.classList.contains('selected');
        const crossSelected = crossBtn.classList.contains('selected');
        
        // Clear previous feedback classes
        sentence.classList.remove('correct-answer', 'incorrect-answer', 'show-correction');
        
        if (tickSelected || crossSelected) {
            answered++;
            
            // User said correct (tick) and sentence IS correct, OR
            // User said wrong (cross) and sentence IS wrong
            const userIsRight = (tickSelected && isCorrectSentence) || (crossSelected && !isCorrectSentence);
            
            if (userIsRight) {
                sentence.classList.add('correct-answer');
                correct++;
            } else {
                sentence.classList.add('incorrect-answer');
                // Show correction if the sentence was wrong and user said it was right
                if (!isCorrectSentence) {
                    sentence.classList.add('show-correction');
                }
            }
        }
    });
    
    // Show feedback
    if (feedback) {
        feedback.classList.add('show');
        if (answered === 0) {
            feedback.textContent = 'Click ✓ if the sentence is correct, or ✗ if it contains a mistake.';
            feedback.className = 'feedback show error';
        } else if (correct === total && answered === total) {
            feedback.textContent = `Perfect! All ${correct} answers correct! 🎉`;
            feedback.className = 'feedback show success';
        } else if (correct === answered) {
            feedback.textContent = `${correct}/${answered} correct so far. Keep going!`;
            feedback.className = 'feedback show success';
        } else {
            feedback.textContent = `${correct}/${answered} correct. Check the highlighted sentences.`;
            feedback.className = 'feedback show error';
        }
    }
    
    // Save checked state
    saveActivityState(activity);
};

// ===== Reset Activity =====
window.resetRightWrong = function(activityId) {
    const activity = document.getElementById(activityId);
    if (!activity) {
        console.error('Activity not found:', activityId);
        return;
    }
    
    const sentences = activity.querySelectorAll('.rw-sentence');
    const feedback = document.getElementById(activityId + 'Feedback');
    
    sentences.forEach(sentence => {
        sentence.classList.remove('correct-answer', 'incorrect-answer', 'show-correction');
        const buttons = sentence.querySelectorAll('.rw-btn');
        buttons.forEach(btn => btn.classList.remove('selected'));
    });
    
    if (feedback) {
        feedback.classList.remove('show');
        feedback.textContent = '';
    }
    
    // Clear saved state
    const activityIndex = activity.id;
    if (rwStates[activityIndex]) {
        delete rwStates[activityIndex];
        saveFieldDebounced(LESSON_ID, 'rightWrong', rwStates);
    }
};

// ===== State Persistence =====
function saveActivityState(activity) {
    const activityId = activity.id;
    const sentences = activity.querySelectorAll('.rw-sentence');
    
    const state = {};
    sentences.forEach((sentence, index) => {
        const tickSelected = sentence.querySelector('.rw-btn.tick').classList.contains('selected');
        const crossSelected = sentence.querySelector('.rw-btn.cross').classList.contains('selected');
        
        if (tickSelected) {
            state[index] = 'tick';
        } else if (crossSelected) {
            state[index] = 'cross';
        }
    });
    
    rwStates[activityId] = state;
    saveFieldDebounced(LESSON_ID, 'rightWrong', rwStates);
}

async function loadRWStates() {
    const username = getCurrentUser();
    if (!username) return;
    
    try {
        const lessonData = await loadLessonData(LESSON_ID);
        
        if (lessonData.rightWrong) {
            rwStates = lessonData.rightWrong;
            
            // Apply saved states
            Object.entries(rwStates).forEach(([activityId, state]) => {
                const activity = document.getElementById(activityId);
                if (!activity) return;
                
                const sentences = activity.querySelectorAll('.rw-sentence');
                
                Object.entries(state).forEach(([index, selection]) => {
                    const sentence = sentences[parseInt(index)];
                    if (!sentence) return;
                    
                    if (selection === 'tick') {
                        sentence.querySelector('.rw-btn.tick').classList.add('selected');
                    } else if (selection === 'cross') {
                        sentence.querySelector('.rw-btn.cross').classList.add('selected');
                    }
                });
            });
            
            console.log('Loaded saved right-wrong states');
        }
    } catch (error) {
        console.error('Error loading right-wrong states:', error);
    }
}
