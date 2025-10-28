import os
from flask import Flask, request, redirect, url_for, session, jsonify
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

app = Flask(__name__)

# Load client ID and secret from .env file
client_id = os.getenv('GOOGLE_CLIENT_ID')
client_secret = os.getenv('GOOGLE_CLIENT_SECRET')

# Create Google OAuth client
SCOPES = ['https://www.googleapis.com/auth/classroom.courses.readonly',
          'https://www.googleapis.com/auth/classroom.coursework.me',
          'https://www.googleapis.com/auth/classroom.coursework.students',
          'https://www.googleapis.com/auth/classroom.rosters.readonly']

def authorize():
    flow = InstalledAppFlow.from_client_secrets_file(
        'client_secret.json', SCOPES)
    authorization_url, state = flow.authorization_url(
        access_type='offline', include_granted_scopes='true')
    session['state'] = state
    return authorization_url

@app.route('/')
def index():
    return 'Login with Google'

@app.route('/login')
def login():
    url = authorize()
    return redirect(url)

@app.route('/oauth2callback')
def oauth2callback():
    state = session.get('state')
    flow = InstalledAppFlow.from_client_secrets_file(
        'client_secret.json', SCOPES)
    credentials = flow.fetch_token(state=state)
    
    # Get the user's profile information
    service = build('classroom', 'v1', credentials=credentials)
    data = request.args.to_dict()
    if 'course_url' in data:
        course_id = get_course_id_from_url(data['course_url'])
        
        # Check if user is a teacher
        try:
            teachers = service.courses().teachers().list(courseId=course_id).execute()
            if any(t['profile']['emailAddress'] == credentials.id_token.get('email') for t in teachers.get('teachers', [])):
                return jsonify({'role': 'teacher', 'message': 'You are a teacher in this course.'})
        except Exception:
            pass
        
        # Check if user is a student
        try:
            students = service.courses().students().list(courseId=course_id).execute()
            if any(s['profile']['emailAddress'] == credentials.id_token.get('email') for s in students.get('students', [])):
                return jsonify({'role': 'student', 'message': 'You are a student in this course.'})
        except Exception:
            pass
        
        # Check if user can view the course at all
        try:
            courses = service.courses().list().execute()
            if any(c['id'] == course_id for c in courses.get('courses', [])):
                return jsonify({'role': 'student', 'message': 'You can view this course but are not a teacher.'})
        except Exception:
            pass
        
    # If user is authenticated
    credentials_to_dict = {
        'token': credentials['access_token'],
        'refresh_token': credentials['refresh_token'],
        'token_uri': credentials['token_uri'],
        'client_id': credentials['client_id'],
        'client_secret': credentials['client_secret'],
        'scopes': credentials['scopes'],
        'id_token': credentials['id_token']
    }
    
    session['credentials'] = credentials_to_dict
    
    return jsonify({'role': 'unauthorized', 'message': 'You are permitted to access this course.'})

def get_course_id_from_url(url):
    #regex :(   youre a bad programmer is you need to use a regex
    match = re.search(r'/c/([a-zA-Z0-9]+)', url)
    return match.group(1) if match else None

if __name__ == '__main__':
    app.run(debug=True)