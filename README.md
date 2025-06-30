# Obsidian Highlight Extractor

A plugin for [Obsidian](https://obsidian.md) that extracts highlights from your notes and compiles them into a formatted summary note with backlinks to the original content.

## Features

- 🔍 **Automatic Highlight Detection**: Finds all text wrapped in double equal signs (`==highlighted text==`)
- 📝 **Custom Templates**: Use your own templates for extracted highlight notes
- 🔗 **Direct Backlinks**: Click any highlight to jump directly to its location in the source note
- 📁 **Organized Output**: Save extracted highlights to a designated folder
- 📋 **Context Preservation**: Optionally include the full paragraph containing each highlight
- ⚡ **Quick Access**: Extract via ribbon icon, command palette, or hotkey

## Installation

### Manual Installation

1. Navigate to your vault's plugins folder: `.obsidian/plugins/`
2. Create a new folder called `highlight-extractor`
3. Download the following files into that folder:
   - `main.js`
   - `manifest.json`
4. Reload Obsidian
5. Go to Settings → Community plugins and enable "Highlight Extractor"

### Building from Source

1. Clone this repository into your vault's plugins folder
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the plugin:
   ```bash
   npm run build
   ```
4. Reload Obsidian and enable the plugin

## Usage

### Basic Usage

1. Add highlights to any note using `==your highlighted text==`
2. Click the highlighter icon in the ribbon, or use the command palette to run "Extract highlights from current note"
3. A new note will be created with all your highlights, formatted and linked back to the source

### Example

**Original Note:**
```markdown
The French Revolution began in 1789 with ==the storming of the Bastille==. 
This event marked ==a turning point in French history== and inspired 
revolutionary movements across Europe.
```

**Extracted Highlights Note:**
```markdown
# French Revolution - Extracted Highlights

**Source:** [[French Revolution]]
**Date Extracted:** 12/26/2024
**Total Highlights:** 2

---

## Highlight 1

> the storming of the Bastille

**Location:** [[French Revolution#^20241226195600001]]

---

## Highlight 2

> a turning point in French history

**Location:** [[French Revolution#^20241226195600002]]
```

## Settings

### Template File Path
- Specify a custom template for your extracted highlights
- Leave empty to use the default template
- Example: `Templates/Highlight Template.md`

### Extracted Notes Folder
- Choose where to save extracted highlight notes
- Default: `Extracted Highlights`

### Include Paragraph Context
- When enabled, includes the full paragraph containing each highlight
- Useful for preserving context around your highlights

## Custom Templates

Create your own template using these variables:

- `{{title}}` - The source note's title
- `{{source}}` - The source note name (for wiki-linking)
- `{{date}}` - The extraction date
- `{{count}}` - Number of highlights extracted
- `{{highlights}}` - The formatted highlights content

### Example Template

```markdown
# 📌 Highlights from: {{title}}

> [!INFO] Metadata
> **Date Created**: {{date}}
> **Source Note**: [[{{source}}]]
> **Highlight Count**: {{count}}

## Extracted Highlights

{{highlights}}

## Personal Thoughts / Reactions

*[Add your analysis here]*

## Related Notes
- [[Related Topic 1]]
- [[Related Topic 2]]
```

## Commands

- **Extract highlights from current note**: Extracts all highlights from the active note

## Tips

1. **Keyboard Shortcut**: Assign a hotkey to the extract command for quick access
2. **Multiple Highlights**: You can have multiple highlights on the same line
3. **Nested Highlights**: Highlights within lists, blockquotes, and other formatting work correctly
4. **Review Workflow**: Use extracted highlights as a review tool for your notes
5. **No Duplicates**: The plugin adds unique block references, so re-extracting won't create duplicate references

## Compatibility

- Requires Obsidian v0.15.0 or higher
- Works on desktop and mobile
- Compatible with other plugins that use standard Obsidian markdown

## License

MIT License - see LICENSE file for details

## Acknowledgments

Created as a local alternative to cloud-based highlight extraction services, giving you full control over your highlights within your Obsidian vault.

---
