import React, { useEffect } from 'react';
import './Board.css'; 

const Board = ({ players, currentPlayerId }) => {
  const playerCount = players.length;

  // Reorder the players array so that the current player is always first
  const reorderPlayers = (players, currentPlayerId) => {
    const currentPlayerIndex = players.findIndex(player => player.id === currentPlayerId);
    return [...players.slice(currentPlayerIndex), ...players.slice(0, currentPlayerIndex)];
  };

  // Reorder the players array for this client
  const reorderedPlayers = reorderPlayers(players, currentPlayerId);

  useEffect(() => {
    const circlegraph = document.querySelector('.circlegraph');
    const circles = circlegraph.querySelectorAll('.circle');
    let angle = 0;
    const dangle = 360 / circles.length;

    for (let i = 0; i < circles.length; i++) {
      angle += dangle;
      const circle = circles[i];
      circle.style.transform = `rotate(${angle}deg) translate(${circlegraph.clientWidth / 2}px) rotate(-${angle}deg)`;
    }
  }, [reorderedPlayers]);

  return (
    <div className="board circlegraph">
      {reorderedPlayers.map((player, index) => (
        <div key={player.id} className="circle">
          <div className="player-info">
            <h3>{player.name}</h3>
            <p>Score: {player.score}</p>
            <p>Tricks: <span className='tricks'></span></p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Board;
