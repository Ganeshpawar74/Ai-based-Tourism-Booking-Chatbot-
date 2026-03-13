"""
Firebase Configuration Module
NOTE: Firebase is disabled for now. Using file-based storage for bookings.
To enable Firebase, uncomment the initialization code below.
"""
import logging

logger = logging.getLogger(__name__)

# Firebase initialization is disabled
# Using file-based JSON storage instead
db = None

logger.info("Firebase configuration: DISABLED (using file-based storage)")

# Uncomment the code below to enable Firebase if needed:
"""
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import os
from config import config

# Get the path to firebase credentials
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
cred_path = os.path.join(BASE_DIR, config.FIREBASE_KEY_PATH)

# Initialize Firebase with credentials
try:
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        logger.info("Firebase Firestore initialized successfully")
    else:
        logger.warning(f"Firebase key file not found at {cred_path}")
except Exception as e:
    logger.warning(f"Firebase initialization error: {str(e)}")
"""