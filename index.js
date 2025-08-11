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

//use the sqlite module to create a db
// Ensure users table exists
const db = new sqlite3.Database(path.join(__dirname, 'users.db'));
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    name TEXT,
    client_id TEXT
)`);

//changed the callback so that it handles oauth and puts in the db
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send('No code provided');
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const ticket = await oauth2Client.verifyIdToken({
            idToken: tokens.id_token,
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();

        // Insert user if not exists
        db.run(
            `INSERT OR IGNORE INTO users (email, name, client_id) VALUES (?, ?, ?)`,
            [payload.email, payload.name, CLIENT_ID],
            function (err) {
                if (err) {
                    console.error('DB error:', err);
                }
            }
        );

        res.redirect(`/?name=${encodeURIComponent(payload.name)}&email=${encodeURIComponent(payload.email)}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Authentication failed');
    }
});

// server pawt <3
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});