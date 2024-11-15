using namespace std;

#include <iostream>
#include <cstdlib>
#include <string>

    class user{
        //attributes, both private and public
        public:  //dont set the password and the email to public
        string name;
        int uid;
        private:
        string email;
        string password;
        
        //making a setter for email and password
        public:
        void setemail (string emailtemp){
            email = emailtemp;
        }
        void setpassword (string passwordtemp){
            password = passwordtemp;
        }
        string getEmail() {
            return email;
        }
        
        string getPassword() {
            return password;
        }

    };
int main(){
    int nextuid = 0;
    string emailtemp;
    string passwordtemp; 
    user u1;
    u1.uid = nextuid; //assigning the uid
    nextuid++; //this increments the uid 
    cout << "Enter the email: "; //getting the user's inputs for  the differing fields
    cin >> emailtemp;
    u1.setemail(emailtemp);
    cout << "Enter password";
    cin >> passwordtemp;
    u1.setpassword(passwordtemp);
    cout << "Enter a username";
    cin >> u1.name;

    //now i can return the values from the class user to check that they worked
    cout<< "username is " << u1.name << endl;
    cout << "uid is " << u1.uid << endl;
    cout<< "email is " << u1.getEmail() << endl;
    cout << "password is " << u1.getPassword() << endl;

    return 0;
}
