
import React from 'react';
import { useSavedState } from './useSavedState';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Scoreboard.css';

// ==========================================
// TEAM CONFIGURATION
// ==========================================

const TEAMS = {
  GEN_Z: 'White Panthers',
  OG: 'Gladiators'
};

const TEST_OVERS = 35;
const TEST_MAX_BALLS = TEST_OVERS * 6;
const MAX_WICKETS = 12;

const isCurrentTeam = name =>
  name === TEAMS.GEN_Z || name === TEAMS.OG;

const normalizePlayerName = name =>
  String(name || '').trim().toLowerCase();

const formatOvers = totalBalls => {
  const value = Number(totalBalls) || 0;
  return `${Math.floor(value / 6)}.${value % 6}`;
};

const calculateStrikeRate = (runs, balls) =>
  Number(balls) > 0
    ? ((Number(runs || 0) / balls) * 100).toFixed(2)
    : '0.00';

const calculateEconomy = (runs, balls) =>
  Number(balls) > 0
    ? ((Number(runs || 0) / balls) * 6).toFixed(2)
    : '0.00';

const getFallbackAvatar = (name, isBowler = false) => {
  const bg = isBowler ? 'fecaca' : 'cbd5e1';
  const color = isBowler ? '991b1b' : '1e293b';

  return (
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '?')}` +
    `&background=${bg}&color=${color}&rounded=true&bold=true`
  );
};

const PlayerImage = ({
  name,
  src,
  className = 'avatar',
  isBowler = false
}) => (
  <img
    src={src}
    alt={name || 'Player'}
    className={className}
    onError={event => {
      const fallback = getFallbackAvatar(name, isBowler);
      if (event.currentTarget.src !== fallback) {
        event.currentTarget.src = fallback;
      }
    }}
  />
);

// ==========================================
// SCOREBOARD
// ==========================================

export default function Scoreboard({
  genZRoster = [],
  ogRoster = [],
  initialState = {},
  onStateChange
}) {
  // Team rosters
  const [liveGenZRoster, setLiveGenZRoster] = useSavedState(
    'liveGenZRoster',
    genZRoster,
    initialState,
    onStateChange
  );

  const [liveOgRoster, setLiveOgRoster] = useSavedState(
    'liveOgRoster',
    ogRoster,
    initialState,
    onStateChange
  );

  // Match information
  const [currentInnings, setCurrentInnings] = useSavedState(
    'currentInnings', 1, initialState, onStateChange
  );

  const [battingTeam, setBattingTeam] = useSavedState(
    'battingTeam', TEAMS.GEN_Z, initialState, onStateChange
  );

  const [selectedTeam, setSelectedTeam] = useSavedState(
    'selectedTeam', TEAMS.GEN_Z, initialState, onStateChange
  );

  const [selectedInnings, setSelectedInnings] = useSavedState(
    'selectedInnings', 1, initialState, onStateChange
  );

  // Match score
  const [runs, setRuns] = useSavedState(
    'runs', 0, initialState, onStateChange
  );

  const [wickets, setWickets] = useSavedState(
    'wickets', 0, initialState, onStateChange
  );

  const [balls, setBalls] = useSavedState(
    'balls', 0, initialState, onStateChange
  );

  const [extras, setExtras] = useSavedState(
    'extras', 0, initialState, onStateChange
  );

  const [currentOverDetails, setCurrentOverDetails] = useSavedState(
    'currentOverDetails', [], initialState, onStateChange
  );

  const [isOverComplete, setIsOverComplete] = useSavedState(
    'isOverComplete', false, initialState, onStateChange
  );

  // Maximum overs per bowler
  const [maxBowlerOvers, setMaxBowlerOvers] = useSavedState(
    'maxBowlerOvers', 6, initialState, onStateChange
  );

  // Active players
  const [striker, setStriker] = useSavedState(
    'striker', '', initialState, onStateChange
  );

  const [nonStriker, setNonStriker] = useSavedState(
    'nonStriker', '', initialState, onStateChange
  );

  const [bowler, setBowler] = useSavedState(
    'bowler', '', initialState, onStateChange
  );

  // Player management
  const [newPlayerName, setNewPlayerName] = useSavedState(
    'newPlayerName', '', initialState, onStateChange
  );

  const [newPlayerTeam, setNewPlayerTeam] = useSavedState(
    'newPlayerTeam', TEAMS.GEN_Z, initialState, onStateChange
  );

  const [removePlayerTeam, setRemovePlayerTeam] = useSavedState(
    'removePlayerTeam', TEAMS.GEN_Z, initialState, onStateChange
  );

  const [removePlayerName, setRemovePlayerName] = useSavedState(
    'removePlayerName', '', initialState, onStateChange
  );

  // Score statistics
  const [batterStats, setBatterStats] = useSavedState(
    'batterStats', {}, initialState, onStateChange
  );

  const [bowlerStats, setBowlerStats] = useSavedState(
    'bowlerStats', {}, initialState, onStateChange
  );

  // Saved innings and undo history
  const [inningsHistory, setInningsHistory] = useSavedState(
    'inningsHistory', [], initialState, onStateChange
  );

  const [history, setHistory] = useSavedState(
    'history', [], initialState, onStateChange
  );

  const [activeHistoryTab, setActiveHistoryTab] = useSavedState(
    'activeHistoryTab', 0, initialState, onStateChange
  );

  // ==========================================
  // CURRENT TEAM DATA
  // ==========================================

  // Protect against old team names in saved state.
  const currentBattingTeam = isCurrentTeam(battingTeam)
    ? battingTeam
    : TEAMS.GEN_Z;

  const currentSelectedTeam = isCurrentTeam(selectedTeam)
    ? selectedTeam
    : TEAMS.GEN_Z;

  const battingRoster =
    currentBattingTeam === TEAMS.GEN_Z
      ? liveGenZRoster
      : liveOgRoster;

  const bowlingRoster =
    currentBattingTeam === TEAMS.GEN_Z
      ? liveOgRoster
      : liveGenZRoster;

  // ==========================================
  // NEW TEAM MATCH HISTORY
  // ==========================================

  // Display only innings belonging to the new teams.
  // Do not rename old innings or transfer their scores.
  const currentTeamHistory = (
    Array.isArray(inningsHistory) ? inningsHistory : []
  ).filter(item => isCurrentTeam(item?.team));

  const hasOldTeamHistory = (
    Array.isArray(inningsHistory) ? inningsHistory : []
  ).some(item => !isCurrentTeam(item?.team));

  const safeHistoryIndex = Math.max(
    0,
    Math.min(
      Number(activeHistoryTab) || 0,
      currentTeamHistory.length - 1
    )
  );

  const historyData = currentTeamHistory[safeHistoryIndex];

  // ==========================================
  // BOWLING RESTRICTIONS
  // ==========================================

  const bowlerBallLimit = Number(maxBowlerOvers) * 6;

  const canUseBowler = name => {
    if (!name) return false;

    const used = Number(bowlerStats[name]?.balls || 0);
    return used < bowlerBallLimit;
  };

  const canScoreDelivery = () => {
    if (balls >= TEST_MAX_BALLS) {
      alert(
        `${TEST_OVERS} overs completed. End the innings before scoring again.`
      );
      return false;
    }

    if (wickets >= MAX_WICKETS) {
      alert(
        `All ${MAX_WICKETS} wickets have fallen. End the innings.`
      );
      return false;
    }

    if (bowler && !canUseBowler(bowler)) {
      alert(
        `${bowler} has reached the ${maxBowlerOvers}-over limit. ` +
        'Please select another bowler.'
      );
      return false;
    }

    return true;
  };

  // ==========================================
  // PLAYER IMAGE LOADING
  // ==========================================

  const getAvatarUrl = (
    name,
    isBowler = false,
    teamOverride = null
  ) => {
    const normalized = normalizePlayerName(name);

    const team = teamOverride || (
      isBowler
        ? currentBattingTeam === TEAMS.GEN_Z
          ? TEAMS.OG
          : TEAMS.GEN_Z
        : currentBattingTeam
    );

    const officialRoster =
      team === TEAMS.GEN_Z ? genZRoster : ogRoster;

    const savedRoster =
      team === TEAMS.GEN_Z
        ? liveGenZRoster
        : liveOgRoster;

    const findPlayer = roster =>
      roster.find(
        player =>
          normalizePlayerName(player.name) === normalized
      );

    const officialPlayer = findPlayer(officialRoster);
    const savedPlayer = findPlayer(savedRoster);

    const image = String(
      officialPlayer?.image || savedPlayer?.image || ''
    ).trim();

    return image || getFallbackAvatar(name, isBowler);
  };

  // ==========================================
  // PLAYER MANAGEMENT
  // ==========================================

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) {
      alert('Please enter a valid player name!');
      return;
    }

    const newPlayer = {
      id: Date.now(),
      name: newPlayerName.trim(),
      role: 'Substitute / New',
      image: ''
    };

    if (newPlayerTeam === TEAMS.GEN_Z) {
      setLiveGenZRoster(prev => [...prev, newPlayer]);
    } else {
      setLiveOgRoster(prev => [...prev, newPlayer]);
    }

    alert(`${newPlayer.name} added to ${newPlayerTeam}!`);
    setNewPlayerName('');
  };

  const handleRemovePlayer = () => {
    if (!removePlayerName) {
      alert('Please select a player to remove!');
      return;
    }

    if (
      removePlayerName === striker ||
      removePlayerName === nonStriker ||
      removePlayerName === bowler
    ) {
      alert(
        'You cannot remove a player who is currently active on the field!'
      );
      return;
    }

    const confirmed = window.confirm(
      `Remove ${removePlayerName} from ${removePlayerTeam}?`
    );

    if (!confirmed) return;

    if (removePlayerTeam === TEAMS.GEN_Z) {
      setLiveGenZRoster(prev =>
        prev.filter(p => p.name !== removePlayerName)
      );
    } else {
      setLiveOgRoster(prev =>
        prev.filter(p => p.name !== removePlayerName)
      );
    }

    setRemovePlayerName('');
    alert('Player removed successfully!');
  };

  // ==========================================
  // REFRESH OFFICIAL TEAM ROSTERS
  // ==========================================

  const syncTeamRosters = () => {
    const whitePanthers = genZRoster.map(p => ({ ...p }));
    const gladiators = ogRoster.map(p => ({ ...p }));

    const matchHasScores =
      balls > 0 ||
      runs > 0 ||
      wickets > 0 ||
      extras > 0 ||
      inningsHistory.length > 0;

    const warning = matchHasScores
      ? (
          'A match has already started.\n\n' +
          'Scores and completed innings will remain unchanged, ' +
          'but players missing from the new rosters will be removed. ' +
          'Active selections may be cleared.\n\n'
        )
      : '';

    const confirmed = window.confirm(
      warning +
      'Refresh the official team rosters?\n\n' +
      `White Panthers: ${whitePanthers.length} players\n` +
      `Gladiators: ${gladiators.length} players\n\n` +
      'Players added only through the admin page may be removed.'
    );

    if (!confirmed) return;

    const newBattingRoster =
      currentBattingTeam === TEAMS.GEN_Z
        ? whitePanthers
        : gladiators;

    const newBowlingRoster =
      currentBattingTeam === TEAMS.GEN_Z
        ? gladiators
        : whitePanthers;

    const playerExists = (name, roster) =>
      roster.some(p => p.name === name);

    setLiveGenZRoster(whitePanthers);
    setLiveOgRoster(gladiators);

    if (striker && !playerExists(striker, newBattingRoster)) {
      setStriker('');
    }

    if (
      nonStriker &&
      !playerExists(nonStriker, newBattingRoster)
    ) {
      setNonStriker('');
    }

    if (bowler && !playerExists(bowler, newBowlingRoster)) {
      setBowler('');
    }

    setRemovePlayerName('');

    alert(
      'Official White Panthers and Gladiators squads refreshed!\n\n' +
      "Please wait for 'All changes saved' before leaving."
    );
  };

  // ==========================================
  // PDF GENERATION
  // ==========================================

  const buildPDF = (
    doc,
    title,
    inningsNum,
    teamRuns,
    teamWickets,
    teamOvers,
    teamExtras,
    batStats,
    bowlStats
  ) => {
    const allBatters = Object.entries(batStats || {});
    const allBowlers = Object.entries(bowlStats || {});

    let bestBatterStr = 'None';

    if (allBatters.length > 0) {
      const best = allBatters.reduce(
        (a, b) => b[1].runs > a[1].runs ? b : a
      );

      bestBatterStr =
        `${best[0]} (${best[1].runs} runs ` +
        `from ${best[1].balls} balls)`;
    }

    let bestBowlerStr = 'None';

    if (allBowlers.length > 0) {
      const best = allBowlers.reduce((a, b) => {
        if (b[1].wickets > a[1].wickets) return b;

        if (
          b[1].wickets === a[1].wickets &&
          b[1].runs < a[1].runs
        ) return b;

        return a;
      });

      bestBowlerStr =
        `${best[0]} (${best[1].wickets} wkts ` +
        `for ${best[1].runs} runs in ` +
        `${formatOvers(best[1].balls)} ov)`;
    }

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');

    doc.text(`Inning: ${inningsNum} / 4`, 14, 28);
    doc.text(`Score: ${teamRuns} / ${teamWickets}`, 14, 34);
    doc.text(`Overs: ${teamOvers}`, 14, 40);
    doc.text(`Extras: ${teamExtras}`, 14, 46);

    doc.setFont('helvetica', 'bold');
    doc.text('Top Performers:', 14, 56);

    doc.setFont('helvetica', 'normal');
    doc.text(`Best Batter: ${bestBatterStr}`, 14, 62);
    doc.text(`Best Bowler: ${bestBowlerStr}`, 14, 68);

    const battingRows = allBatters.map(([name, stats]) => [
      name,
      stats.isOut
        ? stats.outBowler === 'Run Out'
          ? 'Run Out'
          : `b ${stats.outBowler}`
        : 'not out',
      stats.runs,
      stats.balls,
      stats.fours,
      stats.sixes,
      calculateStrikeRate(stats.runs, stats.balls)
    ]);

    autoTable(doc, {
      startY: 75,
      head: [['Batter', 'Status', 'R', 'B', '4s', '6s', 'S/R']],
      body: battingRows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42]
      }
    });

    const bowlingRows = allBowlers.map(([name, stats]) => [
      name,
      formatOvers(stats.balls),
      stats.runs,
      stats.wickets,
      calculateEconomy(stats.runs, stats.balls)
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Bowler', 'O', 'R', 'W', 'Econ']],
      body: bowlingRows,
      theme: 'grid',
      headStyles: {
        fillColor: [220, 38, 38]
      }
    });
  };

  const generatePDF = () => {
    const doc = new jsPDF();

    buildPDF(
      doc,
      `Inning Summary: ${currentBattingTeam}`,
      currentInnings,
      runs,
      wickets,
      formatOvers(balls),
      extras,
      batterStats,
      bowlerStats
    );

    doc.save(
      `${currentBattingTeam.replace(/\s+/g, '_')}_Inning_${currentInnings}.pdf`
    );
  };

  const generatePastInningPDF = data => {
    const doc = new jsPDF();

    buildPDF(
      doc,
      `Inning Summary: ${data.team}`,
      data.innings,
      data.runs,
      data.wickets,
      data.overs,
      data.extras,
      data.batterStats,
      data.bowlerStats
    );

    doc.save(
      `${data.team.replace(/\s+/g, '_')}_Inning_${data.innings}_Summary.pdf`
    );
  };

  // ==========================================
  // UNDO HISTORY
  // ==========================================

  const saveHistory = () => {
    setHistory(prev => [
      ...prev,
      {
        runs,
        wickets,
        balls,
        extras,
        striker,
        nonStriker,
        bowler,
        currentOverDetails: [...currentOverDetails],
        isOverComplete,
        batterStats: JSON.parse(JSON.stringify(batterStats)),
        bowlerStats: JSON.parse(JSON.stringify(bowlerStats))
      }
    ]);
  };

  const handleUndo = () => {
    if (!history.length) {
      alert('Nothing to undo!');
      return;
    }

    const last = history[history.length - 1];

    setRuns(last.runs);
    setWickets(last.wickets);
    setBalls(last.balls);
    setExtras(last.extras);
    setStriker(last.striker);
    setNonStriker(last.nonStriker);
    setBowler(last.bowler);
    setCurrentOverDetails(last.currentOverDetails);
    setIsOverComplete(last.isOverComplete);
    setBatterStats(last.batterStats);
    setBowlerStats(last.bowlerStats);
    setHistory(history.slice(0, -1));
  };

  // ==========================================
  // MATCH SETTINGS AND RESET
  // ==========================================

  const resetInningsState = () => {
    setRuns(0);
    setWickets(0);
    setBalls(0);
    setExtras(0);
    setStriker('');
    setNonStriker('');
    setBowler('');
    setCurrentOverDetails([]);
    setIsOverComplete(false);
    setBatterStats({});
    setBowlerStats({});
    setHistory([]);
  };

  const applySettings = () => {
    const confirmed = window.confirm(
      `Start Innings ${selectedInnings} ` +
      `with ${currentSelectedTeam} batting? ` +
      'This resets current scores.'
    );

    if (!confirmed) return;

    setBattingTeam(currentSelectedTeam);
    setCurrentInnings(Number(selectedInnings));
    resetInningsState();
  };

  // Remove only old-team records.
  const removeOldTeamHistory = () => {
    const confirmed = window.confirm(
      'Permanently delete previous Vikings / Shadows innings?\n\n' +
      'White Panthers and Gladiators innings will be preserved.'
    );

    if (!confirmed) return;

    setInningsHistory(prev =>
      prev.filter(item => isCurrentTeam(item?.team))
    );

    setActiveHistoryTab(0);
    alert('Previous teams history removed successfully!');
  };

  // Begin a completely fresh match.
  const startNewMatch = () => {
    const confirmed = window.confirm(
      'Start a fresh White Panthers vs Gladiators match?\n\n' +
      'This permanently removes ALL saved innings history ' +
      'and resets the current scores.\n\n' +
      'Player rosters and maximum bowler overs will remain unchanged.'
    );

    if (!confirmed) return;

    setInningsHistory([]);
    setActiveHistoryTab(0);

    setBattingTeam(TEAMS.GEN_Z);
    setSelectedTeam(TEAMS.GEN_Z);
    setCurrentInnings(1);
    setSelectedInnings(1);
    setNewPlayerTeam(TEAMS.GEN_Z);
    setRemovePlayerTeam(TEAMS.GEN_Z);
    setRemovePlayerName('');

    resetInningsState();

    alert(
      'New White Panthers vs Gladiators match started!\n\n' +
      'All previous scores and innings history have been cleared.'
    );
  };

  const endInnings = () => {
    const confirmed = window.confirm(
      'Are you sure you want to end this innings? ' +
      'Make sure you have downloaded the PDF Summary first!'
    );

    if (!confirmed) return;

    const completedInnings = {
      team: currentBattingTeam,
      runs,
      wickets,
      overs: formatOvers(balls),
      innings: currentInnings,
      extras,
      batterStats: JSON.parse(JSON.stringify(batterStats)),
      bowlerStats: JSON.parse(JSON.stringify(bowlerStats))
    };

    const updatedHistory = [
      ...inningsHistory,
      completedInnings
    ];

    setInningsHistory(updatedHistory);

    const currentEntries = updatedHistory.filter(
      item => isCurrentTeam(item?.team)
    );

    setActiveHistoryTab(currentEntries.length - 1);

    if (currentInnings >= 4) {
      alert('Match Over!');
      return;
    }

    const nextTeam =
      currentBattingTeam === TEAMS.GEN_Z
        ? TEAMS.OG
        : TEAMS.GEN_Z;

    const nextInnings = currentInnings + 1;

    setBattingTeam(nextTeam);
    setCurrentInnings(nextInnings);
    setSelectedTeam(nextTeam);
    setSelectedInnings(nextInnings);

    resetInningsState();
  };

  // ==========================================
  // BALL BY BALL SCORING
  // ==========================================

  const addRuns = runsToAdd => {
    if (!canScoreDelivery()) return;

    if (!striker || !bowler) {
      alert('Please select a Striker and a Bowler first!');
      return;
    }

    saveHistory();
    setRuns(runs + runsToAdd);

    const newDetails = isOverComplete
      ? []
      : [...currentOverDetails];

    newDetails.push(String(runsToAdd));
    setCurrentOverDetails(newDetails);

    setBatterStats(prev => ({
      ...prev,
      [striker]: {
        ...(prev[striker] || {
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false
        }),
        runs: (prev[striker]?.runs || 0) + runsToAdd,
        balls: (prev[striker]?.balls || 0) + 1,
        fours:
          (prev[striker]?.fours || 0) +
          (runsToAdd === 4 ? 1 : 0),
        sixes:
          (prev[striker]?.sixes || 0) +
          (runsToAdd === 6 ? 1 : 0)
      }
    }));

    setBowlerStats(prev => ({
      ...prev,
      [bowler]: {
        ...prev[bowler],
        balls: (prev[bowler]?.balls || 0) + 1,
        runs: (prev[bowler]?.runs || 0) + runsToAdd,
        wickets: prev[bowler]?.wickets || 0
      }
    }));

    const newBalls = balls + 1;
    setBalls(newBalls);

    let shouldSwap = runsToAdd % 2 !== 0;
    const overFinished = newBalls > 0 && newBalls % 6 === 0;

    setIsOverComplete(overFinished);

    if (overFinished) {
      setBowler('');
      shouldSwap = !shouldSwap;
    }

    if (shouldSwap) {
      setStriker(nonStriker);
      setNonStriker(striker);
    }

    if (newBalls >= TEST_MAX_BALLS) {
      setTimeout(() => {
        alert(
          `${TEST_OVERS} overs completed! ` +
          "Please click 'Declare / End Innings'."
        );
      }, 500);
    }
  };

  const addWide = extraRuns => {
    if (!canScoreDelivery()) return;

    if (!bowler) {
      alert('Please select a Bowler first!');
      return;
    }

    saveHistory();

    setRuns(runs + 1 + extraRuns);
    setExtras(extras + 1 + extraRuns);

    const newDetails = isOverComplete
      ? []
      : [...currentOverDetails];

    newDetails.push(
      extraRuns === 0 ? 'wd' : `${extraRuns + 1}wd`
    );

    setCurrentOverDetails(newDetails);
    setIsOverComplete(false);

    setBowlerStats(prev => ({
      ...prev,
      [bowler]: {
        ...prev[bowler],
        runs: (prev[bowler]?.runs || 0) + 1 + extraRuns,
        balls: prev[bowler]?.balls || 0,
        wickets: prev[bowler]?.wickets || 0
      }
    }));

    if (extraRuns % 2 !== 0) {
      setStriker(nonStriker);
      setNonStriker(striker);
    }
  };

  const addNoBall = batterRuns => {
    if (!canScoreDelivery()) return;

    if (!striker || !bowler) {
      alert('Please select a Striker and a Bowler first!');
      return;
    }

    saveHistory();

    setRuns(runs + 1 + batterRuns);
    setExtras(extras + 1);

    const newDetails = isOverComplete
      ? []
      : [...currentOverDetails];

    newDetails.push(
      batterRuns === 0 ? 'nb' : `${batterRuns}nb`
    );

    setCurrentOverDetails(newDetails);
    setIsOverComplete(false);

    setBatterStats(prev => ({
      ...prev,
      [striker]: {
        ...(prev[striker] || {
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false
        }),
        runs: (prev[striker]?.runs || 0) + batterRuns,
        balls: (prev[striker]?.balls || 0) + 1,
        fours:
          (prev[striker]?.fours || 0) +
          (batterRuns === 4 ? 1 : 0),
        sixes:
          (prev[striker]?.sixes || 0) +
          (batterRuns === 6 ? 1 : 0)
      }
    }));

    setBowlerStats(prev => ({
      ...prev,
      [bowler]: {
        ...prev[bowler],
        runs: (prev[bowler]?.runs || 0) + 1 + batterRuns,
        balls: prev[bowler]?.balls || 0,
        wickets: prev[bowler]?.wickets || 0
      }
    }));

    if (batterRuns % 2 !== 0) {
      setStriker(nonStriker);
      setNonStriker(striker);
    }
  };

  const addRunOut = completedRuns => {
    if (!canScoreDelivery()) return;

    if (!striker || !bowler || !nonStriker) {
      alert(
        'Please select Striker, Non-Striker, and Bowler first!'
      );
      return;
    }

    const isStrikerOut = window.confirm(
      `Who was run out?\n\n` +
      `Click OK if ${striker} (Striker) is out.\n` +
      `Click Cancel if ${nonStriker} (Non-Striker) is out.`
    );

    saveHistory();
    setRuns(runs + completedRuns);

    const newDetails = isOverComplete
      ? []
      : [...currentOverDetails];

    newDetails.push(`W+${completedRuns}`);
    setCurrentOverDetails(newDetails);

    if (wickets < MAX_WICKETS) {
      setWickets(wickets + 1);

      setBatterStats(prev => {
        const updated = { ...prev };

        updated[striker] = {
          ...(updated[striker] || {
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            isOut: false
          }),
          runs: (updated[striker]?.runs || 0) + completedRuns,
          balls: (updated[striker]?.balls || 0) + 1
        };

        const outBatter = isStrikerOut
          ? striker
          : nonStriker;

        updated[outBatter] = {
          ...(updated[outBatter] || {
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0
          }),
          isOut: true,
          outBowler: 'Run Out'
        };

        return updated;
      });

      setBowlerStats(prev => ({
        ...prev,
        [bowler]: {
          ...prev[bowler],
          balls: (prev[bowler]?.balls || 0) + 1,
          runs: (prev[bowler]?.runs || 0) + completedRuns,
          wickets: prev[bowler]?.wickets || 0
        }
      }));

      const newBalls = balls + 1;
      setBalls(newBalls);

      const overFinished =
        newBalls > 0 && newBalls % 6 === 0;

      setIsOverComplete(overFinished);

      if (overFinished) {
        setBowler('');

        if (isStrikerOut) {
          setStriker(nonStriker);
          setNonStriker('');
        } else {
          setNonStriker(striker);
          setStriker('');
        }
      } else if (isStrikerOut) {
        setStriker('');
      } else {
        setNonStriker('');
      }

      if (wickets + 1 === MAX_WICKETS) {
        setTimeout(() => {
          alert(
            `All Out (${MAX_WICKETS} Wickets)! ` +
            "Please click 'Declare / End Innings'."
          );
        }, 500);
      } else if (newBalls >= TEST_MAX_BALLS) {
        setTimeout(() => {
          alert(
            `${TEST_OVERS} overs completed! ` +
            "Please click 'Declare / End Innings'."
          );
        }, 500);
      }
    }
  };

  const addWicket = () => {
    if (!canScoreDelivery()) return;

    if (!striker || !bowler) {
      alert('Please select a Striker and a Bowler first!');
      return;
    }

    saveHistory();

    const newDetails = isOverComplete
      ? []
      : [...currentOverDetails];

    newDetails.push('W');
    setCurrentOverDetails(newDetails);

    if (wickets < MAX_WICKETS) {
      setWickets(wickets + 1);

      setBatterStats(prev => ({
        ...prev,
        [striker]: {
          ...(prev[striker] || {
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0
          }),
          balls: (prev[striker]?.balls || 0) + 1,
          isOut: true,
          outBowler: bowler
        }
      }));

      setBowlerStats(prev => ({
        ...prev,
        [bowler]: {
          ...prev[bowler],
          balls: (prev[bowler]?.balls || 0) + 1,
          runs: prev[bowler]?.runs || 0,
          wickets: (prev[bowler]?.wickets || 0) + 1
        }
      }));

      const newBalls = balls + 1;
      setBalls(newBalls);

      const overFinished =
        newBalls > 0 && newBalls % 6 === 0;

      setIsOverComplete(overFinished);

      if (overFinished) {
        setBowler('');
        setStriker(nonStriker);
        setNonStriker('');
      } else {
        setStriker('');
      }

      if (wickets + 1 === MAX_WICKETS) {
        setTimeout(() => {
          alert(
            `All Out (${MAX_WICKETS} Wickets)! ` +
            "Please click 'Declare / End Innings'."
          );
        }, 500);
      } else if (newBalls >= TEST_MAX_BALLS) {
        setTimeout(() => {
          alert(
            `${TEST_OVERS} overs completed! ` +
            "Please click 'Declare / End Innings'."
          );
        }, 500);
      }
    }
  };

  const getEventClass = event => {
    if (event === 'W' || event.startsWith('W+')) {
      return 'ball-event ball-w';
    }

    if (event === '4' || event === '6') {
      return 'ball-event ball-boundary';
    }

    if (event.includes('wd') || event.includes('nb')) {
      return 'ball-event ball-extra';
    }

    if (event === '0') {
      return 'ball-event ball-dot';
    }

    return 'ball-event';
  };

  // ==========================================
  // SCORECARD DATA
  // ==========================================

  const sStats = batterStats[striker] || {
    runs: 0, balls: 0, fours: 0, sixes: 0
  };

  const nsStats = batterStats[nonStriker] || {
    runs: 0, balls: 0, fours: 0, sixes: 0
  };

  const bStats = bowlerStats[bowler] || {
    runs: 0, balls: 0, wickets: 0
  };

  const allBatters = Object.entries(batterStats);
  const allBowlers = Object.entries(bowlerStats);

  // ==========================================
  // INTERFACE
  // ==========================================

  return (
    <div className="scoreboard-container">
      <div className="scoreboard-wrapper">

        {/* MATCH CONTROLS */}
        <div className="card">
          <h2 className="card-title-main">
            ⚙️ Match Controls
          </h2>

          <div className="row-flex">
            <div className="col-300">
              <h3 className="sub-heading">Match Setup</h3>

              <div className="input-group">
                <select
                  value={currentSelectedTeam}
                  onChange={e => setSelectedTeam(e.target.value)}
                  className="input-field"
                >
                  <option value={TEAMS.GEN_Z}>
                    {TEAMS.GEN_Z}
                  </option>
                  <option value={TEAMS.OG}>
                    {TEAMS.OG}
                  </option>
                </select>

                <select
                  value={selectedInnings}
                  onChange={e =>
                    setSelectedInnings(Number(e.target.value))
                  }
                  className="input-field"
                >
                  {[1, 2, 3, 4].map(num => (
                    <option key={num} value={num}>
                      Innings {num}
                    </option>
                  ))}
                </select>
              </div>

              <label
                className="input-label"
                htmlFor="maxBowlerOvers"
              >
                Maximum overs per bowler:
              </label>

              <select
                id="maxBowlerOvers"
                value={maxBowlerOvers}
                onChange={e =>
                  setMaxBowlerOvers(Number(e.target.value))
                }
                className="input-field"
              >
                {Array.from(
                  { length: TEST_OVERS },
                  (_, i) => i + 1
                ).map(value => (
                  <option key={value} value={value}>
                    {value} {value === 1 ? 'over' : 'overs'}
                  </option>
                ))}
              </select>

              <button
                onClick={applySettings}
                className="btn btn-blue"
              >
                Apply & Start
              </button>

              <button
                type="button"
                onClick={startNewMatch}
                className="btn btn-red"
                style={{ marginTop: '10px' }}
              >
                Start Fresh White Panthers vs Gladiators Match
              </button>

              <button
                type="button"
                onClick={syncTeamRosters}
                className="btn btn-green"
                style={{ marginTop: '10px' }}
              >
                ↻ Refresh Teams & Player Images
              </button>

              <hr className="divider" />

              <h3 className="sub-heading">
                ➕ Add New Player
              </h3>

              <div className="input-group-col">
                <select
                  value={newPlayerTeam}
                  onChange={e =>
                    setNewPlayerTeam(e.target.value)
                  }
                  className="input-field no-margin"
                >
                  <option value={TEAMS.GEN_Z}>
                    {TEAMS.GEN_Z}
                  </option>
                  <option value={TEAMS.OG}>
                    {TEAMS.OG}
                  </option>
                </select>

                <input
                  type="text"
                  placeholder="Player Name"
                  value={newPlayerName}
                  onChange={e =>
                    setNewPlayerName(e.target.value)
                  }
                  className="input-field no-margin"
                />

                <button
                  onClick={handleAddPlayer}
                  className="btn btn-green"
                >
                  Add Player
                </button>
              </div>
            </div>

            {/* ACTIVE PLAYERS */}
            <div className="col-2-500">
              <div>
                <h3 className="sub-heading">
                  Active Players
                </h3>

                <div className="input-group-wrap">
                  <div className="col-150">
                    <label className="input-label">
                      Striker:
                    </label>

                    <select
                      value={striker}
                      onChange={e =>
                        setStriker(e.target.value)
                      }
                      className="input-field"
                    >
                      <option value="">
                        -- Select Striker --
                      </option>

                      {battingRoster.map(p => (
                        <option
                          key={p.name}
                          value={p.name}
                          disabled={
                            p.name === nonStriker ||
                            batterStats[p.name]?.isOut
                          }
                        >
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-150">
                    <label className="input-label">
                      Non-Striker:
                    </label>

                    <select
                      value={nonStriker}
                      onChange={e =>
                        setNonStriker(e.target.value)
                      }
                      className="input-field"
                    >
                      <option value="">
                        -- Select Non-Striker --
                      </option>

                      {battingRoster.map(p => (
                        <option
                          key={p.name}
                          value={p.name}
                          disabled={
                            p.name === striker ||
                            batterStats[p.name]?.isOut
                          }
                        >
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-150">
                    <label className="input-label danger">
                      Bowler:
                    </label>

                    <select
                      value={bowler}
                      onChange={e =>
                        setBowler(e.target.value)
                      }
                      className="input-field bowler"
                    >
                      <option value="">
                        -- Select Bowler --
                      </option>

                      {bowlingRoster.map(p => {
                        const used = Number(
                          bowlerStats[p.name]?.balls || 0
                        );

                        const maxReached = !canUseBowler(p.name);

                        return (
                          <option
                            key={p.name}
                            value={p.name}
                            disabled={maxReached}
                          >
                            {p.name} (
                            {formatOvers(used)} /
                            {formatOvers(bowlerBallLimit)})
                            {maxReached ? ' - Limit Reached' : ''}
                          </option>
                        );
                      })}
                    </select>

                    <p className="bowler-limit-info">
                      Maximum {maxBowlerOvers} overs per bowler
                    </p>
                  </div>
                </div>
              </div>

              <hr className="divider" />

              {/* REMOVE PLAYER */}
              <div>
                <h3 className="sub-heading">
                  ➖ Remove Player
                </h3>

                <div className="input-group-end">
                  <div className="col-150">
                    <label className="input-label">
                      Team:
                    </label>

                    <select
                      value={removePlayerTeam}
                      onChange={e => {
                        setRemovePlayerTeam(e.target.value);
                        setRemovePlayerName('');
                      }}
                      className="input-field no-margin"
                    >
                      <option value={TEAMS.GEN_Z}>
                        {TEAMS.GEN_Z}
                      </option>
                      <option value={TEAMS.OG}>
                        {TEAMS.OG}
                      </option>
                    </select>
                  </div>

                  <div className="col-150">
                    <label className="input-label">
                      Player:
                    </label>

                    <select
                      value={removePlayerName}
                      onChange={e =>
                        setRemovePlayerName(e.target.value)
                      }
                      className="input-field no-margin"
                    >
                      <option value="">
                        -- Select Player --
                      </option>

                      {(removePlayerTeam === TEAMS.GEN_Z
                        ? liveGenZRoster
                        : liveOgRoster
                      ).map(p => (
                        <option
                          key={p.name}
                          value={p.name}
                        >
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-150">
                    <button
                      onClick={handleRemovePlayer}
                      className="btn btn-red"
                    >
                      Remove Player
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LIVE SCOREBOARD */}
        <div className="row-flex">
          <div className="digital-board">
            <div className="digital-innings">
              Innings {currentInnings} / 4
            </div>

            <h2 className="digital-title">
              {currentBattingTeam} Batting
            </h2>

            <div className="digital-score">
              {runs}
              {' '}
              <span className="digital-wickets">
                / {wickets}
              </span>
            </div>

            <div className="digital-overs">
              Overs: <span>{formatOvers(balls)}</span>
              {' '}
              <span className="target-text">
                / {TEST_OVERS} overs
              </span>
            </div>

            <div className="live-players-row">
              {/* BATTERS */}
              <div className="player-box batters">
                <div className="live-batter-row">
                  <div className="live-player-info">
                    <PlayerImage
                      name={striker}
                      src={getAvatarUrl(striker)}
                      className="avatar striker"
                    />

                    <div className="live-player-name">
                      {striker || 'Not Selected'}
                      {' '}
                      <span className="striker-star">*</span>
                    </div>
                  </div>

                  <div className="live-score-large">
                    {sStats.runs}
                    {' '}
                    <span className="live-balls">
                      ({sStats.balls})
                    </span>
                  </div>
                </div>

                <div className="live-batter-ns">
                  <div className="live-player-info">
                    <PlayerImage
                      name={nonStriker}
                      src={getAvatarUrl(nonStriker)}
                      className="avatar non-striker"
                    />

                    <div className="live-player-name-ns">
                      {nonStriker || 'Not Selected'}
                    </div>
                  </div>

                  <div className="live-score-medium">
                    {nsStats.runs}
                    {' '}
                    <span className="live-balls-ns">
                      ({nsStats.balls})
                    </span>
                  </div>
                </div>
              </div>

              {/* BOWLER */}
              <div className="player-box bowler">
                <div className="live-bowler-row">
                  <div className="live-bowler-name">
                    {bowler || 'Not Selected'}
                  </div>

                  <PlayerImage
                    name={bowler}
                    src={getAvatarUrl(bowler, true)}
                    isBowler
                    className="avatar bowler"
                  />
                </div>

                <div className="live-bowler-stats">
                  Ov: <strong>{formatOvers(bStats.balls)}</strong>
                  {' '}| R: <strong>{bStats.runs}</strong>
                </div>

                <div className="live-bowler-wickets">
                  Wickets: <strong>{bStats.wickets}</strong>
                </div>
              </div>
            </div>

            {/* CURRENT OVER */}
            <div className="this-over-container">
              <span className="this-over-label">
                This Over:
              </span>

              <div className="this-over-balls">
                {currentOverDetails.length === 0 ? (
                  <span className="this-over-empty">
                    ...
                  </span>
                ) : (
                  currentOverDetails.map((event, index) => (
                    <span
                      key={index}
                      className={getEventClass(event)}
                    >
                      {event}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="digital-extras">
              Extras:
              {' '}
              <strong className="digital-extras-val">
                {extras}
              </strong>
            </div>
          </div>

          {/* SCORE CONTROLS */}
          <div className="card margin-0 col-500">
            <div className="update-header">
              <h3>🎯 Update Score</h3>

              <button
                onClick={handleUndo}
                className="btn-undo"
              >
                ↩ Undo Last
              </button>
            </div>

            <div className="grid-runs">
              {[0, 1, 2, 3, 4, 6].map(value => (
                <button
                  key={value}
                  onClick={() => addRuns(value)}
                  className={
                    `btn-keypad ${
                      value === 0
                        ? 'btn-0'
                        : value === 4
                          ? 'btn-4'
                          : value === 6
                            ? 'btn-6'
                            : ''
                    }`
                  }
                >
                  {value}
                </button>
              ))}

              <button
                onClick={addWicket}
                className="btn-keypad btn-w"
              >
                Wicket
              </button>
            </div>

            <hr className="divider" />

            <h4 className="sub-heading">
              Wides
            </h4>

            <div className="grid-extras">
              {[0, 1, 2, 3, 4].map(value => (
                <button
                  key={value}
                  onClick={() => addWide(value)}
                  className="btn-extra"
                >
                  {value === 0
                    ? 'Wide'
                    : `Wide + ${value}`}
                </button>
              ))}
            </div>

            <h4 className="sub-heading mt-15">
              No-Balls
            </h4>

            <div className="grid-nb">
              {[0, 1, 2, 3, 4, 6].map(value => (
                <button
                  key={value}
                  onClick={() => addNoBall(value)}
                  className="btn-extra"
                >
                  {value === 0
                    ? 'NB'
                    : `NB + ${value}`}
                </button>
              ))}
            </div>

            <hr className="divider" />

            <h4 className="sub-heading">
              Run Outs
            </h4>

            <div className="grid-runouts">
              {[0, 1, 2, 3].map(value => (
                <button
                  key={value}
                  onClick={() => addRunOut(value)}
                  className="btn-ro"
                >
                  {value === 0
                    ? 'Run Out'
                    : `RO + ${value}`}
                </button>
              ))}
            </div>

            <div className="text-center mt-15">
              <button
                onClick={() => {
                  setStriker(nonStriker);
                  setNonStriker(striker);
                }}
                className="btn-swap"
              >
                🔄 Swap Strike
              </button>
            </div>
          </div>
        </div>

        {/* DETAILED SCORECARDS */}
        <div className="row-flex">
          {/* BATTING */}
          <div className="card col-500">
            <h3 className="card-title">
              🏏 Batting Scorecard
            </h3>

            {allBatters.length === 0 ? (
              <p className="empty-table-text">
                No batters have played yet.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="score-table">
                  <thead>
                    <tr>
                      <th>Batters</th>
                      <th className="right">R</th>
                      <th className="right">B</th>
                      <th className="right">4s</th>
                      <th className="right">6s</th>
                      <th className="right">S/R</th>
                    </tr>
                  </thead>

                  <tbody>
                    {allBatters.map(([name, stats]) => (
                      <tr key={name}>
                        <td>
                          <div className="table-player-cell">
                            <PlayerImage
                              name={name}
                              src={getAvatarUrl(name)}
                            />

                            <div className="table-player-info">
                              <div className="table-player-name">
                                {name}

                                {name === striker && (
                                  <span className="striker-indicator">
                                    ➔
                                  </span>
                                )}

                                {stats.runs >= 100 && (
                                  <span className="century-indicator">
                                    💯
                                  </span>
                                )}
                              </div>

                              <div className="dismissal-info">
                                {stats.isOut
                                  ? stats.outBowler === 'Run Out'
                                    ? 'Run Out'
                                    : `b ${stats.outBowler}`
                                  : (
                                    <span className="not-out-text">
                                      not out
                                    </span>
                                  )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="right bold">
                          {stats.runs}
                        </td>
                        <td className="right">
                          {stats.balls}
                        </td>
                        <td className="right">
                          {stats.fours}
                        </td>
                        <td className="right">
                          {stats.sixes}
                        </td>
                        <td className="right muted">
                          {calculateStrikeRate(
                            stats.runs,
                            stats.balls
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* BOWLING */}
          <div className="card col-500">
            <h3 className="card-title">
              🥎 Bowling Card
            </h3>

            {allBowlers.length === 0 ? (
              <p className="empty-table-text">
                No overs bowled yet.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="score-table">
                  <thead>
                    <tr>
                      <th>Bowlers</th>
                      <th className="right">O</th>
                      <th className="right">R</th>
                      <th className="right">W</th>
                      <th className="right">Econ</th>
                    </tr>
                  </thead>

                  <tbody>
                    {allBowlers.map(([name, stats]) => (
                      <tr key={name}>
                        <td>
                          <div className="table-player-cell">
                            <PlayerImage
                              name={name}
                              src={getAvatarUrl(name, true)}
                              isBowler
                            />

                            <div className="table-player-name">
                              {name}
                            </div>
                          </div>
                        </td>

                        <td className="right">
                          {formatOvers(stats.balls)}
                        </td>
                        <td className="right">
                          {stats.runs}
                        </td>
                        <td className="right danger">
                          {stats.wickets}
                        </td>
                        <td className="right muted">
                          {calculateEconomy(
                            stats.runs,
                            stats.balls
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="footer-actions">
          <button
            onClick={endInnings}
            className="btn-footer btn-dark"
          >
            🛑 Declare / End Innings
          </button>

          <button
            onClick={generatePDF}
            className="btn-footer btn-green"
          >
            📥 Download PDF Summary
          </button>
        </div>

        {/* =====================================
            UPDATED MATCH HISTORY
           ===================================== */}

        <div className="card no-padding mt-20">
          <div style={{ padding: '18px 24px' }}>
            <h3 className="card-title">
              🏏 Match History — White Panthers vs Gladiators
            </h3>

            {hasOldTeamHistory && (
              <button
                type="button"
                onClick={removeOldTeamHistory}
                className="btn btn-red"
              >
                Delete Old Vikings / Shadows History
              </button>
            )}
          </div>

          {currentTeamHistory.length === 0 ? (
            <div
              className="history-content"
              style={{ padding: '24px' }}
            >
              <div className="row-flex">
                <div className="col-500">
                  <h3 className="history-team-title">
                    White Panthers
                  </h3>
                  <p>No completed innings yet.</p>
                </div>

                <div className="col-500">
                  <h3 className="history-team-title">
                    Gladiators
                  </h3>
                  <p>No completed innings yet.</p>
                </div>
              </div>

              <p className="empty-table-text">
                Complete an innings to display its batting,
                bowling, and match summary here.
              </p>
            </div>
          ) : (
            <>
              {/* HISTORY TABS */}
              <div className="history-tabs-container">
                {currentTeamHistory.map((inn, index) => (
                  <div
                    key={index}
                    onClick={() => setActiveHistoryTab(index)}
                    className={
                      `history-tab ${
                        safeHistoryIndex === index
                          ? 'active'
                          : ''
                      }`
                    }
                  >
                    <div className="history-tab-title">
                      {inn.team}
                    </div>

                    <div className="history-tab-subtitle">
                      Innings {inn.innings}
                    </div>
                  </div>
                ))}
              </div>

              {/* SELECTED INNINGS */}
              {historyData && (
                <div className="history-content">
                  <div className="history-banner">
                    <div className="flex-row align-center gap-15">
                      <h3 className="history-team-title">
                        {historyData.team} Innings
                      </h3>

                      <button
                        onClick={() =>
                          generatePastInningPDF(historyData)
                        }
                        className="btn-download-small"
                      >
                        📥 Download PDF
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="history-score-large">
                        {historyData.runs}
                        {' '}
                        <span className="history-wickets-large">
                          / {historyData.wickets}
                        </span>
                      </div>

                      <div className="history-overs">
                        Overs: {historyData.overs}
                      </div>
                    </div>
                  </div>

                  <div className="row-flex">
                    {/* PAST BATTING */}
                    <div className="col-500">
                      <h3 className="card-title">
                        🏏 Batting
                      </h3>

                      <div className="table-responsive">
                        <table className="score-table">
                          <thead>
                            <tr>
                              <th>Batters</th>
                              <th className="right">R</th>
                              <th className="right">B</th>
                              <th className="right">4s</th>
                              <th className="right">6s</th>
                              <th className="right">S/R</th>
                            </tr>
                          </thead>

                          <tbody>
                            {Object.entries(
                              historyData.batterStats || {}
                            ).map(([name, stats]) => (
                              <tr key={name}>
                                <td>
                                  <div className="table-player-cell">
                                    <PlayerImage
                                      name={name}
                                      src={getAvatarUrl(
                                        name,
                                        false,
                                        historyData.team
                                      )}
                                    />

                                    <div className="table-player-info">
                                      <div className="table-player-name">
                                        {name}
                                        {' '}
                                        {stats.runs >= 100 && (
                                          <span className="century-indicator">
                                            💯
                                          </span>
                                        )}
                                      </div>

                                      <div className="dismissal-info">
                                        {stats.isOut
                                          ? stats.outBowler === 'Run Out'
                                            ? 'Run Out'
                                            : `b ${stats.outBowler}`
                                          : (
                                            <span className="not-out-text">
                                              not out
                                            </span>
                                          )}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td className="right bold">
                                  {stats.runs}
                                </td>
                                <td className="right">
                                  {stats.balls}
                                </td>
                                <td className="right">
                                  {stats.fours}
                                </td>
                                <td className="right">
                                  {stats.sixes}
                                </td>
                                <td className="right muted">
                                  {calculateStrikeRate(
                                    stats.runs,
                                    stats.balls
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="history-extras-box">
                        Extras:
                        {' '}
                        <span className="history-extras-val">
                          {historyData.extras}
                        </span>
                      </div>
                    </div>

                    {/* PAST BOWLING */}
                    <div className="col-500">
                      <h3 className="card-title">
                        🥎 Bowling
                      </h3>

                      <div className="table-responsive">
                        <table className="score-table">
                          <thead>
                            <tr>
                              <th>Bowlers</th>
                              <th className="right">O</th>
                              <th className="right">R</th>
                              <th className="right">W</th>
                              <th className="right">Econ</th>
                            </tr>
                          </thead>

                          <tbody>
                            {Object.entries(
                              historyData.bowlerStats || {}
                            ).map(([name, stats]) => (
                              <tr key={name}>
                                <td>
                                  <div className="table-player-cell">
                                    <PlayerImage
                                      name={name}
                                      isBowler
                                      src={getAvatarUrl(
                                        name,
                                        true,
                                        historyData.team === TEAMS.GEN_Z
                                          ? TEAMS.OG
                                          : TEAMS.GEN_Z
                                      )}
                                    />

                                    <div className="table-player-name">
                                      {name}
                                    </div>
                                  </div>
                                </td>

                                <td className="right">
                                  {formatOvers(stats.balls)}
                                </td>
                                <td className="right">
                                  {stats.runs}
                                </td>
                                <td className="right danger">
                                  {stats.wickets}
                                </td>
                                <td className="right muted">
                                  {calculateEconomy(
                                    stats.runs,
                                    stats.balls
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
