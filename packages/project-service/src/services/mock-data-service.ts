import { v4 as uuidv4 } from 'uuid';
import * as moment from 'moment';
import * as _ from 'lodash';
import { 
  Project, 
  ProjectTemplate, 
  TeamMember, 
  ProjectAnalyticsResponse,
  ProjectForecastingResponse,
  ProjectInsightsResponse,
  ResourceAllocationResponse,
  CapacityPlanningResponse,
  ProjectStatus,
  ProjectVisibility,
  ProjectPriority,
  TeamMemberRole,
  TemplateCategory,
  TemplateVisibility,
  AnalyticsTimeRange,
  RiskSeverity,
  InsightCategory,
  InsightType,
  ResourceType,
  CapacityTimeframe
} from '../types';

export class MockDataService {
  private projects: Map<string, Project> = new Map();
  private templates: Map<string, ProjectTemplate> = new Map();
  private teamMembers: Map<string, TeamMember[]> = new Map();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Create mock templates
    const agileTemplate = this.createMockTemplate('Agile Development', 'agile');
    const scrumTemplate = this.createMockTemplate('Scrum Framework', 'scrum');
    const kanbanTemplate = this.createMockTemplate('Kanban Board', 'kanban');
    
    this.templates.set(agileTemplate.id, agileTemplate);
    this.templates.set(scrumTemplate.id, scrumTemplate);
    this.templates.set(kanbanTemplate.id, kanbanTemplate);

    // Create mock projects
    const project1 = this.createMockProject('E-commerce Platform', 'active', agileTemplate);
    const project2 = this.createMockProject('Mobile App Redesign', 'active', scrumTemplate);
    const project3 = this.createMockProject('API Migration', 'on_hold', kanbanTemplate);
    
    this.projects.set(project1.id, project1);
    this.projects.set(project2.id, project2);
    this.projects.set(project3.id, project3);

