# Book-Driven Development

## Definition

Book-Driven Development is a software engineering approach for organizing the development process around a Book.
The Book means a single location that includes all documentation related to running a company.
The same approach can be applied to other fields as well, but the author focuses on their area of expertise.

The Book is structured in a way to include all business aspects and provides a place (chapter) for every topic.
As the company starts its journey, leadership fills in the table of contents, leaving the chapter contents empty.
As decisions are made and progress is done, new paragraphs are added to the Book.

The Book is never complete, but it's always the best source of knowledge for any aspect of running the business.
Ideally, the Book alone should provide enough information to rebuild the company and product from scratch.

## Table of Contents

This is how the table of contents looks for an imaginary Company.
We will use this as an example in a later section for illustration purposes.
Chapters are using [Johnny.Decimal system](https://johnnydecimal.com/).

- 00-09 Book organization
  - 00 Book Driven Development
    - [00.01] This article
    - [00.03] Documentation generation
    - [00.02] Auto-generated content
- 10-19 People and Teams
  - 10 People intros
    - [10.01] Peter Demin
    - [10.02] Johnny Decimal
  - 11 Teams
    - [11.01] Backend team
    - [11.02] Frontend team
    - [11.03] Sales team
    - [11.04] Marketing team
    - [11.05] Hiring team
    - [11.06] Finance team
- 20-29 Processes
  - 20 Engineering processes
    - [20.01] Project maturity levels
    - [20.02] Local setup
    - [20.03] Onboarding
  - 21 HR processes
    - [21.01] New hire checklists
    - [21.02] Available insurance options
- 30-29 Product Management
  - 30 Lines of Business
    - [30.01] The Product
    - [30.02] Public company website
  - 31 Major Product Areas
    - [31.01] Deployment infrastructure
    - [31.02] Product feature 1
    - [31.03] Product feature 2
  - 32 Infrastructure ADRs
    - [32.01] Using Sphinx to generate documentation
  - 33 Product feature 1 ADRs
    - [33.00] Common template for ADRs
    - [33.01] Using React for web frontend
    - [33.02] Using Kafka for background processing
    - [33.03] Using a common template for project pages
- 40-49 Projects
  - 40 Product Feature 1 Projects
    - [40.01] New project
- 50-59 Changelog
  - 50 Weekly Product Deliverables
    - [50.01] Deliverables for the week of Aug 27, 2023
- 60-69 Policies
  - 60 Security
    - [60.01] Best practices for PII handling
  - 61 Infrastructure
    - [61.01] Deployment self-serve guidelines

## Book-centered Work Flow

As an engineer starts working on a new project, they:
1. Create a new page under the "40 Product Feature 1 Projects" category.
2. Pick the next available number: [40.01].
3. Start with a template defined in [33.03].
4. Fill in the Context and Goal sections.
5. While working on the task, create new Architectural Decision Record pages under chapter 33 using [33.00] as a template.

## Book Building

The company is using Sphinx docs for the Book generation. This provides many benefits:
1. Support for Markdown for simple formatting and RestructuredText for more complex ones.
2. Easy verified cross-references between pages.
3. Simple content auto-generation through scripting.

## Auto-Generation Examples

1. Project updates are generated from git history.
2. People and Team pages auto-updated with the links to projects the person worked on.
3. In-depth code walkthroughs pick docstrings from source code.
4. Topic deep-dives documented through Jupyter Notebooks.
5. High-level behavioral test included in project pages.
