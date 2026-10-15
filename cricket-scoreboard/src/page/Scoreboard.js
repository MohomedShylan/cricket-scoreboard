
import React from 'react';
import { useSavedState } from './useSavedState';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Scoreboard.css';

const TEAMS = {
  GEN_Z: 'Ambanpola Vikings',
  OG: 'Ambanpola Shadows',
};

// Custom Test match rules
const TEST_OVERS = 30;
const TEST_MAX_BALLS = TEST_OVERS * 6;
const MAX_SIX_OVER_BOWLERS = 3;
const SIX_OVER_LIMIT = 36;
const OTHER_BOWLER_LIMIT = 30;

// Match player names regardless of case or surrounding spaces
const normalizePlayerName = name =>
  String(name || '').trim().toLowerCase();

const formatOvers = totalBalls => {
  if (!totalBalls) return '0.0';
  return `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`;
};

const calculateStrikeRate = (runs, balls) => {
  if (!balls) return '0.00';
  return ((runs / balls) * 100).toFixed(2);
};

const calculateEconomy = (runs, balls) => {
  if (!balls) return '0.00';
  return ((runs / balls) * 6).toFixed(2);
};

export default function Scoreboard({
  genZRoster = [],
  ogRoster = [],
  initialState = {},
  onStateChange
}) {
  // Saved team rosters
  const [liveGenZRoster, setLiveGenZRoster] = useSavedState(
    'liveGenZRoster', genZRoster, initialState, onStateChange
  );

  const [liveOgRoster, setLiveOgRoster] = useSavedState(
    'liveOgRoster', ogRoster, initialState, onStateChange
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

  // Score
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

  // Statistics and history
  const [batterStats, setBatterStats] = useSavedState(
    'batterStats', {}, initialState, onStateChange
  );

  const [bowlerStats, setBowlerStats] = useSavedState(
    'bowlerStats', {}, initialState, onStateChange
  );

  const [inningsHistory, setInningsHistory] = useSavedState(
    'inningsHistory', [], initialState, onStateChange
  );

  const [history, setHistory] = useSavedState(
    'history', [], initialState, onStateChange
  );

  const [activeHistoryTab, setActiveHistoryTab] = useSavedState(
    'activeHistoryTab', 0, initialState, onStateChange
  );

  // Current batting and bowling teams
  const battingRoster =
    battingTeam === TEAMS.GEN_Z ? liveGenZRoster : liveOgRoster;

  const bowlingRoster =
    battingTeam === TEAMS.GEN_Z ? liveOgRoster : liveGenZRoster;

  const allPlayersData = [
    ...liveGenZRoster,
    ...liveOgRoster
  ];

  // ==========================================
  // CUSTOM BOWLING RULES
  // ==========================================

  const sixOverBowlers = Object.entries(bowlerStats)
    .filter(([, stats]) =>
      Number(stats?.balls || 0) > OTHER_BOWLER_LIMIT
    )
    .map(([name]) => name);

  const bowlerBallLimit = name =>
    sixOverBowlers.includes(name) ||
    sixOverBowlers.length < MAX_SIX_OVER_BOWLERS
      ? SIX_OVER_LIMIT
      : OTHER_BOWLER_LIMIT;

  const canUseBowler = name =>
    Boolean(name) &&
    Number(bowlerStats[name]?.balls || 0) <
      bowlerBallLimit(name);

  const canScoreDelivery = () => {
    if (balls >= TEST_MAX_BALLS) {
      alert(
        '30 overs completed. End the innings before scoring again.'
      );
      return false;
    }

    if (wickets >= 12) {
      alert(
        'All 12 wickets have fallen. End the innings.'
      );
      return false;
    }

    if (bowler && !canUseBowler(bowler)) {
      alert(
        `${bowler} has reached the permitted ` +
        `${bowlerBallLimit(bowler) / 6}-over limit. ` +
        'Select another bowler.'
      );
      return false;
    }

    return true;
  };

  // ==========================================
  // PLAYER MANAGEMENT
  // ==========================================

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) {
      return alert('Please enter a valid player name!');
    }

    const newPlayer = {
      id: Date.now(),
      name: newPlayerName.trim(),
      role: 'Substitute / New',
      image: ''
    };

    if (newPlayerTeam === TEAMS.GEN_Z) {
      setLiveGenZRoster([...liveGenZRoster, newPlayer]);
    } else {
      setLiveOgRoster([...liveOgRoster, newPlayer]);
    }

    alert(
      `${newPlayer.name} has been successfully added to ${newPlayerTeam}!`
    );

    setNewPlayerName('');
  };

  const handleRemovePlayer = () => {
    if (!removePlayerName) {
      return alert('Please select a player to remove!');
    }

    if (
      removePlayerName === striker ||
      removePlayerName === nonStriker ||
      removePlayerName === bowler
    ) {
      return alert(
        'You cannot remove a player who is currently active on the field!'
      );
    }

    if (
      window.confirm(
        `Are you sure you want to remove ${removePlayerName} from ${removePlayerTeam}?`
      )
    ) {
      if (removePlayerTeam === TEAMS.GEN_Z) {
        setLiveGenZRoster(
          liveGenZRoster.filter(
            p => p.name !== removePlayerName
          )
        );
      } else {
        setLiveOgRoster(
          liveOgRoster.filter(
            p => p.name !== removePlayerName
          )
        );
      }

      alert(`${removePlayerName} has been removed.`);
      setRemovePlayerName('');
    }
  };

  // ==========================================
  // UPDATED PLAYER IMAGE LOADING
  // ==========================================

  const getAvatarUrl = (name, isBowler = false) => {
    const normalized = normalizePlayerName(name);

    // Latest player data passed from AdminPage.js
    const officialPlayer = [
      ...genZRoster,
      ...ogRoster
    ].find(
      player =>
        normalizePlayerName(player.name) === normalized
    );

    // Previously saved roster from Supabase
    const savedPlayer = allPlayersData.find(
      player =>
        normalizePlayerName(player.name) === normalized
    );

    // Prefer the latest player image
    const officialImage = String(
      officialPlayer?.image || ''
    ).trim();

    const savedImage = String(
      savedPlayer?.image || ''
    ).trim();

    if (officialImage || savedImage) {
      return officialImage || savedImage;
    }

    // Avatar fallback
    const bgColor = isBowler ? 'fecaca' : 'cbd5e1';
    const textColor = isBowler ? '991b1b' : '1e293b';

    return (
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '?')}` +
      `&background=${bgColor}&color=${textColor}&rounded=true&bold=true`
    );
  };

  // ==========================================
  // REFRESH OFFICIAL SQUADS
  // ==========================================

  const syncTeamRosters = () => {
    const vikings = genZRoster.map(player => ({
      ...player
    }));

    const shadows = ogRoster.map(player => ({
      ...player
    }));

    const matchHasScores =
      balls > 0 ||
      runs > 0 ||
      wickets > 0 ||
      extras > 0 ||
      inningsHistory.length > 0;

    const warning = matchHasScores
      ? (
          'A match has already started.\n\n' +
          'Saved scores and completed innings will remain unchanged, ' +
          'but players missing from the latest squads will be removed ' +
          'from the selection lists. Active selections may be cleared.\n\n'
        )
      : '';

    const confirmed = window.confirm(
      warning +
      `Replace the saved squads with the latest official players?\n\n` +
      `${TEAMS.GEN_Z}: ${vikings.length} players\n` +
      `${TEAMS.OG}: ${shadows.length} players\n\n` +
      'Players added only through the admin page will be removed ' +
      'from the squad lists unless they exist in the official data files.'
    );

    if (!confirmed) return;

    const newBattingRoster =
      battingTeam === TEAMS.OG ? shadows : vikings;

    const newBowlingRoster =
      battingTeam === TEAMS.OG ? vikings : shadows;

    const existsInRoster = (name, roster) =>
      roster.some(player => player.name === name);

    // Update rosters stored through useSavedState
    setLiveGenZRoster(vikings);
    setLiveOgRoster(shadows);

    // Remove invalid player selections
    if (
      striker &&
      !existsInRoster(striker, newBattingRoster)
    ) {
      setStriker('');
    }

    if (
      nonStriker &&
      !existsInRoster(nonStriker, newBattingRoster)
    ) {
      setNonStriker('');
    }

    if (
      bowler &&
      !existsInRoster(bowler, newBowlingRoster)
    ) {
      setBowler('');
    }

    setRemovePlayerName('');

    alert(
      'Official squads refreshed successfully!\n\n' +
      "Please wait for 'All changes saved' before leaving."
    );
  };

  // ==========================================
  // PDF GENERATION
  // ==========================================

  const buildPDF = (
    doc, title, inningsNum, bTeam,
    teamRuns, teamWickets, teamOvers,
    teamExtras, batStats, bowlStats
  ) => {
    const allBatters = Object.entries(batStats);
    const allBowlers = Object.entries(bowlStats);

    let bestBatterStr = 'None';

    if (allBatters.length > 0) {
      const bestBatter = allBatters.reduce(
        (best, current) =>
          current[1].runs > best[1].runs
            ? current
            : best
      );

      bestBatterStr =
        `${bestBatter[0]} (${bestBatter[1].runs} runs ` +
        `from ${bestBatter[1].balls} balls)`;
    }

    let bestBowlerStr = 'None';

    if (allBowlers.length > 0) {
      const bestBowler = allBowlers.reduce(
        (best, current) => {
          if (current[1].wickets > best[1].wickets) {
            return current;
          }
          if (
            current[1].wickets === best[1].wickets &&
            current[1].runs < best[1].runs
          ) {
            return current;
          }
          return best;
        }
      );

      bestBowlerStr =
        `${bestBowler[0]} (${bestBowler[1].wickets} wkts ` +
        `for ${bestBowler[1].runs} runs in ` +
        `${formatOvers(bestBowler[1].balls)} ov)`;
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

    const battingTableData = allBatters.map(
      ([name, stats]) => [
        name,
        stats.isOut
          ? (
              stats.outBowler === 'Run Out'
                ? 'Run Out'
                : `b ${stats.outBowler}`
            )
          : 'not out',
        stats.runs,
        stats.balls,
        stats.fours,
        stats.sixes,
        calculateStrikeRate(stats.runs, stats.balls)
      ]
    );

    autoTable(doc, {
      startY: 75,
      head: [['Batter', 'Status', 'R', 'B', '4s', '6s', 'S/R']],
      body: battingTableData,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42]
      }
    });

    const bowlingTableData = allBowlers.map(
      ([name, stats]) => [
        name,
        formatOvers(stats.balls),
        stats.runs,
        stats.wickets,
        calculateEconomy(stats.runs, stats.balls)
      ]
    );

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Bowler', 'O', 'R', 'W', 'Econ']],
      body: bowlingTableData,
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
      `Inning Summary: ${battingTeam}`,
      currentInnings,
      battingTeam,
      runs,
      wickets,
      formatOvers(balls),
      extras,
      batterStats,
      bowlerStats
    );

    doc.save(
      `${battingTeam.replace(/\s+/g, '_')}_Inning_${currentInnings}.pdf`
    );
  };

  const generatePastInningPDF = data => {
    const doc = new jsPDF();

    buildPDF(
      doc,
      `Inning Summary: ${data.team}`,
      data.innings,
      data.team,
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
  // HISTORY & UNDO
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
    if (history.length === 0) {
      return alert('Nothing to undo!');
    }

    const lastState = history[history.length - 1];

    setRuns(lastState.runs);
    setWickets(lastState.wickets);
    setBalls(lastState.balls);
    setExtras(lastState.extras);
    setStriker(lastState.striker);
    setNonStriker(lastState.nonStriker);
    setBowler(lastState.bowler);
    setCurrentOverDetails(lastState.currentOverDetails);
    setIsOverComplete(lastState.isOverComplete);
    setBatterStats(lastState.batterStats);
    setBowlerStats(lastState.bowlerStats);
    setHistory(history.slice(0, -1));
  };

  // ==========================================
  // MATCH CONTROLS
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
      `Start Innings ${selectedInnings} with ${selectedTeam} batting? ` +
      'This resets current scores.'
    );

    if (!confirmed) return;

    setBattingTeam(selectedTeam);
    setCurrentInnings(selectedInnings);
    resetInningsState();
  };

  const endInnings = () => {
    const confirmed = window.confirm(
      'Are you sure you want to end this innings? ' +
      'Make sure you have downloaded the PDF Summary first!'
    );

    if (!confirmed) return;

    setInningsHistory(prev => {
      const newHistory = [
        ...prev,
        {
          team: battingTeam,
          runs,
          wickets,
          overs: formatOvers(balls),
          innings: currentInnings,
          extras,
          batterStats: JSON.parse(JSON.stringify(batterStats)),
          bowlerStats: JSON.parse(JSON.stringify(bowlerStats))
        }
      ];

      setActiveHistoryTab(newHistory.length - 1);
      return newHistory;
    });

    if (currentInnings >= 4) {
      alert('Match Over!');
      return;
    }

    const nextTeam =
      battingTeam === TEAMS.GEN_Z
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
      return alert('Please select a Striker and a Bowler first!');
    }

    saveHistory();

    setRuns(runs + runsToAdd);

    const newDetails = isOverComplete
      ? []
      : [...currentOverDetails];

    newDetails.push(runsToAdd.toString());
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
          "30 overs completed! Please click 'Declare / End Innings'."
        );
      }, 500);
    }
  };

  const addWide = extraRuns => {
    if (!canScoreDelivery()) return;

    if (!bowler) {
      return alert('Please select a Bowler first!');
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
      return alert('Please select a Striker and a Bowler first!');
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
      return alert(
        'Please select Striker, Non-Striker, and Bowler first!'
      );
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

    if (wickets < 12) {
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
      } else {
        if (isStrikerOut) {
          setStriker('');
        } else {
          setNonStriker('');
        }
      }

      if (wickets + 1 === 12) {
        setTimeout(() => {
          alert(
            "All Out (12 Wickets)! Please click 'Declare / End Innings'."
          );
        }, 500);
      } else if (newBalls >= TEST_MAX_BALLS) {
        setTimeout(() => {
          alert(
            "30 overs completed! Please click 'Declare / End Innings'."
          );
        }, 500);
      }
    }
  };

  const addWicket = () => {
    if (!canScoreDelivery()) return;

    if (!striker || !bowler) {
      return alert('Please select a Striker and a Bowler first!');
    }

    saveHistory();

    const newDetails = isOverComplete
      ? []
      : [...currentOverDetails];

    newDetails.push('W');
    setCurrentOverDetails(newDetails);

    if (wickets < 12) {
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

      if (wickets + 1 === 12) {
        setTimeout(() => {
          alert(
            "All Out (12 Wickets)! Please click 'Declare / End Innings'."
          );
        }, 500);
      } else if (newBalls >= TEST_MAX_BALLS) {
        setTimeout(() => {
          alert(
            "30 overs completed! Please click 'Declare / End Innings'."
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
  // CURRENT SCORECARD DATA
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
  const historyData = inningsHistory[activeHistoryTab];

  // ==========================================
  // SCOREBOARD INTERFACE
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
                  value={selectedTeam}
                  onChange={e => setSelectedTeam(e.target.value)}
                  className="input-field"
                >
                  <option value={TEAMS.GEN_Z}>{TEAMS.GEN_Z}</option>
                  <option value={TEAMS.OG}>{TEAMS.OG}</option>
                </select>

                <select
                  value={selectedInnings}
                  onChange={e => setSelectedInnings(Number(e.target.value))}
                  className="input-field"
                >
                  {[1, 2, 3, 4].map(num => (
                    <option key={num} value={num}>
                      Innings {num}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={applySettings}
                className="btn btn-blue"
              >
                Apply & Start
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
                  onChange={e => setNewPlayerTeam(e.target.value)}
                  className="input-field no-margin"
                >
                  <option value={TEAMS.GEN_Z}>{TEAMS.GEN_Z}</option>
                  <option value={TEAMS.OG}>{TEAMS.OG}</option>
                </select>

                <input
                  type="text"
                  placeholder="Player Name"
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
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
                      onChange={e => setStriker(e.target.value)}
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
                      onChange={e => setNonStriker(e.target.value)}
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
                      onChange={e => setBowler(e.target.value)}
                      className="input-field bowler"
                    >
                      <option value="">
                        -- Select Bowler --
                      </option>

                      {bowlingRoster.map(p => {
                        const used =
                          Number(bowlerStats[p.name]?.balls || 0);

                        const limit =
                          bowlerBallLimit(p.name);

                        const maxReached =
                          !canUseBowler(p.name);

                        return (
                          <option
                            key={p.name}
                            value={p.name}
                            disabled={maxReached}
                          >
                            {p.name} (
                            {formatOvers(used)} /
                            {formatOvers(limit)})
                            {maxReached ? ' - Limit Reached' : ''}
                          </option>
                        );
                      })}
                    </select>

                    <p className="bowler-limit-info">
                      Six-over bowlers: {sixOverBowlers.length} / 3
                      {' '}· Other bowlers: maximum 5 overs
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
                      <option value={TEAMS.GEN_Z}>{TEAMS.GEN_Z}</option>
                      <option value={TEAMS.OG}>{TEAMS.OG}</option>
                    </select>
                  </div>

                  <div className="col-150">
                    <label className="input-label">
                      Player:
                    </label>

                    <select
                      value={removePlayerName}
                      onChange={e => setRemovePlayerName(e.target.value)}
                      className="input-field no-margin"
                    >
                      <option value="">
                        -- Select Player --
                      </option>

                      {(removePlayerTeam === TEAMS.GEN_Z
                        ? liveGenZRoster
                        : liveOgRoster
                      ).map(p => (
                        <option key={p.name} value={p.name}>
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

        {/* LIVE SCOREBOARD AND SCORE CONTROLS */}
        <div className="row-flex">
          <div className="digital-board">
            <div className="digital-innings">
              Innings {currentInnings} / 4
            </div>

            <h2 className="digital-title">
              {battingTeam} Batting
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
                    <img
                      src={getAvatarUrl(striker)}
                      alt="Striker"
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
                    <img
                      src={getAvatarUrl(nonStriker)}
                      alt="Non-Striker"
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

                  <img
                    src={getAvatarUrl(bowler, true)}
                    alt="Bowler"
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
                  <span className="this-over-empty">...</span>
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

          {/* SCORE KEYPAD */}
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

            <h4 className="sub-heading">Wides</h4>

            <div className="grid-extras">
              {[0, 1, 2, 3, 4].map(value => (
                <button
                  key={value}
                  onClick={() => addWide(value)}
                  className="btn-extra"
                >
                  {value === 0 ? 'Wide' : `Wide + ${value}`}
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
                  {value === 0 ? 'NB' : `NB + ${value}`}
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
                  {value === 0 ? 'Run Out' : `RO + ${value}`}
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
                            <img
                              src={getAvatarUrl(name)}
                              alt={name}
                              className="avatar"
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

                        <td className="right bold">{stats.runs}</td>
                        <td className="right">{stats.balls}</td>
                        <td className="right">{stats.fours}</td>
                        <td className="right">{stats.sixes}</td>

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
                            <img
                              src={getAvatarUrl(name, true)}
                              alt={name}
                              className="avatar"
                            />

                            <div className="table-player-name">
                              {name}
                            </div>
                          </div>
                        </td>

                        <td className="right">
                          {formatOvers(stats.balls)}
                        </td>
                        <td className="right">{stats.runs}</td>
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

        {/* PREVIOUS INNINGS */}
        {inningsHistory.length > 0 && (
          <div className="card no-padding mt-20">
            <div className="history-tabs-container">
              {inningsHistory.map((inn, index) => (
                <div
                  key={index}
                  onClick={() => setActiveHistoryTab(index)}
                  className={
                    `history-tab ${
                      activeHistoryTab === index ? 'active' : ''
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

            {historyData && (
              <div className="history-content">
                <div className="history-banner">
                  <div className="flex-row align-center gap-15">
                    <h3 className="history-team-title">
                      {historyData.team} Innings
                    </h3>

                    <button
                      onClick={() => generatePastInningPDF(historyData)}
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
                            historyData.batterStats
                          ).map(([name, stats]) => (
                            <tr key={name}>
                              <td>
                                <div className="table-player-cell">
                                  <img
                                    src={getAvatarUrl(name)}
                                    alt={name}
                                    className="avatar"
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
                            historyData.bowlerStats
                          ).map(([name, stats]) => (
                            <tr key={name}>
                              <td>
                                <div className="table-player-cell">
                                  <img
                                    src={getAvatarUrl(name, true)}
                                    alt={name}
                                    className="avatar"
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
          </div>
        )}
      </div>
    </div>
  );
}
