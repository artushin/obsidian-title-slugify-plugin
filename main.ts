import { App, TFile, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

const isValidSlugRegex = /^[a-z0-9._]+(?:-[a-z0-9._]+)*$/
function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9\s-._]/g, '')
		.replace(/[\s]+/g, '-')
		.replace(/-+/g, '-')
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
		try {
			if (!file || !file.basename) {
				return;
			}

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
			
			this.colorizeFileNames();
		} catch (error) {
			new Notice(`Error: ${error.message}`);
		}
	}

	// Add custom styles to the document
	private addCustomStyles() {
		const styleEl = document.createElement('style');
		styleEl.id = 'title-slugify-styles';
		styleEl.textContent = `
            .nav-file-title-content span.segment-blue { color: #4183c4; }
            .nav-file-title-content span.segment-red { color: #e45649; }
            .nav-file-title-content span.segment-green { color: #50a14f; }
            .nav-file-title-content span.segment-default { color: inherit; }
        `;
		document.head.appendChild(styleEl);
	}

	// Remove custom styles when plugin is disabled
	private removeCustomStyles() {
		const styleEl = document.getElementById('title-slugify-styles');
		if (styleEl) {
			styleEl.remove();
		}
	}

	// Colorize filename segments
	private colorizeFileNames() {
		// Initial colorization of existing files
		const titleElements = document.getElementsByClassName('nav-file-title-content');
		Array.from(titleElements).forEach((el) => {
			setTimeout(() => {
				this.colorizeFileName(el as HTMLElement);
			}, 300);
		});
	}

	private colorizeFileName(titleEl: HTMLElement) {
		if (!titleEl.classList.contains('nav-file-title-content')) return;

		const fileName = titleEl.textContent || '';
		const segments = fileName.split('.');

		if (segments.length <= 1) return; // Skip if no dots in filename

		// Clear existing content
		titleEl.innerHTML = '';

		// Apply colors based on number of segments
		segments.forEach((segment, index) => {
			const span = document.createElement('span');
			span.textContent = segment;

			if (segments.length === 2) {
				// Two segments: blue, default
				span.className = index === 0 ? 'segment-blue' : 'segment-default';
			} else if (segments.length === 3) {
				// Three segments: blue, default, red
				span.className = index === 0 ? 'segment-blue' :
					index === 1 ? 'segment-default' : 'segment-red';
			} else if (segments.length > 3) {
				// More than three: blue, default, red, then green
				span.className = index === 0 ? 'segment-blue' :
					index === 1 ? 'segment-default' :
						index === 2 ? 'segment-red' : 'segment-green';
			}

			titleEl.appendChild(span);

			// Add dot separator if not the last segment
			if (index < segments.length - 1) {
				const dot = document.createElement('span');
				dot.textContent = '.';
				dot.className = 'segment-default';
				titleEl.appendChild(dot);
			}
		});
	}

	// Observer to watch for changes in the file explorer
	private setupFileExplorerObserver() {
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				mutation.addedNodes.forEach((node) => {
					if (node instanceof HTMLElement) {
						// Check for file title elements
						const titleElements = node.getElementsByClassName('nav-file-title-content');
						Array.from(titleElements).forEach((el) => {
							setTimeout(() => {
								this.colorizeFileName(el as HTMLElement);
							}, 300);
						});
					}
				});
			});
		});

		// Start observing the file explorer
		const fileExplorer = document.querySelector('.nav-files-container');
		if (fileExplorer) {
			observer.observe(fileExplorer, {
				childList: true,
				subtree: true
			});
		}

		return observer;
	}


	private handleLayoutChange = () => {
		// Check if file explorer exists and set up observer if needed
		const fileExplorer = document.querySelector('.nav-files-container');
		if (fileExplorer) {
			if (!this.observer) {
				this.observer = this.setupFileExplorerObserver();
			}
			this.colorizeFileNames();
		} else if (this.observer) {
			// Clean up observer if file explorer is hidden/removed
			this.observer.disconnect();
			this.observer = null;
		}
	}

	private observer: MutationObserver | null = null;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new TitleSlugifySettingTab(this.app, this));
		this.registerEvent(this.app.vault.on("rename", this.handleRename));
		this.registerEvent(this.app.vault.on("modify", (file: TFile) => {
			this.handleRename(file, file.path);
		}));
		this.registerEvent(this.app.workspace.on("resize", this.handleLayoutChange));
		this.app.workspace.onLayoutReady(this.handleLayoutChange);

		// Add custom styles
		this.addCustomStyles();
	}

	onunload() {
		// Clean up observer
		if (this.observer) {
			this.observer.disconnect();
		}

		// Remove custom styles
		this.removeCustomStyles();
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
		const { containerEl } = this;

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