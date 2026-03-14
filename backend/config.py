"""
Configuration file for the Tourism Booking Bot
Loads environment variables from .env file
"""
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from .env file
# First, find the .env file location
env_file = Path(__file__).parent / '.env'
if env_file.exists():
    print(f"[CONFIG] Loading .env from: {env_file}")
    load_dotenv(dotenv_path=env_file, override=True)
else:
    print(f"[CONFIG] WARNING: .env file not found at {env_file}")
    load_dotenv(override=True)

class Config:
    """Base configuration"""
    
    # Gemini AI Configuration
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'YOUR_API_KEY')
    GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')
    
    # Flask Configuration
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    FLASK_HOST = os.getenv('FLASK_HOST', '127.0.0.1')
    FLASK_PORT = int(os.getenv('FLASK_PORT', 5000))
    
    # Firebase Configuration
    FIREBASE_KEY_PATH = os.getenv('FIREBASE_KEY_PATH', 'firebase_key.json')
    FIREBASE_PROJECT_ID = os.getenv('FIREBASE_PROJECT_ID', '')
    
    # CORS Configuration
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:5000').split(',')
    
    # Database Configuration
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///tourism.db')
    
    # ===== RAZORPAY PAYMENT CONFIGURATION =====
    # Production-ready Razorpay integration
    # Get your keys from: https://dashboard.razorpay.com/app/keys
    RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID', '')
    RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET', '')
    RAZORPAY_WEBHOOK_SECRET = os.getenv('RAZORPAY_WEBHOOK_SECRET', '')
    
    # Payment Settings
    DEFAULT_TICKET_PRICE = float(os.getenv('DEFAULT_TICKET_PRICE', 1))  # In INR
    MIN_BOOKING_AMOUNT = float(os.getenv('MIN_BOOKING_AMOUNT', 100))      # In INR
    MAX_BOOKING_AMOUNT = float(os.getenv('MAX_BOOKING_AMOUNT', 100000))   # In INR
    
    # QR Code Configuration
    QR_CODE_VERSION = int(os.getenv('QR_CODE_VERSION', 1))
    QR_CODE_BOX_SIZE = int(os.getenv('QR_CODE_BOX_SIZE', 10))
    QR_CODE_BORDER = int(os.getenv('QR_CODE_BORDER', 2))
    
    # ===== ELEVENLABS TEXT-TO-SPEECH CONFIGURATION =====
    # Get your API key from: https://elevenlabs.io/
    # Set as environment variable: ELEVENLABS_API_KEY
    ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY', '')
    ELEVENLABS_VOICE_ID = os.getenv('ELEVENLABS_VOICE_ID', '21m00Tcm4TlvDq8ikWAM')  # Default: Rachel voice
    ELEVENLABS_MODEL_ID = os.getenv('ELEVENLABS_MODEL_ID', 'eleven_multilingual_v2')
    
    # Payment Timeout (in seconds)
    PAYMENT_TIMEOUT = int(os.getenv('PAYMENT_TIMEOUT', 3600))  # 1 hour


class DevelopmentConfig(Config):
    """Development environment configuration"""
    DEBUG = True
    TESTING = False


class ProductionConfig(Config):
    """Production environment configuration"""
    DEBUG = False
    TESTING = False


class TestingConfig(Config):
    """Testing environment configuration"""
    DEBUG = True
    TESTING = True
    DATABASE_URL = 'sqlite:///:memory:'


# Select config based on environment
config_name = os.getenv('FLASK_ENV', 'development')
config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig
}

config = config_map.get(config_name, DevelopmentConfig)
