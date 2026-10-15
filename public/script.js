
const form = document.querySelector('#project-form');
const nameInput = document.querySelector('#name');
const statusInput = document.querySelector('#status');
const projectList = document.querySelector('#project-list');
const emptyState = document.querySelector('#empty-state');
const saveButton = document.querySelector('#save-button');
const cancelButton = document.querySelector('#cancel-button');
const formTitle = document.querySelector('#form-title');
const message = document.querySelector('#message');

const allowedStatuses = ['Planned', 'In Progress', 'Completed'];

let projects = [];
let editingId = null;
let projectsLoaded = false;
let busy = false;

function setMessage(text) {
    message.textContent = text;
}

function setBusy(value) {
    busy = value;

    saveButton.disabled = busy;
    cancelButton.disabled = busy;

    nameInput.disabled = busy;
    statusInput.disabled = busy;

    projectList.querySelectorAll('button').forEach(button => {
        button.disabled = busy;
    });
}

function sameId(first, second) {
    return String(first) === String(second);
}

function validateProjects(value) {
    if (!Array.isArray(value)) {
        throw new Error('The server returned an invalid project list.');
    }

    const uniqueProjects = new Map();

    for (const project of value) {
        if (
            !project ||
            typeof project !== 'object' ||
            Array.isArray(project) ||
            !['string', 'number'].includes(typeof project.id) ||
            String(project.id).length === 0 ||
            typeof project.name !== 'string' ||
            !project.name.trim() ||
            !allowedStatuses.includes(project.status)
        ) {
            throw new Error('The server returned invalid project data.');
        }

        const key = String(project.id);

        if (!uniqueProjects.has(key)) {
            uniqueProjects.set(key, {
                id: project.id,
                name: project.name,
                status: project.status
            });
        }
    }

    return Array.from(uniqueProjects.values());
}

async function getErrorMessage(response) {
    try {
        const body = await response.json();

        if (typeof body.error === 'string' && body.error.trim()) {
            return body.error;
        }

        if (typeof body.message === 'string' && body.message.trim()) {
            return body.message;
        }
    } catch {
        // The server may return an empty or non-JSON error response.
    }

    return `Request failed (${response.status} ${response.statusText || 'HTTP error'}).`;
}

async function requestJSON(url, options = {}) {
    let response;

    try {
        response = await fetch(url, options);
    } catch {
        throw new Error(
            'Could not connect to the server. Check that it is running and try again.'
        );
    }

    if (!response.ok) {
        throw new Error(await getErrorMessage(response));
    }

    return response;
}

async function loadProjects({ showLoading = true } = {}) {
    if (showLoading) {
        setMessage('Loading projects…');
    }

    try {
        const response = await requestJSON('/api/projects');
        const data = await response.json();
        const loadedProjects = validateProjects(data);

        projects = loadedProjects;
        projectsLoaded = true;

        if (
            editingId !== null &&
            !projects.some(project => sameId(project.id, editingId))
        ) {
            resetForm();
            setMessage('The project being edited no longer exists.');
        }

        renderProjects();

        return true;
    } catch (error) {
        if (!projectsLoaded) {
            // A failed initial request must not look like an empty list.
            emptyState.hidden = true;
            projectList.textContent = '';
        }

        setMessage(error.message || 'Could not load projects.');
        return false;
    }
}

