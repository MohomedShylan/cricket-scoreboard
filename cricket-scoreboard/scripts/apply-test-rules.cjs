
const fs = require('fs');
const path = require('path');

const adminFile = path.resolve('src/page/Scoreboard.js');
const viewerFile = path.resolve('src/page/PublicScoreboard.js');
const cssFile = path.resolve('src/page/Scoreboard.css');

function replaceOnce(text, oldValue, newValue, name) {
  const count = text.split(oldValue).length - 1;

  if (count !== 1) {
    throw Error(
      `${name}: expected 1 match, found ${count}. No files changed.`
    );
  }

  return text.replace(oldValue, newValue);
}

function replaceMany(text, oldValue, newValue, expected, name) {
  const count = text.split(oldValue).length - 1;

  if (count !== expected) {
    throw Error(
      `${name}: expected ${expected}, found ${count}. No files changed.`
    );
  }

  return text.split(oldValue).join(newValue);
}

let admin = fs.readFileSync(adminFile, 'utf8')
  .replace(/\r\n/g, '\n');

let viewer = fs.readFileSync(viewerFile, 'utf8')
  .replace(/\r\n/g, '\n');

let css = fs.readFileSync(cssFile, 'utf8')
  .replace(/\r\n/g, '\n');

if (admin.includes('const TEST_MAX_BALLS =')) {
  console.log('Rules already installed; no changes made.');
  process.exit(0);
}

// 1. Set new Test match limits
admin = replaceOnce(
  admin,
  "  OG: 'Original Gangsters',\n};",
  [
    "  OG: 'Original Gangsters',",
    '};',
    '',
    '// Custom Test match rules',
    'const TEST_OVERS = 30;',
    'const TEST_MAX_BALLS = TEST_OVERS * 6;',
    'const MAX_SIX_OVER_BOWLERS = 3;',
    'const SIX_OVER_LIMIT = 36;',
    'const OTHER_BOWLER_LIMIT = 30;'
  ].join('\n'),
  'Test constants'
);

// 2. Add bowling restrictions and validation
admin = replaceOnce(
  admin,
  '  const allPlayersData = [...liveGenZRoster, ...liveOgRoster];',
  [
    '  const allPlayersData = [...liveGenZRoster, ...liveOgRoster];',
    '',
    '  // The first three bowlers to deliver a 31st legal ball',
    '  // claim one of the three six-over slots.',
    '  // Derived from saved stats so undo/reset work automatically.',
    '  const sixOverBowlers = Object.entries(bowlerStats)',
    '    .filter(([, stats]) => Number(stats?.balls || 0) > OTHER_BOWLER_LIMIT)',
    '    .map(([name]) => name);',
    '',
    '  const bowlerBallLimit = (name) =>',
    '    sixOverBowlers.includes(name) ||',
    '    sixOverBowlers.length < MAX_SIX_OVER_BOWLERS',
    '      ? SIX_OVER_LIMIT',
    '      : OTHER_BOWLER_LIMIT;',
    '',
    '  const canUseBowler = (name) =>',
    '    Boolean(name) &&',
    '    Number(bowlerStats[name]?.balls || 0) < bowlerBallLimit(name);',
    '',
    '  const canScoreDelivery = () => {',
    '    if (balls >= TEST_MAX_BALLS) {',
    "      alert('30 overs completed. End the innings before scoring again.');",
    '      return false;',
    '    }',
    '',
    '    if (wickets >= 12) {',
    "      alert('All 12 wickets have fallen. End the innings.');",
    '      return false;',
    '    }',
    '',
    '    if (bowler && !canUseBowler(bowler)) {',
    '      alert(`${bowler} has reached the permitted ${bowlerBallLimit(bowler) / 6}-over limit. Select another bowler.`);',
    '      return false;',
    '    }',
    '',
    '    return true;',
    '  };'
  ].join('\n'),
  'Bowling validation helpers'
);

// 3. Validate all five scoring actions
for (const handler of [
  'addRuns',
  'addWide',
  'addNoBall',
  'addRunOut',
  'addWicket'
]) {
  const signature = new RegExp(
    `(  const ${handler} = \\([^\\n]*\\) => \\{\\n)`
  );

  if (!signature.test(admin)) {
    throw Error(
      `Missing scoring function: ${handler}. No files changed.`
    );
  }

  admin = admin.replace(
    signature,
    '$1    if (!canScoreDelivery()) return;\n'
  );
}

// 4. Replace 35-over checks with 30-over checks
admin = replaceMany(
  admin,
  'newBalls >= 35 * 6',
  'newBalls >= TEST_MAX_BALLS',
  3,
  'Overs checks'
);

admin = replaceMany(
  admin,
  '35 Overs Completed',
  '30 Overs Completed',
  3,
  'Overs alerts'
);

// 5. Update bowler selection options
const oldBowlerOptions = `                      {bowlingRoster.map(p => {
                        const maxReached = (bowlerStats[p.name]?.balls || 0) >= 42; 
                        return <option key={p.name} value={p.name} disabled={maxReached}>{p.name} {maxReached ? '(Max 7 Overs)' : ''}</option>
                      })}`;

const newBowlerOptions = `                      {bowlingRoster.map(p => {
                        const used = Number(bowlerStats[p.name]?.balls || 0);
                        const limit = bowlerBallLimit(p.name);
                        const maxReached = !canUseBowler(p.name);

                        return (
                          <option
                            key={p.name}
                            value={p.name}
                            disabled={maxReached}
                          >
                            {p.name} ({formatOvers(used)} / {formatOvers(limit)})
                            {maxReached ? ' - Limit Reached' : ''}
                          </option>
                        );
                      })}`;

admin = replaceOnce(
  admin,
  oldBowlerOptions,
  newBowlerOptions,
  'Bowler options'
);

// 6. Display bowling limits below dropdown
admin = replaceOnce(
  admin,
  `                      })}
                    </select>
                  </div>
                </div>
              </div>

              <hr className="divider" />`,
  `                      })}
                    </select>

                    <p className="bowler-limit-info">
                      Six-over bowlers: {sixOverBowlers.length} / 3
                      {' '}· Other bowlers: maximum 5 overs
                    </p>
                  </div>
                </div>
              </div>

              <hr className="divider" />`,
  'Bowler status message'
);

// 7. Update admin scoreboard overs display
admin = replaceOnce(
  admin,
  'Overs: <span>{formatOvers(balls)}</span> <span className="target-text">(Target: 35)</span>',
  'Overs: <span>{formatOvers(balls)}</span> <span className="target-text">/ {TEST_OVERS} overs</span>',
  'Admin overs display'
);

// 8. Update public viewer Test format
viewer = replaceOnce(
  viewer,
  '  Test: 35,',
  '  Test: 30,',
  'Public overs display'
);

// 9. Add CSS for bowling limit information
if (!css.includes('.bowler-limit-info')) {
  css += `
/* Custom Test bowling limits */
.bowler-limit-info {
  margin: 3px 0 10px;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
}
`;
}

// 10. Save updated source files
// All replacement checks have passed before writing.
fs.writeFileSync(adminFile, admin);
fs.writeFileSync(viewerFile, viewer);
fs.writeFileSync(cssFile, css);

console.log('Updated Scoreboard.js');
console.log('Updated PublicScoreboard.js');
console.log('Updated Scoreboard.css');
console.log('Test match rules updated successfully.');
console.log('Next: npm run build');
