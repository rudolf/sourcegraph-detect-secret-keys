import * as sourcegraph from 'sourcegraph';
import { app, CodeEditor, Range, Window } from 'sourcegraph';

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

const QUOTED_STRING_REGEXP = /(["'`])(?:\\?.)*?\1/g // From http://blog.stevenlevithan.com/archives/match-quoted-string

function detectSecrets(line: string):RegExpExecArray[] {
    const secrets: RegExpExecArray[] = [];
    let quoteMatch = QUOTED_STRING_REGEXP.exec(line);

    while (quoteMatch !== null) {
        if (entropy(quoteMatch[0]) > 3) {
            secrets.push(quoteMatch);
        }
        quoteMatch = QUOTED_STRING_REGEXP.exec(line);
    }
    return secrets;
}

async function decorate(editor: CodeEditor): Promise<any> {
    const decorations = editor.document.text
        .split('\n')
        .map((line, lineNumber) => (
            {content: line, lineNumber, secrets: detectSecrets(line)}
        ))
        .filter(line => line.secrets.length > 0)
        .map(({content, lineNumber, secrets}) => ({
            // TODO: Only creates a range for the first secret in a line. Once Sourcegraph supports intra-line ranges this should be updated.
            range: new Range(lineNumber, secrets[0].index!, lineNumber, secrets[0][0].length),
            border: 'solid',
            borderWidth: '0 0 0 10px',
            borderColor: 'red',
            backgroundColor: 'hsla(0,100%,50%, 0.2)',
            after: {
                contentText: '🔐'
            }
        })
    )
    editor.setDecorations(null, decorations);
}

export function activate(ctx: sourcegraph.ExtensionContext): void {

    async function initialize(): Promise<any> {
        const editor = await activeEditor()
        return decorate(editor);
    }

   ctx.subscriptions.add(
       sourcegraph.languages.registerHoverProvider(['*'], {
           provideHover: (doc, pos) => {
               /*
                * If Sourcegraph extensions could highlight sub-ranges it would be nice to only provide a hover tooltip
                * if you're hovering over a secret string.
                */

            //    const isHoveringOverSecret: boolean = detectSecrets(doc.text.split('\n')[pos.line]).length > 0;
            //     .map(secret => {
            //         const secretStartPos = new sourcegraph.Position(pos.line, secret.index);
            //         const secretEndPos = new sourcegraph.Position(pos.line, secret.index + secret[0].length);
            //         return pos.isAfterOrEqual(secretStartPos) && pos.isBeforeOrEqual(secretEndPos);
            //     })
            //     .some(posInSecret => posInSecret);

                // Sourcegraph highlights the entire line that contains a secret, so hovering anywhere on a line that contains 1 or
                // more secrets should explain to a user what the highlight is about.
                const isHoveringOverSecret: boolean = detectSecrets(doc.text.split('\n')[pos.line]).length > 0;

                if (isHoveringOverSecret) {
                    return {contents: {
                        value: '⚠️ 🔐 Line contains high entropy string. Check for sensitive information such as secrets or API keys.',
                        kind: sourcegraph.MarkupKind.Markdown
                    }}
                } else {
                    return null;
                }
           },
        })
    )

    initialize();
}

// Sourcegraph extension documentation: https://docs.sourcegraph.com/extensions/authoring
