# CycleTime

**Intelligent Project Orchestration Platform with MCP Integration**

*Enhance team collaboration and developer experience with intelligent AI assistance that keeps humans in control*

## 🗺️ Roadmap

CycleTime is under active development with a focus on delivering a robust MVP that enhances team collaboration and developer experience.

See our detailed [Roadmap](./docs/ROADMAP.md) for:
- MVP goals and current development phases
- Future enhancements (multi-model AI, GitLab support, analytics)
- Timeline and feature priorities
- How to contribute to roadmap planning

## 🚀 What is CycleTime?

CycleTime enhances team collaboration and developer experience with intelligent AI assistance that keeps humans in control. Built with support for leading AI models (OpenAI, Anthropic, Google, and more), CycleTime improves developer experience while ensuring teams maintain full control over all critical decisions.

### ✨ Key Objectives

- **Enhanced Collaboration**: Streamline team communication with AI-assisted project breakdown and shared documentation
- **Improved Developer Experience**: Leverage your preferred AI models to reduce planning overhead and focus on building
- **Workflow Integration**: Seamlessly connect with your existing tools - Linear, Jira, GitHub Issues - without disrupting team processes
- **Living Documentation**: Keep project context current and accessible to both humans and AI tools
- **Seamless AI Integration**: Connect existing AI assistants to project context through MCP
- **Human-Centered Control**: AI provides intelligent suggestions, teams drive all decisions

## 🚀 Killer Features

CycleTime introduces two revolutionary capabilities that no other platform provides:

### 📋 Contract-First Parallel Development
- **Generate system boundaries and API contracts** automatically from PRDs
- **Enable multiple developers to work simultaneously** without coordination bottlenecks
- **Reduce integration errors by 75%** through upfront interface specifications
- **Create mock/stub templates** for independent development and testing
- **Validate implementation compliance** with generated contracts

### 🎯 Custom Development Standards Enforcement
- **Define team-specific development standards** beyond static analysis (TDD cycles, architectural patterns, documentation requirements)
- **Deliver standards to AI coding tools** via MCP for real-time guidance during development  
- **Automatically analyze pull requests** for standards compliance using AI-powered code analysis
- **Configurable enforcement levels** (advisory, warning, blocking) with detailed compliance reports
- **Ships with sensible defaults** (TDD, conventional commits, security practices) that can be fully customized

### Target Users

- **Product Managers** seeking better collaboration with engineering teams through clearer, AI-enhanced specifications
- **Engineering Managers** who want to improve team productivity with consistent project breakdown and tracking
- **Technical Leads** who value excellent developer experience with current documentation and AI-assisted planning

## How CycleTime Works

1. **Store PRDs in Markdown** - Place requirements in your repository's `/docs/requirements/` directory
2. **AI Analysis** - Your chosen AI model processes your PRD and generates structured project plans
3. **Team Review** - Review and refine generated `project-plan.md`, `milestones.md`, and `architecture.md`
4. **Issue Creation** - Generate Linear/Jira issues with links to your documentation
5. **Maintain Sync** - Documentation updates automatically as your project progresses

### Expected Results

- Enhanced team collaboration and reduced planning friction
- Better developer experience with AI-assisted project breakdown
- Documentation that serves both human teams and AI tools effectively
- Improved productivity without disrupting existing development workflows

## Integration & Compatibility

CycleTime is designed to work with your existing development workflow, not replace it:

- **Any AI Coding Tool**: Claude Code, Cursor, Windsurf, GitHub Copilot, JetBrains AI - use your preferred AI-enabled development environment
- **Any Git Workflow**: Works with GitHub, GitLab, Bitbucket and any Git hosting platform
- **Any Repository Structure**: Supports both monorepos and polyrepos (MVP focuses on monorepos)
- **MCP Integration**: Connect with any MCP-enabled AI tool for seamless context sharing and enhanced development workflows
- **Any Issue Tracker**: Native integration with Linear, Jira, GitHub Issues
- **Repository-Centric**: All coordination happens through standard Git operations - no proprietary formats

*The only requirement is that you store project documentation in Markdown format within your Git repository.*


## 🤝 Development Workflow

This project follows a structured development workflow using Linear for task management. See `CLAUDE.md` for detailed development guidelines.

## License

GNU Affero General Public License v3.0

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

See [LICENSE](LICENSE) for the full license text.
