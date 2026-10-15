
const projects = [];
let nextId = 1;

function readProject(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const allowedStatuses = ['Planned', 'In Progress', 'Completed'];

  if (!name || name.length > 80) {
    return { error: 'Name is required and must be 80 characters or fewer.' };
  }

  if (!allowedStatuses.includes(body?.status)) {
    return { error: 'Status must be Planned, In Progress, or Completed.' };
  }

  return { name, status: body.status };
}

function registerProjectRoutes(app) {
  app.post('/api/projects', (req, res) => {
    const result = readProject(req.body);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    const project = {
      id: nextId++,
      name: result.name,
      status: result.status
    };

    projects.push(project);
    return res.status(201).json(project);
  });

  app.get('/api/projects', (req, res) => {
    res.json(projects);
  });
}

export { registerProjectRoutes };
