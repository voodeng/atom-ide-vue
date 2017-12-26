const path = require('path');
const {AutoLanguageClient} = require('atom-languageclient');
const {filter} = require('fuzzaldrin-plus')

// atom.config.set('core.debugLSP', true)

class VueLanguageClient extends AutoLanguageClient {
	getGrammarScopes() {
		return atom.config.get('atom-ide-vue.additionalGrammars').concat(['text.html.vue']);
	};
	getLanguageName() {
		return 'Vue'
	};
	getServerName() {
		return 'Vetur'
	};

	startServerProcess() {
		const args = ['node_modules/vue-language-server/dist/vueServerMain'];
		return super.spawnChildNode(args, {
			cwd: path.join(__dirname, '..')
		});
	};

	preInitialization(connection) {
		connection.onCustom('$/partialResult', () => {}); // Suppress partialResult until the language server honours 'streaming' detection
	}

	// try use https://github.com/atom/ide-typescript/blob/1e75857fe9292e50c9d827900caff345c25580aa/lib/main.js#L24-L91
	getTriggerPoint(request, triggerChars) {
		if (triggerChars.includes(request.prefix))
			return request.bufferPosition;

		return {
			row: request.bufferPosition.row,
			column: request.bufferPosition.column - request.prefix.length
		};
	}

	getPrefixWithTrigger(request, triggerPoint) {
		return request.editor.getBuffer().getTextInRange([
			[
				triggerPoint.row, triggerPoint.column - 1
			],
			request.bufferPosition
		])
	}

	async getSuggestions(request) {
		const server = await this._serverManager.getServer(request.editor)
		if (server == null) {
			return server.currentSuggestions = []
		}

		const triggerChars = server.capabilities.completionProvider && server.capabilities.completionProvider.triggerCharacters
		const triggerPoint = this.getTriggerPoint(request, triggerChars)
		const prefixWithTrigger = this.getPrefixWithTrigger(request, triggerPoint)
		const autoTrigger = triggerChars.find(t => prefixWithTrigger.startsWith(t))

		if (autoTrigger == null && !request.activatedManually) {
			return server.currentSuggestions = []
		}

		// TODO: Handle IsComplete with caching
		if (server.currentSuggestions && server.currentSuggestions.length > 0) {
			if (autoTrigger == prefixWithTrigger) { // User backspaced to trigger, represent entire cache
				this.setPrefixOnSuggestions(server.currentSuggestions, request.prefix)
				return server.currentSuggestions
			}
			if (autoTrigger) { // Still in a triggered autocomplete with cache, fuzzy-filter those results
				const results = filter(server.currentSuggestions, request.prefix, {key: 'text'})
				this.setPrefixOnSuggestions(server.currentSuggestions, request.prefix)
				return results
			}
		}

		// We must be triggered but we don't have a cache so send to LSP
		return server.currentSuggestions = await super.getSuggestions(request)
	}

	setPrefixOnSuggestions(suggestions, prefix) {
		for (const suggestion of suggestions) {
			suggestion.replacementPrefix = prefix
		}
	}

	//
}

module.exports = new VueLanguageClient();
