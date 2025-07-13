Of course. Here is a complete README for your project, with the instructions structured as you requested.

-----

# Ummah Fund 🕌

An AI-powered web application for managing interest-free charitable loans (Qard Hasan) and donations within a community.

This project uses Google's Gemini AI to intelligently validate funding requests based on charitable principles and to optimally allocate incoming donations to those in need.

-----

## Core Features

  * **🤖 AI-Powered Application Validation:** Uses Google's Gemini AI to review new funding requests against charitable principles, prioritizing essential needs.
  * **💸 AI-Powered Donation Allocation:** Intelligently allocates incoming donations to the most deserving pending requests in the database.
  * **📄 Simple Data Persistence:** Uses a local `data.json` file to act as a simple database for funding requests.
  * **💻 Interactive Frontend:** Separate, user-friendly pages for submitting new requests and making donations.

-----

## Tech Stack

  * **Backend:** Node.js, Express.js, Google Generative AI SDK
  * **Frontend:** HTML5, CSS, Vanilla JavaScript
  * **Database:** Flat-file JSON (`data.json`)

-----

## Setup and Installation

Before you begin, make sure you have [Node.js](https://nodejs.org/) installed on your machine.

1.  **Clone the repository**

    ```bash
    git clone <your-repository-url>
    cd <your-repository-name>
    ```

2.  **Install Backend Dependencies**
    Navigate to the project directory and run:

    ```bash
    npm install
    ```

3.  **Add Your API Key**
    Open the `server.js` file and replace the placeholder API key with your actual Google Gemini API key.

    ```javascript
    // Find this line in server.js
    const API_KEY = "REPLACE WITH YOUR ACTUAL GEMINI API KEY";
    ```

-----

## How to Run the Project

For the application to work, the backend server must be running so the frontend can communicate with it.

### 1\. Run the Backend Server

First, start the backend server from your project's root directory.

```bash
npm start
```

This will start the server on `http://localhost:3000`. You should see the message "Backend server running on port 3000" in your terminal. Leave this terminal window running.

### 2\. Run the Frontend

Next, open the frontend pages in your web browser.

For the best experience and to avoid potential issues, **do not open the HTML files directly**. Use a live server extension.

  * **If you use Visual Studio Code:**
    1.  Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension.
    2.  Right-click on your `homepage.html` or `funding.html` file and select "Open with Live Server".
    3.  Your browser will open with a URL like `http://127.0.0.1:5500`, and you can now navigate your site.

You can now interact with the website, submit funding requests, and make donations.

### 3\. Run the Backend

1. Run node server.cjs to get the backend running
2. Add It to the live server's shared servers

-----

## API Endpoints

The backend provides the following API endpoints:

  * `POST /api/applications`: Submits a new funding request for AI validation.
  * `POST /api/donations`: Sends a new donation to be allocated by the AI.
  * `GET /api/requests`: Retrieves a list of all funding requests.
  * `GET /api/requests/pending`: Retrieves a list of only pending requests.
