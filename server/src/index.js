import express from "express"
import cors from "cors"
import {StreamChat} from "stream-chat"
import {v4 as uuidv4} from "uuid"
import bcrypt from "bcrypt"
import dotenv from "dotenv"

dotenv.config();

const app = express()

app.use(cors());
app.use(express.json());

// Connecting project with the Stream platform
// Getting API credentials from .env
const serverClient = StreamChat.getInstance(process.env.STREAM_API_KEY, process.env.STREAM_API_SECRET)

// Get the info from the sign up component, alter them, and send it back to client
app.post("/signup", async (req, res) => {
  try {
    const {firstName, lastName, username, password} = req.body;
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    const token = serverClient.createToken(userId);
    res.json({token, userId, firstName, lastName, username, hashedPassword});
  } 
  // If there is an error, send the error back instead of undefined data
  catch (error) {
    res.json(error);
  }

  });

// Get username and password from the request body and check if there is a user in the Stream database with that username
app.post("/login", async (req, res) => {
    try {
        const {username, password} = req.body;
        const {users} = await serverClient.queryUsers({name: username});

        // User does not exist
        if (users.length === 0) return res.json({message: "User not found"});

        // Create token on login
        const token = serverClient.createToken(users[0].id);

        // Compare the passwords that the user tried to log in with vs the one that's on file
        const passwordMatch = await bcrypt.compare(password, users[0].hashedPassword);

        // If the passwords match, login
        if (passwordMatch) {
            console.log(users)
            res.json({
                token, 
                firstName: users[0].firstName,
                lastName: users[0].lastName,
                username,
                userId: users[0].id,
            });
        }
    } 
    // If there is an error, send the error back instead of undefined data
    catch (error) {
        res.json(error)
    }
});

app.listen(3001, () => {
  console.log("Server is running on port 3001")
});