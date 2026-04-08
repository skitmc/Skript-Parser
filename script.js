require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' }});

let editor;
let deco = [];

require(['vs/editor/editor.main'], function() {
    // 1. Define Professional Theme
    monaco.editor.defineTheme('midnight-cobalt', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'keyword', foreground: '00d4ff', fontStyle: 'bold' },
            { token: 'variable', foreground: 'e0e0e0' },
            { token: 'operator', foreground: '569cd6' },
            { token: 'string', foreground: 'ce9178' },
            { token: 'comment', foreground: '6a9955' }
        ],
        colors: {
            'editor.background': '#0b0e14',
            'editor.lineHighlightBackground': '#11151c',
            'editorCursor.foreground': '#00d4ff',
            'editorIndentGuide.activeBackground': '#1e2530'
        }
    });

    // 2. Register Skript Language
    monaco.languages.register({ id: 'skript' });
    monaco.languages.setMonarchTokensProvider('skript', {
        tokenizer: {
            root: [
                [/on (join|quit|death|break|place|chat):?/, 'keyword'],
                [/command \/\w+:?/, 'keyword'],
                [/if |else |loop |while |return /, 'keyword'],
                [/set |add |remove |give |send |broadcast |cancel event/, 'operator'],
                [/({[^}]+})/, 'variable'],
                [/"[^"]*"/, 'string'],
                [/#[^#]*/, 'comment']
            ]
        }
    });

    // 3. Create Editor
    editor = monaco.editor.create(document.getElementById('monaco-editor'), {
        value: "# SKITMC Skript Repo\non join\n\tsend \"Welcome!\"\n\tgive player 1 diamond",
        language: 'skript',
        theme: 'midnight-cobalt',
        fontFamily: 'JetBrains Mono',
        fontSize: 14,
        lineNumbersMinChars: 3,
        automaticLayout: true,
        minimap: { enabled: false },
        padding: { top: 20 }
    });

    // Auto-run analysis
    editor.onDidChangeModelContent(() => {
        clearTimeout(window.parseTimer);
        window.parseTimer = setTimeout(runAnalysis, 800);
    });
});

function log(msg, type = 'info') {
    const logs = document.getElementById('console-logs');
    const color = type === 'error' ? 'text-red-400' : 'text-slate-500';
    logs.innerHTML += `<div class="${color} border-l border-current pl-3">> ${msg}</div>`;
    logs.scrollTop = logs.scrollHeight;
}

function runAnalysis() {
    const code = editor.getValue();
    const lines = code.split('\n');
    let markers = [];
    let hasError = false;

    lines.forEach((content, i) => {
        // Simple Logic: If it's a trigger but has no colon
        if ((content.includes('on ') || content.includes('command ')) && !content.trim().endsWith(':')) {
            hasError = true;
            markers.push({
                severity: monaco.MarkerSeverity.Error,
                message: 'Missing required colon (:) at end of trigger',
                startLineNumber: i + 1,
                startColumn: 1,
                endLineNumber: i + 1,
                endColumn: content.length + 1
            });
        }
    });

    monaco.editor.setModelMarkers(editor.getModel(), 'owner', markers);
    
    const led = document.getElementById('status-led');
    const statusText = document.getElementById('status-text');

    if (hasError) {
        led.className = "w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]";
        statusText.innerText = "Errors Detected";
        log("Syntax Validation Failed", "error");
    } else {
        led.className = "w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_#00d4ff]";
        statusText.innerText = "All Systems Nominal";
        log("Validation Successful");
    }
}

function applyAutoFix() {
    const model = editor.getModel();
    let code = model.getValue();
    const lines = code.split('\n');
    
    const fixed = lines.map(l => {
        if ((l.includes('on ') || l.includes('command ')) && !l.trim().endsWith(':')) {
            return l + ":";
        }
        return l;
    }).join('\n');

    editor.pushUndoStop(); // Allows user to hit Ctrl+Z to undo the fix
    editor.executeEdits("fixer", [{
        range: model.getFullModelRange(),
        text: fixed
    }]);
    
    log("Auto-Fix applied to triggers", "info");
    runAnalysis();
}