import { App, TFile, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
// import * as path from "path";

// Remember to rename these classes and interfaces!

const isValidSlugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
function slugify(text: string): string {
	return text
		.toLowerCase()                  // Convert to lowercase
		.trim()                        // Remove whitespace from ends
		.normalize('NFD')              // Normalize unicode characters
		.replace(/[\u0300-\u036f]/g, '') // Remove diacritics
		.replace(/[^a-z0-9\s-]/g, '')   // Remove special chars except spaces and dashes
		.replace(/[\s]+/g, '-')         // Replace spaces with dashes
		.replace(/-+/g, '-')            // Remove consecutive dashes
}

interface TitleSlugifyPluginSettings {
	finalizer: string;
}

const DEFAULT_SETTINGS: TitleSlugifyPluginSettings = {
	finalizer: 'default'
}

export default class TitleSlugifyPlugin extends Plugin {
	settings: TitleSlugifyPluginSettings;

	handleRename = (file: TFile, oldPath: string) => {
		// const newMetadata = this.app.metadataCache.getFileCache(file);
		// const oldMetadata = this.app.metadataCache.getCache(oldPath);
		// const metadata = newMetadata || oldMetadata;
		// const oldName = path.parse(oldPath).name;

		try {
			if (!file || !file.basename) {
				throw new Error("Invalid file name");
			}

			// Get the directory path and extension
			const dirPath = file.parent?.path || "";
			const extension = file.extension ? `.${file.extension}` : "";

			if (!isValidSlugRegex.test(file.basename)) {
				const slugified = slugify(file.basename);
				const newPath = dirPath
					? `${dirPath}/${slugified}${extension}`
					: `${slugified}${extension}`;

				this.app.fileManager.renameFile(file, newPath);
				new Notice("File name slugified");
			}
		} catch (error) {
			new Notice(`Error: ${error.message}`);
		}
	}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new TitleSlugifySettingTab(this.app, this));
		this.registerEvent(this.app.vault.on("rename", this.handleRename));

		this.registerEvent(
			this.app.workspace.on('file-open', (file) => {
				if (file instanceof TFile) {
					this.handleRename(file, file.path);
				}
			})
		);
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class TitleSlugifySettingTab extends PluginSettingTab {
	plugin: TitleSlugifyPlugin;

	constructor(app: App, plugin: TitleSlugifyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Finalizer RegEx')
			.setDesc('Optional regular expression to call after slugification')
			.addText(text => text
				.setPlaceholder('Enter a regex')
				.setValue(this.plugin.settings.finalizer)
				.onChange(async (value) => {
					this.plugin.settings.finalizer = value;
					await this.plugin.saveSettings();
				}));
	}
}
