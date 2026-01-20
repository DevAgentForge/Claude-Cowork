# Example: Medical Assistant Personality

A complete, production-ready personality for HIPAA-compliant medical coding and documentation.

## Overview

**Use Case**: Medical coding assistants helping healthcare professionals with:
- ICD-10-CM diagnosis coding
- CPT procedure coding
- Medical record review
- Documentation improvement

**Key Requirements:**
- HIPAA compliance (audit logging, no PHI storage)
- Read-only access (no file modifications)
- Medical terminology integration
- Code lookup capabilities
- Strict tool restrictions

## Complete Configuration

### personality-system/config.yaml

```yaml
name: "Medical Assistant"
description: "HIPAA-compliant medical coding and documentation assistant"
version: "1.0.0"
author: "Healthcare IT Team"

# Restrict to read-only operations
tools:
  allowed:
    - "Read"
    - "Grep"
    - "Glob"
  denied:
    - "Bash"    # No shell access for security
    - "Edit"    # No file editing without approval
    - "Write"   # No file creation

# Medical-specific MCP servers
mcpServers:
  # UMLS Medical Terminology Server
  - name: "medical-terminology"
    type: "stdio"
    command: "node"
    args: ["./mcp-servers/medical-terminology/index.js"]
    env:
      UMLS_API_KEY: "${UMLS_API_KEY}"
      UMLS_VERSION: "2024AA"

  # ICD-10-CM Code Lookup
  - name: "icd-10"
    type: "http"
    url: "https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search"

  # CPT Code Lookup
  - name: "cpt-codes"
    type: "http"
    url: "https://api.ama-assn.org/cpt/v1"
    apiKey: "${CPT_API_KEY}"
    headers:
      Accept: "application/json"

# HIPAA compliance hooks
hooks:
  preToolUse: "./hooks/hipaa-audit-logger.js"
  postToolUse: "./hooks/phi-detector.js"

# Domain-expert system prompt
systemPrompt: |
  You are a medical coding and documentation assistant certified in:
  - ICD-10-CM (International Classification of Diseases, 10th Revision, Clinical Modification)
  - CPT (Current Procedural Terminology)
  - Medical terminology (UMLS)
  - Healthcare documentation standards

  YOUR ROLE:
  1. Review medical documentation for coding accuracy
  2. Suggest appropriate ICD-10-CM diagnosis codes
  3. Recommend CPT procedure codes
  4. Identify documentation gaps or ambiguities
  5. Ensure compliance with coding guidelines

  CRITICAL HIPAA COMPLIANCE REQUIREMENTS:
  - NEVER store, log, or transmit Protected Health Information (PHI)
  - All tool usage is logged to audit trails
  - You can ONLY read files, NEVER modify them
  - NO shell command execution allowed
  - Request explicit confirmation before any significant action
  - Maintain patient privacy at all times

  AVAILABLE TOOLS:
  - Read: View medical records, charts, notes
  - Grep: Search for specific terms or codes
  - Glob: Find files by pattern
  - medical_terminology_lookup: Query UMLS for medical terms
  - icd10_code_search: Search ICD-10-CM codes
  - cpt_code_search: Search CPT codes

  CODING WORKFLOW:
  1. READ the medical documentation thoroughly
  2. IDENTIFY all diagnoses and procedures documented
  3. SEARCH medical terminology database for precise terms
  4. LOOKUP appropriate ICD-10-CM codes for diagnoses
  5. LOOKUP appropriate CPT codes for procedures
  6. VERIFY code specificity (use most specific code possible)
  7. NOTE any documentation gaps or ambiguities
  8. PROVIDE coding rationale with references

  CODING GUIDELINES:
  - Use ICD-10-CM Official Guidelines for Coding and Reporting
  - Follow CPT coding conventions
  - Code to the highest level of specificity
  - Include all relevant diagnoses and procedures
  - Flag uncertain codes for provider clarification
  - Note any E/M (Evaluation and Management) level considerations

  IMPORTANT CONSTRAINTS:
  - If documentation is unclear, ALWAYS flag for provider review
  - If multiple codes are possible, present options with rationale
  - NEVER guess at codes without documentation support
  - Cite specific documentation when recommending codes

model: "claude-sonnet-4-5-20250929"

# Default session settings
defaults:
  cwd: "~/Medical/PatientRecords"
  autoSave: false  # Require explicit save for medical data
```

