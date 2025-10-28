import os
from flask import Flask, request, redirect, url_for, session
from flask_oauthlib.client import OAuthClient

app = Flask(__name__)

# Load client ID and secret from .env file
client_id = os.getenv('GOOGLE_CLIENT_ID')
client_secret = os.getenv('GOOGLE_CLIENT_SECRET')

# Create Google OAuth client
google_client = OAuthClient(
    client_id=client_id,
    client_secret=client_secret,
    redirect_uri=url_for('oauth2callback', _external=True)
)

@app.route('/')
def index():
    return 'Login with Google'

@app.route('/login')
def login():
    return google_client.authorize_redirect(redirect_uri=url_for('oauth2callback'))

@app.route('/oauth2callback')
def oauth2callback():
    resp = google_client.authorize_access_response()
    if resp is None:
        return 'Access denied: reason={}'.format(resp.error)
    
    # Get the user's profile information
    profile = resp['profile']
    print('Email: %s' % (profile.get('email', '')))
    print('Name: %s' % (profile.get('name', '')))

    # Set the user's session variables
    session['username'] = profile.get('email', '')
    session['role'] = 'teacher'
    
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)