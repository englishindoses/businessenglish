document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.confidence-option').forEach(btn => {
        btn.addEventListener('click', function() {
            const item = this.closest('.confidence-item');
            item.querySelectorAll('.confidence-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
});
