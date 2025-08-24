# Development Commands

## Core Development

- `./gradlew run` - Start the application server
- `./gradlew build` - Build the project (compile + test)
- `./gradlew clean` - Clean build artifacts
- `./gradlew buildFatJar` - Build executable JAR with all dependencies
- `./gradlew nativeCompile` - Compile to GraalVM native image

## Quality Assurance

- `./gradlew test` - Run all tests
- `./gradlew detekt` - Run static code analysis
- `./gradlew koverHtmlReport` - Generate test coverage report
- `./gradlew koverVerify` - Verify test coverage meets thresholds
- `./gradlew dependencyCheckAnalyze` - Check for vulnerable dependencies
- `./gradlew check` - Run all quality checks (test + detekt + kover)

## Docker & Deployment

- `docker build -t cycletime-ce .` - Build Docker container
- `docker run -p 8080:8080 cycletime-ce` - Run Docker container
- `./gradlew installDist` - Install distribution locally

## Database Management

- Database file location: `cycletime-ce.db` (SQLite, auto-created on first run)
- Future H2 migration: Will use in-memory or file-based H2 database

## Commit Message Validation

- `./scripts/setup-commit-hooks.sh` - Setup local commit validation
- `npm run commitlint-ci` - Validate last commit message
- `npm run commitlint-pr` - Validate all commits in current branch
- `git config commit.template .gitmessage` - Enable commit message template

## Development Utilities

- `./gradlew dependencies` - Show project dependencies
- `./gradlew tasks` - List all available Gradle tasks
- `./gradlew wrapper` - Update Gradle wrapper version

## IDE Integration

- IntelliJ IDEA: Import as Gradle project
- VS Code: Install Kotlin extension for syntax highlighting

## Environment Configuration

- Development mode: Set `-Dio.ktor.development=true` JVM argument
- Configuration file: `src/main/resources/application.conf`
- Environment variables override config values