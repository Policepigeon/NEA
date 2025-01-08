// Initialize Appwrite Client
const client = new Appwrite.Client();
client
    .setEndpoint('https://cloud.appwrite.io/v1') 
    .setProject('online-ide'); 
    .setKey("standard_fe85db02bc1a32f0c356f167e6e3f19265ed65643fa5842c57c7d985ecb1d92ea64882a4137f22aaf2053397e9a1d7c8ed1dffbd4ea7b8faa97cd9f668188e9d5c88820cb2706dd28f999fa58dab267eb00ac98f1f0431150e20f14c378ccd77b6f04a1f585b409e50e32d264aab170b852fcc2947aa4c8f19ec6fea0ca77323");
const account = new Appwrite.Account(client);

// Handle Google Login
document.getElementById('google-login').addEventListener('click', () => {
    account.createOAuth2Session('google');
});

// Check if the user is already logged in
account.get()

    .then(response => {
        console.log("User Details:", response);
    // You can access response.name, response.email, etc.
})
.catch(error => {
    console.error("Error fetching user details:", error);
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
