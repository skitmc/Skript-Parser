require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' }});

let editor;
let decorations = [];

require(['vs/editor/editor.main'], function() {
    // Define Skript Language
    monaco.languages.register({ id: 'skript' });
    
    editor = monaco.editor.create(document.getElementById('container'), {
        value: "on join\n\tsend \"Missing colon error!\"\n\tgive player 1 diamond",
        language: 'skript',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 15,
        cursorSmoothCaretAnimation: true
    });

    // Run analysis whenever the user stops typing
    let timeout;
    editor.onDidChangeModelContent(() => {
        clearTimeout(timeout);
        timeout = setTimeout(analyze, 1000);
    });
});

function analyze() {
    const code = editor.getValue();
    const lines = code.split('\n');
    let errors = [];
    let newDecorations = [];
    const statusBox = document.getElementById('status-box');
    const logBox = document.getElementById('log-box');

    statusBox.innerHTML = "<span class='text-yellow-500'>Analyzing...</span>";

    lines.forEach((line, index) => {
        // 1. Check for missing colons on triggers
        if ((line.trim().startsWith('on ') || line.trim().startsWith('command ')) && !line.trim().endsWith(':')) {
            errors.push({ line: index + 1, msg: "Missing colon at end of trigger" });
            newDecorations.push({
                range: new monaco.Range(index + 1, 1, index + 1, line.length + 1),
                options: { inlineClassName: 'error-underline', hoverMessage: { value: 'Missing colon (:)' } }
            });
        }
    });

    // Apply red underlines
    decorations = editor.deltaDecorations(decorations, newDecorations);

    if (errors.length > 0) {
        statusBox.innerHTML = `<span class='text-red-500'>Found ${errors.length} error(s)</span>`;
        logBox.innerHTML += `<div class='text-red-400'>> [Error] Line ${errors[0].line}: ${errors[0].msg}</div>`;
    } else {
        statusBox.innerHTML = "<span class='text-green-500'>Syntax Clear</span>";
        logBox.innerHTML += "<div class='text-green-800'>> No issues detected.</div>";
    }
}

function fixCode() {
    let code = editor.getValue();
    const lines = code.split('\n');
    
    const fixedLines = lines.map(line => {
        // Auto-fix: Add missing colons to triggers
        if ((line.trim().startsWith('on ') || line.trim().startsWith('command ')) && !line.trim().endsWith(':')) {
            return line + ":";
        }
        return line;
    });

    editor.setValue(fixedLines.join('\n'));
    document.getElementById('log-box').innerHTML += "<div class='text-blue-400'>> Auto-fix applied.</div>";
    analyze();
}