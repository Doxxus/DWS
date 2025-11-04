import express from 'express';
import type { Request, Response } from 'express';

const app = express();
const PORT = 30100;

// Middleware to parse JSON
app.use(express.json());

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.send('DWS (Doxxus Web Server) Startup.');
});

// Start the server
app.listen(PORT, () => {
  console.log(`DWS is running at http://localhost:${PORT}`);
});