require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' }});

let editor;

require(['vs/editor/editor.main'], function () {

    // LANGUAGE
    monaco.languages.register({ id: 'skript' });

    monaco.languages.setMonarchTokensProvider('skript', {
        tokenizer: {
            root: [
                [/^(on\s.+|command\s.+|trigger|options|else if\s.+|else|if\s.+)/, 'keyword'],
                [/(set|add|remove|give|send|broadcast|ban|kick|op|deop|stop)/, 'operator'],
                [/\{[^}]+\}/, 'variable'],
                [/"[^"]*"/, 'string'],
                [/#[^#]*/, 'comment'],
                [/<[^>]+>/, 'type-tag']
            ]
        }
    });

    // THEME
    monaco.editor.defineTheme('sk-pro-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'keyword', foreground: '58a6ff', fontStyle: 'bold' },
            { token: 'operator', foreground: '79c0ff' },
            { token: 'variable', foreground: 'ffa657' },
            { token: 'type-tag', foreground: 'a5d6ff' },
            { token: 'comment', foreground: '8b949e', fontStyle: 'italic' }
        ],
        colors: {
            'editor.background': '#0d1117',
            'editor.lineHighlightBackground': '#161b22',
            'editorCursor.foreground': '#58a6ff'
        }
    });

    // EDITOR (EMPTY + PLACEHOLDER)
    editor = monaco.editor.create(document.getElementById('monaco-editor'), {
        value: "",
        language: 'skript',
        theme: 'sk-pro-dark',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 14,
        automaticLayout: true,
        minimap: { enabled: false }
    });

    // Placeholder text
    const placeholder = document.createElement('div');
    placeholder.innerText = "ENTER SKRIPT HERE...";
    placeholder.style.position = "absolute";
    placeholder.style.top = "20px";
    placeholder.style.left = "20px";
    placeholder.style.opacity = "0.3";
    placeholder.style.pointerEvents = "none";
    placeholder.style.fontFamily = "JetBrains Mono";
    placeholder.style.fontSize = "14px";

    document.getElementById('monaco-editor').appendChild(placeholder);

    editor.onDidChangeModelContent(() => {
        placeholder.style.display = editor.getValue() ? "none" : "block";
    });

    // Debounce
    let debounce;
    editor.onDidChangeModelContent(() => {
        clearTimeout(debounce);
        debounce = setTimeout(runDiagnostics, 500);
    });
});

/**
 * SMART DIAGNOSTICS
 */
function runDiagnostics() {
    if (!editor) return;

    const model = editor.getModel();
    const lines = model.getLinesContent();
    let markers = [];
    let errorCount = 0;

    lines.forEach((line, i) => {
        const lineNum = i + 1;
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith('#')) return;

        const isHeader = /^(on\s.+|command\s.+|options|if\s.+|else if\s.+|else)$/.test(trimmed);

        // Missing colon
        if (isHeader && !trimmed.endsWith(':')) {
            errorCount++;
            markers.push(createMarker(lineNum, line, 'Missing ":" at end of statement.'));
        }

        // Warning: offlineplayer
        if (/<offlineplayer>/i.test(trimmed)) {
            markers.push({
                severity: monaco.MarkerSeverity.Warning,
                message: 'Use "<offline player>" (recommended format).',
                startLineNumber: lineNum,
                startColumn: 1,
                endLineNumber: lineNum,
                endColumn: line.length + 1
            });
        }

        // Variable warning
        if (/\{[^}]+\.arg-\d+\}/.test(trimmed)) {
            markers.push({
                severity: monaco.MarkerSeverity.Warning,
                message: 'Avoid .arg-# inside variables. Use UUID lists.',
                startLineNumber: lineNum,
                startColumn: 1,
                endLineNumber: lineNum,
                endColumn: line.length + 1
            });
        }

        // Bad syntax
        if (/ban .+ because of .+/.test(trimmed)) {
            errorCount++;
            markers.push(createMarker(lineNum, line, 'Use "due to" instead of "because of".'));
        }

        // Percent check (safe)
        const clean = line.replace(/"[^"]*"/g, '');
        const percentMatches = clean.match(/%/g);

        if (percentMatches && percentMatches.length % 2 !== 0) {
            errorCount++;
            markers.push(createMarker(lineNum, line, 'Unclosed % variable.'));
        }
    });

    monaco.editor.setModelMarkers(model, 'owner', markers);
    updateUI(errorCount);
}

/**
 * MARKER
 */
function createMarker(lineNum, content, msg) {
    return {
        severity: monaco.MarkerSeverity.Error,
        message: msg,
        startLineNumber: lineNum,
        startColumn: 1,
        endLineNumber: lineNum,
        endColumn: content.length + 1
    };
}

/**
 * AUTO FIX (SAFE)
 */
function applyAutoFix() {
    if (!editor) return;

    const model = editor.getModel();
    const lines = model.getLinesContent();

    const fixed = lines.map(line => {
        if (line.trim().startsWith('#')) return line;

        let patched = line;
        const trimmed = patched.trim();

        const isHeader = /^(on\s.+|command\s.+|options|if\s.+|else if\s.+|else)$/.test(trimmed);

        // Colon fix
        if (isHeader && !trimmed.endsWith(':')) {
            patched += ':';
        }

        // Type fix
        patched = patched.replace(/<offlineplayer>/gi, '<offline player>');

        // Syntax fix (only outside strings)
        if (!patched.includes('"')) {
            patched = patched.replace(/(ban\s+.+?)\s+because of\s+(.+)/gi, '$1 due to $2');
        }

        // Variable fix
        patched = patched.replace(/\{([a-zA-Z0-9_-]+)\.arg-(\d+)\}/gi, '{$1::%uuid of arg-$2%}');

        return patched;
    });

    editor.executeEdits("fix", [{
        range: model.getFullModelRange(),
        text: fixed.join('\n')
    }]);

    runDiagnostics();
}

/**
 * UI UPDATE
 */
function updateUI(errorCount) {
    const led = document.getElementById('status-led');
    const text = document.getElementById('status-text');
    const logs = document.getElementById('console-logs');

    if (errorCount > 0) {
        led.className = "w-2.5 h-2.5 rounded-full bg-red-500";
        text.innerText = `${errorCount} Issues Found`;
        logs.innerHTML += `<div class="text-red-400">> Found ${errorCount} issues</div>`;
    } else {
        led.className = "w-2.5 h-2.5 rounded-full bg-green-500";
        text.innerText = "Clean";
        logs.innerHTML += `<div class="text-green-400">> No issues detected</div>`;
    }

    logs.scrollTop = logs.scrollHeight;
}