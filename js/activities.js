// ===== Activities JavaScript with Firebase =====
// Reusable across all lessons - auto-detects lesson from data-lesson attribute

import { 
    loadLessonData, 
    saveFieldDebounced, 
    saveNoteDebounced,
    saveFieldImmediate,
    getCurrentUser 
} from './lesson-utils.js';

// ===== AUTO-DETECT LESSON ID =====
const LESSON_NUMBER = document.body.dataset.lesson || '1';
const LESSON_ID = `lesson${LESSON_NUMBER}`;

console.log(`Initializing activities for ${LESSON_ID}`);

// Current lesson data (loaded from Firebase)
let lessonData = {
    notes: {},
    sorting: { zone1: [], zone2: [], bank: [] },
    revealedTopics: [],
    matching: {},
    flippedCards: [],
    selectedScenario: null
};

// Track if data has been loaded
let dataLoaded = false;

// ===== Initialize on Page Load =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing lesson activities...');
    
    // Load data from Firebase
    await loadSavedData();
    
    // Initialize all activities that exist on the page
    initSortingActivity();
    initDragAndDrop();
    initFlipCards();
    initTopicCards();
    initScenarioCards();
    initNotesInputs();
    initRevealBoxes();
    
    // Apply saved states
    applySavedStates();
    
    // Add entrance animations
    addEntranceAnimations();
});

// ===== Load Saved Data from Firebase =====
async function loadSavedData() {
    const username = getCurrentUser();
    if (!username) {
        console.log('No user logged in, using defaults');
        dataLoaded = true;
        return;
    }
    
    try {
        lessonData = await loadLessonData(LESSON_ID);
        dataLoaded = true;
        console.log('Lesson data loaded:', lessonData);
    } catch (error) {
        console.error('Error loading lesson data:', error);
        dataLoaded = true;
    }
}

// ===== Apply Saved States to UI =====
function applySavedStates() {
    if (!dataLoaded) return;
    
    applySortingState();
    applyRevealedTopics();
    applyMatchingState();
    applyFlippedCards();
    applySelectedScenario();
    applyNotes();
}


// ===== SORTING ACTIVITY =====

let selectedPhrase = null;

function initSortingActivity() {
    const phraseBank = document.getElementById('phraseBank');
    if (!phraseBank) return; // Activity not on this page
    
    // Initialize phrase click handlers
    document.querySelectorAll('#phraseBank .phrase').forEach(phrase => {
        phrase.addEventListener('click', handlePhraseClick);
    });
    
    // Initialize zone click handlers
    document.querySelectorAll('.sort-zone').forEach(zone => {
        zone.addEventListener('click', handleZoneClick);
    });
    
    // Allow clicking phrases in zones to move them back
    document.querySelectorAll('.zone-content').forEach(zone => {
        zone.addEventListener('click', handleZoneContentClick);
    });
}

function handlePhraseClick(e) {
    const phrase = e.currentTarget;
    if (selectedPhrase === phrase) {
        phrase.classList.remove('selected');
        selectedPhrase = null;
    } else {
        if (selectedPhrase) {
            selectedPhrase.classList.remove('selected');
        }
        phrase.classList.add('selected');
        selectedPhrase = phrase;
    }
}

function handleZoneClick(e) {
    const zone = e.currentTarget;
    if (selectedPhrase && (e.target === zone || e.target.classList.contains('zone-content') || e.target.tagName === 'H4' || e.target.classList.contains('zone-hint'))) {
        const zoneContent = zone.querySelector('.zone-content');
        zoneContent.appendChild(selectedPhrase);
        selectedPhrase.classList.remove('selected');
        selectedPhrase = null;
        saveSortingState();
    }
}

function handleZoneContentClick(e) {
    if (e.target.classList.contains('phrase') && !selectedPhrase) {
        const phraseBank = document.getElementById('phraseBank');
        phraseBank.appendChild(e.target);
        e.target.classList.remove('correct', 'incorrect');
        saveSortingState();
    }
}

