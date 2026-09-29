import React, { useState } from 'react';
import Navigation from './page/Navigation';
import Scoreboard from './page/Scoreboard';
import OdiScoreboard from './page/OdiScoreboard';
import T20Scoreboard from './page/T20Scoreboard';
import T10Scoreboard from './page/T10Scoreboard';
import T5Scoreboard from './page/T5Scoreboard';
import { GENZ_PLAYERS } from './genZData';
import { OG_PLAYERS } from './ogData';

export default function App() {
  const [activeFormat, setActiveFormat] = useState('Test');

  return (
    <div>
      <Navigation activeFormat={activeFormat} setActiveFormat={setActiveFormat} />
      
      {activeFormat === 'Test' && (
        <Scoreboard 
          genZRoster={GENZ_PLAYERS} 
          ogRoster={OG_PLAYERS} 
        />
      )}

      {activeFormat === 'ODI' && (
        <OdiScoreboard />
      )}

      {activeFormat === 'T20' && (
        <T20Scoreboard />
      )}

      {activeFormat === 'T10' && (
        <T10Scoreboard />
      )}

      {activeFormat === '5 Over' && (
        <T5Scoreboard />
      )}
    </div>
  );
}