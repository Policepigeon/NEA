#iports
import os
import re
from flask import Flask, redirect, url_for, session, request, jsonify, render_template
#hey look there's a library for this
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

#flask app setup
app = Flask(__name__)
#fix this please before things get worse
app.secret_key = 'your_secret_key'
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

#i should change this later once the prototype stops being a prototype
CLIENT_SECRETS_FILE = "client_secret.json"
#!!!!!!!!!!!!!! SECURITY RISK !!!!!!!!!!!!!!! FIX THIS LATER !!!!!!!!!!!!!!!
SCOPES = [
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.me",
    "https://www.googleapis.com/auth/classroom.coursework.students",
    "https://www.googleapis.com/auth/classroom.rosters.readonly"
]

def get_course_id_from_url(url):
    #regex :(   youre a bad programmer is you need to use a regex
    match = re.search(r'/c/([a-zA-Z0-9]+)', url)
    return match.group(1) if match else None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/authorize')
def authorize():
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        redirect_uri=url_for('oauth2callback', _external=True)
    )
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true'
    )
    session['state'] = state
    return redirect(authorization_url)

@app.route('/oauth2callback')
def oauth2callback():
    state = session['state']
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        state=state,
        redirect_uri=url_for('oauth2callback', _external=True)
    )
    flow.fetch_token(authorization_response=request.url)
    credentials = flow.credentials
    session['credentials'] = credentials_to_dict(credentials)
    return redirect(url_for('index'))

@app.route('/check_role', methods=['POST'])
def check_role():
    if 'credentials' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    credentials = Credentials(**session['credentials'])
    service = build('classroom', 'v1', credentials=credentials)
    data = request.json
    course_url = data.get('course_url')
    course_id = get_course_id_from_url(course_url)
    if not course_id:
        return jsonify({'role': 'invalid', 'message': 'Invalid course URL.'})

    user_email = credentials.id_token.get('email', '')

    # Check if user is a teacher
    try:
        teachers = service.courses().teachers().list(courseId=course_id).execute()
        if any(t['profile']['emailAddress'] == user_email for t in teachers.get('teachers', [])):
            return jsonify({'role': 'teacher', 'message': 'You are a teacher in this course.'})
    except Exception:
        pass

    # Check if user is a student
    try:
        students = service.courses().students().list(courseId=course_id).execute()
        if any(s['profile']['emailAddress'] == user_email for s in students.get('students', [])):
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

    return jsonify({'role': 'unauthorized', 'message': 'You are not permitted to access this course.'})

def credentials_to_dict(credentials):
    return {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes,
        'id_token': credentials.id_token
    }

if __name__ == '__main__':
    app.run(debug=True)