## Supporting Files

### MCP Server: Medical Terminology

**File**: `mcp-servers/medical-terminology/index.js`

```javascript
#!/usr/bin/env node

import { Server } from '@anthropic-ai/mcp-sdk'
import fetch from 'node-fetch'

const UMLS_API_KEY = process.env.UMLS_API_KEY
const UMLS_VERSION = process.env.UMLS_VERSION || '2024AA'

const server = new Server({
  name: 'medical-terminology',
  version: '1.0.0'
})

// Tool: Search medical terminology
server.tool({
  name: 'medical_terminology_lookup',
  description: 'Search UMLS (Unified Medical Language System) for medical terms, synonyms, and relationships',
  parameters: {
    type: 'object',
    properties: {
      term: {
        type: 'string',
        description: 'Medical term to search for'
      },
      searchType: {
        type: 'string',
        enum: ['exact', 'words', 'leftTruncation', 'rightTruncation', 'normalize'],
        description: 'Type of search to perform',
        default: 'words'
      }
    },
    required: ['term']
  },
  handler: async ({ term, searchType = 'words' }) => {
    try {
      const url = `https://uts-ws.nlm.nih.gov/rest/search/${UMLS_VERSION}`
      const params = new URLSearchParams({
        string: term,
        searchType,
        apiKey: UMLS_API_KEY
      })

      const response = await fetch(`${url}?${params}`)
      const data = await response.json()

      if (!data.result || !data.result.results) {
        return { found: false, message: 'No results found' }
      }

      const results = data.result.results.map((r) => ({
        name: r.name,
        ui: r.ui,
        rootSource: r.rootSource
      }))

      return {
        found: true,
        count: results.length,
        results
      }
    } catch (error) {
      return {
        error: true,
        message: error.message
      }
    }
  }
})

// Tool: Get concept details
server.tool({
  name: 'get_medical_concept',
  description: 'Get detailed information about a medical concept by its UMLS CUI (Concept Unique Identifier)',
  parameters: {
    type: 'object',
    properties: {
      cui: {
        type: 'string',
        description: 'UMLS CUI (e.g., C0011849 for Diabetes Mellitus)'
      }
    },
    required: ['cui']
  },
  handler: async ({ cui }) => {
    try {
      const url = `https://uts-ws.nlm.nih.gov/rest/content/${UMLS_VERSION}/CUI/${cui}`
      const params = new URLSearchParams({ apiKey: UMLS_API_KEY })

      const response = await fetch(`${url}?${params}`)
      const data = await response.json()

      return {
        found: true,
        concept: {
          name: data.result.name,
          cui: data.result.ui,
          semanticTypes: data.result.semanticTypes,
          definitions: data.result.definitions
        }
      }
    } catch (error) {
      return {
        error: true,
        message: error.message
      }
    }
  }
})

server.start()
```

### Hook: HIPAA Audit Logger

**File**: `hooks/hipaa-audit-logger.js`

```javascript
#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// HIPAA-compliant audit log location
const AUDIT_DIR = path.join(process.env.HOME, '.agent-cowork', 'audit')
const AUDIT_LOG = path.join(AUDIT_DIR, 'hipaa-audit.log')

// Ensure audit directory exists
if (!fs.existsSync(AUDIT_DIR)) {
  fs.mkdirSync(AUDIT_DIR, { recursive: true, mode: 0o700 })
}

/**
 * Create audit entry compliant with HIPAA requirements
 */
