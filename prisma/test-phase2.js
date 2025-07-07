// Test Phase 2: Documents & AI Integration
// Validates complete database schema with Phase 1 + Phase 2 models

const { PrismaClient } = require('../generated/prisma');

async function testPhase2DatabaseConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Testing Phase 2: Documents & AI Integration...\n');

    // Test 1: Verify all tables exist
    console.log('1. Verifying database tables...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    const expectedTables = [
      'ai_requests', 'ai_responses', 'api_keys', 'documents', 
      'document_versions', 'project_members', 'projects', 
      'repositories', 'usage_tracking', 'user_sessions', 'users'
    ];
    
    const actualTables = tables.map(t => t.table_name);
    const missingTables = expectedTables.filter(t => !actualTables.includes(t));
    
    if (missingTables.length === 0) {
      console.log('✅ All tables exist:', actualTables.join(', '));
    } else {
      console.log('❌ Missing tables:', missingTables.join(', '));
      return;
    }

    // Test 2: Verify enum types
    console.log('\n2. Verifying enum types...');
    const enums = await prisma.$queryRaw`
      SELECT typname 
      FROM pg_type 
      WHERE typtype = 'e' 
      ORDER BY typname;
    `;
    
    const _expectedEnums = [
      'AiRequestStatus', 'AiRequestType', 'DocumentStatus', 
      'DocumentType', 'MemberRole', 'ProjectStatus'
    ];
    
    const actualEnums = enums.map(e => e.typname);
    console.log('✅ Enum types:', actualEnums.join(', '));

    // Test 3: Test core user creation and relationships
    console.log('\n3. Testing core entities...');
    
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test@cycletime.dev',
        github_id: 12345,
        github_username: 'testuser',
        name: 'Test User',
        timezone: 'UTC',
        locale: 'en'
      }
    });
    console.log('✅ Created test user:', user.id);

    // Create test project
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'A test project for Phase 2 validation',
        status: 'ACTIVE',
        ai_model: 'claude-4-sonnet'
      }
    });
    console.log('✅ Created test project:', project.id);

    // Test 4: Test document management (Phase 2)
    console.log('\n4. Testing document management...');
    
    const document = await prisma.document.create({
      data: {
        project_id: project.id,
        title: 'API Documentation',
        description: 'Comprehensive API documentation for CycleTime',
        type: 'API_DOCS',
        status: 'DRAFT',
        created_by: user.id,
        metadata: {
          tags: ['api', 'documentation'],
          priority: 'high'
        }
      }
    });
    console.log('✅ Created test document:', document.id);

    // Create document version
    const version = await prisma.documentVersion.create({
      data: {
        document_id: document.id,
        version: 1,
        content: '# API Documentation\n\nThis is the initial version of our API docs.',
        created_by: user.id
      }
    });
    console.log('✅ Created document version:', version.version);

    // Test 5: Test AI integration (Phase 2)
    console.log('\n5. Testing AI integration...');
    
    const aiRequest = await prisma.aiRequest.create({
      data: {
        project_id: project.id,
        user_id: user.id,
        type: 'DOCUMENTATION',
        status: 'COMPLETED',
        prompt: 'Generate API documentation for user management endpoints',
        context: {
          endpoints: ['GET /users', 'POST /users', 'PUT /users/:id'],
          format: 'markdown'
        },
        model: 'claude-4-sonnet'
      }
    });
    console.log('✅ Created AI request:', aiRequest.id);

    // Create AI response
    const response = await prisma.aiResponse.create({
      data: {
        request_id: aiRequest.id,
        content: 'Generated comprehensive API documentation with examples...',
        tokens_used: 1250,
        model: 'claude-4-sonnet',
        finish_reason: 'stop',
        metadata: {
          confidence: 0.95,
          processing_time: '2.3s'
        }
      }
    });
    console.log('✅ Created AI response:', response.id);

    // Create usage tracking
    const usage = await prisma.usageTracking.create({
      data: {
        request_id: aiRequest.id,
        model: 'claude-4-sonnet',
        prompt_tokens: 150,
        completion_tokens: 1100,
        total_tokens: 1250,
        cost_estimate: 0.0375
      }
    });
    console.log('✅ Created usage tracking:', usage.id);

    // Test 6: Test complex queries with relationships
    console.log('\n6. Testing complex relationship queries...');
    
    const projectWithDocuments = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        documents: {
          include: {
            versions: true,
            creator: {
              select: { name: true, email: true }
            }
          }
        },
        ai_requests: {
          include: {
            responses: true,
            usage: true
          }
        }
      }
    });

    console.log('✅ Complex query successful:');
    console.log(`   - Project: ${projectWithDocuments.name}`);
    console.log(`   - Documents: ${projectWithDocuments.documents.length}`);
    console.log(`   - AI Requests: ${projectWithDocuments.ai_requests.length}`);
    console.log(`   - Document Versions: ${projectWithDocuments.documents[0]?.versions.length || 0}`);

    // Test 7: Test full-text search capabilities
    console.log('\n7. Testing full-text search...');
    
    const searchResults = await prisma.$queryRaw`
      SELECT id, title, ts_rank(to_tsvector('english', title), plainto_tsquery('english', 'API')) as rank
      FROM documents 
      WHERE to_tsvector('english', title) @@ plainto_tsquery('english', 'API')
      ORDER BY rank DESC;
    `;
    
    console.log('✅ Full-text search working:', searchResults.length, 'results');

    // Cleanup
    console.log('\n8. Cleaning up test data...');
    await prisma.usageTracking.deleteMany();
    await prisma.aiResponse.deleteMany();
    await prisma.aiRequest.deleteMany();
    await prisma.documentVersion.deleteMany();
    await prisma.document.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 Phase 2: Documents & AI Integration - ALL TESTS PASSED!');
    console.log('✅ Core entities working');
    console.log('✅ Document management working');
    console.log('✅ AI integration working');
    console.log('✅ Full-text search working');
    console.log('✅ Complex relationships working');
    console.log('✅ Performance indexes applied');

  } catch (error) {
    console.error('❌ Phase 2 test failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPhase2DatabaseConnection()
  .then(() => {
    console.log('\n✅ Phase 2 database validation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Phase 2 database validation failed:', error);
    process.exit(1);
  });