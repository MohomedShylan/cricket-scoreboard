
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Navigation from './Navigation';
import { GENZ_PLAYERS } from '../genZData';
import { OG_PLAYERS } from '../ogData';
import './PublicViewer.css';
import './Scoreboard.css';

const FORMAT_OVERS = {
  Test: 30,
  ODI: 50,
  T20: 20,
  T10: 10,
  '5 Over': 5
};

const TEST_TEAMS = [
  'Ambanpola Vikings',
  'Ambanpola Shadows'
];

const oversText = balls => {
  const count = Number(balls) || 0;
  return `${Math.floor(count / 6)}.${count % 6}`;
};

const rate = (runs, balls) =>
  Number(balls) > 0
    ? ((Number(runs || 0) * 6) / Number(balls)).toFixed(2)
    : '0.00';

const strikeRate = (runs, balls) =>
  Number(balls) > 0
    ? ((Number(runs || 0) * 100) / Number(balls)).toFixed(2)
    : '0.00';

const initials = name =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();

function Avatar({ name, images }) {
  const image = images[name?.trim()];

  return image ? (
    <img
      className="fx-avatar"
      src={image}
      alt=""
      loading="lazy"
    />
  ) : (
    <span className="fx-avatar fx-avatar-text" aria-hidden="true">
      {initials(name)}
    </span>
  );
}

function Ball({ value }) {
  const label = String(value);

  const wicket = label.startsWith('W');
  const boundary = label === '4' || label === '6';
  const extra = label.includes('wd') || label.includes('nb');

  const type = wicket
    ? 'wicket'
    : boundary
    ? 'boundary'
    : extra
    ? 'extra'
    : label === '0'
    ? 'dot'
    : '';

  return (
    <span
      className={`fx-ball ${type}`}
      title={`Delivery: ${label}`}
    >
      {label}
    </span>
  );
}

