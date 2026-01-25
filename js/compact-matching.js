// ===== Compact Matching Activity =====
// 3-column layout with draggable number markers
// Supports: drag & drop, tap-tap selection, tap to undo

import { 
    saveFieldDebounced, 
    loadLessonData,
    getCurrentUser 
} from './lesson-utils.js';

// Get lesson ID from body data attribute
const LESSON_NUMBER = document.body.dataset.lesson || '1';
const LESSON_ID = `lesson${LESSON_NUMBER}`;

console.log(`Initializing compact matching for ${LESSON_ID}`);

// State management
let selectedMarker = null;
let draggedMarker = null;
let matchingStates = {}; // Store states for multiple activities

// Touch support variables
let touchClone = null;
let currentDropTarget = null;

// ===== Initialize on DOM Load =====
document.addEventListener('DOMContentLoaded', function() {
    initCompactMatching();
});

// ===== Main Initialization =====
function initCompactMatching() {
    const activities = document.querySelectorAll('.compact-matching');
    if (activities.length === 0) {
        console.log('No compact matching activities found');
        return;
    }
    
    console.log(`Found ${activities.length} compact matching activities`);
    
    activities.forEach(activity => {
        initActivity(activity);
    });
    
    // Load saved states
    loadMatchingStates();
}

// ===== Initialize Single Activity =====
function initActivity(activity) {
    const markers = activity.querySelectorAll('.cm-marker');
    const answers = activity.querySelectorAll('.cm-answer');
    const slots = activity.querySelectorAll('.cm-answer-slot');
    
    // Initialize markers
    markers.forEach(marker => {
        // Drag events
        marker.addEventListener('dragstart', handleDragStart);
        marker.addEventListener('dragend', handleDragEnd);
        
        // Click/tap for tap-tap mode
        marker.addEventListener('click', handleMarkerClick);
        
        // Touch events for mobile drag
        marker.addEventListener('touchstart', handleTouchStart, { passive: false });
        marker.addEventListener('touchmove', handleTouchMove, { passive: false });
        marker.addEventListener('touchend', handleTouchEnd);
    });
    
    // Initialize answer areas as drop targets
    answers.forEach(answer => {
        answer.addEventListener('dragover', handleDragOver);
        answer.addEventListener('dragleave', handleDragLeave);
        answer.addEventListener('drop', handleDrop);
        
        // Click for tap-tap mode
        answer.addEventListener('click', handleAnswerClick);
    });
    
    // Initialize slots for returning markers
    slots.forEach(slot => {
        slot.addEventListener('click', handleSlotClick);
    });
}

// ===== DRAG & DROP HANDLERS =====

function handleDragStart(e) {
    // Don't drag if marker is in an answer slot
    if (this.parentElement.classList.contains('cm-answer-slot')) {
        e.preventDefault();
        return;
    }
    
    draggedMarker = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.match);
    
    // Clear any tap-tap selection
    clearSelection();
    
    setTimeout(() => {
        this.style.opacity = '0.4';
    }, 0);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    this.style.opacity = '1';
    
    // Clear all drag-over states
    document.querySelectorAll('.cm-answer').forEach(answer => {
        answer.classList.remove('drag-over');
    });
    
    draggedMarker = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const answer = e.target.closest('.cm-answer');
    if (answer) {
        // Only allow drop if slot is empty
        const slot = answer.querySelector('.cm-answer-slot');
        if (slot && !slot.querySelector('.cm-marker')) {
            answer.classList.add('drag-over');
        }
    }
}

