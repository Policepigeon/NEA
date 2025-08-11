const express = require('express');
const sqlite3 = require('sqlite3').verbose();
// use google auth library instead of simple-oauth2 or oauth2-server
const { OAuth2Client } = require('google-auth-library');
//call google-auth-library to handle OAuth2 authentication
//and dotenv to manage environment variables
require('dotenv').config();
const path = require('path');

const app = express();
const PORT = 3000;
//dotenv to stop some moron leaking sensitive information in github and running up a stupid google cloud bill then having to beg google for forgiveness and rebase the git history
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/callback';

//object of client ++ cred
const oauth2Client = new OAuth2Client(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

//express serves the static html file
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

//generate the authorization URL and redirect the user to Google
app.get('/login', (req, res) => {
    const authorizeUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['openid', 'profile', 'email'],
        prompt: 'consent'
    });
    res.redirect(authorizeUrl);
});

// callbacks and response handling
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send('No code provided');
//try getting the tokens to return later
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const ticket = await oauth2Client.verifyIdToken({
            idToken: tokens.id_token,
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();

        res.redirect(`/?name=${encodeURIComponent(payload.name)}&email=${encodeURIComponent(payload.email)}`);
        //catching the errors when authentication fails
    } catch (err) {
        console.error(err);
        res.status(500).send('Authentication failed');
    }
});

const db = new sqlite3.Database(path.join(__dirname, 'users.db'));
//FOR USERS IF IT DOES NOT EXIST, ensures an individual user can only register once with an email and linked client_id
db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, name TEXT, client_id TEXT UNIQUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, permissions TEXT DEFAULT 'none')");

// server pawt <3
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});