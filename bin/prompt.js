#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const DEFAULT_FILES = [
  'package.json',
  'README.md',
  'CONTRIBUTING.md',
  'llm-continuation.md',
  '.agents/skills/fe-ui/SKILL.md'
];

const DEFAULT_DIRS = [
  'src',
  'test',
  'contracts',
  'generator',
  'ir'
];

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.js') || file.endsWith('.md') || file.endsWith('.json')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

function generatePrompt() {
  let prompt = `<instruction>
You are an expert AI assistant. Below is the codebase context for the Fe UI framework.
Please review the rules, architecture, and code provided before answering the user's prompt.
</instruction>\n\n`;

  // Process single files
  for (const file of DEFAULT_FILES) {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      prompt += `<file path="${file}">\n${content}\n</file>\n\n`;
    }
  }

  // Process directories
  for (const dir of DEFAULT_DIRS) {
    const dirPath = path.join(rootDir, dir);
    if (fs.existsSync(dirPath)) {
      const files = getAllFiles(dirPath);
      for (const filePath of files) {
        const relativePath = path.relative(rootDir, filePath);
        const content = fs.readFileSync(filePath, 'utf-8');
        prompt += `<file path="${relativePath}">\n${content}\n</file>\n\n`;
      }
    }
  }

  return prompt;
}

const promptContent = generatePrompt();
console.log(promptContent);

console.error(`Generated context prompt with ${promptContent.split('\\n').length} lines.`);
console.error(`Tip: Run \`node bin/prompt.js | pbcopy\` to copy it to your clipboard for ChatGPT.`);
