import express from 'express';
import { db } from './database.js';

const app = express();

app.use(express.json({ limit: '10kb' }));

app.use(express.static('public'));

const allowedStatuses = [
    'Planned',
    'In Progress',
    'Completed'
];

function validateProject(name, status) {
    if (
        typeof name !== 'string' ||
        name.trim() === '' ||
        name.trim().length > 80
    ) {
        return 'Project name must be between 1 and 80 characters.';
    }

    if (!allowedStatuses.includes(status)) {
        return 'Status must be Planned, In Progress, or Completed.';
    }

    return null;
}

app.get('/api/health', (req, res) => {
    res.json({ ok: true });
});

app.get('/api/projects', async (req, res) => {
    try {
        const projects = await db.list();
        res.json(projects);
    } catch (error) {
        console.error('Failed to load projects:', error);
        res.status(500).json({ error: 'Failed to load projects.' });
    }
});

app.post('/api/projects', async (req, res) => {
    const { name, status } = req.body ?? {};
    const validationError = validateProject(name, status);

    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    try {
        const project = await db.create({
            name: name.trim(),
            status
        });

        res.status(201).json(project);
    } catch (error) {
        console.error('Failed to create project:', error);
        res.status(500).json({ error: 'Failed to create project.' });
    }
});

app.put('/api/projects/:id', async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
        return res.status(400).json({ error: 'Invalid project ID.' });
    }

    const { name, status } = req.body ?? {};
    const validationError = validateProject(name, status);

    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    try {
        const project = await db.update(id, {
            name: name.trim(),
            status
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found.' });
        }

        res.json(project);
    } catch (error) {
        console.error('Failed to update project:', error);
        res.status(500).json({ error: 'Failed to update project.' });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
        return res.status(400).json({ error: 'Invalid project ID.' });
    }

    try {
        const deleted = await db.remove(id);

        if (!deleted) {
            return res.status(404).json({ error: 'Project not found.' });
        }

        res.status(204).end();
    } catch (error) {
        console.error('Failed to delete project:', error);
        res.status(500).json({ error: 'Failed to delete project.' });
    }
});

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
    console.log(`Open http://localhost:${port}`);
});