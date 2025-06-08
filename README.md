# PixelPlace - A Collaborative Canvas

PixelPlace is a full-stack web application inspired by Reddit's r/Place. It allows users to collaboratively place pixels on a shared canvas in real-time. Each user has a cooldown period between pixel placements.

**Live Demo:** [Link to be added once deployed on Railway]

## Features

*   Real-time collaboration: Pixel changes are instantly visible to all connected users.
*   Shared Canvas: A 100x100 grid where users can place colored pixels.
*   Color Palette: A selection of colors to choose from.
*   Cooldown Timer: Users must wait 10 seconds between placing pixels.
*   Simple User Identification: Users are identified by a UUID stored in a cookie.

## Technologies Used

*   **Frontend:**
    *   React (with Vite)
    *   TypeScript
    *   TailwindCSS (v3.3.5)
    *   Socket.io Client
    *   Axios (for HTTP requests)
    *   js-cookie
    *   uuid
*   **Backend:**
    *   Node.js
    *   Express.js
    *   PostgreSQL (database)
    *   Socket.io (for real-time communication)
    *   `pg` (Node.js PostgreSQL client)
    *   `cors` (Cross-Origin Resource Sharing)
    *   `dotenv` (for environment variables)
*   **Database:**
    *   PostgreSQL (can be run locally or provisioned via a service like Railway)

## Project Structure

The project is organized into two main directories:

*   `/frontend`: Contains the React/Vite frontend application.
*   `/backend`: Contains the Node.js/Express backend API and Socket.io server.

Each directory has its own `package.json` and dependencies.

## Environment Variables

Create a `.env` file in both the `/frontend` and `/backend` directories by copying from their respective `.env.example` files.

### Backend (`backend/.env`)

| Variable            | Description                                                                 | Example Value                                        |
| ------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------- |
| `DATABASE_URL`      | Connection string for your PostgreSQL database.                             | `postgresql://user:password@host:port/database_name` |
| `PORT`              | The port on which the backend server will run.                              | `3001`                                               |
| `VITE_FRONTEND_URL` | The URL of the frontend application (used for CORS and Socket.io origins). | `http://localhost:5173`                              |

### Frontend (`frontend/.env`)

| Variable            | Description                                          | Example Value                   |
| ------------------- | ---------------------------------------------------- | ------------------------------- |
| `VITE_BACKEND_URL`  | The base URL for the backend API (including `/api`). | `http://localhost:3001/api`     |

**Note on `VITE_BACKEND_URL` vs `VITE_FRONTEND_URL`:**
*   The frontend uses `VITE_BACKEND_URL` to make API calls (e.g., `http://localhost:3001/api`).
*   The backend uses `VITE_FRONTEND_URL` (e.g., `http://localhost:5173`) to configure CORS correctly, allowing requests *from* the frontend origin for both HTTP and WebSocket connections.

## Setup and Local Development

### Prerequisites

*   Node.js (v16 or later recommended)
*   npm (or yarn)
*   A running PostgreSQL server (for local development)

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Create the .env file from the example
cp .env.example .env

# Update .env with your PostgreSQL connection string and other variables
# Example for DATABASE_URL: postgresql://youruser:yourpassword@localhost:5432/pixelplace_db
# Ensure your PostgreSQL server is running and the specified database exists.
# The initDB() function in db.js will attempt to create the 'pixels' table.

# Start the backend development server
npm run dev
# The server should start on the port specified in .env (default: 3001)
```

### 2. Frontend Setup

```bash
# Navigate to the frontend directory (from the project root)
cd frontend

# Install dependencies
npm install

# Create the .env file from the example
cp .env.example .env

# Update .env if your backend is running on a different URL/port
# VITE_BACKEND_URL should point to where your backend API is accessible

# Start the frontend development server
npm run dev
# The frontend should start on port 5173 by default and open in your browser.
```

You should now have the application running locally. The frontend will connect to the backend for API calls and real-time updates.

## API Endpoints

The backend API is accessible under the `/api` prefix (e.g., `http://localhost:3001/api`).

### `GET /api/health`

*   **Description:** Checks the health status of the backend server.
*   **Response (200 OK):**
    ```json
    {
      "status": "UP",
      "message": "Backend is healthy"
    }
    ```

### `GET /api/pixels`

*   **Description:** Fetches the current state of all pixels on the canvas. Returns an array of the most recent pixel data for each coordinate.
*   **Response (200 OK):**
    ```json
    [
      { "x": 0, "y": 0, "color": "#FF0000" },
      { "x": 1, "y": 5, "color": "#0000FF" }
      // ... other pixels
    ]
    ```
*   **Response (500 Internal Server Error):** If there's an issue fetching from the database.

### `POST /api/pixel`

*   **Description:** Allows a user to place or update a pixel on the canvas.
*   **Request Body (JSON):**
    ```json
    {
      "x": 10,        // X-coordinate (integer, 0-99)
      "y": 20,        // Y-coordinate (integer, 0-99)
      "color": "#AABBCC", // Hex color code (string)
      "userId": "user-uuid-string" // User's unique identifier (string)
    }
    ```
