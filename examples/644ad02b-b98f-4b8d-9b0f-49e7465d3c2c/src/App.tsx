import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';

type Grid = number[][];
type Direction = 'up' | 'down' | 'left' | 'right';

function App() {
  const [grid, setGrid] = useState<Grid>([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  // Initialize empty grid
  const initGrid = useCallback(() => {
    const newGrid = Array(4).fill(null).map(() => Array(4).fill(0));
    return addRandomTile(addRandomTile(newGrid));
  }, []);

  // Add a new tile (2 or 4) to a random empty cell
  const addRandomTile = (currentGrid: Grid): Grid => {
    const emptyCells = [];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (currentGrid[i][j] === 0) {
          emptyCells.push({ i, j });
        }
      }
    }
    if (emptyCells.length === 0) return currentGrid;

    const { i, j } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newGrid = [...currentGrid];
    newGrid[i][j] = Math.random() < 0.9 ? 2 : 4;
    return newGrid;
  };

  // Move and merge tiles
  const moveTiles = (direction: Direction) => {
    let newGrid = grid.map(row => [...row]);
    let moved = false;
    let newScore = score;

    const rotate = (grid: Grid): Grid => {
      const N = grid.length;
      const rotated = Array(N).fill(null).map(() => Array(N).fill(0));
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          rotated[j][N - 1 - i] = grid[i][j];
        }
      }
      return rotated;
    };

    // Normalize direction to always work left-to-right
    if (direction === 'up') {
      newGrid = rotate(rotate(rotate(newGrid)));
    } else if (direction === 'right') {
      newGrid = rotate(rotate(newGrid));
    } else if (direction === 'down') {
      newGrid = rotate(newGrid);
    }

    // Move and merge
    for (let i = 0; i < 4; i++) {
      const row = newGrid[i];
      const newRow = row.filter(cell => cell !== 0);
      
      // Merge
      for (let j = 0; j < newRow.length - 1; j++) {
        if (newRow[j] === newRow[j + 1]) {
          newRow[j] *= 2;
          newScore += newRow[j];
          newRow.splice(j + 1, 1);
        }
      }
      
      // Fill with zeros
      while (newRow.length < 4) {
        newRow.push(0);
      }
      
      if (row.join(',') !== newRow.join(',')) {
        moved = true;
      }
      newGrid[i] = newRow;
    }

    // Rotate back
    if (direction === 'up') {
      newGrid = rotate(newGrid);
    } else if (direction === 'right') {
      newGrid = rotate(rotate(newGrid));
    } else if (direction === 'down') {
      newGrid = rotate(rotate(rotate(newGrid)));
    }

    if (moved) {
      setGrid(addRandomTile(newGrid));
      setScore(newScore);
      if (newScore > bestScore) {
        setBestScore(newScore);
      }
    }
  };

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          moveTiles('up');
          break;
        case 'ArrowDown':
          moveTiles('down');
          break;
        case 'ArrowLeft':
          moveTiles('left');
          break;
        case 'ArrowRight':
          moveTiles('right');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [grid, score]);

  // Initialize game
  useEffect(() => {
    setGrid(initGrid());
  }, [initGrid]);

  const getTileColor = (value: number): string => {
    const colors: { [key: number]: string } = {
      2: 'bg-[#eee4da]',
      4: 'bg-[#ede0c8]',
      8: 'bg-[#f2b179]',
      16: 'bg-[#f59563]',
      32: 'bg-[#f67c5f]',
      64: 'bg-[#f65e3b]',
      128: 'bg-[#edcf72]',
      256: 'bg-[#edcc61]',
      512: 'bg-[#edc850]',
      1024: 'bg-[#edc53f]',
      2048: 'bg-[#edc22e]'
    };
    return colors[value] || 'bg-[#cdc1b4]';
  };

  const getTextColor = (value: number): string => {
    return value <= 4 ? 'text-[#776E65]' : 'text-[#f9f6f2]';
  };

  return (
    <div className="min-h-screen bg-[#FAF8EF] flex flex-col items-center pt-8">
      <h1 className="text-6xl font-bold text-[#776E65] mb-8">2048</h1>
      <div className="relative bg-[#BBADA0] p-4 rounded-lg">
        <div className="grid grid-cols-4 gap-4">
          {grid.map((row, i) =>
            row.map((cell, j) => (
              <div
                key={`${i}-${j}`}
                className={`w-32 h-32 rounded-lg flex items-center justify-center text-5xl font-bold transition-all duration-100 
                  ${cell === 0 ? 'bg-[#CDC1B4]' : getTileColor(cell)} ${getTextColor(cell)}`}
              >
                {cell !== 0 && cell}
              </div>
            ))
          )}
        </div>

        <div className="absolute -right-72 top-16 space-y-36">
          <div className="relative">
            <div className="text-3xl text-[#776E65] mb-4">最高分</div>
            <div className="bg-[#BBADA0] w-60 h-24 rounded-lg flex items-center justify-center text-4xl text-[#F9F6F2]">
              {bestScore}
            </div>
          </div>

          <div className="relative">
            <div className="text-3xl text-[#776E65] mb-4">分数</div>
            <div className="bg-[#BBADA0] w-60 h-24 rounded-lg flex items-center justify-center text-4xl text-[#F9F6F2]">
              {score}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          setGrid(initGrid());
          setScore(0);
        }}
        className="mt-8 bg-[#CDC1B4] text-[#776E65] px-16 py-6 rounded-full text-3xl flex items-center gap-3 hover:bg-[#BBADA0] transition-colors"
      >
        <RotateCcw className="w-8 h-8" />
        新游戏
      </button>
    </div>
  );
}

export default App;