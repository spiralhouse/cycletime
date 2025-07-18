import { TaskService } from '../service';

describe('TaskService', () => {
  let taskService: TaskService;

  beforeEach(() => {
    taskService = new TaskService();
  });

  describe('initialization', () => {
    it('should initialize without GitHub when GITHUB_TOKEN is not set', () => {
      expect(taskService.isGitHubConfigured()).toBe(false);
    });

    it('should indicate Linear is not configured in dev mode', () => {
      expect(taskService.isLinearConfigured()).toBe(false);
    });

    it('should return correct integrations list', () => {
      expect(taskService.getIntegrations()).toEqual(['linear', 'github']);
    });
  });

  describe('placeholder methods', () => {
    it('should throw error for createTask', async () => {
      await expect(taskService.createTask('Test', 'Description'))
        .rejects.toThrow('Task creation not yet implemented');
    });

    it('should throw error for getTask', async () => {
      await expect(taskService.getTask('test-id'))
        .rejects.toThrow('Task retrieval not yet implemented');
    });

    it('should throw error for updateTask', async () => {
      await expect(taskService.updateTask('test-id', {}))
        .rejects.toThrow('Task update not yet implemented');
    });

    it('should throw error for deleteTask', async () => {
      await expect(taskService.deleteTask('test-id'))
        .rejects.toThrow('Task deletion not yet implemented');
    });

    it('should throw error for listTasks', async () => {
      await expect(taskService.listTasks())
        .rejects.toThrow('Task listing not yet implemented');
    });

    it('should throw error for syncWithLinear', async () => {
      await expect(taskService.syncWithLinear())
        .rejects.toThrow('Linear sync not yet implemented');
    });

    it('should throw error for syncWithGitHub', async () => {
      await expect(taskService.syncWithGitHub())
        .rejects.toThrow('GitHub sync not yet implemented');
    });
  });
});