/**
 * Live Game Window Component
 *
 * Displays the live RTS game to the user.
 * Handles:
 * - Game window detection and launching
 * - Resizing
 * - Fullscreen/windowed modes
 * - Window synchronization
 *
 * For 0 A.D., provides native integration.
 * Falls back to external window sync if available.
 */

import React, { useState, useEffect, useRef } from 'react';
import './LiveGameWindow.css';

interface GameWindowState {
  isRunning: boolean;
  windowId: string | null;
  isEmbedded: boolean;
  isFullscreen: boolean;
  canEmbed: boolean;
  lastCheck: number;
}

interface GameWindowProps {
  gameType: 'zeroad' | 'spring';
  matchId: string;
  onWindowReady?: () => void;
  onWindowClosed?: () => void;
}

export const LiveGameWindow: React.FC<GameWindowProps> = ({
  gameType,
  matchId,
  onWindowReady,
  onWindowClosed,
}) => {
  const [state, setState] = useState<GameWindowState>({
    isRunning: false,
    windowId: null,
    isEmbedded: false,
    isFullscreen: false,
    canEmbed: gameType === 'zeroad', // 0 A.D. has better window management
    lastCheck: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [windowSize, setWindowSize] = useState({ width: '100%', height: '100%' });

  /**
   * Launch the game if not running
   */
  useEffect(() => {
    const launchGame = async () => {
      if (state.isRunning) return;

      try {
        const response = await fetch('/api/game/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameType,
            matchId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setState((prev) => ({
            ...prev,
            isRunning: true,
            windowId: data.windowId,
            isEmbedded: data.isEmbedded,
            canEmbed: data.canEmbed,
          }));

          onWindowReady?.();
        }
      } catch (error) {
        console.error('Failed to launch game:', error);
      }
    };

    launchGame();
  }, [gameType, matchId, state.isRunning, onWindowReady]);

  /**
   * Monitor game window
   */
  useEffect(() => {
    const checkWindowStatus = async () => {
      if (!state.windowId) return;

      try {
        const response = await fetch(`/api/game/status/${state.windowId}`);
        if (!response.ok) {
          setState((prev) => ({ ...prev, isRunning: false }));
          onWindowClosed?.();
        }
      } catch (error) {
        console.error('Failed to check game window status:', error);
      }
    };

    const interval = setInterval(checkWindowStatus, 2000);
    return () => clearInterval(interval);
  }, [state.windowId, onWindowClosed]);

  /**
   * Handle window resizing
   */
  const handleResize = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setWindowSize({
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      });
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * Toggle fullscreen
   */
  const toggleFullscreen = async () => {
    if (state.isEmbedded && containerRef.current) {
      try {
        await containerRef.current.requestFullscreen();
        setState((prev) => ({ ...prev, isFullscreen: true }));
      } catch (error) {
        console.error('Failed to enter fullscreen:', error);
      }
    } else if (state.windowId) {
      // Signal to external game window
      await fetch(`/api/game/fullscreen/${state.windowId}`, {
        method: 'POST',
        body: JSON.stringify({ fullscreen: true }),
      });
    }
  };

  /**
   * Render embedded game (if supported)
   */
  if (state.isEmbedded && state.canEmbed) {
    return (
      <div className="live-game-window live-game-embedded" ref={containerRef}>
        <div className="game-container">
          {/* Game renders here via browser integration */}
          <iframe
            ref={iframeRef}
            className="game-iframe"
            src={`/game-view/${state.windowId}`}
            title="Live Game"
            allowFullScreen
            style={{
              width: windowSize.width,
              height: windowSize.height,
            }}
          />
        </div>

        {/* Game Controls */}
        <div className="game-controls">
          <button
            className="control-button fullscreen-btn"
            onClick={toggleFullscreen}
            title="Fullscreen"
          >
            ⛶
          </button>
          <span className="game-status">{gameType.toUpperCase()} • Match {matchId}</span>
        </div>
      </div>
    );
  }

  /**
   * Render external window sync (fallback)
   */
  return (
    <div className="live-game-window live-game-external" ref={containerRef}>
      <div className="game-sync-status">
        {state.isRunning ? (
          <>
            <div className="status-indicator running" />
            <p>Game is running in external window</p>
            <p className="status-hint">Keep the {gameType === 'zeroad' ? '0 A.D.' : 'Spring RTS'} window visible</p>
            <button className="btn-secondary" onClick={toggleFullscreen}>
              Focus Game Window
            </button>
          </>
        ) : (
          <>
            <div className="status-indicator loading" />
            <p>Launching game...</p>
          </>
        )}
      </div>

      {/* Game Info Overlay (visible over external window) */}
      <div className="game-info-overlay">
        <div className="match-badge">
          <span className="badge-label">Match</span>
          <span className="badge-value">{matchId}</span>
        </div>
      </div>
    </div>
  );
};

export default LiveGameWindow;
