// API endpoints
const API_URL = '/api/jobs';

// Settings storage key
const SETTINGS_KEY = 'dockerBackupSettings';

// DOM elements - Form
const addJobBtn = document.getElementById('addJobBtn');
const jobForm = document.getElementById('jobForm');
const formSection = document.getElementById('formSection');
const cancelFormBtn = document.getElementById('cancelFormBtn');
const backupLabel = document.getElementById('backupLabel');
const frequency = document.getElementById('frequency');
const customCronInput = document.getElementById('customCron');
const customCronGroup = document.getElementById('customCronGroup');
const enabledCheckbox = document.getElementById('enabled');
const jobsList = document.getElementById('jobsList');

// DOM elements - Settings
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const settingsForm = document.getElementById('settingsForm');
const settingsClose = document.getElementById('settingsClose');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
const backupNameSchema = document.getElementById('backupNameSchema');
const schemaPreview = document.getElementById('schemaPreview');

// DOM elements - Edit Modal
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const editJobId = document.getElementById('editJobId');
const editBackupLabel = document.getElementById('editBackupLabel');
const editFrequency = document.getElementById('editFrequency');
const editCustomCronInput = document.getElementById('editCustomCron');
const editCustomCronGroup = document.getElementById('editCustomCronGroup');
const editEnabled = document.getElementById('editEnabled');
const closeModalBtn = document.querySelector('.close');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// Frequency to cron mapping
const frequencyMap = {
    'hourly': '0 * * * *',
    'daily': '0 0 * * *',
    'weekly': '0 0 * * 0',
    'monthly': '0 0 1 * *'
};

// Event listeners
addJobBtn.addEventListener('click', showFormSection);
cancelFormBtn.addEventListener('click', hideFormSection);
jobForm.addEventListener('submit', handleCreateBackup);
frequency.addEventListener('change', handleFrequencyChange);

settingsBtn.addEventListener('click', openSettingsModal);
settingsClose.addEventListener('click', closeSettingsModal);
cancelSettingsBtn.addEventListener('click', closeSettingsModal);
settingsForm.addEventListener('submit', handleSaveSettings);
backupNameSchema.addEventListener('input', updateSchemaPreview);

editFrequency.addEventListener('change', handleEditFrequencyChange);
editForm.addEventListener('submit', handleEditBackup);
closeModalBtn.addEventListener('click', closeEditModal);
cancelEditBtn.addEventListener('click', closeEditModal);

// Initialize
loadSettings();
loadAndDisplayJobs();

// Show form section
function showFormSection() {
    formSection.classList.remove('hidden');
    formSection.scrollIntoView({ behavior: 'smooth' });
}

// Hide form section
function hideFormSection() {
    formSection.classList.add('hidden');
    jobForm.reset();
    customCronGroup.classList.add('hidden');
}

// Handle frequency change to show/hide custom cron input
function handleFrequencyChange() {
    if (frequency.value === 'custom') {
        customCronGroup.classList.remove('hidden');
        customCronInput.required = true;
    } else {
        customCronGroup.classList.add('hidden');
        customCronInput.required = false;
    }
}

// Handle edit frequency change
function handleEditFrequencyChange() {
    if (editFrequency.value === 'custom') {
        editCustomCronGroup.classList.remove('hidden');
        editCustomCronInput.required = true;
    } else {
        editCustomCronGroup.classList.add('hidden');
        editCustomCronInput.required = false;
    }
}

// Convert frequency to cron expression
function getScheduleFromFrequency(freq, customCron) {
    if (freq === 'custom') {
        return customCron;
    }
    return frequencyMap[freq] || frequencyMap['daily'];
}

// Load and display all jobs
async function loadAndDisplayJobs() {
    try {
        const response = await fetch(API_URL);
        const jobs = await response.json();
        displayJobs(jobs);
    } catch (error) {
        console.error('Error loading jobs:', error);
    }
}