*   **Responses:**
    *   **201 Created:** Pixel placed/updated successfully.
        ```json
        {
          "message": "Pixel updated successfully",
          "pixel": {
            "id": 123,
            "x": 10,
            "y": 20,
            "color": "#AABBCC",
            "user_id": "user-uuid-string",
            "timestamp": "2023-10-27T10:00:00.000Z"
          }
        }
        ```
    *   **400 Bad Request:** Missing or invalid parameters, invalid color format, or coordinates out of bounds.
        ```json
        { "error": "Missing or invalid parameters (x, y, color, userId are required)." }
        // or
        { "error": "Invalid color format. Must be hex (e.g., #RRGGBB)." }
        // or
        { "error": "Coordinates out of bounds (0-99)." }
        ```
    *   **429 Too Many Requests:** Rate limit exceeded (user tried to place a pixel before cooldown ended).
        ```json
        {
          "error": "Rate limit exceeded. Try again later.",
          "cooldownActive": true,
          "timeLeftSec": 7 // Remaining seconds for cooldown
        }
        ```
    *   **500 Internal Server Error:** If there's an issue saving to the database.

## WebSocket Events

The backend uses Socket.io for real-time communication.

### Server Emits

*   **`pixel_updated`**:
    *   **Description:** Sent to all connected clients when a pixel is successfully placed or updated.
    *   **Payload:** An object containing the updated pixel's data.
        ```json
        {
          "x": 10,
          "y": 20,
          "color": "#AABBCC",
          "userId": "user-uuid-string", // The ID of the user who placed the pixel
          "timestamp": "2023-10-27T10:00:00.000Z" // Timestamp of the update
        }
        ```
*   **`welcome` (Optional):**
    *   **Description:** Sent to a client upon successful connection.
    *   **Payload:** A welcome string.
        ```
        "Welcome to PixelPlace! Real-time updates are active."
        ```

### Client Listens

*   **`pixel_updated`**: Client receives this event and updates its local canvas state to reflect the change.
*   **`connect`**, **`disconnect`**, **`connect_error`**: Standard Socket.io events handled by the client to manage connection status.

## Deployment (Railway)

This project is configured for easy deployment on [Railway](https://railway.app/).

1.  **Create a new Railway project** and connect it to your GitHub repository.
2.  **Add a PostgreSQL Database Service:**
    *   In your Railway project, add a new service and select "Database" > "PostgreSQL".
    *   Railway will provide you with a `DATABASE_URL` connection string.
3.  **Configure Backend Service:**
    *   Railway should detect the `backend/package.json` and set it up as a Node.js service.
    *   **Environment Variables:**
        *   Set `DATABASE_URL` to the one provided by your Railway PostgreSQL service.
        *   Set `PORT` (Railway usually sets this automatically, but good to confirm it's used by the app, which it is: `process.env.PORT || 3001`).
        *   Set `VITE_FRONTEND_URL` to the URL of your deployed frontend service on Railway (e.g., `https://your-frontend-app-name.up.railway.app`).
    *   **Start Command:** Railway typically uses `npm start`. Ensure your `backend/package.json` has a `start` script (e.g., `"start": "node server.js"`). If using `npm run dev` for local, you might need a different script for production or rely on Railway's default. For this project, `node server.js` is fine.
4.  **Configure Frontend Service:**
    *   Add another service pointing to your repository. Railway might need help to identify this as a separate app within the monorepo structure if it doesn't automatically detect `frontend/package.json`. You might need to specify the root directory for this service as `/frontend`.
    *   **Build Command (Vite):** `npm run build` (or `yarn build`) in the `/frontend` directory.
    *   **Install Command:** `npm install` (or `yarn install`) in the `/frontend` directory.
    *   **Publish Directory:** The output directory for Vite's build is `frontend/dist`. This should be served as static files.
    *   **Environment Variables:**
        *   Set `VITE_BACKEND_URL` to the URL of your deployed backend service on Railway (e.g., `https://your-backend-app-name.up.railway.app/api`).
5.  **Networking:** Railway's private networking should allow the backend service to connect to the PostgreSQL service using the provided `DATABASE_URL` without exposing the database publicly.
6.  **Domains:** Assign domains to your frontend and backend services as needed.

## Known Issues / Future Improvements

*   **Rate Limiting:** The current in-memory rate limiting is per server instance and resets on restart. A more robust solution would use Redis or a similar external store.
*   **Scalability:** For a large number of users, the current Socket.io setup (single server instance broadcasting to all) might need scaling (e.g., using Socket.io Redis adapter).
*   **User Authentication:** Implement proper user accounts instead of just UUIDs.
*   **Canvas Size/Performance:** A very large canvas might require optimizations for rendering and data transfer.
*   **Admin Tools:** Moderation tools for the canvas.

---

This README provides a good overview for users and developers.