function saveSortingState() {
    const sortZones = document.querySelectorAll('.sort-zone');
    const phraseBank = document.getElementById('phraseBank');
    
    const sortingState = {
        bank: Array.from(phraseBank.querySelectorAll('.phrase')).map(p => p.textContent)
    };
    
    // Save each zone's contents dynamically
    sortZones.forEach(zone => {
        const zoneId = zone.id;
        sortingState[zoneId] = Array.from(zone.querySelectorAll('.zone-content .phrase')).map(p => p.textContent);
    });
    
    lessonData.sorting = sortingState;
    saveFieldDebounced(LESSON_ID, 'sorting', sortingState);
}

function applySortingState() {
    if (!lessonData.sorting || Object.keys(lessonData.sorting).length === 0) return;
    
    const phraseBank = document.getElementById('phraseBank');
    if (!phraseBank) return;
    
    const allPhrases = document.querySelectorAll('.phrase');
    
    // Move phrases to correct zones based on saved state
    allPhrases.forEach(phrase => {
        const text = phrase.textContent;
        
        // Check each zone in saved state
        for (const [zoneId, phrases] of Object.entries(lessonData.sorting)) {
            if (zoneId === 'bank') continue;
            if (phrases && phrases.includes(text)) {
                const zone = document.getElementById(zoneId);
                if (zone) {
                    const zoneContent = zone.querySelector('.zone-content');
                    if (zoneContent) {
                        zoneContent.appendChild(phrase);
                    }
                }
            }
        }
    });
}

// Generic check sorting function - reads correct answers from data attributes
window.checkSorting = function() {
    const sortZones = document.querySelectorAll('.sort-zone');
    const feedback = document.getElementById('sortingFeedback');
    
    let correct = 0;
    let total = 0;
    
    sortZones.forEach(zone => {
        const expectedCategory = zone.dataset.category; // e.g., "formal", "safe"
        
        zone.querySelectorAll('.zone-content .phrase').forEach(phrase => {
            total++;
            const phraseCategory = phrase.dataset.category; // e.g., data-category="formal"
            
            if (phraseCategory === expectedCategory) {
                phrase.classList.add('correct');
                phrase.classList.remove('incorrect');
                correct++;
            } else {
                phrase.classList.add('incorrect');
                phrase.classList.remove('correct');
            }
        });
    });
    
    const totalPhrases = document.querySelectorAll('.phrase').length;
    
    feedback.classList.add('show');
    if (total === 0) {
        feedback.textContent = 'Please sort some phrases first!';
        feedback.className = 'feedback show error';
    } else if (correct === total && total === totalPhrases) {
        feedback.textContent = `Excellent! All ${correct} phrases sorted correctly! 🎉`;
        feedback.className = 'feedback show success';
    } else if (correct === total) {
        feedback.textContent = `${correct}/${total} correct so far. Keep going!`;
        feedback.className = 'feedback show success';
    } else {
        feedback.textContent = `${correct}/${total} correct. The highlighted phrases need to be moved.`;
        feedback.className = 'feedback show error';
    }
};

window.resetSorting = function() {
    const phraseBank = document.getElementById('phraseBank');
    const feedback = document.getElementById('sortingFeedback');
    
    document.querySelectorAll('.zone-content .phrase').forEach(phrase => {
        phrase.classList.remove('correct', 'incorrect', 'selected');
        phraseBank.appendChild(phrase);
    });
    
    feedback.classList.remove('show');
    
    if (selectedPhrase) {
        selectedPhrase.classList.remove('selected');
        selectedPhrase = null;
    }
    
    saveSortingState();
};


// ===== TOPIC CARDS (Reveal on Click) =====

function initTopicCards() {
    // Topic cards are initialized via onclick in HTML, but we can add handlers here too
    document.querySelectorAll('.topic-card').forEach(card => {
        if (!card.onclick) {
            card.addEventListener('click', function() {
                revealTopic(this);
            });
        }
    });
}