// Display jobs
function displayJobs(jobs) {
    if (jobs.length === 0) {
        jobsList.innerHTML = '<div class="empty-state"><p>No backups scheduled yet. Create one above!</p></div>';
        return;
    }

    jobsList.innerHTML = jobs.map(job => `
        <div class="job-card ${job.enabled ? '' : 'disabled'}">
            <div class="job-header">
                <h3 class="job-name">${escapeHtml(job.backupLabel)}</h3>
                <span class="job-status ${job.enabled ? 'enabled' : 'disabled'}">
                    ${job.enabled ? '✓ Enabled' : '✗ Disabled'}
                </span>
            </div>
            <div class="job-schedule">
                <strong>Schedule:</strong> ${escapeHtml(job.schedule)}
            </div>
            <div class="job-schedule">
                <strong>Frequency:</strong> ${escapeHtml(job.frequency)}
            </div>
            <div class="job-actions">
                <button class="btn-edit" onclick="openEditModal('${job.id}')">Edit</button>
                <button class="btn-toggle ${job.enabled ? 'disable' : ''}" onclick="toggleJob('${job.id}')">
                    ${job.enabled ? 'Disable' : 'Enable'}
                </button>
                <button class="btn-delete" onclick="deleteJob('${job.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// Handle create backup
async function handleCreateBackup(e) {
    e.preventDefault();

    const freq = frequency.value;
    const schedule = getScheduleFromFrequency(freq, customCronInput.value);

    const jobData = {
        backupLabel: backupLabel.value,
        frequency: freq,
        schedule: schedule,
        enabled: enabledCheckbox.checked
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jobData)
        });

        if (!response.ok) throw new Error('Failed to create backup');

        // Reset form
        jobForm.reset();
        customCronGroup.classList.add('hidden');
        enabledCheckbox.checked = true;

        // Reload jobs
        loadAndDisplayJobs();
    } catch (error) {
        console.error('Error creating backup:', error);
        alert('Failed to create backup: ' + error.message);
    }
}

// Open edit modal
async function openEditModal(jobId) {
    try {
        const response = await fetch(`${API_URL}/${jobId}`);
        if (!response.ok) throw new Error('Job not found');
        const job = await response.json();

        editJobId.value = job.id;
        editBackupLabel.value = job.backupLabel;
        editFrequency.value = job.frequency;
        editEnabled.checked = job.enabled;

        if (job.frequency === 'custom') {
            editCustomCronInput.value = job.schedule;
            editCustomCronGroup.classList.remove('hidden');
        } else {
            editCustomCronGroup.classList.add('hidden');
        }

        editModal.classList.remove('hidden');
        editModal.classList.add('visible');
    } catch (error) {
        console.error('Error opening edit modal:', error);
        alert('Failed to load backup details');
    }
}

// Handle edit backup
async function handleEditBackup(e) {
    e.preventDefault();

    const freq = editFrequency.value;
    const schedule = getScheduleFromFrequency(freq, editCustomCronInput.value);

    const jobData = {
        backupLabel: editBackupLabel.value,
        frequency: freq,
        schedule: schedule,
        enabled: editEnabled.checked
    };

    try {
        const response = await fetch(`${API_URL}/${editJobId.value}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jobData)
        });

        if (!response.ok) throw new Error('Failed to update backup');

        closeEditModal();
        loadAndDisplayJobs();
    } catch (error) {
        console.error('Error updating backup:', error);
        alert('Failed to update backup: ' + error.message);
    }
}

// Close edit modal
function closeEditModal() {
    editModal.classList.remove('visible');
    editModal.classList.add('hidden');
    editForm.reset();
}

// Toggle job enabled/disabled
async function toggleJob(jobId) {
    try {
        const response = await fetch(`${API_URL}/${jobId}`);
        if (!response.ok) throw new Error('Job not found');
        const job = await response.json();

        const updatedJob = { ...job, enabled: !job.enabled };

        const updateResponse = await fetch(`${API_URL}/${jobId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedJob)
        });

        if (!updateResponse.ok) throw new Error('Failed to update job');

        loadAndDisplayJobs();
    } catch (error) {
        console.error('Error toggling job:', error);
        alert('Failed to toggle job');
    }
}

// Delete job
async function deleteJob(jobId) {
    if (!confirm('Are you sure you want to delete this backup schedule?')) return;

    try {
        const response = await fetch(`${API_URL}/${jobId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete job');

        loadAndDisplayJobs();
    } catch (error) {
        console.error('Error deleting job:', error);
        alert('Failed to delete job: ' + error.message);
    }
}

// Utility: Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Settings functions
function loadSettings() {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
        const settings = JSON.parse(saved);
        backupNameSchema.value = settings.backupNameSchema || 'backup_{label}_{date}';
    } else {
        backupNameSchema.value = 'backup_{label}_{date}';
    }
    updateSchemaPreview();
}

function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function updateSchemaPreview() {
    const schema = backupNameSchema.value;
    const preview = schema
        .replace('{label}', 'myvolume')
        .replace('{date}', '20251224')
        .replace('{time}', '1430')
        .replace('{timestamp}', '20251224_1430');
    schemaPreview.textContent = preview;
}

function openSettingsModal() {
    settingsModal.classList.remove('hidden');
    settingsModal.classList.add('visible');
}

function closeSettingsModal() {
    settingsModal.classList.remove('visible');
    settingsModal.classList.add('hidden');
}

async function handleSaveSettings(e) {
    e.preventDefault();
    const settings = {
        backupNameSchema: backupNameSchema.value
    };
    saveSettings(settings);
    closeSettingsModal();
    alert('Settings saved successfully!');
}

// Auto-reload jobs every 10 seconds
setInterval(loadAndDisplayJobs, 10000);
