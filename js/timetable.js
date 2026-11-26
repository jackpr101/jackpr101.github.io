document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('timetable-form');
    if (!form) return;

    const codeInput = document.getElementById('parent-code');
    const codeErrorEl = document.getElementById('code-error');
    const notesInput = document.getElementById('parent-notes');
    const slotButtons = Array.from(form.querySelectorAll('.slot-btn'));
    const clearBtn = document.getElementById('clear-slots-btn');
    const summaryEl = document.getElementById('selection-summary');
    const errorEl = document.getElementById('timetable-error');
    const submitBtn = document.getElementById('timetable-submit-btn');

    const confirmationEl = document.getElementById('timetable-confirmation');
    const confirmCodeEl = document.getElementById('confirm-code');
    const confirmSlotsEl = document.getElementById('confirm-slots');
    const confirmNotesWrap = document.getElementById('confirm-notes-wrap');
    const confirmNotesEl = document.getElementById('confirm-notes');
    const submitAnotherBtn = document.getElementById('submit-another-btn');

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

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearError();

        const code = codeInput.value.trim();
        const selected = getSelectedSlots();
        const notes = notesInput.value.trim();

        if (!code) {
            clearCodeError();
            return;
        }

        if (!VALID_CODES.has(code)) {
            codeErrorEl.hidden = false;
            codeInput.classList.add('is-invalid');
            codeInput.focus();
            return;
        }

        clearCodeError();

        if (selected.length === 0) {
            showError('Please select at least one time slot that works for you.');
            return;
        }

        const payload = {
            _subject: `Availability - ${code}`,
            code: code,
            total_slots_selected: selected.length,
            selected_slots: selected.map(s => s.label).join(', ')
        };

        DAYS.forEach(day => {
            const dayTimes = selected.filter(s => s.day === day).map(s => s.time);
            payload[day.toLowerCase()] = dayTimes.length > 0 ? dayTimes.join(', ') : 'None';
        });

        if (notes) {
            payload.notes = notes;
        }

        const gotcha = form.querySelector('input[name="_gotcha"]');
        if (gotcha && gotcha.value) {
            payload._gotcha = gotcha.value;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                let errMsg = 'Something went wrong while sending your availability. Please try again.';
                try {
                    const data = await response.json();
                    if (data && Array.isArray(data.errors) && data.errors.length > 0) {
                        errMsg = data.errors.map(e => e.message).join(' ');
                    }
                } catch (_) {
                    // Ignore JSON parse error
                }
                throw new Error(errMsg);
            }

            confirmCodeEl.textContent = code;
            confirmSlotsEl.innerHTML = '';
            selected.forEach(slot => {
                const li = document.createElement('li');
                li.textContent = slot.label;
                confirmSlotsEl.appendChild(li);
            });

            if (notes) {
                confirmNotesEl.textContent = notes;
                confirmNotesWrap.hidden = false;
            } else {
                confirmNotesWrap.hidden = true;
            }

            form.hidden = true;
            confirmationEl.hidden = false;
            confirmationEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) {
            showError(err.message || 'Could not send your availability. Please check your connection and try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Availability';
            updateSubmitState();
        }
    });

    submitAnotherBtn.addEventListener('click', () => {
        confirmationEl.hidden = true;
        form.hidden = false;
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});
