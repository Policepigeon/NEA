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

// Check if the user is already logged in
account.get()
    .then(response => {
        // Update the UI with user information
        document.getElementById('user-info').textContent = `Logged in as: ${response.name} (${response.email})`;
        // Prepare data to insert into the SQLite database
        const userId = response.$id; // Unique user ID from Appwrite
        const name = response.name; // Name of the user
        const email = response.email; // Email of the user
        const token = "session_managed_by_appwrite"; 
        // Insert data into the `users` table
        db.run(
            `INSERT INTO users (user_id, name, email, token) VALUES (?, ?, ?, ?)`,
            [userId, name, email, token],
            function (err) {
                if (err) {
                    console.error("Error inserting data:", err.message);
                } else {
                    console.log(`A row has been inserted with rowid ${this.lastID}`);
                }
            }
        );
    })
    .catch(() => {
        // If not logged in, update the UI
        document.getElementById('user-info').textContent = 'Not logged in.';
    });
