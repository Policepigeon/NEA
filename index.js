const express = require('express');
const dotenv = require('dotenv');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const { AuthorizationCode } = require('simple-oauth2');

dotenv.config();
const app = express();

// OAuth2 client setup
const oauth2Client = new AuthorizationCode({
  client: {
    id: process.env.GOOGLE_CLIENT_ID,
    secret: process.env.GOOGLE_CLIENT_SECRET,
  },
  auth: {
    tokenHost: 'https://accounts.google.com',
    authorizePath: '/o/oauth2/v2/auth',
    tokenPath: '/token',
  },
});


// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: true,
  })
);

// Generate Google login URL
const authorizationUri = oauth2Client.authorizeURL({
  redirect_uri: process.env.GOOGLE_REDIRECT_URI,
  scope: ['openid', 'profile', 'email'],
  response_type: 'code',
  prompt: 'consent',

});

// Route to start OAuth flow when button is clicked
app.get('/login', (req, res) => {
  console.log('Generated Google login URL:', authorizationUri);
  res.redirect(authorizationUri);
});

// Callback route to handle Google's response
app.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Authorization code not received.');
  }

  try {
    const tokenParams = {
      code,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'authorization_code',
    };

    console.log('Token request params:', tokenParams);

    const accessToken = await oauth2Client.getToken(tokenParams);
    const idToken = accessToken.token.id_token;
    const userInfo = jwt.decode(idToken);

    req.session.user = userInfo;
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error obtaining access token:', error.response?.data || error.message);
    res.status(500).send(`Authentication failed: ${error.message}`);
  }
});



// Display user dashboard
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.send(`<h1>Welcome, ${req.session.user.name}</h1><p>Email: ${req.session.user.email}</p>`);
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});

try {
  const accessToken = await oauth2Client.getToken(tokenParams);
  console.log('Token response:', accessToken.token);
  res.json({
    access_token: accessToken.token.access_token,
    id_token: accessToken.token.id_token,
  });
} catch (error) {
  console.error('Error obtaining access token:', error);
  res.status(500).send(`Authentication failed: ${error.message}`);
}
