
// -----------------------------------------------------------------------------

export interface ParsedTemplate {
	headers: {
		[key: string]: string;
	}
	body: string;
	
}

// -----------------------------------------------------------------------------

const regexKey = /[a-zA-Z][a-zA-Z0-9]*/u;

// -----------------------------------------------------------------------------

export function parse(template: string): ParsedTemplate {
	const res: ParsedTemplate = {
		headers: {},
		body: ''
	};

	// Split lines
	const lines = template.split(/[\r\n]+/u);
	let lineIdx: number;
	for (lineIdx = 0; lineIdx < lines.length; lineIdx += 1) {
		let line = lines[lineIdx].trim();

		// Skip comments
		if (line.startsWith('#') || line.startsWith('//')) {
			continue;
		}

		// Try to process a key/value
		let idx = line.indexOf(':');
		if (idx < 0) {
			break; // Not a key, stop processing
		}
		const key = line.substring(0, idx);
		if (!regexKey.test(key)) {
			break; // Not a key, stop processing
		}

		// Get key's value
		let value = line.substring(idx+1).trim();
		if (value) {
			const ch = value.charAt(0);
			if (ch == '`' || ch == '\'' || ch == '"') {
				if (!value.endsWith(ch)) {
					throw new Error('missing closing quote of value at line #' + (lineIdx+1).toFixed(0));
				}
				value = value.substring(1, value.length-1);
			}
		}

		// Add to headers
		res.headers[key] = value;
	}

	// Sets the body
	res.body = lines.slice(lineIdx).join('\n');

	// Done
	return res;
}
