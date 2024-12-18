//sqlite from frontend!
import sqlite3 from "sqlite3";

const db = new sqlite3.Database("users.db");

// Initialize Appwrite Client
const client = new Appwrite.Client();
client
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('online-ide');
const account = new Appwrite.Account(client);

// Handle Google Login
document.getElementById('google-login').addEventListener('click', () => {
    account.createOAuth2Session('google');
});

// Check if the user is already logged in and display their info
account.get()
    .then(response => {
        const userId = response.$id; // User's unique ID 
        const name = response.name; // User's name
        const email = response.email; // User's email
        const token = response.$sessionId; // Appwrite session token

        // Display the user info on the frontend
        document.getElementById('user-info').textContent = `Logged in as: ${name} (${email})`;

        // Insert user data into the SQLite database
        db.run(
            "INSERT INTO users (user_id, name, email, token) VALUES (?, ?, ?, ?)",
            [userId, name, email, token],
            function (err) {
                if (err) {
                    console.error("Error inserting data into the database:", err);
                } else {
                    console.log("User data inserted successfully. Row ID:", this.lastID);
                }
            }
        );
    })
    .catch(() => {
        document.getElementById('user-info').textContent = 'Not logged in.';
    });