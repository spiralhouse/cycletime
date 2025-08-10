import Database from 'better-sqlite3';

export interface Project {
  id: string;
  name: string;
  description: string;
  path: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'completed' | 'archived';
}

export interface Issue {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done' | 'canceled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
  assignee?: string;
  labels?: string[];
}

export class SqliteStore {
  private db: Database.Database;

  constructor(dbPath: string = 'jcvd.db') {
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    // Create projects table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        path TEXT,
        status TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `);

    // Create issues table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS issues (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT,
        priority TEXT,
        created_at TEXT,
        updated_at TEXT,
        assignee TEXT,
        labels TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (id)
      )
    `);
  }

  // Project operations
  async createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const newProject: Project = {
      id,
      ...project,
      created_at: now,
      updated_at: now
    };

    const stmt = this.db.prepare(`
      INSERT INTO projects (id, name, description, path, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(newProject.id, newProject.name, newProject.description, newProject.path, newProject.status, newProject.created_at, newProject.updated_at);
      return newProject;
    } catch (error) {
      throw new Error(`Failed to create project: ${error}`);
    }
  }

  async getProject(id: string): Promise<Project | null> {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    const row = stmt.get(id) as any;
    return row || null;
  }

  async listProjects(): Promise<Project[]> {
    const stmt = this.db.prepare('SELECT * FROM projects ORDER BY created_at DESC');
    return stmt.all() as Project[];
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    const existing = await this.getProject(id);
    if (!existing) {
      return null;
    }

    const updatedProject = {
      ...existing,
      ...updates,
      id, // Ensure ID cannot be changed
      updated_at: new Date().toISOString()
    };

    const stmt = this.db.prepare(`
      UPDATE projects 
      SET name = ?, description = ?, path = ?, status = ?, updated_at = ?
      WHERE id = ?
    `);

    try {
      stmt.run(updatedProject.name, updatedProject.description, updatedProject.path, updatedProject.status, updatedProject.updated_at, id);
      return updatedProject;
    } catch (error) {
      throw new Error(`Failed to update project: ${error}`);
    }
  }

  async deleteProject(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Issue operations
  async createIssue(issue: Omit<Issue, 'id' | 'created_at' | 'updated_at'>): Promise<Issue> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const newIssue: Issue = {
      id,
      ...issue,
      created_at: now,
      updated_at: now
    };

    const stmt = this.db.prepare(`
      INSERT INTO issues (id, project_id, title, description, status, priority, created_at, updated_at, assignee, labels)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        newIssue.id,
        newIssue.project_id,
        newIssue.title,
        newIssue.description,
        newIssue.status,
        newIssue.priority,
        newIssue.created_at,
        newIssue.updated_at,
        newIssue.assignee || null,
        newIssue.labels?.join(',') || null
      );
      return newIssue;
    } catch (error) {
      throw new Error(`Failed to create issue: ${error}`);
    }
  }

  async getIssue(id: string): Promise<Issue | null> {
    const stmt = this.db.prepare('SELECT * FROM issues WHERE id = ?');
    const row = stmt.get(id) as any;
    if (row && row.labels) {
      row.labels = row.labels.split(',').filter((l: string) => l.trim());
    }
    return row || null;
  }

  async listIssues(projectId: string): Promise<Issue[]> {
    const stmt = this.db.prepare('SELECT * FROM issues WHERE project_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(projectId) as any[];
    return rows.map(row => ({
      ...row,
      labels: row.labels ? row.labels.split(',').filter((l: string) => l.trim()) : []
    }));
  }

  async updateIssue(id: string, updates: Partial<Issue>): Promise<Issue | null> {
    const existing = await this.getIssue(id);
    if (!existing) {
      return null;
    }

    const updatedIssue = {
      ...existing,
      ...updates,
      id, // Ensure ID cannot be changed
      updated_at: new Date().toISOString()
    };

    const stmt = this.db.prepare(`
      UPDATE issues 
      SET title = ?, description = ?, status = ?, priority = ?, assignee = ?, labels = ?, updated_at = ?
      WHERE id = ?
    `);

    try {
      stmt.run(
        updatedIssue.title,
        updatedIssue.description,
        updatedIssue.status,
        updatedIssue.priority,
        updatedIssue.assignee || null,
        updatedIssue.labels?.join(',') || null,
        updatedIssue.updated_at,
        id
      );
      return updatedIssue;
    } catch (error) {
      throw new Error(`Failed to update issue: ${error}`);
    }
  }

  async deleteIssue(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM issues WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Utility methods
  close(): void {
    this.db.close();
  }
}