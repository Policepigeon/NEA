//Sqlite3
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('users.db')
//Should never need this but good practice just in case
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        name TEXT,
        email TEXT,
        token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`);



// Initialize Appwrite client
const client = new Appwrite.Client();
client
    .setEndpoint('https://cloud.appwrite.io/v1') 
    .setProject('online-ide'); // can be replaced with other appwrite names if i need to reuse oauth in another project (probabaly juddai)

const account = new Appwrite.Account(client);

// Handle OAuth Login
document.getElementById('google-login').addEventListener('click', () => {
    account.createOAuth2Session('google'); // Redirects for Google login
});

// Fetch and display user details after login
account.get()
    .then(response => {
        console.log('User Details:', response);

        // Extract user data
        const userData = {
            uid: response.$id,         // User ID
            name: response.name,       // User name
            email: response.email,     // User email
            token: response.prefs.token // Custom token (see below for setup)
        };

        // Insert into SQLite database
        db.run(
            `INSERT INTO users (user_id, name, email, token) VALUES (?, ?, ?, ?)`,
            [userId, name, email, token],
            function (err) {
                if (err) {
                    return console.error('Error inserting data:', err.message);
                }
                console.log(`A row has been inserted with rowid ${this.lastID}`);
            }
        );

        console.log('User Data:', userData);

        // Update UI or send data to backend as needed
        document.getElementById('user-info').textContent = 
            `UID: ${userData.uid}, Name: ${userData.name}, Email: ${userData.email}`;
    })
    .catch(err => {
        console.error('Error fetching user details:', err);
        document.getElementById('user-info').textContent = 'Not logged in.';
    });
