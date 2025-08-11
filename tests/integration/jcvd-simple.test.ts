import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createJCVD } from '../../src/jcvd-simple.js';

import type { JCVD } from '../../src/jcvd-simple.js';

describe('JCVD Simple', () => {
  let jcvd: JCVD;
  let testProjectPath: string;

  beforeEach(async () => {
    // Generate unique path for each test
    testProjectPath = join(tmpdir(), `jcvd-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    
    // Clean up and create test directory
    if (existsSync(testProjectPath)) {
      rmSync(testProjectPath, { recursive: true, force: true });
    }
    mkdirSync(testProjectPath, { recursive: true });

    // Initialize JCVD
    jcvd = await createJCVD({
      databasePath: join(testProjectPath, 'test.db'),
    });
  });

  afterEach(async () => {
    try {
      await jcvd.close();
    } catch {
      // Ignore close errors in tests
    }
    if (existsSync(testProjectPath)) {
      rmSync(testProjectPath, { recursive: true, force: true });
    }
  });

  describe('Initialization', () => {
    it('should create JCVD instance', () => {
      expect(jcvd).toBeDefined();
      expect(jcvd.getStatus().status).toBe('running');
      expect(jcvd.getStatus().role).toBe('simple-context-provider');
    });
  });

  describe('Basic Operations', () => {
    it('should create and retrieve project context', async () => {
      const project = await jcvd.projects.createProject({
        name: 'Test Project',
        description: 'A test project',
        path: testProjectPath,
        status: 'active',
      });

      expect(project).toBeDefined();
      expect(project.name).toBe('Test Project');

      const context = await jcvd.context.getProjectContext(project.id);

      expect(context).toBeDefined();
      expect(context?.project.name).toBe('Test Project');
    });

    it('should create projects and get status', async () => {
      await jcvd.projects.createProject({
        name: 'Test Project 2',
        description: 'Another test project',
        path: testProjectPath,
        status: 'active',
      });

      const status = jcvd.getStatus();

      expect(status.status).toBe('running');
      expect(status.role).toBe('simple-context-provider');
      expect(status.capabilities).toContain('project-context');
    });
  });
});
