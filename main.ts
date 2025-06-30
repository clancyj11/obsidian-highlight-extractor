import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

interface HighlightExtractorSettings {
    templatePath: string;
    extractedNotesFolder: string;
    includeParagraphContext: boolean;
}

const DEFAULT_SETTINGS: HighlightExtractorSettings = {
    templatePath: '',
    extractedNotesFolder: 'Extracted Highlights',
    includeParagraphContext: false
}

export default class HighlightExtractorPlugin extends Plugin {
    settings: HighlightExtractorSettings;
    highlightCounter: number;
    lastExtractionTime: string;

    async onload() {
        await this.loadSettings();

        // Add ribbon icon
        this.addRibbonIcon('highlighter', 'Extract highlights', async () => {
            await this.extractHighlights();
        });

        // Add command
        this.addCommand({
            id: 'extract-highlights',
            name: 'Extract highlights from current note',
            callback: async () => {
                await this.extractHighlights();
            }
        });

        // Add settings tab
        this.addSettingTab(new HighlightExtractorSettingTab(this.app, this));
    }

    async extractHighlights() {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice('No active file');
            return;
        }

        const content = await this.app.vault.read(activeFile);
        const highlights = this.parseHighlights(content, activeFile);

        if (highlights.length === 0) {
            new Notice('No highlights found in the current note');
            return;
        }

        // Add block references to the original file
        const updatedContent = await this.addBlockReferences(content, highlights);
        await this.app.vault.modify(activeFile, updatedContent);

        // Get template content
        let template = await this.getTemplate();
        
        // Create new note content
        const newNoteContent = await this.createExtractedNote(highlights, activeFile, template);
        
        // Generate filename
        const baseFileName = `${activeFile.basename} - Highlights`;
        // Result: "My Note - Highlights"
        
        // Ensure folder exists
        const folder = this.settings.extractedNotesFolder;
        if (folder && !await this.app.vault.adapter.exists(folder)) {
            await this.app.vault.createFolder(folder);
        }
        
        // Create the new note
        const newFilePath = folder ? `${folder}/${baseFileName}.md` : `${baseFileName}.md`;
        const newFile = await this.app.vault.create(newFilePath, newNoteContent);
        
        // Open the new file
        await this.app.workspace.getLeaf().openFile(newFile);
        
