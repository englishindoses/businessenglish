// ===== Drop-down Gap-fill Activity =====
// Reusable component for sentence completion with dropdown menus
// Auto-detects lesson from data-lesson attribute

// ===== AUTO-DETECT LESSON ID =====
const LESSON_NUMBER = document.body.dataset.lesson || '1';
const LESSON_ID = `lesson${LESSON_NUMBER}`;

console.log(`Initializing drop-down activity for ${LESSON_ID}`);

// Store dropdown states
let dropdownStates = {};

// Helper functions (standalone to avoid import issues)
function getSessionUser() {
    return sessionStorage.getItem('businessEnglish_currentUser');
}

// ===== Initialize on Page Load =====
document.addEventListener('DOMContentLoaded', function() {
    initDropdownActivity();
});

// ===== Initialize Drop-down Activity =====
function initDropdownActivity() {
    const dropdownActivities = document.querySelectorAll('.dropdown-activity');
    if (dropdownActivities.length === 0) {
        console.log('No dropdown activities found on this page');
        return;
    }
    
    console.log('Initializing dropdown activities...');
    
    // Add change listeners to all dropdowns
    document.querySelectorAll('.gap-dropdown').forEach((dropdown, index) => {
        dropdown.addEventListener('change', function() {
            handleDropdownChange(this);
        });
    });
    
    // Load saved states if available
    loadDropdownStates();
}

// ===== Handle Dropdown Change =====
function handleDropdownChange(dropdown) {
    // Add 'answered' class when a selection is made
    if (dropdown.value !== '') {
        dropdown.classList.add('answered');
    } else {
        dropdown.classList.remove('answered');
    }
    
    // Clear any previous correct/incorrect styling
    dropdown.classList.remove('correct', 'incorrect');
    
    // Clear sentence styling too
    const sentence = dropdown.closest('.dropdown-sentence');
    if (sentence) {
        sentence.classList.remove('correct', 'incorrect');
    }
    
    // Save state
    saveDropdownStates();
}

// ===== Check Dropdown Answers =====
window.checkDropdownAnswers = function(activityId) {
    console.log('Checking dropdown answers for:', activityId);
    
    const activity = document.getElementById(activityId);
    if (!activity) {
        console.error('Activity not found:', activityId);
        return;
    }
    
    const dropdowns = activity.querySelectorAll('.gap-dropdown');
    const feedback = document.getElementById(activityId + 'Feedback');
    
    let correct = 0;
    let total = 0;
    let answered = 0;
    
    dropdowns.forEach(dropdown => {
        const correctAnswer = dropdown.dataset.answer;
        const selectedValue = dropdown.value;
        const sentence = dropdown.closest('.dropdown-sentence');
        
        total++;
        
        // Clear previous states
        dropdown.classList.remove('correct', 'incorrect');
        if (sentence) {
            sentence.classList.remove('correct', 'incorrect');
        }
        
        if (selectedValue !== '') {
            answered++;
            
            if (selectedValue === correctAnswer) {
                dropdown.classList.add('correct');
                correct++;
            } else {
                dropdown.classList.add('incorrect');
            }
        }
    });
    
    // Display feedback
    if (feedback) {
        feedback.classList.add('show');
        
        if (answered === 0) {
            feedback.textContent = 'Please select answers for the gaps first!';
            feedback.className = 'feedback show error';
        } else if (correct === total) {
            feedback.textContent = `Excellent! All ${correct} answers correct! 🎉`;
            feedback.className = 'feedback show success';
        } else if (answered < total) {
            feedback.textContent = `${correct}/${answered} correct so far. Complete all gaps and try again!`;
            feedback.className = 'feedback show error';
        } else {
            feedback.textContent = `${correct}/${total} correct. Review the highlighted answers and try again.`;
            feedback.className = 'feedback show error';
        }
    }
    
    // Save states after checking
    saveDropdownStates();
};

// ===== Reset Dropdown Activity =====
window.resetDropdownActivity = function(activityId) {
    console.log('Resetting dropdown activity:', activityId);
    
    const activity = document.getElementById(activityId);
    if (!activity) {
        console.error('Activity not found:', activityId);
        return;
    }
    
    const dropdowns = activity.querySelectorAll('.gap-dropdown');
    const feedback = document.getElementById(activityId + 'Feedback');
    
    dropdowns.forEach(dropdown => {
        dropdown.value = '';
        dropdown.classList.remove('correct', 'incorrect', 'answered');
        
        const sentence = dropdown.closest('.dropdown-sentence');
        if (sentence) {
            sentence.classList.remove('correct', 'incorrect');
        }
    });
    
    if (feedback) {
        feedback.classList.remove('show');
        feedback.textContent = '';
    }
    
    // Clear saved states for this activity
    if (dropdownStates[activityId]) {
        delete dropdownStates[activityId];
        saveDropdownStates();
    }
};

// ===== Save Dropdown States =====
function saveDropdownStates() {
    const activities = document.querySelectorAll('.dropdown-activity');
    
    activities.forEach(activity => {
        const activityId = activity.id;
        if (!activityId) return;
        
        const states = {};
        activity.querySelectorAll('.gap-dropdown').forEach((dropdown, index) => {
            states[index] = {
                value: dropdown.value,
                isCorrect: dropdown.classList.contains('correct'),
                isIncorrect: dropdown.classList.contains('incorrect')
            };
        });
        
        dropdownStates[activityId] = states;
    });
    
    // Save to Firebase if lesson-utils is available
    const username = getSessionUser();
    if (username) {
        try {
            import('./lesson-utils.js').then(module => {
                module.saveFieldDebounced(LESSON_ID, 'dropdownStates', dropdownStates);
            }).catch(err => {
                console.log('Could not save to Firebase:', err);
            });
        } catch (e) {
            console.log('Firebase save skipped');
        }
    }
}

// ===== Load Dropdown States =====
async function loadDropdownStates() {
    const username = getSessionUser();
    if (!username) return;
    
    try {
        const module = await import('./lesson-utils.js');
        const lessonData = await module.loadLessonData(LESSON_ID);
        
        if (lessonData && lessonData.dropdownStates) {
            dropdownStates = lessonData.dropdownStates;
            applyDropdownStates();
        }
    } catch (error) {
        console.log('Could not load saved dropdown states:', error);
    }
}

// ===== Apply Saved Dropdown States =====
function applyDropdownStates() {
    Object.entries(dropdownStates).forEach(([activityId, states]) => {
        const activity = document.getElementById(activityId);
        if (!activity) return;
        
        const dropdowns = activity.querySelectorAll('.gap-dropdown');
        
        Object.entries(states).forEach(([index, state]) => {
            const dropdown = dropdowns[parseInt(index)];
            if (!dropdown) return;
            
            if (state.value) {
                dropdown.value = state.value;
                dropdown.classList.add('answered');
                
                if (state.isCorrect) {
                    dropdown.classList.add('correct');
                }
                if (state.isIncorrect) {
                    dropdown.classList.add('incorrect');
                }
            }
        });
    });
}

// ===== Export for module usage =====
export { initDropdownActivity, dropdownStates };
