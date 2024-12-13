// Initialize Appwrite Client
const client = new Appwrite.Client();
client
    .setEndpoint('https://cloud.appwrite.io/v1') // Replace with your Appwrite endpoint
    .setProject('online-ide'); // Replace with your project ID

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
        // Send user data to C++ backend
        fetch('http://localhost:5000/store_user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: response.$id,
                name: response.name,
                email: response.email,
                token: response.$sessionId // Example session token
            })
        }).then(res => res.json())
          .then(data => console.log('Success:', data))
          .catch(err => console.error('Error:', err));
    });