function createAuditEntry(event, details) {
  return {
    timestamp: new Date().toISOString(),
    event,
    sessionId: details.sessionId,
    user: details.user || process.env.USER || 'unknown',
    tool: details.tool,
    // Hash sensitive paths for privacy
    resourceHash: details.resource
      ? crypto.createHash('sha256').update(details.resource).digest('hex').substring(0, 16)
      : null,
    success: details.success !== false,
    // Unique log entry ID for tamper detection
    logId: crypto.randomBytes(16).toString('hex')
  }
}

module.exports = {
  /**
   * Pre-tool execution hook
   * Logs access attempts and validates HIPAA compliance
   */
  preToolUse: async (toolName, toolInput, context) => {
    const entry = createAuditEntry('ACCESS_ATTEMPT', {
      sessionId: context.sessionId,
      user: context.user,
      tool: toolName,
      resource: toolInput.file_path || toolInput.path || 'N/A'
    })

    // Append to audit log (append-only for compliance)
    fs.appendFileSync(AUDIT_LOG, JSON.stringify(entry) + '\n', { mode: 0o600 })

    // HIPAA compliance check: Deny write operations
    if (['Edit', 'Write', 'Bash'].includes(toolName)) {
      console.warn(`[HIPAA] Blocked prohibited tool: ${toolName}`)

      const denyEntry = createAuditEntry('ACCESS_DENIED', {
        sessionId: context.sessionId,
        tool: toolName,
        success: false
      })

      fs.appendFileSync(AUDIT_LOG, JSON.stringify(denyEntry) + '\n', { mode: 0o600 })

      return {
        allowed: false,
        reason: 'Tool denied by HIPAA compliance policy'
      }
    }

    // Allow read-only operations
    return { allowed: true }
  },

  /**
   * Post-tool execution hook
   * Logs completed actions and checks for PHI exposure
   */
  postToolUse: async (toolName, toolInput, toolOutput, context) => {
    const entry = createAuditEntry('ACCESS_COMPLETE', {
      sessionId: context.sessionId,
      user: context.user,
      tool: toolName,
      resource: toolInput.file_path || toolInput.path || 'N/A',
      success: !toolOutput.error
    })

    fs.appendFileSync(AUDIT_LOG, JSON.stringify(entry) + '\n', { mode: 0o600 })
  }
}
```

### Hook: PHI Detector

**File**: `hooks/phi-detector.js`

```javascript
#!/usr/bin/env node

/**
 * PHI (Protected Health Information) Detector Hook
 * Scans tool output for potential PHI and flags violations
 */

const PHI_PATTERNS = [
  // Social Security Numbers
  { name: 'SSN', regex: /\b\d{3}-\d{2}-\d{4}\b/g },

  // Medical Record Numbers (various formats)
  { name: 'MRN', regex: /\bMRN[:\s]*\d{6,10}\b/gi },

  // Dates of Birth
  { name: 'DOB', regex: /\b(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}\b/g },

  // Email addresses
  { name: 'Email', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },

  // Phone numbers
  { name: 'Phone', regex: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g }
]

module.exports = {
  postToolUse: async (toolName, toolInput, toolOutput, context) => {
    // Only check Read tool output (most likely to contain PHI)
    if (toolName !== 'Read') return

    const content = toolOutput.content || toolOutput.text || ''
    const findings = []

    for (const pattern of PHI_PATTERNS) {
      const matches = content.match(pattern.regex)
      if (matches && matches.length > 0) {
        findings.push({
          type: pattern.name,
          count: matches.length
        })
      }
    }

    if (findings.length > 0) {
      console.warn('[PHI DETECTOR] Potential PHI detected:')
      findings.forEach((f) => {
        console.warn(`  - ${f.type}: ${f.count} occurrence(s)`)
      })

      console.warn('[PHI DETECTOR] Ensure this data is handled according to HIPAA guidelines')
    }
  }
}
```

## Usage Examples

### Example 1: Code a Clinical Note

**User Prompt:**
```
Read the file patient-notes/2026-01-20-smith-john.txt and suggest appropriate ICD-10-CM codes for the documented diagnoses.
```

**Assistant Response:**
```
I've reviewed the clinical note for John Smith (2026-01-20). Here are the documented diagnoses and recommended ICD-10-CM codes:

