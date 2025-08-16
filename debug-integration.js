import { RealIntegrationInfrastructure, TestDataBuilder } from './dist/tests/fixtures/real-integration-infrastructure.js';

const infrastructure = new RealIntegrationInfrastructure();
const services = infrastructure.createApplicationServices();

console.log('Testing project creation...');

try {
  const command = TestDataBuilder.project({
    name: 'Debug Project',
    description: 'Testing project creation'
  });
  
  console.log('Command:', command);
  
  const result = await services.projectService.createProject(command);
  
  console.log('Result:', result);
  
  if (!result.success) {
    console.log('Error:', result.error);
  } else {
    console.log('Success! Project ID:', result.data.id);
  }
} catch (error) {
  console.error('Exception:', error);
} finally {
  infrastructure.cleanup();
}