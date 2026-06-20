#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Simple .env parser to avoid external dependencies
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf-8');
    for (const line of envFile.split(/\r?\n/)) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("Error: OPENAI_API_KEY is not set. Please set it in a .env file or as an environment variable.");
  process.exit(1);
}

const args = process.argv.slice(2);
const includeContext = args.includes('--context');
const promptArgs = args.filter(a => a !== '--context');
let userPrompt = promptArgs.join(' ').trim();

// Read from stdin if no prompt provided via args
if (!userPrompt) {
  try {
    userPrompt = fs.readFileSync(0, 'utf-8').trim();
  } catch (e) {
    // ignore
  }
}

if (!userPrompt) {
  console.error('Usage: node bin/ask-chatgpt.js [--context] "Your question here"');
  console.error('       or pipe content: echo "Your question" | node bin/ask-chatgpt.js [--context]');
  process.exit(1);
}

// Reuse the context generator logic if requested
async function buildMessages() {
  const messages = [];

  if (includeContext) {
    // Import dynamically from the existing prompt.js or just execute it to get the context
    // For simplicity, we can just run the script and capture stdout
    const { execSync } = await import('child_process');
    try {
      const context = execSync(`node ${path.join(rootDir, 'bin/prompt.js')}`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
      messages.push({
        role: "system",
        content: context
      });
    } catch (e) {
      console.warn("Warning: Failed to load context from bin/prompt.js");
    }
  } else {
    messages.push({
      role: "system",
      content: "You are a helpful programming assistant."
    });
  }

  messages.push({
    role: "user",
    content: userPrompt
  });

  return messages;
}

async function askChatGPT() {
  const messages = await buildMessages();
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o', // or gpt-4-turbo
        messages: messages,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`OpenAI API Error: ${response.status} - ${err}`);
      process.exit(1);
    }

    const data = await response.json();
    console.log(data.choices[0].message.content);
  } catch (error) {
    console.error("Network Error:", error.message);
    process.exit(1);
  }
}

askChatGPT();
