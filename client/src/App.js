import './App.css';
import SignUp from './components/SignUp.js';
import Login from "./components/Login.js"
import {StreamChat} from "stream-chat"
import Cookies from "universal-cookie"
import {useState} from 'react'

function App() {
  // Define variables
  const cookies = new Cookies();
  const token = cookies.get("token");
  console.log(process.env.REACT_APP_STREAM_API_KEY)
  console.log(token)
  const client = StreamChat.getInstance(process.env.REACT_APP_STREAM_API_KEY);
  const [isAuth, setIsAuth] = useState(false);

  // Log out function
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

  // If the token exists, the user is logged in
  // If not, they are either not logged in or don't have an account
  if (token) {
    // Stream keeps track of users created within the application
    // This line connects to the account already in Stream
    client.connectUser({
      id: cookies.get("userId"),
      name: cookies.get("username"),
      firstName: cookies.get("firstName"),
      lastName: cookies.get("lastName"),
      hashedPassword: cookies.get("hashedPassword")
    },
    token
    ).then((user) => {
      setIsAuth(true);
    });
  }

  return (
    <div className="App">
      {isAuth ? (
        <button onClick={logOut}>Log Out</button>
      ) : (
        <>
          <SignUp setIsAuth = {setIsAuth} />
          <Login setIsAuth = {setIsAuth} />
        </>
    )}
    </div>
  );
}

export default App;
