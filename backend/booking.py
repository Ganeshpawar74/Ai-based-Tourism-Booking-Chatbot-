import uuid
import json
import os
from datetime import datetime

# Simple file-based storage (no Firestore needed)
BOOKINGS_FILE = os.path.join(os.path.dirname(__file__), 'bookings.json')

def load_bookings():
    """Load bookings from JSON file"""
    if os.path.exists(BOOKINGS_FILE):
        try:
            with open(BOOKINGS_FILE, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_bookings(bookings):
    """Save bookings to JSON file"""
    with open(BOOKINGS_FILE, 'w') as f:
        json.dump(bookings, f, indent=2)

def create_booking(name, place, date, time):
    """Create a booking record (light version without Firestore)"""
    booking_id = str(uuid.uuid4())[:12]

    booking_data = {
        "booking_id": booking_id,
        "name": name,
        "place": place,
        "date": date,
        "time": time,
        "created_at": datetime.now().isoformat(),
        "payment_status": "pending",  # pending, completed, failed
        "order_id": None,
        "payment_id": None,
        "ticket_id": None
    }

    # Load existing bookings
    bookings = load_bookings()
    
    # Add new booking
    bookings[booking_id] = booking_data
    
    # Save to file
    save_bookings(bookings)

    return booking_id

def update_booking_payment(booking_id, order_id, payment_id, payment_status):
    """Update booking with payment information"""
    bookings = load_bookings()
    
    if booking_id in bookings:
        bookings[booking_id]["order_id"] = order_id
        bookings[booking_id]["payment_id"] = payment_id
        bookings[booking_id]["payment_status"] = payment_status
        save_bookings(bookings)
        return True
    return False

def get_booking(booking_id):
    """Get booking details"""
    bookings = load_bookings()
    return bookings.get(booking_id, None)