# Agent Cowork Documentation

This directory contains the complete developer documentation for Agent Cowork, built with [Docusaurus](https://docusaurus.io/).

## Quick Start

### Install Dependencies

```bash
npm install
```

### Development Server

Start the local development server:

```bash
npm start
```

This will open [http://localhost:3000](http://localhost:3000) in your browser with hot reload enabled.

### Build

Generate static HTML files:

```bash
npm run build
```

Output will be in the `build/` directory.

### Serve Built Site

Preview the production build locally:

```bash
npm run serve
```

## Documentation Structure

```
docs/
├── docs/                          # Documentation content (Markdown)
│   ├── introduction/             # Getting started, architecture
│   ├── guides/                   # Frontend, backend, build guides
│   │   └── frontend/            # React patterns, components, state
│   ├── personality-system/       # Config-based AI specialization
│   │   ├── overview.md
│   │   ├── architecture.md
│   │   ├── creating-personalities.md
│   │   └── examples/            # Medical, legal, financial
│   ├── sdk-integration/          # Tools, MCP servers, hooks
│   ├── cookbook/                 # Copy-paste examples
│   ├── api-reference/            # Type definitions, APIs
│   ├── troubleshooting/          # Common issues, debugging
│   └── agents_sdk.md            # SDK reference
├── static/img/                   # Static assets
├── docusaurus.config.ts          # Site configuration
└── sidebars.ts                   # Sidebar structure
```

## Key Documentation Sections

### 1. Introduction
- **Overview**: What is Agent Cowork, key features
- **Quick Start**: Installation and setup
- **Architecture**: System design deep dive

### 2. Frontend Development Guide
- **Overview**: React 19, Zustand, Tailwind CSS patterns
- **Components**: Component design
- **State Management**: Zustand store patterns

### 3. Personality Registry System
- **Overview**: Config-based AI specialization
- **Architecture**: Technical design
- **Creating Personalities**: Step-by-step guide
- **Examples**: Medical, legal, financial personalities

### 4. SDK Integration
- **Tools**: Built-in capabilities
- **MCP Servers**: External tool integration
- **Full SDK Reference**: Complete SDK documentation

### 5. Cookbook
- Copy-paste ready examples for common tasks

### 6. Troubleshooting
- Common issues and solutions

## Contributing to Documentation

### Adding a New Page

1. Create a new Markdown file:
   ```bash
   touch docs/docs/guides/my-guide.md
   ```

2. Add frontmatter:
   ```markdown
   ---
   sidebar_position: 3
   ---

   # My Guide

   Content here...
   ```

### Adding Images

1. Add to `static/img/`:
   ```bash
   cp screenshot.png docs/static/img/
   ```

2. Reference:
   ```markdown
   ![Description](/img/screenshot.png)
   ```

## Deployment

### GitHub Pages

```bash
npm run build
npm run deploy
```

### Vercel/Netlify

Build command: `npm run build`
Output directory: `build/`

## License

MIT License
