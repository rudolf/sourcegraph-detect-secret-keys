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

export function detectSecrets(line: string):RegExpExecArray[] {
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