    // Create mock team members for each project
    this.teamMembers.set(project1.id, this.createMockTeamMembers(project1.id));
    this.teamMembers.set(project2.id, this.createMockTeamMembers(project2.id));
    this.teamMembers.set(project3.id, this.createMockTeamMembers(project3.id));
  }

  private createMockTemplate(name: string, category: TemplateCategory): ProjectTemplate {
    const templateId = uuidv4();
    const now = moment().toISOString();
    
    return {
      id: templateId,
      name,
      description: `${name} template with predefined workflows and best practices`,
      category,
      visibility: 'public' as TemplateVisibility,
      configuration: {
        phases: [
          {
            id: uuidv4(),
            name: 'Planning',
            description: 'Initial project planning and requirement gathering',
            duration: 7,
            dependencies: []
          },
          {
            id: uuidv4(),
            name: 'Development',
            description: 'Core development phase',
            duration: 30,
            dependencies: ['Planning']
          },
          {
            id: uuidv4(),
            name: 'Testing',
            description: 'Quality assurance and testing',
            duration: 10,
            dependencies: ['Development']
          },
          {
            id: uuidv4(),
            name: 'Deployment',
            description: 'Production deployment and monitoring',
            duration: 3,
            dependencies: ['Testing']
          }
        ],
        taskTemplates: [
          {
            title: 'Requirements Analysis',
            description: 'Analyze and document project requirements',
            estimatedHours: 16,
            phase: 'Planning',
            dependencies: []
          },
          {
            title: 'Architecture Design',
            description: 'Design system architecture and components',
            estimatedHours: 24,
            phase: 'Planning',
            dependencies: ['Requirements Analysis']
          },
          {
            title: 'Core Implementation',
            description: 'Implement core business logic',
            estimatedHours: 80,
            phase: 'Development',
            dependencies: ['Architecture Design']
          },
          {
            title: 'Unit Testing',
            description: 'Write and execute unit tests',
            estimatedHours: 32,
            phase: 'Testing',
            dependencies: ['Core Implementation']
          }
        ],
        roles: [
          {
            name: 'Project Manager',
            permissions: ['read', 'write', 'manage_team', 'manage_settings'],
            defaultAllocation: 25
          },
          {
            name: 'Developer',
            permissions: ['read', 'write'],
            defaultAllocation: 80
          },
          {
            name: 'QA Engineer',
            permissions: ['read', 'write'],
            defaultAllocation: 60
          }
        ]
      },
      metadata: {
        author: 'CycleTime Team',
        version: '1.0.0',
        tags: [category, 'software-development', 'best-practices'],
        usageCount: _.random(50, 500)
      },
      audit: {
        createdBy: uuidv4(),
        createdAt: moment().subtract(_.random(30, 180), 'days').toISOString(),
        updatedBy: uuidv4(),
        updatedAt: now
      }
    };
  }

  private createMockProject(name: string, status: ProjectStatus, template: ProjectTemplate): Project {
    const projectId = uuidv4();
    const ownerId = uuidv4();
    const now = moment().toISOString();
    
    return {
      id: projectId,
      name,
      description: `${name} project with comprehensive feature set and modern architecture`,
      status,
      visibility: 'private' as ProjectVisibility,
      priority: _.sample(['medium', 'high', 'urgent']) as ProjectPriority,
      progress: _.random(10, 95),
      tags: ['web', 'typescript', 'react', 'nodejs'],
      metadata: {
        client: 'Internal',
        budget: _.random(50000, 200000),
        complexity: _.sample(['low', 'medium', 'high'])
      },
      owner: {
        id: ownerId,
        name: _.sample(['Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson'])!,
        email: `user${_.random(1, 100)}@cycletime.dev`
      },
      template: {
        id: template.id,
        name: template.name,
        category: template.category
      },
      timeline: {
        startDate: moment().subtract(_.random(30, 90), 'days').toISOString(),
        endDate: moment().add(_.random(30, 180), 'days').toISOString(),
        dueDate: moment().add(_.random(60, 120), 'days').toISOString(),
        milestones: [
          {
            id: uuidv4(),
            title: 'MVP Release',
            dueDate: moment().add(_.random(30, 60), 'days').toISOString(),
            completed: _.random(0, 1) === 1
          },
          {
            id: uuidv4(),
            title: 'Beta Testing',
            dueDate: moment().add(_.random(60, 90), 'days').toISOString(),
            completed: false
          }
        ]
      },
      resources: {
        budget: _.random(80000, 150000),
        budgetUsed: _.random(20000, 80000),
        estimatedHours: _.random(800, 2000),
        actualHours: _.random(200, 1000)
      },
      integrations: {
        github: {
          repository: `https://github.com/cycletime/${name.toLowerCase().replace(/\s+/g, '-')}`,
          enabled: true
        },
        linear: {
          projectId: uuidv4(),
          enabled: true
        },
        slack: {
          channel: `#${name.toLowerCase().replace(/\s+/g, '-')}`,
          enabled: true
        }
      },
      settings: {
        notifications: {
          email: true,
          slack: true,
          inApp: true
        },
        permissions: {
          allowGuestAccess: false,
          requireApproval: true
        },
        automation: {
          autoAssign: false,
          autoProgress: true,
          autoNotify: true
        }
      },
      audit: {
        createdBy: ownerId,
        createdAt: moment().subtract(_.random(30, 90), 'days').toISOString(),
        updatedBy: ownerId,
        updatedAt: now,
        version: _.random(1, 10)
      }
    };
  }

  private createMockTeamMembers(projectId: string): TeamMember[] {
    const memberCount = _.random(3, 8);
    const members: TeamMember[] = [];
    
    const roles: TeamMemberRole[] = ['owner', 'admin', 'member', 'contributor'];
    const names = [
      'Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson',
      'Eva Rodriguez', 'Frank Miller', 'Grace Chen', 'Henry Taylor',
      'Ivy Anderson', 'Jack Thompson'
    ];
    
    for (let i = 0; i < memberCount; i++) {
      const memberId = uuidv4();
      const name = names[i % names.length];
      const role = i === 0 ? 'owner' : _.sample(roles.slice(1))!;
      
      members.push({
        id: memberId,
        name,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@cycletime.dev`,
        role,
        permissions: this.getPermissionsForRole(role),
        allocation: {
          percentage: _.random(25, 100),
          hoursPerWeek: _.random(10, 40),
          startDate: moment().subtract(_.random(7, 30), 'days').toISOString(),
          endDate: moment().add(_.random(30, 180), 'days').toISOString()
        },
        addedAt: moment().subtract(_.random(1, 30), 'days').toISOString(),
        addedBy: uuidv4()
      });
    }
    
    return members;
  }

  private getPermissionsForRole(role: TeamMemberRole): string[] {
    switch (role) {
      case 'owner':
        return ['read', 'write', 'delete', 'manage_team', 'manage_settings'];
      case 'admin':
        return ['read', 'write', 'delete', 'manage_team'];
      case 'member':
        return ['read', 'write'];
      case 'contributor':
        return ['read', 'write'];
      case 'viewer':
        return ['read'];
      default:
        return ['read'];
    }
  }

  // Project methods
  getAllProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  getProjectById(id: string): Project | null {
    return this.projects.get(id) || null;
  }

  createProject(project: Project): Project {
    this.projects.set(project.id, project);
    return project;
  }

  updateProject(id: string, updates: Partial<Project>): Project | null {
    const project = this.projects.get(id);
    if (!project) return null;
    
    const updatedProject = { ...project, ...updates };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  deleteProject(id: string): boolean {
    return this.projects.delete(id);
  }

  // Template methods
  getAllTemplates(): ProjectTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplateById(id: string): ProjectTemplate | null {
    return this.templates.get(id) || null;
  }

  createTemplate(template: ProjectTemplate): ProjectTemplate {
    this.templates.set(template.id, template);
    return template;
  }

  updateTemplate(id: string, updates: Partial<ProjectTemplate>): ProjectTemplate | null {
    const template = this.templates.get(id);
    if (!template) return null;
    
    const updatedTemplate = { ...template, ...updates };
    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  deleteTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  // Team methods
  getProjectTeam(projectId: string): TeamMember[] {
    return this.teamMembers.get(projectId) || [];
  }

  addTeamMember(projectId: string, member: TeamMember): TeamMember {
    const team = this.teamMembers.get(projectId) || [];
    team.push(member);
    this.teamMembers.set(projectId, team);
    return member;
  }

  updateTeamMember(projectId: string, userId: string, updates: Partial<TeamMember>): TeamMember | null {
    const team = this.teamMembers.get(projectId) || [];
    const memberIndex = team.findIndex(m => m.id === userId);
    
    if (memberIndex === -1) return null;
    
    const updatedMember = { ...team[memberIndex], ...updates };
    team[memberIndex] = updatedMember;
    this.teamMembers.set(projectId, team);
    return updatedMember;
  }

  removeTeamMember(projectId: string, userId: string): boolean {
    const team = this.teamMembers.get(projectId) || [];
    const memberIndex = team.findIndex(m => m.id === userId);
    
    if (memberIndex === -1) return false;
    
    team.splice(memberIndex, 1);
    this.teamMembers.set(projectId, team);
    return true;
  }

  // Analytics methods
  generateProjectAnalytics(projectId: string, timeRange: AnalyticsTimeRange): ProjectAnalyticsResponse {
    const project = this.getProjectById(projectId);
    if (!project) throw new Error('Project not found');

    const days = this.getTimeRangeDays(timeRange);
    const trends = this.generateTrends(days);
    const team = this.getProjectTeam(projectId);

    return {
      projectId,
      timeRange,
      summary: {
        totalTasks: _.random(50, 200),
        completedTasks: _.random(30, 150),
        pendingTasks: _.random(10, 50),
        overdueTasks: _.random(0, 20),
        teamVelocity: _.random(15, 35),
        burndownRate: _.random(0.5, 1.5),
        progressPercentage: project.progress
      },
      performance: {
        cycleTime: _.random(24, 168),
        leadTime: _.random(48, 336),
        throughput: _.random(5, 15),
        qualityMetrics: {
          defectRate: _.random(0.01, 0.05),
          codeReviewTime: _.random(2, 8),
          testCoverage: _.random(75, 95)
        }
      },
      trends,
      teamMetrics: {
        productivity: team.map(member => ({
          memberId: member.id,
          tasksCompleted: _.random(5, 25),
          hoursWorked: _.random(20, 40),
          efficiency: _.random(0.7, 1.3)
        })),
        collaboration: {
          codeReviews: _.random(20, 80),
          pairProgramming: _.random(0.1, 0.4),
          knowledgeSharing: _.random(0.2, 0.6)
        }
      }
    };
  }

  generateProjectForecasting(projectId: string, horizon: number): ProjectForecastingResponse {
    const project = this.getProjectById(projectId);
    if (!project) throw new Error('Project not found');

    const completionDate = moment().add(horizon * 0.8, 'days');
    
    return {
      projectId,
      horizon,
      predictions: {
        completionDate: completionDate.toISOString(),
        confidence: _.random(0.6, 0.95),
        remainingEffort: _.random(200, 800),
        budgetForecast: _.random(80000, 120000)
      },
      scenarios: [
        {
          name: 'Optimistic',
          probability: 0.2,
          completionDate: completionDate.subtract(7, 'days').toISOString(),
          budgetImpact: _.random(75000, 85000),
          description: 'Best case scenario with no major blockers'
        },
        {
          name: 'Most Likely',
          probability: 0.6,
          completionDate: completionDate.toISOString(),
          budgetImpact: _.random(90000, 110000),
          description: 'Expected completion with normal challenges'
        },
        {
          name: 'Pessimistic',
          probability: 0.2,
          completionDate: completionDate.add(14, 'days').toISOString(),
          budgetImpact: _.random(110000, 130000),
          description: 'Worst case with significant delays'
        }
      ],
      risks: [
        {
          type: 'schedule',
          severity: 'medium' as RiskSeverity,
          probability: 0.3,
          impact: 'May delay delivery by 1-2 weeks',
          mitigation: 'Add additional resources or reduce scope'
        },
        {
          type: 'technical',
          severity: 'high' as RiskSeverity,
          probability: 0.15,
          impact: 'Could require architecture changes',
          mitigation: 'Conduct technical review and proof of concept'
        }
      ],
      recommendations: [
        {
          type: 'resource',
          priority: 'medium',
          description: 'Consider adding a senior developer to accelerate development',
          expectedImpact: 'Reduce timeline by 10-15%'
        },
        {
          type: 'process',
          priority: 'high',
          description: 'Implement daily standups to improve team coordination',
          expectedImpact: 'Improve velocity by 20%'
        }
      ]
    };
  }

  generateProjectInsights(projectId: string, category?: InsightCategory): ProjectInsightsResponse {
    const project = this.getProjectById(projectId);
    if (!project) throw new Error('Project not found');

    const insights = this.generateInsights(projectId, category);
    const criticalCount = insights.filter(i => i.severity === 'critical').length;
    const warningCount = insights.filter(i => i.severity === 'high' || i.severity === 'medium').length;

    return {
      projectId,
      insights,
      summary: {
        totalInsights: insights.length,
        criticalCount,
        warningCount,
        healthScore: _.random(60, 95),
        trending: _.sample(['improving', 'stable', 'declining'])!
      }
    };
  }

  generateResourceAllocation(projectId: string): ResourceAllocationResponse {
    const project = this.getProjectById(projectId);
    if (!project) throw new Error('Project not found');

    const resources = [
      {
        type: 'human' as ResourceType,
        name: 'Development Team',
        allocated: _.random(5, 8),
        available: _.random(8, 12),
        utilization: _.random(0.6, 0.9),
        cost: _.random(80000, 120000),
        period: {
          start: moment().subtract(30, 'days').toISOString(),
          end: moment().add(90, 'days').toISOString()
        }
      },
      {
        type: 'financial' as ResourceType,
        name: 'Project Budget',
        allocated: project.resources?.budgetUsed || 0,
        available: project.resources?.budget || 0,
        utilization: ((project.resources?.budgetUsed || 0) / (project.resources?.budget || 1)),
        cost: project.resources?.budgetUsed || 0
      },
      {
        type: 'software' as ResourceType,
        name: 'Development Tools',
        allocated: 1,
        available: 1,
        utilization: 1,
        cost: _.random(5000, 15000),
        period: {
          start: moment().subtract(60, 'days').toISOString(),
          end: moment().add(180, 'days').toISOString()
        }
      }
    ];

    return {
      projectId,
      resources,
      summary: {
        totalBudget: project.resources?.budget || 0,
        usedBudget: project.resources?.budgetUsed || 0,
        remainingBudget: (project.resources?.budget || 0) - (project.resources?.budgetUsed || 0),
        totalHours: project.resources?.estimatedHours || 0,
        allocatedHours: project.resources?.actualHours || 0,
        availableHours: (project.resources?.estimatedHours || 0) - (project.resources?.actualHours || 0),
        utilizationRate: _.random(0.6, 0.9)
      }
    };
  }

  generateCapacityPlanning(projectId: string, timeframe: CapacityTimeframe): CapacityPlanningResponse {
    const project = this.getProjectById(projectId);
    if (!project) throw new Error('Project not found');

    const team = this.getProjectTeam(projectId);
    const teamCapacity = team.map(member => ({
      memberId: member.id,
      memberName: member.name,
      totalHours: member.allocation?.hoursPerWeek || 40,
      allocatedHours: _.random(20, 35),
      availableHours: _.random(5, 15),
      skills: ['JavaScript', 'React', 'Node.js', 'TypeScript'].slice(0, _.random(2, 4))
    }));

    const totalCapacity = teamCapacity.reduce((sum, member) => sum + member.totalHours, 0);
    const allocatedCapacity = teamCapacity.reduce((sum, member) => sum + member.allocatedHours, 0);
    const availableCapacity = totalCapacity - allocatedCapacity;

    return {
      projectId,
      timeframe,
      capacity: {
        totalCapacity,
        allocatedCapacity,
        availableCapacity,
        utilizationRate: allocatedCapacity / totalCapacity
      },
      teamCapacity,
      forecast: this.generateCapacityForecast(timeframe)
    };
  }

  private getTimeRangeDays(timeRange: AnalyticsTimeRange): number {
    switch (timeRange) {
      case 'day': return 1;
      case 'week': return 7;
      case 'month': return 30;
      case 'quarter': return 90;
      case 'year': return 365;
      default: return 30;
    }
  }

  private generateTrends(days: number) {
    const trends = [];
    for (let i = days; i >= 0; i--) {
      trends.push({
        date: moment().subtract(i, 'days').format('YYYY-MM-DD'),
        completed: _.random(0, 10),
        created: _.random(0, 12),
        velocity: _.random(10, 30)
      });
    }
    return trends;
  }

  private generateInsights(projectId: string, category?: InsightCategory) {
    const categories: InsightCategory[] = ['performance', 'risks', 'opportunities', 'team', 'timeline'];
    const types: InsightType[] = ['warning', 'recommendation', 'observation', 'alert'];
    const severities: RiskSeverity[] = ['low', 'medium', 'high', 'critical'];

    const insights = [];
    const count = _.random(3, 8);

    for (let i = 0; i < count; i++) {
      const insightCategory = category || _.sample(categories)!;
      const insight = {
        id: uuidv4(),
        category: insightCategory,
        type: _.sample(types)!,
        severity: _.sample(severities)!,
        title: this.generateInsightTitle(insightCategory),
        description: this.generateInsightDescription(insightCategory),
        confidence: _.random(0.6, 0.95),
        impact: this.generateInsightImpact(insightCategory),
        generatedAt: moment().subtract(_.random(1, 24), 'hours').toISOString(),
        evidence: [
          {
            metric: 'Velocity',
            value: `${_.random(15, 35)} tasks/sprint`,
            trend: _.sample(['increasing', 'stable', 'decreasing'])!
          },
          {
            metric: 'Cycle Time',
            value: `${_.random(2, 8)} days`,
            trend: _.sample(['improving', 'stable', 'declining'])!
          }
        ],
        recommendations: [
          {
            action: this.generateRecommendationAction(insightCategory),
            priority: _.sample(['low', 'medium', 'high', 'urgent'])!,
            effort: _.sample(['low', 'medium', 'high'])!,
            expectedImpact: this.generateExpectedImpact(insightCategory)
          }
        ]
      };
      insights.push(insight);
    }

    return insights;
  }

  private generateInsightTitle(category: InsightCategory): string {
    const titles = {
      performance: ['High Code Review Time', 'Declining Velocity', 'Increased Cycle Time'],
      risks: ['Budget Overrun Risk', 'Timeline Delay Risk', 'Technical Debt Accumulation'],
      opportunities: ['Automation Opportunity', 'Process Improvement', 'Team Skill Enhancement'],
      team: ['Team Capacity Underutilized', 'Communication Bottleneck', 'Skill Gap Identified'],
      timeline: ['Milestone At Risk', 'Delivery Date Pressure', 'Scope Creep Detected']
    };
    return _.sample(titles[category])!;
  }

  private generateInsightDescription(category: InsightCategory): string {
    const descriptions = {
      performance: 'Analysis shows a trend that may impact project delivery efficiency.',
      risks: 'Potential risk identified that could affect project success.',
      opportunities: 'Opportunity identified to improve project outcomes.',
      team: 'Team-related observation that may require attention.',
      timeline: 'Timeline-related concern that needs monitoring.'
    };
    return descriptions[category];
  }

  private generateInsightImpact(category: InsightCategory): string {
    const impacts = {
      performance: 'May reduce team productivity by 15-25%',
      risks: 'Could delay project delivery by 1-2 weeks',
      opportunities: 'Potential to improve efficiency by 20-30%',
      team: 'May affect team morale and collaboration',
      timeline: 'Could impact milestone achievement'
    };
    return impacts[category];
  }

  private generateRecommendationAction(category: InsightCategory): string {
    const actions = {
      performance: 'Implement code review time limits and automated checks',
      risks: 'Schedule risk assessment meeting and mitigation planning',
      opportunities: 'Evaluate automation tools and process improvements',
      team: 'Conduct team retrospective and capacity planning',
      timeline: 'Review scope and adjust timeline expectations'
    };
    return actions[category];
  }

  private generateExpectedImpact(category: InsightCategory): string {
    const impacts = {
      performance: 'Improve development speed by 20%',
      risks: 'Reduce risk probability by 50%',
      opportunities: 'Increase team productivity by 25%',
      team: 'Improve team satisfaction and collaboration',
      timeline: 'Ensure on-time delivery with 90% confidence'
    };
    return impacts[category];
  }

  private generateCapacityForecast(timeframe: CapacityTimeframe) {
    const periods = timeframe === 'week' ? 4 : timeframe === 'month' ? 3 : 4;
    const forecast = [];

    for (let i = 0; i < periods; i++) {
      const period = moment().add(i, timeframe === 'week' ? 'weeks' : timeframe === 'month' ? 'months' : 'quarters');
      forecast.push({
        period: period.format('YYYY-MM-DD'),
        requiredCapacity: _.random(200, 400),
        availableCapacity: _.random(180, 420),
        gap: _.random(-50, 50),
        recommendations: [
          'Consider hiring additional developers',
          'Optimize current team allocation',
          'Reduce scope for this period'
        ].slice(0, _.random(1, 3))
      });
    }

    return forecast;
  }
}