import React, { useState } from 'react';
import Cookies from "universal-cookie"
import  {useChatContext } from "stream-chat-react"

function JoinGame() {
  const {client} = useChatContext();
  const cookies = new Cookies();
  const [username, setUsername] = useState('');
  const [usernames, setUsernames] = useState([cookies.get("username")]);

  const handleAddUser = async () => {
    if (username.trim() && !usernames.includes(username)) {
      // Prevent adding more than 5 players
      if (usernames.length < 5) {
        // Check if the user exists using StreamChat API
        try {
          const response = await client.queryUsers({ name: { $eq: username } });
          
          if (response.users.length === 0) {
            alert("User not found");
            return;
          } else {
            setUsernames([...usernames, username]);
            setUsername(''); 
          }
        } catch (error) {
          console.error("Error querying users:", error);
          alert("An error occurred while searching for the user.");
        }
      } else {
        alert("You cannot add more than 5 players.");
      }
    }
  };
  

  // Remove a user from the game, but you cannot remove yourself
  const handleRemoveUser = (removeUsername) => {
    if (removeUsername === cookies.get("username")) {
      alert("You can't remove yourself from the game");
      return;
    }
    setUsernames(usernames.filter((user) => user !== removeUsername));
  };

  // Function to start the game (for now it just logs the list)
  const startGame = () => {
    console.log(usernames);
  };

  return (
    <div className='joinGame'>
      <h4>Create Game</h4>
      <p>Invite 2-4 friends</p>
      
      <input 
        placeholder='Username of friend' 
        value={username} 
        onChange={(e) => setUsername(e.target.value)}
      />
      
      {/*Disable the add button when there are maximum players added*/}
      <button onClick={handleAddUser} disabled={usernames.length >= 5}>Add</button>

      {/*Conditionally render the Start Game button if there are 3 or more players*/}
      {usernames.length >= 3 && <button onClick={startGame}>Start Game</button>}

      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {usernames.map((user, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <p style={{ marginRight: '10px' }}>{user}</p>
            <button onClick={() => handleRemoveUser(user)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default JoinGame;
