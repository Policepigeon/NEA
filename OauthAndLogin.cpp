#include "crow_all.h"
#include <sqlite3.h>
#include <iostream>
#include <string>

// Function to insert user credentials into SQLite
void saveUserToDatabase(const std::string& name, const std::string& email) {
    sqlite3* db;
    char* errorMessage = 0;

    // Open SQLite database (creates it if it doesn't exist)
    int rc = sqlite3_open("users.db", &db);
    if (rc) {
        std::cerr << "Can't open database: " << sqlite3_errmsg(db) << std::endl;
        return;
    }

    // Create table if not exists
    const char* createTableQuery =
        "CREATE TABLE IF NOT EXISTS users ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "name TEXT NOT NULL, "
        "email TEXT NOT NULL UNIQUE);";

    rc = sqlite3_exec(db, createTableQuery, 0, 0, &errorMessage);
    if (rc != SQLITE_OK) {
        std::cerr << "SQL error: " << errorMessage << std::endl;
        sqlite3_free(errorMessage);
    }

    // Insert user data
    std::string insertQuery = "INSERT INTO users (name, email) VALUES ('" + name + "', '" + email + "');";
    rc = sqlite3_exec(db, insertQuery.c_str(), 0, 0, &errorMessage);
    if (rc != SQLITE_OK) {
        std::cerr << "SQL error: " << errorMessage << std::endl;
        sqlite3_free(errorMessage);
    } else {
        std::cout << "User saved successfully: " << name << " (" << email << ")" << std::endl;
    }

    // Close database
    sqlite3_close(db);
}

int main() {
    crow::SimpleApp app;

    // Define a POST route to save user data
    CROW_ROUTE(app, "/save-user").methods("POST"_method)([](const crow::request& req) {
        auto json = crow::json::load(req.body);
        if (!json) {
            return crow::response(400, "Invalid JSON");
        }

        std::string name = json["name"].s();
        std::string email = json["email"].s();

        // Save the user to the database
        saveUserToDatabase(name, email);

        return crow::response(200, "User saved successfully");
    });

    // Run the server on localhost:8080
    app.port(5600).multithreaded().run();
}
