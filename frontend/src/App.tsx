import React, { useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios'; // Import axios
import './App.css';
import Canvas from './components/Canvas';
import ColorPalette from './components/ColorPalette';
import Timer from './components/Timer';

export interface Pixel {
  x: number;
  y: number;
  color: string;
}

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';
const CANVAS_WIDTH = 100;
const CANVAS_HEIGHT = 100;
const PIXEL_SIZE = 6; // Adjust for desired canvas display size (e.g., 600x600px if PIXEL_SIZE is 6)
const COOLDOWN_SECONDS = 10;

function App() {
  const [backendStatus, setBackendStatus] = useState("Loading...");
  const [selectedColor, setSelectedColor] = useState<string>("#FFFFFF");
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [cooldownTime, setCooldownTime] = useState<number>(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [isPlacingPixel, setIsPlacingPixel] = useState<boolean>(false);
  const [placingPixelError, setPlacingPixelError] = useState<string | null>(null);


  // Initialize User ID
  useEffect(() => {
    let currentUserId = Cookies.get('rPlaceCloneUserId');
    if (!currentUserId) {
      currentUserId = uuidv4();
      Cookies.set('rPlaceCloneUserId', currentUserId, { expires: 365 }); // Cookie expires in 1 year
    }
    setUserId(currentUserId);
    console.log("User ID:", currentUserId);
  }, []);

  // Fetch initial canvas state and backend health
  useEffect(() => {
    axios.get(`${API_BASE_URL}/health`)
      .then(response => setBackendStatus(response.data.message || "Backend connected"))
      .catch(err => {
        console.error("Health check failed:", err);
        setBackendStatus("Backend connection failed.");
      });

    axios.get(`${API_BASE_URL}/pixels`)
      .then(response => {
        setPixels(response.data);
        console.log("Fetched initial pixels:", response.data.length);
      })
      .catch(err => {
        console.error("Failed to fetch pixels:", err);
        // Optionally set an error state to display to the user
      });
  }, []);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownTime > 0) {
      const timerId = setInterval(() => {
        setCooldownTime(prevTime => prevTime - 1);
      }, 1000);
      return () => clearInterval(timerId);
    }
  }, [cooldownTime]);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
  };

  const handlePixelClick = useCallback(async (x: number, y: number) => {
    if (!userId) {
      setPlacingPixelError("User ID not available. Please refresh.");
      return;
    }
    if (cooldownTime > 0) {
      setPlacingPixelError(`Please wait for the cooldown (${cooldownTime}s left).`);
      return;
    }
    if (isPlacingPixel) {
      return; // Prevent multiple submissions
    }

    setIsPlacingPixel(true);
    setPlacingPixelError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/pixels`, {
        x,
        y,
        color: selectedColor,
        userId,
      });

      if (response.status === 201) {
        // Update pixel locally immediately for responsiveness
        setPixels(prevPixels => {
          const newPixels = [...prevPixels];
          const existingPixelIndex = newPixels.findIndex(p => p.x === x && p.y === y);
          if (existingPixelIndex > -1) {
            newPixels[existingPixelIndex] = { x, y, color: selectedColor };
          } else {
            newPixels.push({ x, y, color: selectedColor });
          }
          return newPixels;
        });
        setCooldownTime(COOLDOWN_SECONDS); // Start cooldown
        // Optional: If WebSockets are implemented, backend would push this update
      }
    } catch (error) {
      console.error('Error placing pixel:', error);
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 429) {
             const timeLeft = error.response.data.timeLeftSec || COOLDOWN_SECONDS;
             setCooldownTime(timeLeft); // Sync cooldown with server
             setPlacingPixelError(error.response.data.error || "Rate limit exceeded.");
        } else {
            setPlacingPixelError(error.response.data.error || "Failed to place pixel.");
        }
      } else {
        setPlacingPixelError("An unexpected error occurred.");
      }
    } finally {
      setIsPlacingPixel(false);
    }
  }, [userId, selectedColor, cooldownTime, isPlacingPixel]);


  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 font-sans">
      <header className="w-full max-w-5xl mb-6 text-center">
        <h1 className="text-5xl font-bold text-cyan-400 tracking-tight">PixelPlace</h1>
        <p className="text-lg text-gray-400 mt-1">Collaborate one pixel at a time. (<span className="text-xs text-gray-500">UserID: {userId?.substring(0,8)}...</span>)</p>
        <div className="mt-3 p-2 bg-gray-800 rounded-md text-sm shadow">
          Backend Status: <span className="font-semibold text-yellow-300">{backendStatus}</span>
        </div>
      </header>

      <main className="w-full max-w-5xl flex flex-col lg:flex-row gap-6">
        <div className="flex-grow flex flex-col items-center justify-start">
          {/* Add a wrapper for horizontal scrolling if canvas is too wide */}
          <div className="w-full overflow-x-auto pb-2">
            <Canvas
              pixels={pixels}
              onPixelClick={handlePixelClick}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            pixelSize={PIXEL_SIZE}
            disabled={cooldownTime > 0 || isPlacingPixel}
            />
          </div>
          {placingPixelError && (
            <div className="mt-2 text-center p-2 bg-red-800 text-red-200 rounded-md text-sm">
              {placingPixelError}
            </div>
          )}
           {isPlacingPixel && !placingPixelError && (
            <div className="mt-2 text-center p-2 bg-blue-800 text-blue-200 rounded-md text-sm">
              Placing pixel...
            </div>
          )}
        </div>
        <aside className="w-full lg:w-72 flex flex-col gap-6">
          <div className="bg-gray-800 p-5 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-teal-300 border-b border-gray-700 pb-2">Color Palette</h2>
            <ColorPalette onSelectColor={handleColorSelect} />
            <div className="mt-4 text-sm text-gray-400">
              Selected: <span className="font-bold p-1 rounded" style={{ backgroundColor: selectedColor, color: selectedColor === '#000000' || selectedColor === '#0000FF' || selectedColor === '#800080' ? 'white': 'black' }}>{selectedColor}</span>
            </div>
          </div>
          <div className="bg-gray-800 p-5 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-orange-300 border-b border-gray-700 pb-2">Cooldown</h2>
            <Timer timeLeft={cooldownTime} />
          </div>
        </aside>
      </main>

      <footer className="mt-16 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} PixelPlace. Inspired by r/place.</p>
        <p>Real-time updates via WebSockets are not yet implemented. Refresh to see others' changes.</p>
      </footer>
    </div>
  );
}

export default App;
