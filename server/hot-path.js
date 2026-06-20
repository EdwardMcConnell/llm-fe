import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf-8');
    for (const line of envFile.split(/\r?\n/)) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        if (!process.env[match[1].trim()]) {
          process.env[match[1].trim()] = value;
        }
      }
    }
  }
}

loadEnv();

const clients = new Set();
const PORT = 3001;

function broadcastReload() {
  for (const res of clients) {
    res.write('data: reload\n\n');
  }
}

function broadcastMessage(msg) {
  for (const res of clients) {
    res.write(`data: msg:${msg}\n\n`);
  }
}

async function handlePrompt(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { prompt } = JSON.parse(body);
      broadcastMessage('Compiling intent...');

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");

      // Read current IR and Contract
      const cardIrPath = path.join(rootDir, 'ir', 'kanban-card.ir.json');
      const cardIr = fs.readFileSync(cardIrPath, 'utf8');
      
      const appIrPath = path.join(rootDir, 'ir', 'normalized-kanban.ir.json');
      const appIr = fs.readFileSync(appIrPath, 'utf8');
      
      const contractPath = path.join(rootDir, 'contracts', 'kanban-card.contract.json');
      const contractStr = fs.readFileSync(contractPath, 'utf8');

      const systemPrompt = `You are the Fe UI Application Compiler Hot-Path.
Your job is to read the user's intent and modify the Explicit JSON IR representing the application, as well as the JSON Contract if state fields are added.
You must return valid JSON matching the exact schema. 
Return a JSON object with up to three keys:
{
  "kanban-card.contract.json": { ... mutated contract ... },
  "kanban-card.ir.json": { ... mutated card IR ... },
  "normalized-kanban.ir.json": { ... mutated app IR ... }
}
Do not return markdown formatting, just the raw JSON object.

CURRENT kanban-card.contract.json:
${contractStr}

CURRENT kanban-card.ir.json:
${cardIr}

CURRENT normalized-kanban.ir.json:
${appIr}
`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          temperature: 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API Error: ${await response.text()}`);
      }

      const data = await response.json();
      let content = data.choices[0].message.content.trim();
      
      if (content.startsWith('\`\`\`json')) content = content.slice(7, -3);
      if (content.startsWith('\`\`\`')) content = content.slice(3, -3);
      
      const mutations = JSON.parse(content);
      
      if (mutations['kanban-card.contract.json']) {
        fs.writeFileSync(contractPath, JSON.stringify(mutations['kanban-card.contract.json'], null, 2));
      }
      if (mutations['kanban-card.ir.json']) {
        fs.writeFileSync(cardIrPath, JSON.stringify(mutations['kanban-card.ir.json'], null, 2));
      }
      if (mutations['normalized-kanban.ir.json']) {
        fs.writeFileSync(appIrPath, JSON.stringify(mutations['normalized-kanban.ir.json'], null, 2));
      }

      broadcastMessage('Generating optimal DOM patches...');
      execSync('node generator/app-generator.js contracts/kanban-app.contract.json', { stdio: 'inherit', cwd: rootDir });

      broadcastMessage('Done! Reloading browser...');
      setTimeout(broadcastReload, 500); // Give JS time to write to disk
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));

    } catch (e) {
      console.error(e);
      broadcastMessage('Error: ' + e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}

const server = http.createServer((req, res) => {
  if (req.url === '/_sse') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (req.method === 'POST' && req.url === '/_prompt') {
    return handlePrompt(req, res);
  }

  // Simple static file server
  let filePath = path.join(rootDir, req.url === '/' ? 'demo/index.html' : req.url);
  
  const extname = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
  };
  
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Hot-Path Compiler listening at http://localhost:${PORT}`);
  console.log(`Waiting for intent...`);
});
