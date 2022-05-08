# Developer docs done right

## Problem

Existing developer documentation systems largely fall into two buckets:

1. Docs live separately from source code. Examples: Confluence, Notion. 
2. Docs are generated from source code. Examples: Sphinx, Rust spec. 

Both approaches have pros and cons. When docs are generated from source code:
1. Docs are more likely to be updated when the code changes. 
2. Have extensive support for cross reference to other parts of the codebase. 
3. Are immediately available to the developers who read and change the code. 

The downsides:
1. Developers need to learn the markup language. 
2. It’s hard to tell if the docs are going to render properly during the editing. 
3. There’s an extra friction between reading generated docs to editing them, which oftentimes leads to typos not being fixed and less readability improvements. 
4. Changes are likely bound to the same code review process as the actual code changes, that further increases friction for small edits. 

When docs are in a separate system, say Notion:
1. WYSIWYG editors are easy to use and have a low entrance cost. 
2. Editing can done during reading, which increases collaboration and improves text quality over time. 
3. Non-developers can update the docs too. 

The downsides:
1. It’s hard to reference and cross reference class and code snippets. 
2. Docs are harder to discover during editing code. 
3. Docs are always stale when code changes. 

## Requirements

The perfect documentation system has to be a mix of both approaches:
1. Developers should immediately see the rendered docs (and rendering issues) while editing code. 
2. Readers should be able to edit the docs while reading without searching for the respective docs origin in code. 
3. Doc changes need to become immediately available for other readers. 

## Existing solutions

Few projects are trying to solve this:
1. [swimm](https://swimm.io/) is paid solution that puts special hooks into code and provides IDE integrations to display the docs while editing code. 
2. [typo3](https://typo3.org/) is an open source CMS that provides extension for Sphinx docs that syncs edits back to the code.

## Components

Here are the high level components that make this system work regardless of implementation. 

1. Docs renderer. Extracts doc strings from source code, resolves cross references, applies markup, and generates HTML pages.
2. Docs server. Serves generated docs to the readers. Links docs sections to the source doc strings in the source code. 
3. Online docs editor. Allows users to make edits while reading, publishes the new version in near real time. 
4. Synchronizer. Propagates online edits back to the source code. Updates only the doc strings, and keeps formatting consistent. 
5. VCS integration. Commits the changes and pushes them to a central repository. Records who and when made the changes. 
6. Code review integration. Creates pull request with the new edits.
7. Code review streamliner. Detects pull requests that only change docs and automatically approved and merges the request. 