        new Notice(`Extracted ${highlights.length} highlights to ${newFile.name}`);
    }

    parseHighlights(content: string, file: TFile): Array<{text: string, lineNumber: number, blockId?: string, context?: string}> {
        const highlights: Array<{text: string, lineNumber: number, blockId?: string, context?: string}> = [];
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const regex = /==(.*?)==/g;
            let match;
            
            while ((match = regex.exec(line)) !== null) {
                // Generate a unique block ID for this highlight
                const blockId = this.generateBlockId(match[1]);
                
                const highlight = {
                    text: match[1],
                    lineNumber: i + 1,
                    blockId: blockId,
                    context: this.settings.includeParagraphContext ? this.getParagraphContext(lines, i) : undefined
                };
                highlights.push(highlight);
            }
        }
        
        return highlights;
    }

    generateBlockId(text: string): string {
        // Create a base datetime stamp: YYYYMMDDHHMMSS
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        // Add a counter that increments for each highlight in the same extraction
        if (!this.highlightCounter || this.lastExtractionTime !== `${year}${month}${day}${hours}${minutes}${seconds}`) {
            this.highlightCounter = 1;
            this.lastExtractionTime = `${year}${month}${day}${hours}${minutes}${seconds}`;
        } else {
            this.highlightCounter++;
        }
        
        const counter = String(this.highlightCounter).padStart(2, '0');
        
        return `${year}${month}${day}${hours}${minutes}${seconds}${counter}`;
    }

    async addBlockReferences(content: string, highlights: Array<{text: string, lineNumber: number, blockId?: string, context?: string}>): Promise<string> {
        const lines = content.split('\n');
        
        // Process highlights in reverse order to maintain line numbers
        for (let i = highlights.length - 1; i >= 0; i--) {
            const highlight = highlights[i];
            const lineIndex = highlight.lineNumber - 1;
            
            if (highlight.blockId && lines[lineIndex]) {
                // Check if the line already has a block reference
                if (!lines[lineIndex].match(/ \^[a-z0-9-]+$/)) {
                    // Add block reference to the end of the line
                    lines[lineIndex] = lines[lineIndex] + ` ^${highlight.blockId}`;
                }
            }
        }
        
        return lines.join('\n');
    }

    getParagraphContext(lines: string[], lineIndex: number): string {
        // Find paragraph boundaries
        let start = lineIndex;
        let end = lineIndex;
        
        // Find start of paragraph
        while (start > 0 && lines[start - 1].trim() !== '') {
            start--;
        }
        
        // Find end of paragraph
        while (end < lines.length - 1 && lines[end + 1].trim() !== '') {
            end++;
        }
        
        // Extract paragraph
        const paragraph = lines.slice(start, end + 1).join('\n');
        return paragraph;
    }

    async getTemplate(): Promise<string> {
        if (!this.settings.templatePath) {
            return this.getDefaultTemplate();
        }
        
        const templateFile = this.app.vault.getAbstractFileByPath(this.settings.templatePath);
        if (templateFile instanceof TFile) {
            return await this.app.vault.read(templateFile);
        }
        
        new Notice('Template file not found, using default template');
        return this.getDefaultTemplate();
    }

    getDefaultTemplate(): string {
        return `# {{title}} - Extracted Highlights

**Source:** [[{{source}}]]
**Date Extracted:** {{date}}
**Total Highlights:** {{count}}

---

{{highlights}}`;
    }

    async createExtractedNote(highlights: Array<{text: string, lineNumber: number, blockId?: string, context?: string}>, sourceFile: TFile, template: string): Promise<string> {
        const date = new Date().toLocaleDateString();
        
        // Format highlights
        const formattedHighlights = highlights.map((h, index) => {
            let highlightBlock = `## Highlight ${index + 1}\n\n`;
            highlightBlock += `> ${h.text}\n\n`;
            
            // Use block reference if available, otherwise fall back to just note link
            if (h.blockId) {
                highlightBlock += `**Location:** [[${sourceFile.basename}#^${h.blockId}]]\n`;
            } else {
                highlightBlock += `**Location:** [[${sourceFile.basename}]] (Line ${h.lineNumber})\n`;
            }
            
            if (h.context && this.settings.includeParagraphContext) {
                highlightBlock += `\n**Context:**\n${h.context}\n`;
            }
            
            return highlightBlock;
        }).join('\n---\n\n');
        
        // Replace template variables
        let noteContent = template;
        noteContent = noteContent.replace('{{title}}', sourceFile.basename);
        noteContent = noteContent.replace('{{source}}', sourceFile.basename);
        noteContent = noteContent.replace('{{date}}', date);
        noteContent = noteContent.replace('{{count}}', highlights.length.toString());
        noteContent = noteContent.replace('{{highlights}}', formattedHighlights);
        
        return noteContent;
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class HighlightExtractorSettingTab extends PluginSettingTab {
    plugin: HighlightExtractorPlugin;

    constructor(app: App, plugin: HighlightExtractorPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();

        containerEl.createEl('h2', {text: 'Highlight Extractor Settings'});

        new Setting(containerEl)
            .setName('Template file path')
            .setDesc('Path to the template file for extracted highlights (leave empty for default)')
            .addText(text => text
                .setPlaceholder('Templates/Highlight Template.md')
                .setValue(this.plugin.settings.templatePath)
                .onChange(async (value) => {
                    this.plugin.settings.templatePath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Extracted notes folder')
            .setDesc('Folder where extracted highlight notes will be saved')
            .addText(text => text
                .setPlaceholder('Extracted Highlights')
                .setValue(this.plugin.settings.extractedNotesFolder)
                .onChange(async (value) => {
                    this.plugin.settings.extractedNotesFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Include paragraph context')
            .setDesc('Include the full paragraph containing each highlight')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.includeParagraphContext)
                .onChange(async (value) => {
                    this.plugin.settings.includeParagraphContext = value;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl('h3', {text: 'Template Variables'});
        containerEl.createEl('p', {text: 'Available variables for your template:'});
        const variableList = containerEl.createEl('ul');
        variableList.createEl('li', {text: '{{title}} - Source note title'});
        variableList.createEl('li', {text: '{{source}} - Source note name (for linking)'});
        variableList.createEl('li', {text: '{{date}} - Current date'});
        variableList.createEl('li', {text: '{{count}} - Number of highlights'});
        variableList.createEl('li', {text: '{{highlights}} - The formatted highlights'});
    }
}