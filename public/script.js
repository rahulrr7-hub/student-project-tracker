const form = document.querySelector('#project-form');
const nameInput = document.querySelector('#name');
const statusInput = document.querySelector('#status');
const projectList = document.querySelector('#project-list');
const emptyState = document.querySelector('#empty-state');

// Projects exist only while this page is loaded.
const projects = [];

// Generate a unique ID for each project.
function generateProjectId() {
  return crypto.randomUUID();
}

// Display all projects in the list.
function renderProjects() {
  // Remove previously displayed items to avoid duplicates.
  projectList.replaceChildren();

  // Build the list from the current projects array.
  projects.forEach(project => {
    const listItem = document.createElement('li');
    const projectName = document.createElement('span');
    const projectStatus = document.createElement('span');

    projectName.textContent = project.name;
    projectStatus.textContent = ` — ${project.status}`;

    listItem.append(projectName, projectStatus);
    projectList.appendChild(listItem);
  });

  // Update the empty-state message if it exists.
  if (emptyState) {
    emptyState.hidden = projects.length > 0;
  }
}

// Handle adding a project.
form.addEventListener('submit', event => {
  // Prevent the browser's normal form submission.
  event.preventDefault();

  // Read the current form values.
  const name = nameInput.value.trim();
  const status = statusInput.value;

  // Reject an empty or whitespace-only name.
  if (!name) {
    nameInput.value = '';
    nameInput.focus();
    return;
  }

  // Create a project using the user's actual input.
  const project = {
    id: generateProjectId(),
    name: name,
    status: status
  };

  // Store the project in memory.
  projects.push(project);

  // Refresh the visible list.
  renderProjects();

  // Prepare the form for the next project.
  form.reset();
  nameInput.focus();
});

// Show the initial empty state.
renderProjects();