function ScoreTable({ inning, images }) {
  const batting = Object.entries(inning.batterStats || {});
  const bowling = Object.entries(inning.bowlerStats || {});

  return (
    <div className="fx-tables">
      <section className="fx-card fx-table-card">
        <div className="fx-section-heading">
          <div>
            <span className="fx-eyebrow">BATTING</span>
            <h3>Batting scorecard</h3>
          </div>
          <span className="fx-soft-tag">
            {batting.length} batters
          </span>
        </div>

        <div className="fx-table-scroll">
          <table className="fx-table">
            <thead>
              <tr>
                <th>BATTER</th>
                <th>R</th>
                <th>B</th>
                <th>4s</th>
                <th>6s</th>
                <th>SR</th>
              </tr>
            </thead>

            <tbody>
              {batting.map(([name, stats]) => (
                <tr key={name}>
                  <td>
                    <div className="fx-person">
                      <Avatar name={name} images={images} />
                      <div>
                        <strong>{name}</strong>
                        <small>
                          {stats.isOut
                            ? stats.outBowler === 'Run Out'
                              ? 'Run out'
                              : `b ${stats.outBowler || '—'}`
                            : 'Not out'}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td className="fx-emphasis">{stats.runs ?? 0}</td>
                  <td>{stats.balls ?? 0}</td>
                  <td>{stats.fours ?? 0}</td>
                  <td>{stats.sixes ?? 0}</td>
                  <td>{strikeRate(stats.runs, stats.balls)}</td>
                </tr>
              ))}

              {!batting.length && (
                <tr>
                  <td className="fx-empty-cell" colSpan="6">
                    No batting statistics yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="fx-table-footer">
          <span>Extras</span>
          <strong>{inning.extras ?? 0}</strong>
          <span>Total</span>
          <strong>
            {inning.runs ?? 0}/{inning.wickets ?? 0}
          </strong>
        </div>
      </section>

      <section className="fx-card fx-table-card">
        <div className="fx-section-heading">
          <div>
            <span className="fx-eyebrow">BOWLING</span>
            <h3>Bowling figures</h3>
          </div>
          <span className="fx-soft-tag">
            {bowling.length} bowlers
          </span>
        </div>

        <div className="fx-table-scroll">
          <table className="fx-table">
            <thead>
              <tr>
                <th>BOWLER</th>
                <th>O</th>
                <th>R</th>
                <th>W</th>
                <th>ECON</th>
              </tr>
            </thead>

            <tbody>
              {bowling.map(([name, stats]) => (
                <tr key={name}>
                  <td>
                    <div className="fx-person">
                      <Avatar name={name} images={images} />
                      <strong>{name}</strong>
                    </div>
                  </td>
                  <td>{oversText(stats.balls)}</td>
                  <td>{stats.runs ?? 0}</td>
                  <td className="fx-emphasis">
                    {stats.wickets ?? 0}
                  </td>
                  <td>{rate(stats.runs, stats.balls)}</td>
                </tr>
              ))}

              {!bowling.length && (
                <tr>
                  <td className="fx-empty-cell" colSpan="5">
                    No bowling statistics yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const getViewerBallClass = (event) => {
  const value = String(event);

  if (value === 'W' || value.startsWith('W+')) {
    return 'ball-event ball-w';
  }

  if (value === '4' || value === '6') {
    return 'ball-event ball-boundary';
  }

  if (value.includes('wd') || value.includes('nb')) {
    return 'ball-event ball-extra';
  }

  if (value === '0') {
    return 'ball-event ball-dot';
  }

  return 'ball-event';
};

function LiveMatch({ format }) {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [selectedInning, setSelectedInning] =
    useState('current');

  const acceptMatch = useCallback(row => {
    if (!row || row.format !== format) return;

    setMatch(previous =>
      !previous ||
      Date.parse(row.updated_at) >=
        Date.parse(previous.updated_at)
        ? row
        : previous
    );
  }, [format]);

  const refresh = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);

    const { data, error: queryError } = await supabase
      .from('scoreboard_matches')
      .select('format, state, updated_at')
      .eq('format', format)
      .maybeSingle();

    if (queryError) {
      setError(queryError.message);
    } else {
      setError('');
      if (data) acceptMatch(data);
    }

    setLoading(false);
    if (manual) setRefreshing(false);
  }, [acceptMatch, format]);

  useEffect(() => {
    let active = true;

    const channel = supabase
      .channel(`fx-public-${format}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scoreboard_matches'
        },
        payload => {
          if (active && payload.new) {
            acceptMatch(payload.new);
          }
        }
      )
      .subscribe(status => {
        if (active) {
          setConnected(status === 'SUBSCRIBED');
        }
      });

    void refresh();

    const polling = setInterval(() => {
      if (active) void refresh();
    }, 15000);

    return () => {
      active = false;
      clearInterval(polling);
      void supabase.removeChannel(channel);
    };
  }, [format, acceptMatch, refresh]);

  const s = match?.state || {};

  const inningsHistory = Array.isArray(s.inningsHistory)
    ? s.inningsHistory
    : [];

  const maxInnings = format === 'Test' ? 4 : 2;
  const matchFinished = inningsHistory.length >= maxInnings;

  const teamNames = format === 'Test'
    ? TEST_TEAMS
    : [s.team1Name, s.team2Name].filter(Boolean);

  const teamReady = format === 'Test'
    ? Boolean(s.battingTeam)
    : Boolean(s.teamsLocked && teamNames.length === 2);

  const balls = Number(s.balls || 0);
 

  const firstInnings = inningsHistory.find(
    item => Number(item.innings) === 1
  );

  const isChase =
    format !== 'Test' &&
    Number(s.currentInnings) === 2 &&
    Boolean(firstInnings);

  const target = isChase
    ? Number(firstInnings.runs) + 1
    : null;

  

  const images = useMemo(() => {
    const players = [
      ...GENZ_PLAYERS,
      ...OG_PLAYERS,
      ...(s.liveGenZRoster || []),
      ...(s.liveOgRoster || []),
      ...(s.roster1 || []),
      ...(s.roster2 || [])
    ];

    return Object.fromEntries(
      players
        .filter(p => p?.name && p.image)
        .map(p => [p.name.trim(), p.image])
    );
  }, [
    s.liveGenZRoster,
    s.liveOgRoster,
    s.roster1,
    s.roster2
  ]);

  const current = {
    team: s.battingTeam,
    innings: s.currentInnings,
    runs: s.runs || 0,
    wickets: s.wickets || 0,
    balls,
    extras: s.extras || 0,
    batterStats: s.batterStats || {},
    bowlerStats: s.bowlerStats || {}
  };


  const scorecard = selectedInning === 'current'
    ? (
        matchFinished
          ? inningsHistory[inningsHistory.length - 1]
          : current
      )
    : (
        inningsHistory[Number(selectedInning)] || current
      );

  const result = (() => {
    if (!matchFinished) return null;

    if (format === 'Test') {
      return 'All four innings have been recorded';
    }

    const first = inningsHistory.find(
      item => Number(item.innings) === 1
    );

    const second = inningsHistory.find(
      item => Number(item.innings) === 2
    );

    if (!first || !second) return 'Match completed';

    if (Number(first.runs) === Number(second.runs)) {
      return 'Scores tied';
    }

    return Number(first.runs) > Number(second.runs)
      ? `${first.team} finished ${
          Number(first.runs) - Number(second.runs)
        } runs ahead`
      : `${second.team} reached the target`;
  })();

  if (loading && !match) {
    return (
      <div className="fx-notice" role="status">
        Loading the {format} scoreboard…
      </div>
    );
  }

  if (!match || !teamReady) {
    return (
      <div className="fx-notice">
        <h2>{format} scoreboard</h2>
        <p>
          {error ||
            'The match has not been published by an admin yet.'}
        </p>
        <button
          className="fx-button"
          onClick={() => void refresh(true)}
          disabled={refreshing}
        >
          {refreshing ? 'Checking…' : 'Check again'}
        </button>
      </div>
    );
  }

  return (
    <main className="fx-page">
      <div className="fx-container">

        {/* PAGE HEADER */}
        <header className="fx-topbar">
          <div>
            <div className="fx-eyebrow">
              AMBANPOLA FOXELEVEN · {format.toUpperCase()}
            </div>
            <h1>Match centre</h1>
            <p>Live scores and player performance</p>
          </div>

          <div className="fx-top-actions">
            <span className={`fx-connection ${
              connected ? 'online' : 'polling'
            }`}>
              <span className="fx-connection-dot" />
              {connected
                ? 'Realtime connected'
                : 'Refreshing periodically'}
            </span>

            <button
              type="button"
              className="fx-button fx-refresh"
              onClick={() => void refresh(true)}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing…' : '↻ Refresh'}
            </button>
          </div>
        </header>

        {error && (
          <p className="fx-alert" role="alert">
            Unable to check for new scores: {error}.
            Last received scores are displayed.
          </p>
        )}

       
{/* LIVE SCOREBOARD - REFERENCE DESIGN */}
<section
  className="digital-board fx-viewer-board"
  aria-label="Live cricket scoreboard"
>
  {/* Innings Number */}
  <div className="digital-innings">
    Innings {s.currentInnings || 1} / {maxInnings}
  </div>

  {/* Batting Team */}
  <h2 className="digital-title">
    {s.battingTeam || 'Team'} Batting
  </h2>

  {/* Main Score */}
  <div className="digital-score" aria-live="polite">
    {s.runs ?? 0}
    <span className="digital-wickets">
      {' '}/ {s.wickets ?? 0}
    </span>
  </div>

  {/* Overs and Target */}
  <div className="digital-overs">
    Overs:{' '}
    <span>{oversText(s.balls)}</span>

    <span className="target-text">
      {' '}
      {isChase && target !== null
        ? `(Target: ${target})`
        : `(Limit: ${FORMAT_OVERS[format]} overs)`}
    </span>
  </div>

  {/* BATTERS AND BOWLER */}
  <div className="live-players-row">

    {/* Batters */}
    <div className="player-box batters">

      {/* Striker */}
      <div className="live-batter-row">
        <div className="live-player-info">
          <Avatar
            name={s.striker || '?'}
            images={images}
          />

          <div className="live-player-name">
            {s.striker || 'Not Selected'}
            <span className="striker-star">
              {' '}*
            </span>
          </div>
        </div>

        <div className="live-score-large">
          {(s.batterStats || {})[s.striker]?.runs ?? 0}
          {' '}
          <span className="live-balls">
            ({(s.batterStats || {})[s.striker]?.balls ?? 0})
          </span>
        </div>
      </div>

      {/* Non-Striker */}
      <div className="live-batter-ns">
        <div className="live-player-info">
          <Avatar
            name={s.nonStriker || '?'}
            images={images}
          />

          <div className="live-player-name-ns">
            {s.nonStriker || 'Not Selected'}
          </div>
        </div>

        <div className="live-score-medium">
          {(s.batterStats || {})[s.nonStriker]?.runs ?? 0}
          {' '}
          <span className="live-balls-ns">
            ({(s.batterStats || {})[s.nonStriker]?.balls ?? 0})
          </span>
        </div>
      </div>
    </div>

    {/* Bowler */}
    <div className="player-box bowler">
      <div className="live-bowler-row">
        <div className="live-bowler-name">
          {s.bowler || 'Not Selected'}
        </div>

        <Avatar
          name={s.bowler || '?'}
          images={images}
        />
      </div>

      <div className="live-bowler-stats">
        Ov:{' '}
        <strong>
          {oversText(
            (s.bowlerStats || {})[s.bowler]?.balls
          )}
        </strong>

        {' '}| R:{' '}
        <strong>
          {(s.bowlerStats || {})[s.bowler]?.runs ?? 0}
        </strong>
      </div>

      <div className="live-bowler-wickets">
        Wickets:{' '}
        <strong>
          {(s.bowlerStats || {})[s.bowler]?.wickets ?? 0}
        </strong>
      </div>
    </div>
  </div>

  {/* THIS OVER */}
  <div className="this-over-container">
    <span className="this-over-label">
      THIS OVER:
    </span>

    <div className="this-over-balls">
      {(s.currentOverDetails || []).length === 0 ? (
        <span className="this-over-empty">
          ...
        </span>
      ) : (
        s.currentOverDetails.map((event, index) => (
          <span
            key={`${index}-${event}`}
            className={getViewerBallClass(event)}
          >
            {event}
          </span>
        ))
      )}
    </div>
  </div>

  {/* EXTRAS */}
  <div className="digital-extras">
    Extras:
    <strong className="digital-extras-val">
      {s.extras ?? 0}
    </strong>
  </div>

  {/* Match Result, When Available */}
  {matchFinished && result && (
    <div className="fx-viewer-result">
      {result}
    </div>
  )}
</section>


        {/* ACTIVE PLAYER CARDS */}
        <div className="fx-match-grid">
          <section className="fx-card fx-current-card">
            <div className="fx-section-heading">
              <div>
                <span className="fx-eyebrow">AT THE CREASE</span>
                <h3>Current batters</h3>
              </div>
              <span className="fx-soft-tag">Batting</span>
            </div>

            {[
              ['Striker', s.striker, true],
              ['Non-striker', s.nonStriker, false]
            ].map(([role, name, onStrike]) => {
              const stats = (s.batterStats || {})[name] || {};

              return (
                <div className="fx-active-row" key={role}>
                  <Avatar
                    name={name || role}
                    images={images}
                  />

                  <div className="fx-active-name">
                    <strong>
                      {name || 'Not selected'}
                      {onStrike && name ? ' *' : ''}
                    </strong>
                    <small>{role}</small>
                  </div>

                  <div className="fx-active-score">
                    <strong>
                      {stats.runs ?? 0}{' '}
                      <span>({stats.balls ?? 0})</span>
                    </strong>
                    <small>
                      SR {strikeRate(stats.runs, stats.balls)}
                    </small>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="fx-card fx-current-card">
            <div className="fx-section-heading">
              <div>
                <span className="fx-eyebrow">ON THE FIELD</span>
                <h3>Current bowler</h3>
              </div>
              <span className="fx-soft-tag">Bowling</span>
            </div>

            <div className="fx-active-row fx-bowler-row">
              <Avatar
                name={s.bowler || 'Bowler'}
                images={images}
              />

              <div className="fx-active-name">
                <strong>
                  {s.bowler || 'Not selected'}
                </strong>
                <small>Bowler</small>
              </div>

              <div className="fx-active-score">
                <strong>
                  {(s.bowlerStats || {})[s.bowler]?.wickets ?? 0}
                  /
                  {(s.bowlerStats || {})[s.bowler]?.runs ?? 0}
                </strong>

                <small>
                  {oversText(
                    (s.bowlerStats || {})[s.bowler]?.balls
                  )} overs
                </small>
              </div>
            </div>

            <div className="fx-bowler-summary">
              Economy
              <strong>
                {rate(
                  (s.bowlerStats || {})[s.bowler]?.runs,
                  (s.bowlerStats || {})[s.bowler]?.balls
                )}
              </strong>
            </div>
          </section>
        </div>

        {/* CURRENT OVER EVENTS */}
        <section className="fx-card fx-over-card">
          <div className="fx-section-heading">
            <div>
              <span className="fx-eyebrow">BALL BY BALL</span>
              <h3>
                {s.isOverComplete
                  ? 'Last completed over'
                  : 'Current over'}
              </h3>
            </div>
            <span className="fx-soft-tag">
              {oversText(balls)} ov
            </span>
          </div>

          <div
            className="fx-balls"
            aria-label="Recent delivery outcomes"
          >
            {Array.isArray(s.currentOverDetails) &&
            s.currentOverDetails.length
              ? s.currentOverDetails.map((ball, index) => (
                  <Ball
                    key={`${index}-${ball}`}
                    value={ball}
                  />
                ))
              : (
                  <span className="fx-muted">
                    No deliveries recorded in this over yet.
                  </span>
                )}
          </div>

          <p className="fx-legend">
            <span>●</span> W = Wicket
            <span>●</span> 4 / 6 = Boundary
            <span>●</span> wd / nb = Extra
          </p>
        </section>

        {/* INNINGS SCORECARDS */}
        <section
          className="fx-scorecards"
          aria-label="Detailed scorecards"
        >
          <div className="fx-scorecard-title">
            <div>
              <span className="fx-eyebrow">
                MATCH STATISTICS
              </span>
              <h2>Scorecards</h2>
            </div>

            <span className="fx-muted">
              Select an innings to view its statistics
            </span>
          </div>

          <div
            className="fx-innings-tabs"
            role="tablist"
            aria-label="Innings scorecards"
          >
            {!matchFinished && (
              <button
                type="button"
                role="tab"
                aria-selected={selectedInning === 'current'}
                className={
                  selectedInning === 'current'
                    ? 'selected'
                    : ''
                }
                onClick={() => setSelectedInning('current')}
              >
                Current innings
              </button>
            )}

            {inningsHistory.map((inn, index) => {
              const isSelected =
                selectedInning === String(index) ||
                (
                  matchFinished &&
                  selectedInning === 'current' &&
                  index === inningsHistory.length - 1
                );

              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  key={`${inn.innings}-${index}`}
                  className={isSelected ? 'selected' : ''}
                  onClick={() =>
                    setSelectedInning(String(index))
                  }
                >
                  Innings {inn.innings} · {inn.team}
                </button>
              );
            })}
          </div>

          <div className="fx-selected-inning">
            <span>
              {scorecard.team || 'Current innings'}
            </span>

            <strong>
              {scorecard.runs ?? 0}/{scorecard.wickets ?? 0}
              {' '}
              <small>
                ({scorecard.overs ||
                  oversText(scorecard.balls)} overs)
              </small>
            </strong>
          </div>

          <ScoreTable
            inning={scorecard}
            images={images}
          />
        </section>

        <footer className="fx-footer">
          <span>
            Updated{' '}
            {new Date(match.updated_at).toLocaleString()}
          </span>
          <span>
            Scores are entered by the match administrator.
          </span>
        </footer>

      </div>
    </main>
  );
}

export default function PublicScoreboard() {
  const [format, setFormat] = useState('Test');

  return (
    <>
      <Navigation
        activeFormat={format}
        setActiveFormat={setFormat}
      />

      <div className="fx-public-strip">
        <span>FOXELEVEN / LIVE CRICKET</span>
        <Link to="/admin">Admin login ↗</Link>
      </div>

      <LiveMatch key={format} format={format} />
    </>
  );
}