window.revealTopic = function(card) {
    card.classList.add('revealed');
    
    // Save revealed state
    const topicText = card.querySelector('.topic-text').textContent;
    if (!lessonData.revealedTopics) {
        lessonData.revealedTopics = [];
    }
    if (!lessonData.revealedTopics.includes(topicText)) {
        lessonData.revealedTopics.push(topicText);
        saveFieldDebounced(LESSON_ID, 'revealedTopics', lessonData.revealedTopics);
    }
};

function applyRevealedTopics() {
    if (!lessonData.revealedTopics || lessonData.revealedTopics.length === 0) return;
    
    document.querySelectorAll('.topic-card').forEach(card => {
        const topicText = card.querySelector('.topic-text').textContent;
        if (lessonData.revealedTopics.includes(topicText)) {
            card.classList.add('revealed');
        }
    });
}


// ===== DRAG AND DROP MATCHING =====

let draggedResponse = null;

function initDragAndDrop() {
    const responseBank = document.getElementById('responseBank');
    if (!responseBank) return; // Activity not on this page
    
    const responses = document.querySelectorAll('.draggable-response');
    const dropZones = document.querySelectorAll('.drop-zone');
    
    responses.forEach(response => {
        response.addEventListener('dragstart', handleDragStart);
        response.addEventListener('dragend', handleDragEnd);
        
        // Touch support
        response.addEventListener('touchstart', handleTouchStart, { passive: false });
        response.addEventListener('touchmove', handleTouchMove, { passive: false });
        response.addEventListener('touchend', handleTouchEnd);
    });
    
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('dragleave', handleDragLeave);
        zone.addEventListener('drop', handleDrop);
    });
    
    responseBank.addEventListener('dragover', handleDragOver);
    responseBank.addEventListener('drop', handleDropToBank);
}

function handleDragStart(e) {
    draggedResponse = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragEnd() {
    this.classList.remove('dragging');
    document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
}

function handleDragLeave() {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    if (draggedResponse) {
        const existingResponse = this.querySelector('.draggable-response');
        if (existingResponse) {
            const bank = document.getElementById('responseBank');
            bank.appendChild(existingResponse);
        }
        
        const placeholder = this.querySelector('.drop-placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        this.appendChild(draggedResponse);
        draggedResponse.classList.remove('dragging');
        
        saveMatchingState();
    }
}

function handleDropToBank(e) {
    e.preventDefault();
    if (draggedResponse) {
        this.appendChild(draggedResponse);
        draggedResponse.classList.remove('dragging');
        
        document.querySelectorAll('.drop-zone').forEach(zone => {
            if (!zone.querySelector('.draggable-response')) {
                const placeholder = zone.querySelector('.drop-placeholder');
                if (placeholder) {
                    placeholder.style.display = 'block';
                }
            }
        });
        
        saveMatchingState();
    }
}

// Touch support
let touchStartX, touchStartY, touchClone;

function handleTouchStart(e) {
    e.preventDefault();
    draggedResponse = this;
    this.classList.add('dragging');
    
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    
    touchClone = this.cloneNode(true);
    touchClone.classList.add('touch-clone');
    touchClone.style.position = 'fixed';
    touchClone.style.left = (touch.clientX - 100) + 'px';
    touchClone.style.top = (touch.clientY - 20) + 'px';
    touchClone.style.zIndex = '1000';
    touchClone.style.opacity = '0.8';
    touchClone.style.pointerEvents = 'none';
    document.body.appendChild(touchClone);
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!touchClone) return;
    
    const touch = e.touches[0];
    touchClone.style.left = (touch.clientX - 100) + 'px';
    touchClone.style.top = (touch.clientY - 20) + 'px';
    
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.classList.remove('drag-over');
    });
    
    if (elementBelow) {
        const dropZone = elementBelow.closest('.drop-zone');
        if (dropZone) {
            dropZone.classList.add('drag-over');
        }
    }
}

