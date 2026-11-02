#!/usr/bin/env node
/**
 * Full MongoDB backup — exports every collection to JSON, zips it, keeps the last 10.
 * Usage:  node server/scripts/backup.js
 * Output: ~/backups/sugarloop/sugarloop-YYYY-MM-DD_HH-MM-SS.zip
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import os from 'node:os';

const BACKUP_DIR = path.join(os.homedir(), 'backups', 'sugarloop');
const KEEP = 10; // number of backups to retain

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error('MONGO_URI not set'); process.exit(1); }

  const client = new MongoClient(uri);
  await client.connect();

  const dbName = client.options?.dbName || new URL(uri.replace('mongodb+srv://', 'https://')).pathname.slice(1) || 'test';
  const db = client.db(dbName);
  const collections = await db.listCollections().toArray();

  const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const tmpDir = path.join(os.tmpdir(), `sugarloop-backup-${ts}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  console.log(`Backing up database "${dbName}" — ${collections.length} collections`);

  for (const { name } of collections) {
    const docs = await db.collection(name).find({}).toArray();
    fs.writeFileSync(path.join(tmpDir, `${name}.json`), JSON.stringify(docs, null, 2));
    console.log(`  ${name}: ${docs.length} documents`);
  }

  await client.close();

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const zipPath = path.join(BACKUP_DIR, `sugarloop-${ts}.zip`);
  execSync(`zip -r "${zipPath}" .`, { cwd: tmpDir, stdio: 'inherit' });
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log(`\nBackup saved: ${zipPath}`);

  // Rotate — delete oldest if more than KEEP backups exist.
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('sugarloop-') && f.endsWith('.zip'))
    .map((f) => ({ f, mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => a.mtime - b.mtime);

  if (files.length > KEEP) {
    const toDelete = files.slice(0, files.length - KEEP);
    for (const { f } of toDelete) {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
      console.log(`Rotated out: ${f}`);
    }
  }

  console.log(`\nDone. Backups stored in ${BACKUP_DIR}`);
}

run().catch((err) => { console.error(err.message); process.exit(1); });
