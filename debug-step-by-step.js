import { RealIntegrationInfrastructure, TestDataBuilder } from './dist/tests/fixtures/real-integration-infrastructure.js';

const infrastructure = new RealIntegrationInfrastructure();
const services = infrastructure.createApplicationServices();
const db = infrastructure.getDatabase();

console.log('Step-by-step integration test...');

try {
  // Step 1: Create project
  console.log('\n1. Creating project...');
  const projectCommand = TestDataBuilder.project({
    name: 'Debug Project',
    description: 'Testing step by step'
  });
  
  console.log('Project command:', projectCommand);
  
  const projectResult = await services.projectService.createProject(projectCommand);
  
  if (!projectResult.success) {
    console.log('❌ Project creation failed:', projectResult.error);
    process.exit(1);
  }
  
  console.log('✅ Project created:', {
    id: projectResult.data.id,
    name: projectResult.data.name
  });
  
  // Step 2: Verify project in database
  console.log('\n2. Verifying project in database...');
  const projectInDb = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectResult.data.id);
  console.log('Project in DB:', projectInDb);
  
  if (!projectInDb) {
    console.log('❌ Project not found in database!');
    process.exit(1);
  }
  
  // Step 3: Create issue
  console.log('\n3. Creating issue...');
  const issueCommand = TestDataBuilder.issue(projectResult.data.id, {
    title: 'Debug Issue',
    type: 'Story',
    description: 'Testing issue creation'
  });
  
  console.log('Issue command:', issueCommand);
  
  const issueResult = await services.issueService.createIssue(issueCommand);
  
  if (!issueResult.success) {
    console.log('❌ Issue creation failed:', issueResult.error);
    process.exit(1);
  }
  
  console.log('✅ Issue created:', {
    id: issueResult.data.id,
    title: issueResult.data.title,
    projectId: issueResult.data.projectId
  });
  
  // Step 4: Verify issue in database
  console.log('\n4. Verifying issue in database...');
  const issueInDb = db.prepare('SELECT * FROM issues WHERE id = ?').get(issueResult.data.id);
  console.log('Issue in DB:', issueInDb);
  
  const projectIssueInDb = db.prepare('SELECT * FROM project_issues WHERE issue_id = ?').get(issueResult.data.id);
  console.log('Project-issue relationship in DB:', projectIssueInDb);
  
  console.log('\n✅ All steps completed successfully!');
  
} catch (error) {
  console.error('💥 Exception:', error);
} finally {
  infrastructure.cleanup();
}