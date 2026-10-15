
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Navigation from './Navigation';
import { GENZ_PLAYERS } from '../genZData';
import { OG_PLAYERS } from '../ogData';
import './Scoreboard.css';
import './LiveScoreboard.css';

const formatOvers = balls =>
  `${Math.floor((balls || 0) / 6)}.${(balls || 0) % 6}`;

const percentage = (numerator, denominator) =>
  denominator
    ? ((numerator / denominator) * 100).toFixed(2)
    : '0.00';

const economy = (runs, balls) =>
  balls ? ((runs / balls) * 6).toFixed(2) : '0.00';

const limits = {
  Test: 35,
  ODI: 50,
  T20: 20,
  T10: 10,
  '5 Over': 5
};

function LiveScore({ format }) {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    setMatch(null);
    setLoading(true);
    setError('');

    function acceptRow(row) {
      if (!active || !row || row.format !== format) return;

      setMatch(previous => {
        if (
          !previous ||
          Date.parse(row.updated_at) >=
          Date.parse(previous.updated_at)
        ) {
          return row;
        }

        return previous;
      });
    }

    async function refresh() {
      const { data, error: fetchError } = await supabase
        .from('scoreboard_matches')
        .select('format, state, updated_at')
        .eq('format', format)
        .maybeSingle();

      if (!active) return;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setError('');
        if (data) acceptRow(data);
      }

      setLoading(false);
    }

    const channel = supabase
      .channel(`public-score-${format}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scoreboard_matches'
        },
        payload => {
          if (payload.new) acceptRow(payload.new);
        }
      )
      .subscribe();

    void refresh();

    // Fallback if a Realtime event is missed.
    const polling = setInterval(
      () => void refresh(),
      15000
    );

    return () => {
      active = false;
      clearInterval(polling);
      void supabase.removeChannel(channel);
    };
  }, [format]);

  if (loading) {
    return <p className="score-message">Loading live scores…</p>;
  }

  if (!match) {
    return (
      <p className="score-message" role="status">
        {error || `No ${format} match has been published yet.`}
      </p>
    );
  }

  const s = match.state || {};
  const batting = s.batterStats || {};
  const bowling = s.bowlerStats || {};
  const innings = s.inningsHistory || [];

  const allPlayers = [
    ...(s.liveGenZRoster || GENZ_PLAYERS),
    ...(s.liveOgRoster || OG_PLAYERS),
    ...(s.roster1 || []),
    ...(s.roster2 || [])
  ];

  const avatar = name => {
    const image = allPlayers.find(p => p.name === name)?.image;

    return image ||
      `https://ui-avatars.com/api/?name=${
        encodeURIComponent(name || 'Player')
      }&background=cbd5e1&color=1e293b`;
  };

  const maxInnings = format === 'Test' ? 4 : 2;
  const finished = innings.length >= maxInnings;
  const battingTeam = s.battingTeam || '';

  const team1 =
    format === 'Test' ? 'GenZ Strikers' : s.team1Name;

  const team2 =
    format === 'Test' ? 'Original Gangsters' : s.team2Name;

  const ready = format === 'Test' || s.teamsLocked;

  if (!ready) {
    return (
      <p className="score-message">
        The {format} match is being set up.
        Check back shortly.
      </p>
    );
  }

  return (
    <main className="scoreboard-container score-viewer">
      <div className="scoreboard-wrapper">

        <div className="score-viewer-top">
          <div>
            <span className="score-live-label">
              {finished
                ? 'MATCH COMPLETE'
                : '● LIVE SCOREBOARD'}
            </span>

            <h1>{team1} vs {team2}</h1>

            <p>
              {format} • Innings {s.currentInnings || 1}
              {' '}of {maxInnings}
            </p>
          </div>

          <div className="score-updated">
            Last updated{' '}
            {new Date(match.updated_at).toLocaleTimeString()}
          </div>
        </div>

        {error && (
          <p role="alert" className="score-error">
            Connection issue: {error}
          </p>
        )}

        <div className="digital-board score-public-hero">
          <h2 className="digital-title">
            {battingTeam} Batting
          </h2>

          <div className="digital-score">
            {s.runs || 0}{' '}
            <span className="digital-wickets">
              / {s.wickets || 0}
            </span>
          </div>

          <div className="digital-overs">
            Overs{' '}
            <span>{formatOvers(s.balls)}</span>
            {' '}/ {limits[format]}

            <span className="score-extras">
              Extras: {s.extras || 0}
            </span>
          </div>

          <div className="score-active-players">
            <div>
              <strong>
                {s.striker || 'Striker not selected'} *
              </strong>

              <span>
                {batting[s.striker]?.runs || 0}
                {' '}({batting[s.striker]?.balls || 0})
              </span>
            </div>

            <div>
              <strong>
                {s.nonStriker || 'Non-striker not selected'}
              </strong>

              <span>
                {batting[s.nonStriker]?.runs || 0}
                {' '}({batting[s.nonStriker]?.balls || 0})
              </span>
            </div>

            <div>
              <strong>
                {s.bowler || 'Bowler not selected'}
              </strong>

              <span>
                {bowling[s.bowler]?.wickets || 0}
                {' '}/ {bowling[s.bowler]?.runs || 0}
                {' '}({formatOvers(bowling[s.bowler]?.balls)})
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Current over</h3>

          <div className="score-events">
            {(s.currentOverDetails || []).length
              ? s.currentOverDetails.map((event, index) => (
                  <span key={index} className="score-event">
                    {event}
                  </span>
                ))
              : <span>No deliveries recorded in this over.</span>
            }
          </div>
        </div>

        <div className="row-flex">
          <div className="card col-500">
            <h3 className="card-title">
              🏏 Batting Scorecard
            </h3>

            <div className="table-responsive">
              <table className="score-table">
                <thead>
                  <tr>
                    <th>Batter</th>
                    <th>R</th>
                    <th>B</th>
                    <th>4s</th>
                    <th>6s</th>
                    <th>SR</th>
                  </tr>
                </thead>

                <tbody>
                  {Object.entries(batting).map(
                    ([name, stats]) => (
                      <tr key={name}>
                        <td>
                          <div className="score-player-name">
                            <img src={avatar(name)} alt="" />

                            <div>
                              <strong>{name}</strong>
                              <small>
                                {stats.isOut
                                  ? stats.outBowler === 'Run Out'
                                    ? 'Run Out'
                                    : `b ${stats.outBowler}`
                                  : 'not out'}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>{stats.runs || 0}</td>
                        <td>{stats.balls || 0}</td>
                        <td>{stats.fours || 0}</td>
                        <td>{stats.sixes || 0}</td>

                        <td>
                          {percentage(
                            stats.runs || 0,
                            stats.balls || 0
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>

              {!Object.keys(batting).length && (
                <p>Batting has not started.</p>
              )}
            </div>
          </div>

          <div className="card col-500">
            <h3 className="card-title">
              🥎 Bowling Scorecard
            </h3>

            <div className="table-responsive">
              <table className="score-table">
                <thead>
                  <tr>
                    <th>Bowler</th>
                    <th>O</th>
                    <th>R</th>
                    <th>W</th>
                    <th>Econ</th>
                  </tr>
                </thead>

                <tbody>
                  {Object.entries(bowling).map(
                    ([name, stats]) => (
                      <tr key={name}>
                        <td>
                          <div className="score-player-name">
                            <img src={avatar(name)} alt="" />
                            <strong>{name}</strong>
                          </div>
                        </td>

                        <td>{formatOvers(stats.balls)}</td>
                        <td>{stats.runs || 0}</td>
                        <td>{stats.wickets || 0}</td>

                        <td>
                          {economy(stats.runs, stats.balls)}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>

              {!Object.keys(bowling).length && (
                <p>Bowling has not started.</p>
              )}
            </div>
          </div>
        </div>

        {innings.length > 0 && (
          <div className="card">
            <h3 className="card-title">
              Completed Innings
            </h3>

            <div className="score-history-list">
              {innings.map((inn, index) => (
                <details key={index}>
                  <summary>
                    Innings {inn.innings}: {inn.team}
                    {' '}— {inn.runs}/{inn.wickets}
                    {' '}({inn.overs} ov)
                  </summary>

                  <p>Extras: {inn.extras || 0}</p>

                  <h4>Batting</h4>
                  <ul>
                    {Object.entries(
                      inn.batterStats || {}
                    ).map(([name, stats]) => (
                      <li key={name}>
                        {name}: {stats.runs || 0}
                        {' '}({stats.balls || 0})
                      </li>
                    ))}
                  </ul>

                  <h4>Bowling</h4>
                  <ul>
                    {Object.entries(
                      inn.bowlerStats || {}
                    ).map(([name, stats]) => (
                      <li key={name}>
                        {name}: {stats.wickets || 0}
                        /{stats.runs || 0}
                        {' '}in {formatOvers(stats.balls)} overs
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </div>
        )}
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

      <div className="score-public-header">
        <span>
          Ambanpola FoxEleven · Live Cricket Scores
        </span>

        <Link to="/admin">Admin Login</Link>
      </div>

      <LiveScore key={format} format={format} />
    </>
  );
}
