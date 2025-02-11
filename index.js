const express = require('express');
const { AuthorizationCode } = require('simple-oauth2');
require('dotenv').config();

const app = express();
const PORT = 3000;

// OAuth2 client configuration
const oauth2Client = new AuthorizationCode({
    client: {
        id: process.env.CLIENT_ID,
        secret: process.env.CLIENT_SECRET,
    },
    auth: {
        tokenHost: 'https://oauth2.googleapis.com',
        authorizePath: '/o/oauth2/v2/auth',
        tokenPath: '/token',
    },
});

// Google OAuth login URL
app.get('/login', (req, res) => {
    const authorizationUri = oauth2Client.authorizeURL({
        redirect_uri: 'http://localhost:3000/callback',
        scope: ['openid', 'profile', 'email'],
        state: 'randomstring',
    });
    res.redirect(authorizationUri);
});

// Callback route to handle OAuth response
app.get('/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('Authorization code is missing.');
    }
    //whooo try except statements
    try {
        // Use an async function to handle the token exchange
        const getToken = async () => {
            const tokenParams = {
                code,
                redirect_uri: 'http://localhost:3000/callback',
            };
            const accessToken = await oauth2Client.getToken(tokenParams);
            res.send(`Access Token: ${accessToken.token.access_token}`);
        };

        await getToken();
    } catch (error) {
        console.error('Error getting token:', error.message);
        res.status(500).send('Authentication failed');
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