1. **Type 2 Diabetes Mellitus with Diabetic Neuropathy**
   - ICD-10-CM: E11.40
   - Rationale: Documentation states "type 2 diabetes with peripheral neuropathy"
   - Source: Lines 15-17 of the note

2. **Essential Hypertension**
   - ICD-10-CM: I10
   - Rationale: "HTN" documented with BP 145/92
   - Source: Lines 8-9

3. **Hyperlipidemia, Unspecified**
   - ICD-10-CM: E78.5
   - Rationale: "Elevated cholesterol" noted, LDL 185
   - Source: Lines 22-24

**Documentation Gaps:**
- Diabetes: Consider documenting if with/without complications for more specific coding
- Hypertension: Specify if controlled or uncontrolled
- Hyperlipidemia: Specify type if known (pure hypercholesterolemia vs mixed)

**Coding Notes:**
- All codes are to the highest specificity based on available documentation
- E11.40 requires documentation of both diabetes type and neurological complication
- Consider E&M level: This appears to be an established patient visit, detailed history
```

### Example 2: Review Surgical Documentation

**User Prompt:**
```
Review surgical-notes/procedure-2026-01-15.txt and recommend CPT codes.
```

**Assistant Response:**
```
Surgical procedure reviewed. Recommended CPT codes:

**Primary Procedure:**
- CPT: 47562 - Laparoscopy, surgical; cholecystectomy
- Rationale: Documentation clearly describes laparoscopic cholecystectomy
- Source: Operative report, lines 45-67

**Additional Findings:**
- Moderate complexity due to adhesions noted
- Consider modifier -22 (Increased Procedural Services) if operative time significantly exceeded typical
- No complications documented

**Documentation Completeness:**
✅ Preoperative diagnosis documented
✅ Postoperative diagnosis documented
✅ Procedure description detailed
✅ Indications for surgery clear
❌ RECOMMENDATION: Add estimated blood loss (required for complete documentation)
❌ RECOMMENDATION: Specify type of closure used

**Billing Notes:**
- No separate anesthesia code needed (included in surgical package)
- Hospital facility fee separate from professional fee
```

## Deployment

### 1. Install Dependencies

```bash
# Install MCP SDK
npm install @anthropic-ai/mcp-sdk node-fetch

# Make hooks executable
chmod +x hooks/*.js
```

### 2. Set Environment Variables

```bash
# Add to ~/.bashrc or ~/.zshrc
export UMLS_API_KEY="your-umls-api-key"
export CPT_API_KEY="your-cpt-api-key"
```

### 3. Test Personality

```bash
# Start Agent Cowork
bun run dev

# Create new session
# Select "Medical Assistant" personality
# Choose a directory with sample medical records

# Test tool restrictions
# Try: "Read patient-notes/example.txt" (should work)
# Try: "Edit patient-notes/example.txt" (should be blocked)
```

### 4. Verify Compliance

```bash
# Check audit log
cat ~/.agent-cowork/audit/hipaa-audit.log

# Should contain entries for all file access
```

## Production Considerations

### 1. Data Security

- Store audit logs on HIPAA-compliant storage
- Encrypt audit logs at rest
- Implement log rotation with retention policy
- Regular audit log reviews

### 2. Access Control

- Implement user authentication
- Role-based access control (RBAC)
- Multi-factor authentication (MFA)
- Session timeout policies

### 3. Monitoring

- Alert on denied tool usage
- Monitor for PHI exposure patterns
- Track unusual access patterns
- Regular compliance audits

### 4. Training

- Train staff on HIPAA requirements
- Document personality usage policies
- Regular compliance training
- Incident response procedures

## Next Steps

- **[Legal Example](/personality-system/examples/legal)** - Legal document review personality
- **[Financial Example](/personality-system/examples/financial)** - Financial audit personality
- **[Build Variants](/personality-system/advanced/build-variants)** - Create medical edition binary