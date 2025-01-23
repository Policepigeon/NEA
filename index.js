const express = require('express');
const dotenv = require('dotenv');
const { AuthorizationCode } = require('simple-oauth2');

dotenv.config();
const app = express();

// Configure OAuth2 client
const oauth2Client = new AuthorizationCode({
  client: {
    id: process.env.GOOGLE_CLIENT_ID,
    secret: process.env.GOOGLE_CLIENT_SECRET,
  },
  auth: {
    tokenHost: 'https://oauth2.googleapis.com',
    authorizePath: '/o/oauth2/auth',
    tokenPath: '/token',
  },
});

const authorizationUri = oauth2Client.authorizeURL({
  redirect_uri: process.env.GOOGLE_REDIRECT_URI,
  scope: ['openid', 'profile', 'email'],
  response_type: 'code',
  prompt: 'consent', // Forces user to select an account
});

// Route to start OAuth2 login flow
app.get('/login', (req, res) => {
  res.redirect(authorizationUri);
});

// Callback route to handle Google's response
app.get('/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const tokenParams = {
      code,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      scope: 'openid profile email',
    };

    const accessToken = await oauth2Client.getToken(tokenParams);
    res.json({
      access_token: accessToken.token.access_token,
      id_token: accessToken.token.id_token, // Contains user profile info
    });
  } catch (error) {
    console.error('Error obtaining access token:', error);
    res.status(500).send('Authentication failed');
  }
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});

const jwt = require('jsonwebtoken');

app.get('/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const tokenParams = {
      code,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    };

    const accessToken = await oauth2Client.getToken(tokenParams);
    const idToken = accessToken.token.id_token;

    const decoded = jwt.decode(idToken);
    res.json(decoded); // Display user profile info
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Authentication failed');
  }
});

const session = require('express-session');

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.get('/callback', async (req, res) => {
  const { code } = req.query;
  const tokenParams = {
    code,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
  };

  const accessToken = await oauth2Client.getToken(tokenParams);
  req.session.user = jwt.decode(accessToken.token.id_token);
  res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.send(`Welcome, ${req.session.user.name}`);
});