function handleDragLeave(e) {
    const answer = e.target.closest('.cm-answer');
    if (answer) {
        answer.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    
    const answer = e.target.closest('.cm-answer');
    if (!answer || !draggedMarker) return;
    
    answer.classList.remove('drag-over');
    
    const slot = answer.querySelector('.cm-answer-slot');
    if (!slot) return;
    
    // Check if slot already has a marker
    const existingMarker = slot.querySelector('.cm-marker');
    if (existingMarker) {
        // Return existing marker to bank
        returnMarkerToBank(existingMarker);
    }
    
    // Place the dragged marker
    placeMarkerInSlot(draggedMarker, slot);
    
    // Clear states
    draggedMarker.classList.remove('dragging');
    draggedMarker.style.opacity = '1';
    draggedMarker = null;
    
    // Save state
    saveActivityState(answer.closest('.compact-matching'));
}

// ===== TAP-TAP HANDLERS =====

function handleMarkerClick(e) {
    e.stopPropagation();
    
    const marker = e.target.closest('.cm-marker');
    if (!marker) return;
    
    // If marker is in an answer slot, return it to bank
    if (marker.parentElement.classList.contains('cm-answer-slot')) {
        returnMarkerToBank(marker);
        saveActivityState(marker.closest('.compact-matching'));
        return;
    }
    
    // If marker is in the bank (cm-marker-slot), toggle selection
    if (marker.parentElement.classList.contains('cm-marker-slot')) {
        if (selectedMarker === marker) {
            // Deselect
            clearSelection();
        } else {
            // Select this marker
            clearSelection();
            selectedMarker = marker;
            marker.classList.add('selected');
        }
    }
}

function handleAnswerClick(e) {
    // Don't handle if clicking on a marker in the slot
    if (e.target.closest('.cm-marker')) return;
    
    const answer = e.target.closest('.cm-answer');
    if (!answer || !selectedMarker) return;
    
    const slot = answer.querySelector('.cm-answer-slot');
    if (!slot) return;
    
    // Check if slot already has a marker
    const existingMarker = slot.querySelector('.cm-marker');
    if (existingMarker) {
        // Return existing marker to bank
        returnMarkerToBank(existingMarker);
    }
    
    // Place selected marker
    placeMarkerInSlot(selectedMarker, slot);
    
    // Clear selection
    clearSelection();
    
    // Save state
    saveActivityState(answer.closest('.compact-matching'));
}

function handleSlotClick(e) {
    const slot = e.target.closest('.cm-answer-slot');
    if (!slot) return;
    
    const marker = slot.querySelector('.cm-marker');
    if (marker) {
        returnMarkerToBank(marker);
        saveActivityState(slot.closest('.compact-matching'));
    } else if (selectedMarker) {
        // Place selected marker in empty slot
        placeMarkerInSlot(selectedMarker, slot);
        clearSelection();
        saveActivityState(slot.closest('.compact-matching'));
    }
}

// ===== TOUCH HANDLERS (Mobile Drag) =====

function handleTouchStart(e) {
    const marker = e.target.closest('.cm-marker');
    if (!marker) return;
    
    // If marker is in answer slot, handle as click (return to bank)
    if (marker.parentElement.classList.contains('cm-answer-slot')) {
        return; // Let the click handler deal with it
    }
    
    // Only allow dragging from bank slots
    if (!marker.parentElement.classList.contains('cm-marker-slot')) {
        return;
    }
    
    e.preventDefault();
    draggedMarker = marker;
    marker.classList.add('dragging');
    
    const touch = e.touches[0];
    
    // Create visual clone
    touchClone = document.createElement('div');
    touchClone.className = 'cm-marker-clone';
    touchClone.textContent = marker.textContent;
    touchClone.style.left = (touch.clientX - 18) + 'px';
    touchClone.style.top = (touch.clientY - 18) + 'px';
    document.body.appendChild(touchClone);
    
    marker.style.opacity = '0.4';
    
    // Clear tap-tap selection
    clearSelection();
}

function handleTouchMove(e) {
    if (!touchClone || !draggedMarker) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    touchClone.style.left = (touch.clientX - 18) + 'px';
    touchClone.style.top = (touch.clientY - 18) + 'px';
    
    // Find element under touch
    touchClone.style.display = 'none';
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    touchClone.style.display = '';
    
    // Clear previous drag-over states
    document.querySelectorAll('.cm-answer').forEach(answer => {
        answer.classList.remove('drag-over');
    });
    
    if (elementBelow) {
        const answer = elementBelow.closest('.cm-answer');
        if (answer) {
            const slot = answer.querySelector('.cm-answer-slot');
            if (slot && !slot.querySelector('.cm-marker')) {
                answer.classList.add('drag-over');
                currentDropTarget = answer;
            } else {
                currentDropTarget = null;
            }
        } else {
            currentDropTarget = null;
        }
    }
}

function handleTouchEnd(e) {
    if (!draggedMarker) return;
    
    // Clean up clone
    if (touchClone && touchClone.parentNode) {
        touchClone.parentNode.removeChild(touchClone);
    }
    touchClone = null;
    
    // Handle drop if we have a valid target
    if (currentDropTarget) {
        const slot = currentDropTarget.querySelector('.cm-answer-slot');
        if (slot) {
            const existingMarker = slot.querySelector('.cm-marker');
            if (existingMarker) {
                returnMarkerToBank(existingMarker);
            }
            placeMarkerInSlot(draggedMarker, slot);
            saveActivityState(currentDropTarget.closest('.compact-matching'));
        }
    }
    
    // Clean up
    draggedMarker.classList.remove('dragging');
    draggedMarker.style.opacity = '1';
    
    document.querySelectorAll('.cm-answer').forEach(answer => {
        answer.classList.remove('drag-over');
    });
    
    draggedMarker = null;
    currentDropTarget = null;
}

// ===== UTILITY FUNCTIONS =====

function clearSelection() {
    if (selectedMarker) {
        selectedMarker.classList.remove('selected');
        selectedMarker = null;
    }
}

function placeMarkerInSlot(marker, slot) {
    // Remove draggable when in slot
    marker.removeAttribute('draggable');
    marker.classList.remove('selected', 'dragging');
    marker.style.opacity = '1';
    
    // Move marker to slot
    slot.appendChild(marker);
}

function returnMarkerToBank(marker) {
    const activity = marker.closest('.compact-matching');
    const markerNum = marker.dataset.match;
    
    // Find the original slot for this marker
    const originalSlot = activity.querySelector(`.cm-marker-slot[data-marker="${markerNum}"]`);
    
    // Restore draggable
    marker.setAttribute('draggable', 'true');
    marker.classList.remove('correct', 'incorrect');
    
    // Clear answer styling
    const answer = marker.closest('.cm-answer');
    if (answer) {
        answer.classList.remove('correct', 'incorrect');
    }
    
    // Return to original slot
    if (originalSlot) {
        originalSlot.appendChild(marker);
    }
}

// ===== CHECK & RESET FUNCTIONS =====

window.checkCompactMatching = function(activityId) {
    const activity = document.getElementById(activityId);
    if (!activity) {
        console.error('Activity not found:', activityId);
        return;
    }
    
    const answers = activity.querySelectorAll('.cm-answer');
    const feedback = document.getElementById(activityId + 'Feedback');
    
    let correct = 0;
    let answered = 0;
    const total = answers.length;
    
    answers.forEach(answer => {
        const expectedMatch = answer.dataset.match;
        const slot = answer.querySelector('.cm-answer-slot');
        const marker = slot ? slot.querySelector('.cm-marker') : null;
        
        // Clear previous states
        answer.classList.remove('correct', 'incorrect');
        if (marker) {
            marker.classList.remove('correct', 'incorrect');
        }
        
        if (marker) {
            answered++;
            const markerMatch = marker.dataset.match;
            
            if (markerMatch === expectedMatch) {
                correct++;
                answer.classList.add('correct');
                marker.classList.add('correct');
            } else {
                answer.classList.add('incorrect');
                marker.classList.add('incorrect');
            }
        }
    });
    
    // Display feedback
    if (feedback) {
        feedback.classList.add('show');
        
        if (answered === 0) {
            feedback.textContent = 'Place the numbered markers next to the matching answers.';
            feedback.className = 'feedback show error';
        } else if (correct === total) {
            feedback.textContent = `Excellent! All ${correct} matches correct! 🎉`;
            feedback.className = 'feedback show success';
        } else if (answered < total) {
            feedback.textContent = `${correct}/${answered} correct so far. Complete all matches!`;
            feedback.className = 'feedback show error';
        } else {
            feedback.textContent = `${correct}/${total} correct. Check the red items and try again.`;
            feedback.className = 'feedback show error';
        }
    }
    
    // Save state after checking
    saveActivityState(activity);
};

window.resetCompactMatching = function(activityId) {
    const activity = document.getElementById(activityId);
    if (!activity) {
        console.error('Activity not found:', activityId);
        return;
    }
    
    const feedback = document.getElementById(activityId + 'Feedback');
    
    // Return all markers to bank
    const placedMarkers = activity.querySelectorAll('.cm-answer-slot .cm-marker');
    placedMarkers.forEach(marker => {
        returnMarkerToBank(marker);
    });
    
    // Clear all styling
    activity.querySelectorAll('.cm-answer').forEach(answer => {
        answer.classList.remove('correct', 'incorrect', 'drag-over');
    });
    
    // Clear feedback
    if (feedback) {
        feedback.classList.remove('show');
        feedback.textContent = '';
    }
    
    // Clear selection
    clearSelection();
    
    // Clear saved state
    if (matchingStates[activityId]) {
        delete matchingStates[activityId];
        saveAllStates();
    }
};

// ===== STATE PERSISTENCE =====

function saveActivityState(activity) {
    if (!activity || !activity.id) return;
    
    const state = {};
    const answers = activity.querySelectorAll('.cm-answer');
    
    answers.forEach(answer => {
        const slot = answer.querySelector('.cm-answer-slot');
        const marker = slot ? slot.querySelector('.cm-marker') : null;
        
        if (marker) {
            state[answer.dataset.match] = marker.dataset.match;
        }
    });
    
    matchingStates[activity.id] = state;
    saveAllStates();
}

function saveAllStates() {
    const username = getCurrentUser();
    if (!username) return;
    
    saveFieldDebounced(LESSON_ID, 'compactMatching', matchingStates);
}

async function loadMatchingStates() {
    const username = getCurrentUser();
    if (!username) return;
    
    try {
        const lessonData = await loadLessonData(LESSON_ID);
        
        if (lessonData.compactMatching) {
            matchingStates = lessonData.compactMatching;
            applyLoadedStates();
            console.log('Loaded compact matching states:', matchingStates);
        }
    } catch (error) {
        console.error('Error loading matching states:', error);
    }
}

function applyLoadedStates() {
    Object.entries(matchingStates).forEach(([activityId, state]) => {
        const activity = document.getElementById(activityId);
        if (!activity) return;
        
        Object.entries(state).forEach(([answerMatch, markerMatch]) => {
            const answer = activity.querySelector(`.cm-answer[data-match="${answerMatch}"]`);
            // Find marker in its original bank slot
            const markerSlot = activity.querySelector(`.cm-marker-slot[data-marker="${markerMatch}"]`);
            const marker = markerSlot ? markerSlot.querySelector('.cm-marker') : null;
            
            if (answer && marker) {
                const slot = answer.querySelector('.cm-answer-slot');
                if (slot) {
                    placeMarkerInSlot(marker, slot);
                }
            }
        });
    });
}

// Export for potential external use
export { initCompactMatching, matchingStates };
