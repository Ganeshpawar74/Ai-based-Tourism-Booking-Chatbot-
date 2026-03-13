import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the Flask app from backend
from backend.app import app

# Vercel expects the app to be exported as 'app'
# This is automatically picked up by Vercel's Python runtime
