import React, { useState, useEffect } from 'react';
import { StreamChat } from 'stream-chat';
import Cookies from 'universal-cookie';
import Game from './Game.js';

const cookies = new Cookies();
const client = StreamChat.getInstance(process.env.REACT_APP_STREAM_API_KEY);

function JoinOrCreateGame() {
  const [mode, setMode] = useState('');
  const [channelId, setChannelId] = useState('');
  const [usernames, setUsernames] = useState([]);
  const [channel, setChannel] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);

  const generateUniqueId = () => {
    return `game-${Math.random().toString(36).substr(2, 9)}`;
  };

  const createGame = async () => {
    const newChannelId = generateUniqueId();
    const newChannel = client.channel('messaging', newChannelId, {
      name: `Game Room ${newChannelId}`,
      members: [cookies.get('userId')],
    });
    
    await newChannel.create();
    await newChannel.watch();

    setChannel(newChannel);
    setChannelId(newChannelId);
    updateUsernames(newChannel);
  };

  const joinGame = async () => {
    try {
      const response = await fetch('http://localhost:3001/join-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: cookies.get('userId'),
          channelId: channelId,
        }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        const existingChannel = client.channel('messaging', channelId);
        await existingChannel.watch();
        console.log("Joined client is now watching the channel:", existingChannel);
  
        setChannel(existingChannel);
        updateUsernames(existingChannel);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error joining the game:', error);
      alert('Failed to join the game');
    }
  };
  
  const startGame = async () => {
    if (channel) {
      console.log("Channel members at game start:", channel.state.members);
      try {
        const eventResponse = await channel.sendEvent({
          type: 'game-started',
          data: { message: 'Game has started!' },
        });
        console.log("Successfully sent the start message:", eventResponse);
        setGameStarted(true);
      } catch (e) {
        console.error("Error:", e.message);
      }
    }
  };

  const updateUsernames = async (channel) => {
    const members = Object.values(channel.state.members);
    const usernamesInChannel = members.map(member => member.user.name || member.user.id);
    setUsernames(usernamesInChannel);
  };

  useEffect(() => {
    if (channel) {
      const handleMemberAdded = () => updateUsernames(channel);
      const handleMemberRemoved = () => updateUsernames(channel);
      const handleGameStarted = (event) => {
        console.log("Received 'game-started' event:", event.data.message);
        setGameStarted(true);
      };
  
      channel.on('member.added', handleMemberAdded);
      channel.on('member.removed', handleMemberRemoved);
      channel.on('game-started', handleGameStarted);
  
      return () => {
        channel.off('member.added', handleMemberAdded);
        channel.off('member.removed', handleMemberRemoved);
        channel.off('game-started', handleGameStarted);
      };
    }
  }, [channel]);

  return (
    <>
      {gameStarted ? (
        <>
          {console.log("Channel being passed to Game:", channel)}
          <Game channel={channel} initialGameStarted={gameStarted} />
        </>
      ) : (
        <div className='joinOrCreateGame'>
          {!mode && (
            <>
              <button onClick={() => setMode('create')}>Create Game</button>
              <button onClick={() => setMode('join')}>Join Game</button>
            </>
          )}

          {mode === 'create' && !channel && (
            <>
              <h4>Creating Game...</h4>
              <button onClick={createGame}>Create New Game</button>
            </>
          )}

          {mode === 'create' && channel && (
            <>
              <h4>Game Created!</h4>
              <p>Share this Game ID with your friends to join: <strong>{channelId}</strong></p>
              <button onClick={startGame}>Start Game</button>
            </>
          )}

          {mode === 'join' && !channel && (
            <>
              <h4>Join Game</h4>
              <input
                placeholder='Enter Game ID'
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
              />
              <button onClick={joinGame}>Join</button>
            </>
          )}

          {channel && (
            <div style={{ marginTop: '20px' }}>
              <h4>Players in the Game</h4>
              {usernames.map((user, index) => (
                <p key={index}>{user}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default JoinOrCreateGame;