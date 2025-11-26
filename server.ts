import express from 'express';
import type { Request, Response } from 'express';
import sql from 'mssql';
import fs from 'fs';
import path from 'path'
import { getMimeType } from './utils'

const app = express();
const PORT = 30100;

// Middleware to parse JSON
app.use(express.json());

// SQL Server configuration to be replaced with config later.
const sqlConfig: sql.config = {
  user: "your_username",
  password: "your_password",
  server: "localhost",
  database: "your_database",
  options: {
    encrypt: true, 
    trustServerCertificate: true,
  },
};

app.post("/getallmixes", async (req: Request, res: Response) => {
  const { param1, param2 } = req.body;

  let pool: sql.ConnectionPool | null = null;
  try {
    pool = await sql.connect(sqlConfig);

    const result = await pool
      .request()
      //.input("TestParam", sql.VarChar, param1)
      .execute("GetAllMixes");

    res.json({
      success: true,
      data: result.recordset,
    });
  } catch (err) {
    console.error("Error executing stored procedure:", err);
    res.status(500).json({
      success: false,
      error: (err as Error).message,
    });
  } finally {
    if (pool) {
      await pool.close();
    }
  }
});

app.get('/audio', (req: Request, res: Response) => {
  const fileName = req.query.file as string | undefined;
  if (!fileName) {
    return res.status(400).send('Missing "file" query parameter');
  }

  // Sanitize filename to prevent directory traversal
  const safeFileName = path.basename(fileName);
  const filePath = path.join(__dirname, 'audio', safeFileName);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      console.error(err);
      return res.status(404).send('Audio file not found');
    }

    const mimeType = getMimeType(fileName);
    const range = req.headers.range;

    if (!range) {
      res.writeHead(200, {
        'Content-Type': mimeType,
        'Content-Length': stats.size,
      });
      fs.createReadStream(filePath).pipe(res);
    } else {
      const parts = range.replace(/bytes=/, '').split('-');
      const startStr = parts[0];
      const endStr = parts[1];

      if (!startStr) {
        return res.status(400).send('Invalid Range header');
      }

      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : stats.size - 1;

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
      });

      fileStream.pipe(res);
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`DWS is running at http://localhost:${PORT}`);
});