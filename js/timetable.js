document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('timetable-form');
    if (!form) return;

    const codeInput = document.getElementById('parent-code');
    const codeErrorEl = document.getElementById('code-error');
    const slotButtons = Array.from(form.querySelectorAll('.slot-btn'));
    const clearBtn = document.getElementById('clear-slots-btn');
    const summaryEl = document.getElementById('selection-summary');
    const errorEl = document.getElementById('timetable-error');
    const submitBtn = document.getElementById('timetable-submit-btn');

    const hiddenSubject = document.getElementById('hidden-subject');
    const hiddenTotal = document.getElementById('hidden-total');
    const hiddenSlots = document.getElementById('hidden-slots');

    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const VALID_CODES = new Set([
        '3910', '8135', '2995', '2057', '5854', '1705', '3351',
        '1329', '8609', '1683', '2644', '7170', '9675'
    ]);

    function updateSubmitState() {
        const hasCode = codeInput.value.trim().length > 0;
        submitBtn.classList.toggle('is-disabled', !hasCode);
        submitBtn.setAttribute('aria-disabled', String(!hasCode));
    }

    function clearCodeError() {
        codeErrorEl.hidden = true;
        codeInput.classList.remove('is-invalid');
    }

    // Optional: pre-fill code if shared via ?code=...
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get('code');
    if (urlCode && urlCode.trim()) {
        codeInput.value = urlCode.trim();
    }
    updateSubmitState();

    function getSelectedSlots() {
        return slotButtons
            .filter(btn => btn.getAttribute('aria-pressed') === 'true')
            .map(btn => ({
                day: btn.dataset.day,
                time: btn.dataset.time,
                label: `${btn.dataset.day} ${btn.dataset.time}`
            }));
    }

    function showError(message) {
        errorEl.textContent = message;
        errorEl.hidden = false;
    }

    function clearError() {
        errorEl.textContent = '';
        errorEl.hidden = true;
    }

    function updateSummary() {
        const selected = getSelectedSlots();
        clearBtn.hidden = selected.length === 0;

        if (selected.length === 0) {
            summaryEl.textContent = 'No slots selected yet.';
            summaryEl.classList.remove('has-selection');
            return;
        }

        const countText = selected.length === 1 ? '1 slot selected' : `${selected.length} slots selected`;
        summaryEl.textContent = countText;
        summaryEl.classList.add('has-selection');
    }

    slotButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const isSelected = btn.getAttribute('aria-pressed') === 'true';
            const nextState = !isSelected;
            btn.setAttribute('aria-pressed', String(nextState));
            btn.classList.toggle('is-selected', nextState);
            clearError();
            updateSummary();
        });
    });

    clearBtn.addEventListener('click', () => {
        slotButtons.forEach(btn => {
            btn.setAttribute('aria-pressed', 'false');
            btn.classList.remove('is-selected');
        });
        clearError();
        updateSummary();
    });

    codeInput.addEventListener('input', () => {
        clearError();
        clearCodeError();
        updateSubmitState();
    });

    form.addEventListener('submit', (event) => {
        clearError();

        const code = codeInput.value.trim();
        const selected = getSelectedSlots();

        if (!code) {
            event.preventDefault();
            clearCodeError();
            return;
        }

        if (!VALID_CODES.has(code)) {
            event.preventDefault();
            codeErrorEl.hidden = false;
            codeInput.classList.add('is-invalid');
            codeInput.focus();
            return;
        }

        clearCodeError();

        if (selected.length === 0) {
            event.preventDefault();
            showError('Please select at least one time slot that works for you.');
            return;
        }

        // Normalize trimmed code and populate hidden fields for standard Formspree POST
        codeInput.value = code;
        hiddenSubject.value = `Availability - ${code}`;
        hiddenTotal.value = String(selected.length);
        hiddenSlots.value = selected.map(s => s.label).join(', ');

        DAYS.forEach(day => {
            const dayEl = document.getElementById(`hidden-${day.toLowerCase()}`);
            if (dayEl) {
                const dayTimes = selected.filter(s => s.day === day).map(s => s.time);
                dayEl.value = dayTimes.length > 0 ? dayTimes.join(', ') : 'None';
            }
        });

        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
    });

    // Reset button state if user navigates back via browser history
    window.addEventListener('pageshow', () => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Availability';
        updateSubmitState();
    });
});
