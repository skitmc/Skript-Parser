require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' }});

let editor;

require(['vs/editor/editor.main'], function() {
    // Define Skript language rules for syntax highlighting
    monaco.languages.register({ id: 'skript' });
    monaco.languages.setMonarchTokensProvider('skript', {
        tokenizer: {
            root: [
                [/on (join|quit|break|place|death|chat):/, "keyword"],
                [/if|else|while|loop|return|stop/, "keyword"],
                [/send|set|add|remove|give|cancel event|broadcast/, "operator"],
                [/({.*?})/, "variable"],
                [/"[^"]*"/, "string"],
                [/#[^#]*/, "comment"],
                [/[0-9]+/, "number"],
            ]
        }
    });

    // Initialize the Editor
    editor = monaco.editor.create(document.getElementById('container'), {
        value: [
            '# Welcome to Skript-Parser',
            'on join:',
            '\tsend "Hello %player%, welcome to the server!" to player',
            '\tset {joins::%uuid of player%} to 1',
            '',
            'command /test:',
            '\ttrigger:',
            '\t\tbroadcast "Testing Skript-Parser logic..."',
        ].join('\n'),
        language: 'skript',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 14,
        fontFamily: 'Fira Code, monospace',
        minimap: { enabled: true }
    });
});

function checkSyntax() {
    const code = editor.getValue();
    // This is where you would call your backend Java API
    console.log("Analyzing Skript code...");
    alert("Syntax analysis started. Check console for output.");
}