function renderProjects() {
    projectList.textContent = '';

    for (const project of projects) {
        const listItem = document.createElement('li');
        const projectName = document.createElement('span');
        const projectStatus = document.createElement('span');
        const editButton = document.createElement('button');
        const deleteButton = document.createElement('button');

        // Use textContent so project names are displayed as text.
        projectName.textContent = project.name;
        projectStatus.textContent = ` — ${project.status}`;

        editButton.type = 'button';
        editButton.textContent = 'Edit';
        editButton.disabled = busy;

        editButton.addEventListener('click', () => {
            if (busy) return;

            editingId = project.id;

            nameInput.value = project.name;
            statusInput.value = project.status;

            saveButton.textContent = 'Save changes';
            cancelButton.hidden = false;
            formTitle.textContent = 'Edit Project';

            setMessage('');
            nameInput.focus();
        });

        deleteButton.type = 'button';
        deleteButton.textContent = 'Delete';
        deleteButton.disabled = busy;

        deleteButton.addEventListener('click', async () => {
            if (busy) return;

            const confirmed = window.confirm(
                `Are you sure you want to delete "${project.name}"?`
            );

            if (!confirmed) {
                return;
            }

            await deleteProject(project);
        });

        listItem.appendChild(projectName);
        listItem.appendChild(projectStatus);
        listItem.appendChild(document.createTextNode(' '));
        listItem.appendChild(editButton);
        listItem.appendChild(document.createTextNode(' '));
        listItem.appendChild(deleteButton);

        projectList.appendChild(listItem);
    }

    emptyState.hidden = !projectsLoaded || projects.length > 0;
    setBusy(busy);
}

function resetForm() {
    form.reset();

    editingId = null;

    saveButton.textContent = 'Save Project';
    cancelButton.hidden = true;
    formTitle.textContent = 'Add or Edit Project';
}

async function refreshAfterMutation(successMessage) {
    const refreshed = await loadProjects({ showLoading: false });

    if (refreshed) {
        setMessage(successMessage);
    } else {
        setMessage(
            `${successMessage} However, the project list could not be refreshed: ${message.textContent}`
        );
    }
}

form.addEventListener('submit', async event => {
    event.preventDefault();

    if (busy) return;

    if (!projectsLoaded) {
        setMessage('Projects have not loaded successfully. Please try again.');
        return;
    }

    const name = nameInput.value.trim();
    const status = statusInput.value;

    if (!name) {
        setMessage('Please enter a project name.');
        nameInput.focus();
        return;
    }

    if (name.length > 80) {
        setMessage('Project names must be 80 characters or fewer.');
        nameInput.focus();
        return;
    }

    if (!allowedStatuses.includes(status)) {
        setMessage('Please select a valid project status.');
        return;
    }

    const wasEditing = editingId !== null;
    const targetId = editingId;

    if (
        wasEditing &&
        !projects.some(project => sameId(project.id, targetId))
    ) {
        resetForm();
        renderProjects();
        setMessage('The project being edited no longer exists. Please try again.');
        return;
    }

    const payload = { name, status };
    const url = wasEditing
        ? `/api/projects/${encodeURIComponent(String(targetId))}`
        : '/api/projects';

    setBusy(true);
    setMessage(wasEditing ? 'Saving changes…' : 'Saving project…');

    try {
        await requestJSON(url, {
            method: wasEditing ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // Reset only after the server confirms the mutation succeeded.
        resetForm();

        await refreshAfterMutation(
            wasEditing ? 'Project updated successfully.' : 'Project added successfully.'
        );

        if (projectsLoaded) {
            nameInput.focus();
        }
    } catch (error) {
        setMessage(error.message || 'Could not save the project.');
        // Keep the entered values and edit mode after a failed mutation.
    } finally {
        setBusy(false);
        renderProjects();
    }
});

async function deleteProject(project) {
    if (!projectsLoaded || busy) return;

    setBusy(true);
    setMessage('Deleting project…');

    try {
        await requestJSON(
            `/api/projects/${encodeURIComponent(String(project.id))}`,
            { method: 'DELETE' }
        );

        if (editingId !== null && sameId(editingId, project.id)) {
            resetForm();
        }

        await refreshAfterMutation('Project deleted successfully.');
    } catch (error) {
        setMessage(error.message || 'Could not delete the project.');
    } finally {
        setBusy(false);
        renderProjects();
    }
}

cancelButton.addEventListener('click', () => {
    if (busy) return;

    resetForm();
    setMessage('');
});

setBusy(true);
loadProjects().finally(() => {
    setBusy(false);
    renderProjects();
});