function handleTouchEnd(e) {
    if (!draggedResponse || !touchClone) return;
    
    const touch = e.changedTouches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (touchClone.parentNode) {
        touchClone.parentNode.removeChild(touchClone);
    }
    touchClone = null;
    
    if (elementBelow) {
        const dropZone = elementBelow.closest('.drop-zone');
        if (dropZone) {
            const existingResponse = dropZone.querySelector('.draggable-response');
            if (existingResponse) {
                const bank = document.getElementById('responseBank');
                bank.appendChild(existingResponse);
            }
            
            const placeholder = dropZone.querySelector('.drop-placeholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
            
            dropZone.appendChild(draggedResponse);
        }
    }
    
    draggedResponse.classList.remove('dragging');
    document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.classList.remove('drag-over');
    });
    draggedResponse = null;
    
    saveMatchingState();
}

function saveMatchingState() {
    const matchingState = {};
    
    document.querySelectorAll('.drop-zone').forEach(zone => {
        const response = zone.querySelector('.draggable-response');
        if (response) {
            matchingState[zone.dataset.match] = response.dataset.match;
        }
    });
    
    lessonData.matching = matchingState;
    saveFieldDebounced(LESSON_ID, 'matching', matchingState);
}

function applyMatchingState() {
    if (!lessonData.matching || Object.keys(lessonData.matching).length === 0) return;
    
    const responseBank = document.getElementById('responseBank');
    if (!responseBank) return;
    
    Object.entries(lessonData.matching).forEach(([zoneMatch, responseMatch]) => {
        const zone = document.querySelector(`.drop-zone[data-match="${zoneMatch}"]`);
        const response = document.querySelector(`.draggable-response[data-match="${responseMatch}"]`);
        
        if (zone && response) {
            const placeholder = zone.querySelector('.drop-placeholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
            zone.appendChild(response);
        }
    });
}

window.checkDragMatching = function() {
    const feedback = document.getElementById('dragMatchingFeedback');
    const dropZones = document.querySelectorAll('.drop-zone');
    
    let correct = 0;
    let total = 0;
    let totalZones = dropZones.length;
    
    dropZones.forEach(zone => {
        const response = zone.querySelector('.draggable-response');
        if (response) {
            total++;
            zone.classList.remove('correct', 'incorrect');
            response.classList.remove('correct', 'incorrect');
            
            if (response.dataset.match === zone.dataset.match) {
                zone.classList.add('correct');
                response.classList.add('correct');
                correct++;
            } else {
                zone.classList.add('incorrect');
                response.classList.add('incorrect');
            }
        }
    });
    
    feedback.classList.add('show');
    if (total === 0) {
        feedback.textContent = 'Drag the responses and drop them next to the matching statements.';
        feedback.className = 'feedback show error';
    } else if (correct === totalZones) {
        feedback.textContent = 'Perfect! All responses matched correctly! 🎉';
        feedback.className = 'feedback show success';
    } else if (correct === total) {
        feedback.textContent = `${correct}/${total} correct so far. Keep going!`;
        feedback.className = 'feedback show success';
    } else {
        feedback.textContent = `${correct}/${total} correct. The red ones need to be moved.`;
        feedback.className = 'feedback show error';
    }
};

window.resetDragMatching = function() {
    const feedback = document.getElementById('dragMatchingFeedback');
    const responseBank = document.getElementById('responseBank');
    const dropZones = document.querySelectorAll('.drop-zone');
    
    dropZones.forEach(zone => {
        const response = zone.querySelector('.draggable-response');
        if (response) {
            response.classList.remove('correct', 'incorrect');
            responseBank.appendChild(response);
        }
        zone.classList.remove('correct', 'incorrect');
        
        const placeholder = zone.querySelector('.drop-placeholder');
        if (placeholder) {
            placeholder.style.display = 'block';
        }
    });
    
    feedback.classList.remove('show');
    
    // Clear saved matching state
    lessonData.matching = {};
    saveFieldDebounced(LESSON_ID, 'matching', {});
};


// ===== FLIP CARDS =====

function initFlipCards() {
    document.querySelectorAll('.flip-card').forEach((card, index) => {
        card.addEventListener('click', function() {
            this.classList.toggle('flipped');
            saveFlippedCardsState();
        });
    });
}

function saveFlippedCardsState() {
    const flippedCards = [];
    document.querySelectorAll('.flip-card').forEach((card, index) => {
        if (card.classList.contains('flipped')) {
            flippedCards.push(index);
        }
    });
    
    lessonData.flippedCards = flippedCards;
    saveFieldDebounced(LESSON_ID, 'flippedCards', flippedCards);
}

function applyFlippedCards() {
    if (!lessonData.flippedCards || lessonData.flippedCards.length === 0) return;
    
    document.querySelectorAll('.flip-card').forEach((card, index) => {
        if (lessonData.flippedCards.includes(index)) {
            card.classList.add('flipped');
        }
    });
}


// ===== REVEAL BOXES =====

function initRevealBoxes() {
    // Reveal boxes are initialized via onclick in HTML
}

window.toggleRevealBox = function(header) {
    const box = header.closest('.reveal-box');
    box.classList.toggle('revealed');
};


// ===== SCENARIO CARDS =====

function initScenarioCards() {
    document.querySelectorAll('.scenario-card').forEach(card => {
        if (!card.onclick) {
            card.addEventListener('click', function() {
                selectScenario(this);
            });
        }
    });
}

window.selectScenario = function(card) {
    document.querySelectorAll('.scenario-card').forEach(c => {
        c.classList.remove('selected');
    });
    
    card.classList.add('selected');
    
    // Save selected scenario
    const scenarioIndex = Array.from(document.querySelectorAll('.scenario-card')).indexOf(card);
    lessonData.selectedScenario = scenarioIndex;
    saveFieldDebounced(LESSON_ID, 'selectedScenario', scenarioIndex);
};

function applySelectedScenario() {
    if (lessonData.selectedScenario === null || lessonData.selectedScenario === undefined) return;
    
    const scenarioCards = document.querySelectorAll('.scenario-card');
    if (scenarioCards[lessonData.selectedScenario]) {
        scenarioCards[lessonData.selectedScenario].classList.add('selected');
    }
}


// ===== NOTES =====

function initNotesInputs() {
    const notesInputs = document.querySelectorAll('.notes-input');
    
    notesInputs.forEach((input, index) => {
        input.addEventListener('input', function() {
            if (!lessonData.notes) lessonData.notes = {};
            lessonData.notes[index] = this.value;
            saveNoteDebounced(LESSON_ID, index.toString(), this.value);
        });
    });
}

function applyNotes() {
    if (!lessonData.notes || Object.keys(lessonData.notes).length === 0) return;
    
    const notesInputs = document.querySelectorAll('.notes-input');
    
    notesInputs.forEach((input, index) => {
        if (lessonData.notes[index] !== undefined) {
            input.value = lessonData.notes[index];
        }
    });
}


// ===== SMOOTH SCROLL =====

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});


// ===== ENTRANCE ANIMATIONS =====

function addEntranceAnimations() {
    const sections = document.querySelectorAll('.section');
    sections.forEach((section, index) => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        
        setTimeout(() => {
            section.style.opacity = '1';
            section.style.transform = 'translateY(0)';
        }, 100 + (index * 100));
    });
}


// ===== LESSON COMPLETION (loaded separately in each lesson HTML) =====
// Export lesson info for completion module
window.currentLessonNumber = parseInt(LESSON_NUMBER);
window.currentLessonId = LESSON_ID;
