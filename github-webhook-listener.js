#!/usr/bin/env node
/**
 * GitHub Webhook Listener
 * 
 * Listens for GitHub push events
 * Auto-deploys the voice webhook on code changes
 */

const http = require('http');
const { execSync } = require('child_process');
const crypto = require('crypto');

const PORT = 9999;
const GITHUB_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'your-webhook-secret';
const AUTO_DEPLOY_SCRIPT = '/Users/adiramsalem/.openclaw/workspace-alon/auto-deploy.sh';

function verifyGitHubSignature(req, payload) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return false;
  
  const hash = crypto
    .createHmac('sha256', GITHUB_SECRET)
    .update(payload)
    .digest('hex');
  
  const expected = `sha256=${hash}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  let body = '';
  
  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      const event = req.headers['x-github-event'];
      
      // Verify signature
      if (!verifyGitHubSignature(req, body)) {
        console.log(`❌ Invalid GitHub signature at ${new Date().toISOString()}`);
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      const payload = JSON.parse(body);

      // Only deploy on push to main branch
      if (event === 'push' && payload.ref === 'refs/heads/main') {
        console.log(`\n🔔 GitHub Push detected at ${new Date().toISOString()}`);
        console.log(`📦 Commit: ${payload.head_commit.message}`);
        console.log(`👤 Author: ${payload.pusher.name}`);
        
        console.log(`\n🚀 Running auto-deploy script...`);
        
        try {
          const output = execSync(`bash ${AUTO_DEPLOY_SCRIPT}`, {
            cwd: '/Users/adiramsalem/.openclaw/workspace-alon/internal-bot-platform',
            stdio: 'pipe'
          }).toString();
          
          console.log(`✅ Deploy completed:\n${output}`);
          
          res.writeHead(200);
          res.end('Deployed successfully');
        } catch (error) {
          console.error(`❌ Deploy failed: ${error.message}`);
          res.writeHead(500);
          res.end('Deploy failed');
        }
      } else {
        // Ignore other events
        res.writeHead(200);
        res.end('Ignored');
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      res.writeHead(400);
      res.end('Bad Request');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎙️ GitHub Webhook Listener started`);
  console.log(`📍 Listening on port ${PORT}`);
  console.log(`🔑 Secret: ${GITHUB_SECRET.substring(0, 10)}...`);
  console.log(`🚀 Auto-deploy script: ${AUTO_DEPLOY_SCRIPT}`);
  console.log(`⏰ Waiting for GitHub push events...\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⏹️ Shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
