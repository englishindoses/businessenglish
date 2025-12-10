// ===== Activity 1: Sorting Formal/Informal Phrases =====

let selectedPhrase = null;

// Initialize phrase click handlers
document.querySelectorAll('#phraseBank .phrase').forEach(phrase => {
    phrase.addEventListener('click', function() {
        if (selectedPhrase === this) {
            // Deselect if clicking the same phrase
            this.classList.remove('selected');
            selectedPhrase = null;
        } else {
            // Select new phrase
            if (selectedPhrase) {
                selectedPhrase.classList.remove('selected');
            }
            this.classList.add('selected');
            selectedPhrase = this;
        }
    });
});

// Initialize zone click handlers
document.querySelectorAll('.sort-zone').forEach(zone => {
    zone.addEventListener('click', function(e) {
        if (selectedPhrase && e.target === this || e.target.classList.contains('zone-content') || e.target === this.querySelector('h4') || e.target === this.querySelector('.zone-hint')) {
            const zoneContent = this.querySelector('.zone-content');
            zoneContent.appendChild(selectedPhrase);
            selectedPhrase.classList.remove('selected');
            selectedPhrase = null;
        }
    });
});

// Allow clicking phrases in zones to move them back
document.querySelectorAll('.zone-content').forEach(zone => {
    zone.addEventListener('click', function(e) {
        if (e.target.classList.contains('phrase') && !selectedPhrase) {
            // Move phrase back to bank
            const phraseBank = document.getElementById('phraseBank');
            phraseBank.appendChild(e.target);
            e.target.classList.remove('correct', 'incorrect');
        }
    });
});

function checkSorting() {
    const formalZone = document.querySelector('#formalZone .zone-content');
    const informalZone = document.querySelector('#informalZone .zone-content');
    const feedback = document.getElementById('sortingFeedback');
    
    let correct = 0;
    let total = 0;
    
    // Check formal zone
    formalZone.querySelectorAll('.phrase').forEach(phrase => {
        total++;
        if (phrase.dataset.formality === 'formal') {
            phrase.classList.add('correct');
            phrase.classList.remove('incorrect');
            correct++;
        } else {
            phrase.classList.add('incorrect');
            phrase.classList.remove('correct');
        }
    });
    
    // Check informal zone
    informalZone.querySelectorAll('.phrase').forEach(phrase => {
        total++;
        if (phrase.dataset.formality === 'informal') {
            phrase.classList.add('correct');
            phrase.classList.remove('incorrect');
            correct++;
        } else {
            phrase.classList.add('incorrect');
            phrase.classList.remove('correct');
        }
    });
    
    // Show feedback
    feedback.classList.add('show');
    if (total === 0) {
        feedback.textContent = 'Please sort some phrases first!';
        feedback.className = 'feedback show error';
    } else if (correct === total && total === 8) {
        feedback.textContent = `Excellent! All ${correct} phrases sorted correctly! 🎉`;
        feedback.className = 'feedback show success';
    } else if (correct === total) {
        feedback.textContent = `${correct}/${total} correct so far. Keep going!`;
        feedback.className = 'feedback show success';
    } else {
        feedback.textContent = `${correct}/${total} correct. The highlighted phrases need to be moved.`;
        feedback.className = 'feedback show error';
    }
}

function resetSorting() {
    const phraseBank = document.getElementById('phraseBank');
    const feedback = document.getElementById('sortingFeedback');
    
    // Move all phrases back to bank
    document.querySelectorAll('.zone-content .phrase').forEach(phrase => {
        phrase.classList.remove('correct', 'incorrect', 'selected');
        phraseBank.appendChild(phrase);
    });
    
    // Hide feedback
    feedback.classList.remove('show');
    
    // Clear selection
    if (selectedPhrase) {
        selectedPhrase.classList.remove('selected');
        selectedPhrase = null;
    }
}


// ===== Activity 3: Small Talk Topics =====

function revealTopic(card) {
    card.classList.add('revealed');
}


// ===== Activity 4: Drag and Drop Matching =====

let draggedResponse = null;

// Initialize drag and drop
document.addEventListener('DOMContentLoaded', function() {
    initDragAndDrop();
});

