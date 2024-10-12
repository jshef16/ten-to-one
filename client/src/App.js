import './App.css';
import SignUp from './components/SignUp.js';
import Login from "./components/Login.js"
import Game from "./components/Game.js"
import JoinOrCreateGame from './components/JoinOrCreateGame.js';
import { StreamChat } from "stream-chat";
import { Chat } from "stream-chat-react";
import Cookies from "universal-cookie";
import { useState, useEffect } from 'react';

function App() {
  const cookies = new Cookies();
  const token = cookies.get("token");
  const client = StreamChat.getInstance(process.env.REACT_APP_STREAM_API_KEY);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const connectUser = async () => {
      if (token && !client.userID) { // Ensure the client isn't already connected
        try {
          await client.connectUser({
            id: cookies.get("userId"),
            name: cookies.get("username"),
            firstName: cookies.get("firstName"),
            lastName: cookies.get("lastName"),
            hashedPassword: cookies.get("hashedPassword"),
          }, token);
          setIsAuth(true);
        } catch (error) {
          console.error("Failed to connect user:", error);
        }
      }
    };

    connectUser();
  }, [client, token, cookies]);

  const logOut = () => {
    cookies.remove("token");
    cookies.remove("userId");
    cookies.remove("firstName");
    cookies.remove("lastName");
    cookies.remove("hashedPassword");
    cookies.remove("channelName");
    cookies.remove("username");
    client.disconnectUser();
    setIsAuth(false);
  };

  return (
    <div className="App">
      {isAuth ? (
        <Chat client={client}>
          <JoinOrCreateGame />
          <button onClick={logOut}>Log Out</button>
        </Chat>
      ) : (
        <>
          <SignUp setIsAuth={setIsAuth} />
          <Login setIsAuth={setIsAuth} />
        </>
      )}
    </div>
  );
}

export default App;
