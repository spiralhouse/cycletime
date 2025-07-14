# Create Implementation Subtasks

Break down approved technical design into Linear subtasks for: $ARGUMENTS

## Prerequisites:
- Technical design document approved and merged
- Design subtask moved to "Done" status
- Ready to begin implementation phase

## Subtask Creation Process:

### 1. **Analyze Technical Design**
- Read approved technical design document for $ARGUMENTS
- Identify implementable components from design
- Estimate effort for each component using Fibonacci scale (see estimation guide below)

### 2. **Create Linear Subtasks**
For each component, create subtask with:
- **Title**: Clear, actionable task description
- **Description**: Link to technical design document + specific implementation details
- **Parent Issue**: Use `parentId` parameter to link subtasks to parent (not naming conventions like "SPI-X.Y")
- **Estimate**: Story points or time estimate (Linear estimation enabled)
- **Dependencies**: Use Linear "Blocked by" relationships if needed
- **Labels**: Appropriate team/component labels

### 3. **Suggested Subtask Categories**:
- **Database/Schema**: Data model changes, migrations
- **API/Backend**: Service layer, endpoints, business logic
- **Frontend/UI**: Components, pages, user interactions
- **Testing**: Unit tests, integration tests, E2E tests
- **Documentation**: API docs, user guides, deployment notes

### 4. **Link Everything**
- Link subtasks to parent issue $ARGUMENTS
- Reference technical design document in each subtask
- Set up dependency chains for logical order
- Move parent issue to "In Progress" status

### 5. **Team Assignment**
- Assign subtasks to appropriate team members
- Consider skill sets and availability
- Balance workload across team

## Subtask Template:
```
Title: [Component] - [Specific Implementation]
Description: 
- Technical Design: /docs/technical-designs/$ARGUMENTS.md
- Implementation details: [specific requirements]
- Acceptance criteria: [what defines done]

Estimate: [X story points using Fibonacci scale]
Dependencies: [Blocked by other subtasks if applicable]
```

## Estimation Scale (Fibonacci)

**Complexity-Based Estimation**: Points reflect task complexity, not time duration

- **1 point** = Trivial complexity (straightforward implementation)
- **2 points** = Simple complexity (well-understood requirements)  
- **3 points** = Moderate complexity (some architectural decisions needed)
- **5 points** = Moderately complex (multiple integrations or significant logic)
- **8 points** = Complex (substantial architectural work or many unknowns)
- **13 points** = Highly complex (major feature, consider decomposition)

**Guidelines**:
- Target subtasks at 1-5 points for optimal sprint planning
- 8+ point tasks may need further breakdown
- Consider task complexity, unknowns, and dependencies when estimating
- Let velocity emerge from completed complexity over time

Create subtasks systematically and ensure complete coverage of the technical design.