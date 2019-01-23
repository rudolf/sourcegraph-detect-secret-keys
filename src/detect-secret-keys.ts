import * as sourcegraph from 'sourcegraph';
import { app, CodeEditor, Range, Window } from 'sourcegraph'

async function sleep(milliseconds: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, milliseconds))
}

async function activeWindow(): Promise<Window> {
    let retries = 5

    const getActiveWindow = async (): Promise<Window> => {
        if (retries-- === 0) {
            throw new Error('Could not activate: no active window')
        }
        const window: Window | null  = app.activeWindow ? app.activeWindow : null
        if (window) {
            return window
        } else {
            await sleep(500)
            return await getActiveWindow()
        }
    }

    return getActiveWindow()
}

async function activeEditor(): Promise<CodeEditor> {
    const window = await activeWindow()
    return window.visibleViewComponents[0]
}

function entropy(str: string): number {
    const acc:{ [index:string] : number } = {};
    const charMap = str.split('').reduce((acc, val) => {
        acc[val] ? acc[val]++ : (acc[val] = 1)
        return acc;
    }, acc);

  const entropy = Object.keys(charMap).reduce((acc, c) => {
    const p = charMap[c] / str.length;
    return acc - (p * (Math.log(p) / Math.log(2)));
  }, 0);

  return entropy;
}

const QUOTED_STRING_REGEXP = /(["'])(?:\\?.)*?\1/ // From http://blog.stevenlevithan.com/archives/match-quoted-string

async function decorate(editor: CodeEditor): Promise<any> {
    const decorations = editor.document.text
        .split('\n')
        .map((line, lineNumber) => {
            const secrets = [];
            let quoteMatch = QUOTED_STRING_REGEXP.exec(line);
            while (quoteMatch !== null) {
                if (entropy(quoteMatch[0]) > 3) {
                    secrets.push(quoteMatch);
                }
                quoteMatch = QUOTED_STRING_REGEXP.exec(line);
            }

            return {content: line, lineNumber, secrets};
        })
        .filter(line => line.secrets.length > 0)
        .map(({content, lineNumber, secrets}) => ({
            // TODO: Highlights the whole line even when the start and end character doesn't contain the whole line
            // TODO: Only creates range for first secret in a line
            range: new Range(lineNumber, secrets[0].index!, lineNumber, secrets[0][0].length), // -1 because lines are 0 indexed
            border: 'solid',
            borderWidth: '0 0 0 10px',
            borderColor: 'red',
            backgroundColor: 'hsla(0,100%,50%, 0.2)',
            after: {
                contentText: '🔐 High entropy string, might contain secrets.'
            }
        })
    )
    editor.setDecorations(null, decorations);
}

export function activate(ctx: sourcegraph.ExtensionContext): void {

    async function initialize(): Promise<any> {
        const editor = await activeEditor()

        //await initializeSettings()

        //if(configuration.get<Settings>().get('dockerfilelint.enabled')) {
        //   debugger
        return decorate(editor);
        //}
    }

//    ctx.subscriptions.add(
//        sourcegraph.languages.registerHoverProvider(['*'], {
//            provideHover: (doc, pos) => ({
//                contents: {
//                    value: 'Hello world from detect-secret-keys! 🎉🎉🎉',
//                    kind: sourcegraph.MarkupKind.Markdown
//                }
//            }),
//         })
//     )

    initialize();
}

// Sourcegraph extension documentation: https://docs.sourcegraph.com/extensions/authoring
