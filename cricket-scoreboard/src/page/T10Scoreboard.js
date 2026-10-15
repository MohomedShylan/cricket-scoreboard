import React from 'react';
import { useSavedState } from './useSavedState';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Scoreboard.css'; 

const formatOvers = (totalBalls) => {
  if (!totalBalls) return "0.0";
  return `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`;
};

const calculateStrikeRate = (runs, balls) => {
  if (!balls || balls === 0) return "0.00";
  return ((runs / balls) * 100).toFixed(2);
};

const calculateEconomy = (runs, totalBalls) => {
  if (!totalBalls || totalBalls === 0) return "0.00";
  return ((runs / totalBalls) * 6).toFixed(2);
};

export default function T10Scoreboard({ initialState = {}, onStateChange }) {
  const [team1Name, setTeam1Name] = useSavedState('team1Name', '', initialState, onStateChange);
  const [team2Name, setTeam2Name] = useSavedState('team2Name', '', initialState, onStateChange);
  const [teamsLocked, setTeamsLocked] = useSavedState('teamsLocked', false, initialState, onStateChange);
  
  const [roster1, setRoster1] = useSavedState('roster1', [], initialState, onStateChange);
  const [roster2, setRoster2] = useSavedState('roster2', [], initialState, onStateChange);

  const [currentInnings, setCurrentInnings] = useSavedState('currentInnings', 1, initialState, onStateChange);
  const [battingTeam, setBattingTeam] = useSavedState('battingTeam', '', initialState, onStateChange);
  const [selectedTeam, setSelectedTeam] = useSavedState('selectedTeam', '', initialState, onStateChange);
  const [selectedInnings, setSelectedInnings] = useSavedState('selectedInnings', 1, initialState, onStateChange);

  const [runs, setRuns] = useSavedState('runs', 0, initialState, onStateChange);
  const [wickets, setWickets] = useSavedState('wickets', 0, initialState, onStateChange);
  const [balls, setBalls] = useSavedState('balls', 0, initialState, onStateChange); 
  const [extras, setExtras] = useSavedState('extras', 0, initialState, onStateChange); 

  const [currentOverDetails, setCurrentOverDetails] = useSavedState('currentOverDetails', [], initialState, onStateChange);
  const [isOverComplete, setIsOverComplete] = useSavedState('isOverComplete', false, initialState, onStateChange);

  const [striker, setStriker] = useSavedState('striker', '', initialState, onStateChange);
  const [nonStriker, setNonStriker] = useSavedState('nonStriker', '', initialState, onStateChange);
  const [bowler, setBowler] = useSavedState('bowler', '', initialState, onStateChange);

  const [newPlayerName, setNewPlayerName] = useSavedState('newPlayerName', '', initialState, onStateChange);
  const [newPlayerTeam, setNewPlayerTeam] = useSavedState('newPlayerTeam', '', initialState, onStateChange);
  const [removePlayerTeam, setRemovePlayerTeam] = useSavedState('removePlayerTeam', '', initialState, onStateChange);
  const [removePlayerName, setRemovePlayerName] = useSavedState('removePlayerName', '', initialState, onStateChange);

  const [batterStats, setBatterStats] = useSavedState('batterStats', {}, initialState, onStateChange);
  const [bowlerStats, setBowlerStats] = useSavedState('bowlerStats', {}, initialState, onStateChange);
  const [inningsHistory, setInningsHistory] = useSavedState('inningsHistory', [], initialState, onStateChange);
  const [history, setHistory] = useSavedState('history', [], initialState, onStateChange);
  const [activeHistoryTab, setActiveHistoryTab] = useSavedState('activeHistoryTab', 0, initialState, onStateChange);

  const battingRoster = battingTeam === team1Name ? roster1 : roster2;
  const bowlingRoster = battingTeam === team1Name ? roster2 : roster1;
  const allPlayersData = [...roster1, ...roster2];

  const lockTeams = () => {
    if (!team1Name.trim() || !team2Name.trim()) return alert("Both team names are required!");
    if (team1Name.trim() === team2Name.trim()) return alert("Teams must have different names!");
    setBattingTeam(team1Name);
    setSelectedTeam(team1Name);
    setNewPlayerTeam(team1Name);
    setRemovePlayerTeam(team1Name);
    setTeamsLocked(true);
  };

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) return alert("Please enter a valid player name!");
    const newPlayer = { id: Date.now(), name: newPlayerName.trim(), role: 'Player', image: '' };
    
    if (newPlayerTeam === team1Name) setRoster1([...roster1, newPlayer]);
    else setRoster2([...roster2, newPlayer]);
    
    alert(`${newPlayer.name} added to ${newPlayerTeam}!`);
    setNewPlayerName(''); 
  };

  const handleRemovePlayer = () => {
    if (!removePlayerName) return alert("Please select a player to remove!");
    if (removePlayerName === striker || removePlayerName === nonStriker || removePlayerName === bowler) {
      return alert("Cannot remove an active player! Change active players first.");
    }
    if (window.confirm(`Remove ${removePlayerName} from ${removePlayerTeam}?`)) {
      if (removePlayerTeam === team1Name) setRoster1(roster1.filter(p => p.name !== removePlayerName));
      else setRoster2(roster2.filter(p => p.name !== removePlayerName));
      alert(`${removePlayerName} removed.`);
      setRemovePlayerName('');
    }
  };

  const getAvatarUrl = (name, isBowler = false) => {
    const playerObj = allPlayersData.find(p => p.name === name);
    if (playerObj && playerObj.image) return playerObj.image; 
    const bgColor = isBowler ? 'fecaca' : 'cbd5e1';
    const textColor = isBowler ? '991b1b' : '1e293b';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '?')}&background=${bgColor}&color=${textColor}&rounded=true&bold=true`;
  };

  const buildPDF = (doc, title, inningsNum, bTeam, teamRuns, teamWickets, teamOvers, teamExtras, batStats, bowlStats) => {
    const allBatters = Object.entries(batStats);
    const allBowlers = Object.entries(bowlStats);
    let bestBatterStr = "None", bestBowlerStr = "None";
    
    if (allBatters.length > 0) {
      const bestBatter = allBatters.reduce((best, current) => (current[1].runs > best[1].runs ? current : best));
      bestBatterStr = `${bestBatter[0]} (${bestBatter[1].runs} runs from ${bestBatter[1].balls} balls)`;
    }
    if (allBowlers.length > 0) {
      const bestBowler = allBowlers.reduce((best, current) => {
        if (current[1].wickets > best[1].wickets) return current;
        if (current[1].wickets === best[1].wickets && current[1].runs < best[1].runs) return current;
        return best;
      });
      bestBowlerStr = `${bestBowler[0]} (${bestBowler[1].wickets} wkts for ${bestBowler[1].runs} runs in ${formatOvers(bestBowler[1].balls)} ov)`;
    }

    doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.text(title, 14, 20);
    doc.setFontSize(12); doc.setFont("helvetica", "normal");
    doc.text(`Inning: ${inningsNum} / 2 (T10)`, 14, 28);
    doc.text(`Score: ${teamRuns} / ${teamWickets}`, 14, 34);
    doc.text(`Overs: ${teamOvers}`, 14, 40);
    doc.text(`Extras: ${teamExtras}`, 14, 46);
    doc.setFont("helvetica", "bold"); doc.text("Top Performers:", 14, 56);
    doc.setFont("helvetica", "normal"); doc.text(`Best Batter: ${bestBatterStr}`, 14, 62); doc.text(`Best Bowler: ${bestBowlerStr}`, 14, 68);

    const battingTableData = allBatters.map(([name, stats]) => [
      name, stats.isOut ? (stats.outBowler === 'Run Out' ? 'Run Out' : `b ${stats.outBowler}`) : 'not out',
      stats.runs, stats.balls, stats.fours, stats.sixes, calculateStrikeRate(stats.runs, stats.balls)
    ]);
    autoTable(doc, { startY: 75, head: [['Batter', 'Status', 'R', 'B', '4s', '6s', 'S/R']], body: battingTableData, theme: 'grid', headStyles: { fillColor: [15, 23, 42] } });

    const bowlingTableData = allBowlers.map(([name, stats]) => [
      name, formatOvers(stats.balls), stats.runs, stats.wickets, calculateEconomy(stats.runs, stats.balls)
    ]);
    autoTable(doc, { startY: doc.lastAutoTable.finalY + 10, head: [['Bowler', 'O', 'R', 'W', 'Econ']], body: bowlingTableData, theme: 'grid', headStyles: { fillColor: [220, 38, 38] } });
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    buildPDF(doc, `T10 Summary: ${battingTeam}`, currentInnings, battingTeam, runs, wickets, formatOvers(balls), extras, batterStats, bowlerStats);
    doc.save(`T10_${battingTeam.replace(/\s+/g, '_')}_Inning_${currentInnings}.pdf`);
  };

  const generatePastInningPDF = (historyData) => {
    const doc = new jsPDF();
    buildPDF(doc, `T10 Summary: ${historyData.team}`, historyData.innings, historyData.team, historyData.runs, historyData.wickets, historyData.overs, historyData.extras, historyData.batterStats, historyData.bowlerStats);
    doc.save(`T10_${historyData.team.replace(/\s+/g, '_')}_Inning_${historyData.innings}_Summary.pdf`);
  };

  const saveHistory = () => {
    setHistory(prev => [...prev, {
      runs, wickets, balls, extras, striker, nonStriker, bowler,
      currentOverDetails: [...currentOverDetails], isOverComplete, 
      batterStats: JSON.parse(JSON.stringify(batterStats)), bowlerStats: JSON.parse(JSON.stringify(bowlerStats))
    }]);
  };

  const handleUndo = () => {
    if (history.length === 0) return alert("Nothing to undo!");
    const lastState = history[history.length - 1];
    setRuns(lastState.runs); setWickets(lastState.wickets); setBalls(lastState.balls); setExtras(lastState.extras); 
    setStriker(lastState.striker); setNonStriker(lastState.nonStriker); setBowler(lastState.bowler);
    setCurrentOverDetails(lastState.currentOverDetails); setIsOverComplete(lastState.isOverComplete); 
    setBatterStats(lastState.batterStats); setBowlerStats(lastState.bowlerStats);
    setHistory(history.slice(0, -1));
  };

  const applySettings = () => {
    if (window.confirm(`Start Innings ${selectedInnings} with ${selectedTeam} batting? This resets current scores.`)) {
      setBattingTeam(selectedTeam); setCurrentInnings(selectedInnings); resetInningsState();
    }
  };

  const resetInningsState = () => {
    setRuns(0); setWickets(0); setBalls(0); setExtras(0);
    setStriker(''); setNonStriker(''); setBowler('');
    setCurrentOverDetails([]); setIsOverComplete(false); 
    setBatterStats({}); setBowlerStats({}); setHistory([]);
  };

  const endInnings = () => {
    if (window.confirm("End this T10 innings? Ensure you downloaded the PDF Summary first!")) {
      setInningsHistory(prev => {
        const newHistory = [...prev, {
          team: battingTeam, runs, wickets, overs: formatOvers(balls), innings: currentInnings, extras,
          batterStats: JSON.parse(JSON.stringify(batterStats)), bowlerStats: JSON.parse(JSON.stringify(bowlerStats))
        }];
        setActiveHistoryTab(newHistory.length - 1);
        return newHistory;
      });
      // T10 Rule: 2 Innings Max
      if (currentInnings >= 2) return alert("T10 Match Complete!");
      const nextTeam = battingTeam === team1Name ? team2Name : team1Name;
      const nextInnings = currentInnings + 1;
      setBattingTeam(nextTeam); setCurrentInnings(nextInnings); setSelectedTeam(nextTeam); setSelectedInnings(nextInnings); resetInningsState();
    }
  };

  // T10 Rules (No Wicket Limit, 10 Overs, No Bowler Limit)
  const checkInningsLimits = (newBalls) => {
    if (newBalls >= 10 * 6) {
      setTimeout(() => alert("End of Innings (10 Overs Completed)! Please download your PDF Summary and manually click 'Declare / End Innings'."), 500);
    }
  };

  const addRuns = (runsToAdd) => {
    if (!striker || !bowler) return alert("Please select a Striker and a Bowler first!");
    saveHistory();
    setRuns(runs + runsToAdd);
    
    let newDetails = isOverComplete ? [] : [...currentOverDetails];
    newDetails.push(runsToAdd.toString());
    setCurrentOverDetails(newDetails);

    setBatterStats(prev => ({ ...prev, [striker]: { ...(prev[striker] || {runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false}), runs: (prev[striker]?.runs || 0) + runsToAdd, balls: (prev[striker]?.balls || 0) + 1, fours: (prev[striker]?.fours || 0) + (runsToAdd === 4 ? 1 : 0), sixes: (prev[striker]?.sixes || 0) + (runsToAdd === 6 ? 1 : 0) } }));
    setBowlerStats(prev => ({ ...prev, [bowler]: { ...prev[bowler], balls: (prev[bowler]?.balls || 0) + 1, runs: (prev[bowler]?.runs || 0) + runsToAdd, wickets: prev[bowler]?.wickets || 0 } }));
    
    const newBalls = balls + 1; setBalls(newBalls);
    let shouldSwap = (runsToAdd % 2 !== 0); 
    let isEndOfOver = (newBalls > 0 && newBalls % 6 === 0);
    setIsOverComplete(isEndOfOver);

    if (isEndOfOver) { setBowler(''); shouldSwap = !shouldSwap; }
    if (shouldSwap) { setStriker(nonStriker); setNonStriker(striker); }
    checkInningsLimits(newBalls);
  };

  const addWide = (extraRuns) => {
    if (!bowler) return alert("Please select a Bowler first!");
    saveHistory();
    setRuns(runs + 1 + extraRuns); setExtras(extras + 1 + extraRuns); 
    
    let newDetails = isOverComplete ? [] : [...currentOverDetails];
    newDetails.push(extraRuns === 0 ? 'wd' : `${extraRuns + 1}wd`);
    setCurrentOverDetails(newDetails);
    setIsOverComplete(false);

    setBowlerStats(prev => ({ ...prev, [bowler]: { ...prev[bowler], runs: (prev[bowler]?.runs || 0) + 1 + extraRuns, balls: prev[bowler]?.balls || 0, wickets: prev[bowler]?.wickets || 0 } }));
    if (extraRuns % 2 !== 0) { setStriker(nonStriker); setNonStriker(striker); }
  };

  const addNoBall = (batterRuns) => {
    if (!striker || !bowler) return alert("Please select a Striker and a Bowler first!");
    saveHistory();
    setRuns(runs + 1 + batterRuns); setExtras(extras + 1); 
    
    let newDetails = isOverComplete ? [] : [...currentOverDetails];
    newDetails.push(batterRuns === 0 ? 'nb' : `${batterRuns}nb`);
    setCurrentOverDetails(newDetails);
    setIsOverComplete(false); 

    setBatterStats(prev => ({ ...prev, [striker]: { ...(prev[striker] || {runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false}), runs: (prev[striker]?.runs || 0) + batterRuns, balls: (prev[striker]?.balls || 0) + 1, fours: (prev[striker]?.fours || 0) + (batterRuns === 4 ? 1 : 0), sixes: (prev[striker]?.sixes || 0) + (batterRuns === 6 ? 1 : 0) } }));
    setBowlerStats(prev => ({ ...prev, [bowler]: { ...prev[bowler], runs: (prev[bowler]?.runs || 0) + 1 + batterRuns, balls: prev[bowler]?.balls || 0, wickets: prev[bowler]?.wickets || 0 } }));
    if (batterRuns % 2 !== 0) { setStriker(nonStriker); setNonStriker(striker); }
  };

  const addRunOut = (completedRuns) => {
    if (!striker || !bowler || !nonStriker) return alert("Please select Striker, Non-Striker, and Bowler first!");
    const isStrikerOut = window.confirm(`Who was run out?\n\nClick 'OK' if ${striker} (Striker) is out.\nClick 'Cancel' if ${nonStriker} (Non-Striker) is out.`);
    saveHistory();
    setRuns(runs + completedRuns);
    
    let newDetails = isOverComplete ? [] : [...currentOverDetails];
    newDetails.push(`W+${completedRuns}`);
    setCurrentOverDetails(newDetails);

    const newWickets = wickets + 1;
    setWickets(newWickets);
    setBatterStats(prev => {
      const updated = { ...prev };
      updated[striker] = { ...(updated[striker] || {runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false}), runs: (updated[striker]?.runs || 0) + completedRuns, balls: (updated[striker]?.balls || 0) + 1 };
      const outBatter = isStrikerOut ? striker : nonStriker;
      updated[outBatter] = { ...(updated[outBatter] || {runs: 0, balls: 0, fours: 0, sixes: 0}), isOut: true, outBowler: 'Run Out' };
      return updated;
    });
    setBowlerStats(prev => ({ ...prev, [bowler]: { ...prev[bowler], balls: (prev[bowler]?.balls || 0) + 1, runs: (prev[bowler]?.runs || 0) + completedRuns, wickets: prev[bowler]?.wickets || 0 } }));
    
    const newBalls = balls + 1; setBalls(newBalls);
    const isEndOfOver = (newBalls > 0 && newBalls % 6 === 0);
    setIsOverComplete(isEndOfOver);
    
    if (isEndOfOver) { setBowler(''); if (isStrikerOut) { setStriker(nonStriker); setNonStriker(''); } else { setNonStriker(striker); setStriker(''); } } 
    else { if (isStrikerOut) setStriker(''); else setNonStriker(''); }
    
    checkInningsLimits(newBalls);
  };

  const addWicket = () => {
    if (!striker || !bowler) return alert("Please select a Striker and a Bowler first!");
    saveHistory();
    
    let newDetails = isOverComplete ? [] : [...currentOverDetails];
    newDetails.push('W');
    setCurrentOverDetails(newDetails);

    const newWickets = wickets + 1;
    setWickets(newWickets);
    setBatterStats(prev => ({ ...prev, [striker]: { ...(prev[striker] || {runs: 0, balls: 0, fours: 0, sixes: 0}), balls: (prev[striker]?.balls || 0) + 1, isOut: true, outBowler: bowler } }));
    setBowlerStats(prev => ({ ...prev, [bowler]: { ...prev[bowler], balls: (prev[bowler]?.balls || 0) + 1, runs: prev[bowler]?.runs || 0, wickets: (prev[bowler]?.wickets || 0) + 1 } }));
    
    const newBalls = balls + 1; setBalls(newBalls);
    const isEndOfOver = (newBalls > 0 && newBalls % 6 === 0);
    setIsOverComplete(isEndOfOver);
    
    if (isEndOfOver) { setBowler(''); setStriker(nonStriker); setNonStriker(''); } else { setStriker(''); }
    
    checkInningsLimits(newBalls);
  };

  const getEventClass = (event) => {
    if (event === 'W' || event.startsWith('W+')) return 'ball-event ball-w';
    if (event === '4' || event === '6') return 'ball-event ball-boundary';
    if (event.includes('wd') || event.includes('nb')) return 'ball-event ball-extra';
    if (event === '0') return 'ball-event ball-dot';
    return 'ball-event';
  };

  const sStats = batterStats[striker] || { runs: 0, balls: 0, fours: 0, sixes: 0 };
  const nsStats = batterStats[nonStriker] || { runs: 0, balls: 0, fours: 0, sixes: 0 };
  const bStats = bowlerStats[bowler] || { runs: 0, balls: 0, wickets: 0 };
  
  const allBatters = Object.entries(batterStats);
  const allBowlers = Object.entries(bowlerStats);
  const historyData = inningsHistory[activeHistoryTab];

  if (!teamsLocked) {
    return (
      <div className="scoreboard-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="card col-500" style={{ maxWidth: '600px', width: '100%' }}>
          <h2 className="card-title-main text-center">T10 Match Setup</h2>
          <p style={{ color: '#64748b', textAlign: 'center', marginBottom: '20px' }}>Enter the names of the two competing teams to start.</p>
          <div className="input-group-col">
            <label className="input-label">Team 1 Name</label>
            <input type="text" value={team1Name} onChange={(e) => setTeam1Name(e.target.value)} className="input-field" placeholder="e.g., India" />
            <label className="input-label">Team 2 Name</label>
            <input type="text" value={team2Name} onChange={(e) => setTeam2Name(e.target.value)} className="input-field" placeholder="e.g., Australia" />
            <button onClick={lockTeams} className="btn btn-blue mt-15" style={{ padding: '15px', fontSize: '18px' }}>Lock Teams & Start Match</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="scoreboard-container">
      <div className="scoreboard-wrapper">
        
        {/* ROW 1: MATCH CONTROLS */}
        <div className="card">
          <h2 className="card-title-main">⚙️ T10 Match Controls</h2>
          
          <div className="row-flex">
            
            {/* LEFT COLUMN: Setup & Add Player */}
            <div className="col-300">
              <h3 className="sub-heading">Match Setup</h3>
              <div className="input-group">
                <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} className="input-field">
                  <option value={team1Name}>{team1Name}</option>
                  <option value={team2Name}>{team2Name}</option>
                </select>
                <select value={selectedInnings} onChange={(e) => setSelectedInnings(Number(e.target.value))} className="input-field">
                  <option value={1}>Innings 1</option>
                  <option value={2}>Innings 2</option>
                </select>
              </div>
              <button onClick={applySettings} className="btn btn-blue">Apply & Start</button>

              <hr className="divider" />
              
              <h3 className="sub-heading">➕ Add New Player</h3>
              <div className="input-group-col">
                <select value={newPlayerTeam} onChange={(e) => setNewPlayerTeam(e.target.value)} className="input-field no-margin">
                  <option value={team1Name}>{team1Name}</option>
                  <option value={team2Name}>{team2Name}</option>
                </select>
                <input 
                  type="text" 
                  placeholder="Player Name" 
                  value={newPlayerName} 
                  onChange={(e) => setNewPlayerName(e.target.value)} 
                  className="input-field no-margin" 
                />
                <button onClick={handleAddPlayer} className="btn btn-green">Add Player</button>
              </div>
            </div>

            {/* RIGHT COLUMN: Active Players & Remove Player */}
            <div className="col-2-500">
              
              <div>
                <h3 className="sub-heading">Active Players</h3>
                <div className="input-group-wrap">
                  <div className="col-150">
                    <label className="input-label">Striker:</label>
                    <select value={striker} onChange={(e) => setStriker(e.target.value)} className="input-field">
                      <option value="">-- Select Striker --</option>
                      {battingRoster.map(p => <option key={p.name} value={p.name} disabled={p.name === nonStriker || batterStats[p.name]?.isOut}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="col-150">
                    <label className="input-label">Non-Striker:</label>
                    <select value={nonStriker} onChange={(e) => setNonStriker(e.target.value)} className="input-field">
                      <option value="">-- Select Non-Striker --</option>
                      {battingRoster.map(p => <option key={p.name} value={p.name} disabled={p.name === striker || batterStats[p.name]?.isOut}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="col-150">
                    <label className="input-label danger">Bowler:</label>
                    <select value={bowler} onChange={(e) => setBowler(e.target.value)} className="input-field bowler">
                      <option value="">-- Select Bowler --</option>
                      {/* T10 Rule: No Bowler Limits */}
                      {bowlingRoster.map(p => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <hr className="divider" />

              <div>
                <h3 className="sub-heading">➖ Remove Player</h3>
                <div className="input-group-end">
                  <div className="col-150">
                    <label className="input-label">Team:</label>
                    <select 
                      value={removePlayerTeam} 
                      onChange={(e) => { setRemovePlayerTeam(e.target.value); setRemovePlayerName(''); }} 
                      className="input-field no-margin"
                    >
                      <option value={team1Name}>{team1Name}</option>
                      <option value={team2Name}>{team2Name}</option>
                    </select>
                  </div>
                  <div className="col-150">
                    <label className="input-label">Player:</label>
                    <select 
                      value={removePlayerName} 
                      onChange={(e) => setRemovePlayerName(e.target.value)} 
                      className="input-field no-margin"
                    >
                      <option value="">-- Select Player --</option>
                      {(removePlayerTeam === team1Name ? roster1 : roster2).map(p => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-150">
                    <button onClick={handleRemovePlayer} className="btn btn-red">Remove Player</button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ROW 2: SCOREBOARD & KEYPAD */}
        <div className="row-flex">
          
          <div className="digital-board">
            <div className="digital-innings">T10 Innings {currentInnings} / 2</div>
            <h2 className="digital-title">{battingTeam} Batting</h2>
            
            <div className="digital-score">
              {runs} <span className="digital-wickets">/ {wickets}</span>
            </div>
            <div className="digital-overs">
              Overs: <span>{formatOvers(balls)}</span> <span className="target-text">(Max: 10)</span>
            </div>

            <div className="live-players-row">
              <div className="player-box batters">
                <div className="live-batter-row">
                  <div className="live-player-info">
                    <img src={getAvatarUrl(striker)} alt="Striker" className="avatar striker" />
                    <div className="live-player-name">{striker || 'Not Selected'} <span className="striker-star">*</span></div>
                  </div>
                  <div className="live-score-large">{sStats.runs} <span className="live-balls">({sStats.balls})</span></div>
                </div>
                
                <div className="live-batter-ns">
                  <div className="live-player-info">
                    <img src={getAvatarUrl(nonStriker)} alt="Non-Striker" className="avatar non-striker" />
                    <div className="live-player-name-ns">{nonStriker || 'Not Selected'}</div>
                  </div>
                  <div className="live-score-medium">{nsStats.runs} <span className="live-balls-ns">({nsStats.balls})</span></div>
                </div>
              </div>

              <div className="player-box bowler">
                <div className="live-bowler-row">
                  <div className="live-bowler-name">{bowler || 'Not Selected'}</div>
                  <img src={getAvatarUrl(bowler, true)} alt="Bowler" className="avatar bowler" />
                </div>
                <div className="live-bowler-stats">Ov: <strong>{formatOvers(bStats.balls)}</strong> | R: <strong>{bStats.runs}</strong></div>
                <div className="live-bowler-wickets">Wickets: <strong>{bStats.wickets}</strong></div>
              </div>
            </div>
            
            <div className="this-over-container">
              <span className="this-over-label">This Over:</span>
              <div className="this-over-balls">
                {currentOverDetails.length === 0 ? (
                  <span className="this-over-empty">...</span>
                ) : (
                  currentOverDetails.map((event, index) => <span key={index} className={getEventClass(event)}>{event}</span>)
                )}
              </div>
            </div>

            <div className="digital-extras">
              Extras: <strong className="digital-extras-val">{extras}</strong>
            </div>
          </div>

          <div className="card margin-0 col-500">
            <div className="update-header">
              <h3>🎯 Update Score</h3>
              <button onClick={handleUndo} className="btn-undo">↩ Undo Last</button>
            </div>
            
            <div className="grid-runs">
              <button onClick={() => addRuns(0)} className="btn-keypad btn-0">0</button>
              <button onClick={() => addRuns(1)} className="btn-keypad">1</button>
              <button onClick={() => addRuns(2)} className="btn-keypad">2</button>
              <button onClick={() => addRuns(3)} className="btn-keypad">3</button>
              <button onClick={() => addRuns(4)} className="btn-keypad btn-4">4</button>
              <button onClick={() => addRuns(6)} className="btn-keypad btn-6">6</button>
              <button onClick={addWicket} className="btn-keypad btn-w">Wicket</button>
            </div>

            <hr className="divider" />

            <h4 className="sub-heading">Wides</h4>
            <div className="grid-extras">
              <button onClick={() => addWide(0)} className="btn-extra">Wide</button>
              <button onClick={() => addWide(1)} className="btn-extra">Wide + 1</button>
              <button onClick={() => addWide(2)} className="btn-extra">Wide + 2</button>
              <button onClick={() => addWide(3)} className="btn-extra">Wide + 3</button>
              <button onClick={() => addWide(4)} className="btn-extra">Wide + 4</button>
            </div>

            <h4 className="sub-heading mt-15">No-Balls</h4>
            <div className="grid-nb">
              <button onClick={() => addNoBall(0)} className="btn-extra">NB</button>
              <button onClick={() => addNoBall(1)} className="btn-extra">NB + 1</button>
              <button onClick={() => addNoBall(2)} className="btn-extra">NB + 2</button>
              <button onClick={() => addNoBall(3)} className="btn-extra">NB + 3</button>
              <button onClick={() => addNoBall(4)} className="btn-extra">NB + 4</button>
              <button onClick={() => addNoBall(6)} className="btn-extra">NB + 6</button>
            </div>

            <hr className="divider" />

            <h4 className="sub-heading">Run Outs</h4>
            <div className="grid-runouts">
              <button onClick={() => addRunOut(0)} className="btn-ro">Run Out</button>
              <button onClick={() => addRunOut(1)} className="btn-ro">RO + 1</button>
              <button onClick={() => addRunOut(2)} className="btn-ro">RO + 2</button>
              <button onClick={() => addRunOut(3)} className="btn-ro">RO + 3</button>
            </div>
            
            <div className="text-center mt-15">
              <button onClick={() => { setStriker(nonStriker); setNonStriker(striker); }} className="btn-swap">🔄 Swap Strike</button>
            </div>
          </div>

        </div>

        {/* ROW 3: DETAILED SCORECARDS */}
        <div className="row-flex">
          
          <div className="card col-500">
            <h3 className="card-title">🏏 Batting Scorecard</h3>
            {allBatters.length === 0 ? <p className="empty-table-text">No batters have played yet.</p> : (
              <div className="table-responsive">
                <table className="score-table">
                  <thead>
                    <tr><th>Batters</th><th className="right">R</th><th className="right">B</th><th className="right">4s</th><th className="right">6s</th><th className="right">S/R</th></tr>
                  </thead>
                  <tbody>
                    {allBatters.map(([name, stats]) => (
                      <tr key={name}>
                        <td>
                          <div className="table-player-cell">
                            <img src={getAvatarUrl(name)} alt={name} className="avatar" />
                            <div className="table-player-info">
                              <div className="table-player-name">
                                {name} 
                                {name === striker && <span className="striker-indicator">➔</span>}
                                {stats.runs >= 100 && <span className="century-indicator">💯</span>}
                              </div>
                              <div className="dismissal-info">
                                {stats.isOut ? (stats.outBowler === 'Run Out' ? 'Run Out' : `b ${stats.outBowler}`) : <span className="not-out-text">not out</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="right bold">{stats.runs}</td>
                        <td className="right">{stats.balls}</td>
                        <td className="right">{stats.fours}</td>
                        <td className="right">{stats.sixes}</td>
                        <td className="right muted">{calculateStrikeRate(stats.runs, stats.balls)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card col-500">
            <h3 className="card-title">🥎 Bowling Card</h3>
            {allBowlers.length === 0 ? <p className="empty-table-text">No overs bowled yet.</p> : (
              <div className="table-responsive">
                <table className="score-table">
                  <thead>
                    <tr><th>Bowlers</th><th className="right">O</th><th className="right">R</th><th className="right">W</th><th className="right">Econ</th></tr>
                  </thead>
                  <tbody>
                    {allBowlers.map(([name, stats]) => (
                      <tr key={name}>
                        <td>
                          <div className="table-player-cell">
                            <img src={getAvatarUrl(name, true)} alt={name} className="avatar" />
                            <div className="table-player-name">{name}</div>
                          </div>
                        </td>
                        <td className="right">{formatOvers(stats.balls)}</td>
                        <td className="right">{stats.runs}</td>
                        <td className="right danger">{stats.wickets}</td>
                        <td className="right muted">{calculateEconomy(stats.runs, stats.balls)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* ROW 4: FOOTER ACTIONS */}
        <div className="footer-actions">
          <button onClick={endInnings} className="btn-footer btn-dark">🛑 Declare / End Innings</button>
          <button onClick={generatePDF} className="btn-footer btn-green">📥 Download PDF Summary</button>
        </div>

        {/* ROW 5: PAST INNINGS FULL SCORECARDS */}
        {inningsHistory.length > 0 && (
          <div className="card no-padding mt-20">
            
            <div className="history-tabs-container">
              {inningsHistory.map((inn, idx) => (
                <div key={idx} onClick={() => setActiveHistoryTab(idx)} className={`history-tab ${activeHistoryTab === idx ? 'active' : ''}`}>
                  <div className="history-tab-title">{inn.team}</div>
                  <div className="history-tab-subtitle">Innings {inn.innings}</div>
                </div>
              ))}
            </div>

            {historyData && (
              <div className="history-content">
                
                <div className="history-banner">
                  <div className="flex-row align-center gap-15">
                    <h3 className="history-team-title">{historyData.team} Innings</h3>
                    <button onClick={() => generatePastInningPDF(historyData)} className="btn-download-small">📥 Download PDF</button>
                  </div>
                  <div className="text-right">
                    <div className="history-score-large">
                      {historyData.runs} <span className="history-wickets-large">/ {historyData.wickets}</span>
                    </div>
                    <div className="history-overs">Overs: {historyData.overs}</div>
                  </div>
                </div>

                <div className="row-flex">
                  <div className="col-500">
                    <h3 className="card-title">🏏 Batting</h3>
                    <div className="table-responsive">
                      <table className="score-table">
                        <thead>
                          <tr><th>Batters</th><th className="right">R</th><th className="right">B</th><th className="right">4s</th><th className="right">6s</th><th className="right">S/R</th></tr>
                        </thead>
                        <tbody>
                          {Object.entries(historyData.batterStats).map(([name, stats]) => (
                            <tr key={name}>
                              <td>
                                <div className="table-player-cell">
                                  <img src={getAvatarUrl(name)} alt={name} className="avatar" />
                                  <div className="table-player-info">
                                    <div className="table-player-name">
                                      {name} {stats.runs >= 100 && <span className="century-indicator">💯</span>}
                                    </div>
                                    <div className="dismissal-info">
                                      {stats.isOut ? (stats.outBowler === 'Run Out' ? 'Run Out' : `b ${stats.outBowler}`) : <span className="not-out-text">not out</span>}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="right bold">{stats.runs}</td>
                              <td className="right">{stats.balls}</td>
                              <td className="right">{stats.fours}</td>
                              <td className="right">{stats.sixes}</td>
                              <td className="right muted">{calculateStrikeRate(stats.runs, stats.balls)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="history-extras-box">
                      Extras: <span className="history-extras-val">{historyData.extras}</span>
                    </div>
                  </div>

                  <div className="col-500">
                    <h3 className="card-title">🥎 Bowling</h3>
                    <div className="table-responsive">
                      <table className="score-table">
                        <thead>
                          <tr><th>Bowlers</th><th className="right">O</th><th className="right">R</th><th className="right">W</th><th className="right">Econ</th></tr>
                        </thead>
                        <tbody>
                          {Object.entries(historyData.bowlerStats).map(([name, stats]) => (
                            <tr key={name}>
                              <td>
                                <div className="table-player-cell">
                                  <img src={getAvatarUrl(name, true)} alt={name} className="avatar" />
                                  <div className="table-player-name">{name}</div>
                                </div>
                              </td>
                              <td className="right">{formatOvers(stats.balls)}</td>
                              <td className="right">{stats.runs}</td>
                              <td className="right danger">{stats.wickets}</td>
                              <td className="right muted">{calculateEconomy(stats.runs, stats.balls)}</td>
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