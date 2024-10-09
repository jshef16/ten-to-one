import React, { useState, useEffect } from 'react';
import { StreamChat } from 'stream-chat';
import Cookies from 'universal-cookie';
import Game from './Game.js'

const cookies = new Cookies();
const client = StreamChat.getInstance(process.env.REACT_APP_STREAM_API_KEY);

function JoinOrCreateGame() {
  const [mode, setMode] = useState(''); // 'create' or 'join'
  const [channelId, setChannelId] = useState('');
  const [usernames, setUsernames] = useState([]); // Dynamically updated with users in the channel
  const [channel, setChannel] = useState(null); // To store the current game channel
  const [gameStarted, setGameStarted] = useState(false); // To toggle between Join/Create and Game component

  // Function to create a unique game ID
  const generateUniqueId = () => {
    return `game-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Function to create a game (create a new channel)
  const createGame = async () => {
    const newChannelId = generateUniqueId(); // Generate unique game ID
    const newChannel = client.channel('messaging', newChannelId, {
      name: `Game Room ${newChannelId}`,
      members: [cookies.get('userId')],
    });
    
    await newChannel.create();
    await newChannel.watch(); // Ensure the creator is watching the channel

    setChannel(newChannel); // Store the channel
    setChannelId(newChannelId); // Set the channel ID so others can join

    // Fetch and update the list of members in the channel
    updateUsernames(newChannel);
  };

  // Function to join an existing game by channel ID
  const joinGame = async () => {
    try {
      // Send request to the server to add the current user to the channel
      const response = await fetch('http://localhost:3001/join-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: cookies.get('userId'), // Current user's username
          channelId: channelId,              // The channel ID entered by the user
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // If the user is successfully added, start watching the channel
        const existingChannel = client.channel('messaging', channelId);
        await existingChannel.watch();
        setChannel(existingChannel);  // Set the channel in local state

        // Fetch and update the list of members in the channel
        updateUsernames(existingChannel);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error joining the game:', error);
      alert('Failed to join the game');
    }
  };

  // Function to fetch and update usernames from the channel members
  const updateUsernames = async (channel) => {
    const members = Object.values(channel.state.members);
    const usernamesInChannel = members.map(member => member.user.name || member.user.id); // Prefer user.name, fallback to user.id
    setUsernames(usernamesInChannel); // Update the usernames state with all members in the channel
  };

    // Real-time updates: listen for when members are added or removed
    useEffect(() => {
        if (channel) {
            const handleMemberAdded = () => updateUsernames(channel);
            const handleMemberRemoved = () => updateUsernames(channel);

            // Listen for member added/removed events
            channel.on('member.added', handleMemberAdded);
            channel.on('member.removed', handleMemberRemoved);

            // Cleanup the event listeners when the component unmounts or when channel changes
            return () => {
            channel.off('member.added', handleMemberAdded);
            channel.off('member.removed', handleMemberRemoved);
            };
        }
        }, [channel]); // Re-run this effect when `channel` changes

  return (
    <>
      {/* Show the Game component if the game has started */}
      {gameStarted ? (
        <Game />
      ) : (
        <div className='joinOrCreateGame'>
          {!mode && (
            <>
              <button onClick={() => setMode('create')}>Create Game</button>
              <button onClick={() => setMode('join')}>Join Game</button>
            </>
          )}

          {/* Create Game Mode */}
          {mode === 'create' && !channel && (
            <>
              <h4>Creating Game...</h4>
              <button onClick={createGame}>Create New Game</button>
            </>
          )}

          {/* Show Game ID after creating a game */}
          {mode === 'create' && channel && (
            <>
              <h4>Game Created!</h4>
              <p>Share this Game ID with your friends to join: <strong>{channelId}</strong></p>
              {/* Add a Start Game button */}
              <button onClick={() => setGameStarted(true)}>Start Game</button>
            </>
          )}

          {/* Join Game Mode */}
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

          {/* Display the current usernames in the channel */}
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


