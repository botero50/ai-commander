import React from 'react';
import { ChessSpectator } from './components/ChessSpectator/ChessSpectator';
import './App.css';

export const App: React.FC = () => {
  return (
    <div className="app">
      <ChessSpectator />
    </div>
  );
};

export default App;
