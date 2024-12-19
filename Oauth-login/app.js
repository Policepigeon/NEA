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
        document.getElementById('user-info').textContent = `Logged in as: ${response.name} (${response.email})`;
    })
    .catch(() => {
        document.getElementById('user-info').textContent = 'Not logged in.';
    });

account.get()
    .then(response => {
        document.getElementById('user-info').textContent = `Logged in as: ${response.name} (${response.email})`;

        // Send the credentials to the C++ backend
        fetch('http://localhost:5600/save-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: response.name,
                email: response.email,
            }),
        })
        .then(res => {
            if (res.ok) {
                console.log('User credentials sent successfully');
            } else {
                console.error('Failed to send user credentials');
            }
        })
        .catch(err => console.error('Error:', err));

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
        document.getElementById('user-info').textContent = 'Not logged in.';
    });