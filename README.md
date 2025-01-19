## **Tunisian Book Fair Project**

### **About the Project**
This is a web application created for my **Web Services academic course**. The platform aims to promote the **Tunisian literary legacy**, focusing on accessibility and inclusivity. It allows users to:
- Explore **Braille books**, **audiobooks**, and **research papers**.
- Register and log in to access additional features.
- Lay the groundwork for future functionalities like **book signings**, **meetups**, and **analytics**.

The project combines **frontend, backend**, and **database integration** to showcase practical web service development.

---

### **Key Features**
1. **User Authentication**:
   - Users can register and log in with roles like Reader, Author, Publisher, or Organizer.
   - Basic security measures implemented (passwords are hashed).

2. **Book Listings**:
   - Browse a list of **Braille books**, **audiobooks**, and **research papers**.
   - Dynamically display books from the database.

3. **Accessible Design**:
   - ARIA labels and basic keyboard navigation for improved usability.

---

### **How to Run**
#### **1. Backend Setup**
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/tunisian-book-fair.git
   cd tunisian-book-fair/backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the backend server:
   ```bash
   node server.js
   ```
4. The server will run on `http://localhost:5000`.

#### **2. Frontend Setup**
1. Open the `index.html` file located in the `frontend/` folder in your browser.

---

### **Project Structure**
```
tunisian-book-fair/
│
├── backend/               # Backend files
│   ├── server.js          # Main server file
│   ├── routes/            # API route definitions (auth, books)
│   ├── models/            # Database models
│   ├── db/                # Database configuration
│
├── frontend/              # Frontend files
│   ├── index.html         # Main HTML file
│   ├── css/               # CSS styles
│   ├── fonts/             # Website fonts
│   ├── images/            # Images for visuals
│   ├── js/                # Javascript for dynamics
│   
└── README.md              # Project documentation
```

---

### **Future Plans**
This is just the beginning! In the future, I plan to add:
1. **Book Signings**:
   - Let authors schedule signing sessions for readers.
2. **Meetups and Discussions**:
   - Organize events for book lovers and authors.
3. **Stand Booking**:
   - Allow publishers and authors to reserve stands at the fair.
4. **Accessibility Enhancements**:
   - Add text-to-speech and improved navigation for visually impaired users.
5. **Statistics and Analytics**:
   - Include insights like book popularity and reader engagement.

---

### **License**
This project was developed for my **Web Services course**, the topic chosen by my Professor.  
Feel free to check it out and use it for inspiration, but please give credit where it’s due! 😊  

---
