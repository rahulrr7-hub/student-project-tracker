
import express from 'express';
import { registerProjectRoutes } from './app.js';

const app = express();

app.use(express.static('public'));
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

registerProjectRoutes(app);

const port = Number(process.env.PORT || 3000);

app.listen(port, () => console.log(`Open http://localhost:${port}`));
