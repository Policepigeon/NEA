const express = require('express');
const sqlite3 = require('sqlite3').verbose();
// use google auth library instead of simple-oauth2 or oauth2-server
const { OAuth2Client } = require('google-auth-library');
//call google-auth-library to handle OAuth2 authentication
//and dotenv to manage environment variables
require('dotenv').config();
const session = require('express-session');
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

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_session_secret',
    resave: false,
    saveUninitialized: false,
}));

//express serves the static html file
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

//generate the authorization URL and redirect the user to Google
app.get('/login', (req, res) => {
    const authorizeUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'openid',
            'profile',
            'email',
            'https://www.googleapis.com/auth/classroom.courses.readonly',
            'https://www.googleapis.com/auth/classroom.rosters.readonly',
        ],
        prompt: 'consent',
        include_granted_scopes: true,
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

// Add role column when missing because tech debt from earlier
//I like the operator pragma because the word sounds nice. remove this code comment before handing in
db.all(`PRAGMA table_info(users)`, (err, rows) => {
    if (err) {
        console.error('Failed to inspect users table:', err);
        return;
    }
    const hasRole = rows.some((r) => r.name === 'role');
    if (!hasRole) {
        db.run(`ALTER TABLE users ADD COLUMN role TEXT`, (alterErr) => {
            if (alterErr) {
                console.error('Failed to add role column:', alterErr);
            }
        });
    }
});

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
        req.session.user = {
            email: payload.email,
            name: payload.name,
        };
        req.session.tokens = tokens;

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

        res.redirect(`/classroom`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Authentication failed');
    }
});

// helper to extract courseId from a classroom URL
function getCourseIdFromUrl(url) {
    const match = url.match(/\/c\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
}

// classroom URL input screen
app.get('/classroom', (req, res) => {
    if (!req.session || !req.session.tokens || !req.session.user) {
        return res.redirect('/');
    }
    res.redirect(`/templates/classlink.html`);
});

// check role and redirect accordingly
app.post('/check-role', async (req, res) => {
    if (!req.session || !req.session.tokens || !req.session.user) {
        return res.redirect('/');
    }

    const courseUrl = req.body.course_url;
    const webCourseId = getCourseIdFromUrl(courseUrl || '');
    if (!webCourseId) {
        return res.status(400).send('Invalid course URL');
    }

    try {
        oauth2Client.setCredentials(req.session.tokens);

        // Resolve numeric course id by listing user's courses and matching alternateLink
        let pageToken = undefined;
        let numericCourseId = undefined;
        do {
            const listResp = await oauth2Client.request({
                url: 'https://classroom.googleapis.com/v1/courses',
                params: {
                    pageSize: 100,
                    pageToken,
                    courseStates: 'ACTIVE',
                },
            });
            const courses = Array.isArray(listResp.data.courses) ? listResp.data.courses : [];
            for (const c of courses) {
                const link = c.alternateLink || '';
                if (link.includes(`/c/${webCourseId}`) || (courseUrl && courseUrl.startsWith(link))) {
                    numericCourseId = c.id;
                    break;
                }
            }
            pageToken = listResp.data.nextPageToken;
        } while (!numericCourseId && pageToken);

        if (!numericCourseId) {
            return res.redirect('/unauthorized');
        }

        // Check if the current user is a teacher in this course
        try {
            await oauth2Client.request({
                url: `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(numericCourseId)}/teachers/me`
            });
            db.run(`UPDATE users SET role = ? WHERE email = ?`, ['teacher', req.session.user.email]);
            return res.redirect('/teacher');
        } catch (_) {
            // not a teacher, fall through
        }

        // Check if the current user is a student in this course
        try {
            await oauth2Client.request({
                url: `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(numericCourseId)}/students/me`
            });
            db.run(`UPDATE users SET role = ? WHERE email = ?`, ['student', req.session.user.email]);
            return res.redirect('/student');
        } catch (_) {
            // not a student
        }

        // neither teacher nor student
        return res.redirect('/unauthorized');
    } catch (err) {
        console.error('Role check failed:', err);
        return res.redirect('/unauthorized');
    }
});

app.get('/teacher', (req, res) => {
    res.redirect('/templates/teachers.html');
});

app.get('/student', (req, res) => {
    // redirect to students template -- removed python runner to make it in line with rest of the program
    res.redirect('/templates/students.html');
});

app.get('/unauthorized', (req, res) => {
    res.redirect('/templates/invalids.html');
});

// server pawt <3
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});