function initDragAndDrop() {
    const responses = document.querySelectorAll('.draggable-response');
    const dropZones = document.querySelectorAll('.drop-zone');
    
    // Draggable responses
    responses.forEach(response => {
        response.addEventListener('dragstart', handleDragStart);
        response.addEventListener('dragend', handleDragEnd);
        
        // Touch support
        response.addEventListener('touchstart', handleTouchStart, { passive: false });
        response.addEventListener('touchmove', handleTouchMove, { passive: false });
        response.addEventListener('touchend', handleTouchEnd);
    });
    
    // Drop zones
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('dragleave', handleDragLeave);
        zone.addEventListener('drop', handleDrop);
    });
    
    // Also allow dropping back to response bank
    const responseBank = document.getElementById('responseBank');
    if (responseBank) {
        responseBank.addEventListener('dragover', handleDragOver);
        responseBank.addEventListener('drop', handleDropToBank);
    }
}

function handleDragStart(e) {
    draggedResponse = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragEnd(e) {
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

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    if (draggedResponse) {
        // Check if zone already has a response
        const existingResponse = this.querySelector('.draggable-response');
        if (existingResponse) {
            // Move existing response back to bank
            const bank = document.getElementById('responseBank');
            bank.appendChild(existingResponse);
        }
        
        // Hide placeholder
        const placeholder = this.querySelector('.drop-placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        // Add dragged response to zone
        this.appendChild(draggedResponse);
        draggedResponse.classList.remove('dragging');
    }
}

function handleDropToBank(e) {
    e.preventDefault();
    if (draggedResponse) {
        this.appendChild(draggedResponse);
        draggedResponse.classList.remove('dragging');
        
        // Show placeholder again in original zone
        document.querySelectorAll('.drop-zone').forEach(zone => {
            if (!zone.querySelector('.draggable-response')) {
                const placeholder = zone.querySelector('.drop-placeholder');
                if (placeholder) {
                    placeholder.style.display = 'block';
                }
            }
        });
    }
}

// Touch support for mobile
let touchStartX, touchStartY, touchClone;

function handleTouchStart(e) {
    e.preventDefault();
    draggedResponse = this;
    this.classList.add('dragging');
    
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    
    // Create clone for visual feedback
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
    
    // Highlight drop zone under finger
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
    
    // Remove clone
    if (touchClone.parentNode) {
        touchClone.parentNode.removeChild(touchClone);
    }
    touchClone = null;
    
    // Find drop zone
    if (elementBelow) {
        const dropZone = elementBelow.closest('.drop-zone');
        if (dropZone) {
            // Check if zone already has a response
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
}

function checkDragMatching() {
    const feedback = document.getElementById('dragMatchingFeedback');
    const dropZones = document.querySelectorAll('.drop-zone');
    
    let correct = 0;
    let total = 0;
    
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
    } else if (correct === 4) {
        feedback.textContent = 'Perfect! All responses matched correctly! 🎉';
        feedback.className = 'feedback show success';
    } else if (correct === total) {
        feedback.textContent = `${correct}/${total} correct so far. Keep going!`;
        feedback.className = 'feedback show success';
    } else {
        feedback.textContent = `${correct}/${total} correct. The red ones need to be moved.`;
        feedback.className = 'feedback show error';
    }
}

function resetDragMatching() {
    const feedback = document.getElementById('dragMatchingFeedback');
    const responseBank = document.getElementById('responseBank');
    const dropZones = document.querySelectorAll('.drop-zone');
    
    // Move all responses back to bank
    dropZones.forEach(zone => {
        const response = zone.querySelector('.draggable-response');
        if (response) {
            response.classList.remove('correct', 'incorrect');
            responseBank.appendChild(response);
        }
        zone.classList.remove('correct', 'incorrect');
        
        // Show placeholder
        const placeholder = zone.querySelector('.drop-placeholder');
        if (placeholder) {
            placeholder.style.display = 'block';
        }
    });
    
    feedback.classList.remove('show');
}


// ===== Reveal Box Toggle =====

function toggleRevealBox(header) {
    const box = header.closest('.reveal-box');
    box.classList.toggle('revealed');
}


// ===== Activity 5: Scenario Selection =====

function selectScenario(card) {
    // Remove selection from all cards
    document.querySelectorAll('.scenario-card').forEach(c => {
        c.classList.remove('selected');
    });
    
    // Add selection to clicked card
    card.classList.add('selected');
}


// ===== Smooth Scroll for Navigation =====

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


// ===== Save Notes to Local Storage =====

const notesInputs = document.querySelectorAll('.notes-input');

// Load saved notes
notesInputs.forEach((input, index) => {
    const saved = localStorage.getItem(`lesson1-notes-${index}`);
    if (saved) {
        input.value = saved;
    }
    
    // Save on input
    input.addEventListener('input', function() {
        localStorage.setItem(`lesson1-notes-${index}`, this.value);
    });
});


// ===== Initialize =====

document.addEventListener('DOMContentLoaded', function() {
    // Add entrance animations
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
});
