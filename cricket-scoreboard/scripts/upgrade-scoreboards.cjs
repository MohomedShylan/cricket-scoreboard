
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'src', 'page');

const specs = [
  ['Scoreboard.js', 'Scoreboard'],
  ['OdiScoreboard.js', 'OdiScoreboard'],
  ['T20Scoreboard.js', 'T20Scoreboard'],
  ['T10Scoreboard.js', 'T10Scoreboard'],
  ['T5Scoreboard.js', 'T5Scoreboard'],
];

for (const [file, component] of specs) {
  const filepath = path.join(root, file);
  let code = fs.readFileSync(filepath, 'utf8');

  if (code.includes('useSavedState(')) {
    console.log(`${file}: already updated`);
    continue;
  }

  const oldImport = "import React, { useState } from 'react';";

  if (!code.includes(oldImport)) {
    throw Error(`Missing import in ${file}`);
  }

  code = code.replace(
    oldImport,
    "import React from 'react';\n" +
    "import { useSavedState } from './useSavedState';"
  );

  const oldSignature = component === 'Scoreboard'
    ? 'export default function Scoreboard({ genZRoster, ogRoster, onBackToSetup }) {'
    : `export default function ${component}() {`;

  const newSignature = component === 'Scoreboard'
    ? 'export default function Scoreboard({ genZRoster, ogRoster, onBackToSetup, initialState = {}, onStateChange }) {'
    : `export default function ${component}({ initialState = {}, onStateChange }) {`;

  if (!code.includes(oldSignature)) {
    throw Error(`Unexpected function signature in ${file}`);
  }

  code = code.replace(oldSignature, newSignature);

  let replaced = 0;

  code = code.replace(
    /^([ \t]*)const \[(\w+),\s*(\w+)\] = useState\((.*)\);([ \t]*)$/gm,
    (whole, indent, name, setter, initial, spaces) => {
      replaced += 1;
      return `${indent}const [${name}, ${setter}] = useSavedState('${name}', ${initial}, initialState, onStateChange);${spaces}`;
    }
  );

  if (replaced < 20) {
    throw Error(`Found only ${replaced} state fields in ${file}`);
  }

  fs.writeFileSync(filepath, code);
  console.log(`${file}: updated ${replaced} state fields`);
}
