import React, { useEffect, useRef } from 'react';
import type { MinimapState } from '@ai-commander/zeroad-adapter';

interface MinimapCanvasProps {
  state: MinimapState | null;
  width?: number;
  height?: number;
}

export function MinimapCanvas({ state, width = 300, height = 300 }: MinimapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!state || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Draw border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);

    const bounds = state.mapBounds;
    const mapWidth = bounds.maxX - bounds.minX;
    const mapHeight = bounds.maxZ - bounds.minZ;

    // Helper to convert world position to canvas position
    const worldToCanvas = (worldX: number, worldZ: number) => {
      const canvasX = ((worldX - bounds.minX) / mapWidth) * width;
      const canvasY = ((worldZ - bounds.minZ) / mapHeight) * height;
      return { x: canvasX, y: canvasY };
    };

    // Draw grid (optional)
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 0.5;
    const gridSize = 10;
    for (let i = 0; i < width; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // Draw Player 1 buildings (blue squares)
    ctx.fillStyle = '#3b82f6';
    for (const building of state.player1Buildings) {
      const pos = worldToCanvas(building.position.x, building.position.z);
      ctx.fillRect(pos.x - 3, pos.y - 3, 6, 6);
    }

    // Draw Player 2 buildings (red squares)
    ctx.fillStyle = '#ef4444';
    for (const building of state.player2Buildings) {
      const pos = worldToCanvas(building.position.x, building.position.z);
      ctx.fillRect(pos.x - 3, pos.y - 3, 6, 6);
    }

    // Draw Player 1 units (blue circles)
    ctx.fillStyle = '#60a5fa';
    for (const unit of state.player1Units) {
      const pos = worldToCanvas(unit.position.x, unit.position.z);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Player 2 units (red circles)
    ctx.fillStyle = '#f87171';
    for (const unit of state.player2Units) {
      const pos = worldToCanvas(unit.position.x, unit.position.z);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw fog of war overlay (semi-transparent)
    const cellSize = 32;
    const cellsPerGridWidth = Math.ceil(mapWidth / cellSize);
    const cellsPerGridHeight = Math.ceil(mapHeight / cellSize);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    for (let row = 0; row < state.fogOfWar.player1.length; row++) {
      for (let col = 0; col < state.fogOfWar.player1[row]!.length; col++) {
        // Only draw fogged tiles (false = fogged)
        if (!state.fogOfWar.player1[row]![col]) {
          const worldX = bounds.minX + col * cellSize;
          const worldZ = bounds.minZ + row * cellSize;
          const pos = worldToCanvas(worldX, worldZ);
          const cellPixelSize = (cellSize / mapWidth) * width;
          ctx.fillRect(pos.x, pos.y, cellPixelSize, cellPixelSize);
        }
      }
    }
  }, [state, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        borderRadius: '4px',
        backgroundColor: '#0a0a0a',
        border: '1px solid #333',
      }}
    />
  );
}
