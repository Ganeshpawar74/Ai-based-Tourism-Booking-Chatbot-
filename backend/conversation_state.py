# In-memory session storage for conversation state
# In production, use Redis or database
conversations = {}

# Available time slots for booking
TIME_SLOTS = [
    "8:00 - 10:00 AM",
    "10:00 AM - 12:00 PM",
    "12:00 PM - 2:00 PM",
    "2:00 PM - 4:00 PM",
    "4:00 PM - 6:00 PM"
]

def get_or_create_session(session_id):
    """Get or create a conversation session"""
    if session_id not in conversations:
        conversations[session_id] = {
            # States: START -> CITY_SEARCH -> PLACE_SELECTION -> PLACE_DETAILS -> TIME_SELECTION -> DATE_SELECTION -> CONFIRMATION -> BOOKING_FORM -> SUMMARY -> PAYMENT
            "state": "START",
            "city": None,
            "city_key": None,
            "selected_place": None,
            "selected_time": None,
            "selected_date": None,
            "num_tickets": 1,
            "user_name": None,
            "user_email": None,
            "user_phone": None,
            "available_places": None,
            "price_per_ticket": 500,
            "booking_id": None
        }
    return conversations[session_id]

def update_session_state(session_id, updates):
    """Update session state"""
    session = get_or_create_session(session_id)
    session.update(updates)
    return session

def reset_session(session_id):
    """Reset conversation"""
    if session_id in conversations:
        conversations[session_id] = {
            "state": "START",
            "city": None,
            "city_key": None,
            "selected_place": None,
            "selected_time": None,
            "selected_date": None,
            "num_tickets": 1,
            "user_name": None,
            "user_email": None,
            "user_phone": None,
            "available_places": None,
            "price_per_ticket": 500,
            "booking_id": None
        }
    
def get_time_slots():
    """Return available time slots"""
    return TIME_SLOTS
