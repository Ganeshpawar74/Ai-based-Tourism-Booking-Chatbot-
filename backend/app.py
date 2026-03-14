print("[DEBUG] app.py is loading NOW - FRESH RUN")

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from config import config
print("[DEBUG] config imported")
import os
import uuid
import logging
import json
from datetime import datetime

# Direct import from tourist database - NO Gemini API
from tourist_database import find_city_by_name, get_formatted_places_response, get_place_details, TOURIST_PLACES_DB
from payment import create_razorpay_order, verify_payment_signature
from ticket_generator import generate_ticket, generate_qr_code_base64

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Get paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')

# Fallback to current working directory if needed
if not os.path.exists(FRONTEND_DIR):
    FRONTEND_DIR = os.path.join(os.getcwd(), 'frontend')

# Create app
app = Flask(__name__)
CORS(app)

# Add cache-busting headers to prevent browser from caching old responses
@app.after_request
def set_cache_headers(response):
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

# Log configuration on startup
logger.info(f"Razorpay Key ID: {config.RAZORPAY_KEY_ID[:10]}..." if config.RAZORPAY_KEY_ID else "Razorpay Key ID: NOT SET")
logger.info(f"Razorpay Key Secret: {'SET' if config.RAZORPAY_KEY_SECRET else 'NOT SET'}")

# ===== FRONTEND ROUTES =====
@app.route('/')
def home():
    """Serve index.html"""
    try:
        with open(os.path.join(FRONTEND_DIR, 'index.html'), 'r', encoding='utf-8') as f:
            html = f.read()
        return html
    except Exception as e:
        return f"Error loading index.html: {str(e)}", 500

@app.route('/style.css')
def serve_css():
    """Serve CSS file"""
    return send_from_directory(FRONTEND_DIR, 'style.css')

@app.route('/chatbot.js')
def serve_js():
    """Serve JS file"""
    return send_from_directory(FRONTEND_DIR, 'chatbot.js')

# ===== API ROUTES =====
@app.route('/chat', methods=['POST'])
def chat():
    """AI Chat endpoint"""
    try:
        # Get JSON safely
        data = request.get_json()

        if not data:
            return jsonify({
                "reply": "Please send a message.",
                "session_state": "CHAT_ACTIVE"
            })

        # Extract message
        user_message = data.get("message", "").strip()
        session_id = data.get("session_id", "")

        # Validate message
        if user_message == "":
            return jsonify({
                "reply": "Please type a city name or travel query.",
                "session_state": "CHAT_ACTIVE"
            })

        # Debug log (VERY IMPORTANT)
        logger.info(f"User message received: {user_message}")

        # Get response from tourist database directly
        city_key, city_data = find_city_by_name(user_message)
        
        if city_key and city_data:
            # Use the updated function that includes city description and place names
            response_text, places_list = get_formatted_places_response(city_key, city_data)
            
            logger.info(f"[STAGE_1_CITY_SEARCH] City: {city_key}")
            logger.info(f"[STAGE_1_RESPONSE] Reply includes city name + description + instruction text")
            logger.info(f"[STAGE_1_PLACES_BUTTON_NAMES] {places_list}")
            logger.info(f"[STAGE_1_VERIFICATION] {len(places_list)} place names extracted")
            
            return jsonify({
                "reply": response_text,
                "places": places_list,
                "is_city_query": True,
                "city_key": city_key,
                "session_state": "CHAT_ACTIVE",
                "selected_place": None
            })
        else:
            # City not found - show guidance
            reply_text = """<b>🤖 Tourism Booking Bot</b>

I can help you discover amazing tourist places in major Indian cities!

<b>🎟️ What I can do:</b>
• Show top 5 tourist places in any city
• Display ticket prices and timings
• Provide place descriptions and ratings
• Help you book tickets and generate QR codes

<b>✨ Just type a city name</b> like:
"Delhi", "Jaipur", "Agra", "Mumbai", "Goa", etc.

Let me know which city you'd like to explore!"""
            return jsonify({
                "reply": reply_text,
                "places": [],
                "is_city_query": False,
                "session_state": "CHAT_ACTIVE",
                "selected_place": None
            })

        logger.info(f"Response sent successfully")

    except Exception as e:
        logger.error(f"Chat route error: {str(e)}", exc_info=True)

        return jsonify({
            "reply": f"🔧 NEW ERROR HANDLER v2: {str(e)}",
            "session_state": "ERROR",
            "error_time": "2026-03-13-v2"
        }), 500


@app.route('/place-details', methods=['POST'])
def place_details():
    """Get details about a specific place in a city"""
    try:
        data = request.get_json()
        city = data.get('city', '').strip()
        place = data.get('place', '').strip()
        
        logger.info(f"[PLACE_DETAILS] Requested: city='{city}', place='{place}'")
        
        # Find city in database
        city_key, city_data = find_city_by_name(city)
        logger.info(f"[PLACE_DETAILS] City lookup result: city_key={city_key}, city_data exists={city_data is not None}")
        
        if not city_key or not city_data:
            logger.error(f"[PLACE_DETAILS] City not found: {city}")
            # Return 200 with error message instead of 404 for better frontend handling
            return jsonify({
                "error": "City not found. Please try again.",
                "place": "NA",
                "city": city
            }), 200
        
        # Find place in city
        places = city_data.get('places', [])
        logger.info(f"[PLACE_DETAILS] Total places in {city_key}: {len(places)}")
        logger.info(f"[PLACE_DETAILS] Available places: {[p['name'] for p in places]}")
        logger.info(f"[PLACE_DETAILS] Looking for place: '{place}' (length: {len(place)})")
        
        matching_place = None
        
        # Try exact match first (case-insensitive)
        place_lower = place.lower().strip()
        for p in places:
            p_name_lower = p['name'].lower().strip()
            logger.info(f"[PLACE_DETAILS] Exact match check: '{p_name_lower}' == '{place_lower}': {p_name_lower == place_lower}")
            if p_name_lower == place_lower:
                matching_place = p
                logger.info(f"[PLACE_DETAILS] EXACT MATCH FOUND: {p['name']}")
                break
        
        # Try partial match if no exact match found
        if not matching_place:
            logger.info(f"[PLACE_DETAILS] No exact match found, trying partial match...")
            for p in places:
                p_name_lower = p['name'].lower().strip()
                logger.info(f"[PLACE_DETAILS] Partial match check: '{p_name_lower}' contains '{place_lower}': {place_lower in p_name_lower}")
                if place_lower in p_name_lower or p_name_lower in place_lower:
                    matching_place = p
                    logger.info(f"[PLACE_DETAILS] PARTIAL MATCH FOUND: {p['name']}")
                    break
        
        if not matching_place:
            logger.error(f"[PLACE_DETAILS] Place not found: '{place}' in city {city_key}")
            logger.error(f"[PLACE_DETAILS] Available places in {city_key}: {[p['name'] for p in places]}")
            return jsonify({
                "error": f"Place '{place}' not found in {city_key}",
                "place": "NA",
                "available_places": [p['name'] for p in places]
            }), 200
        
        logger.info(f"[PLACE_DETAILS] Returning place: {matching_place['name']}")
        # Return both place name AND description
        return jsonify({
            "place": matching_place['name'],
            "description": matching_place.get('description', 'No description available'),
            "city": city_data['name'],
            "success": True
        }), 200
        
    except Exception as e:
        logger.error(f"[PLACE_DETAILS] EXCEPTION ERROR: {str(e)}", exc_info=True)
        return jsonify({
            "error": f"Server error: {str(e)}",
            "place": "NA",
            "success": False
        }), 200


@app.route('/parse-booking-intent', methods=['POST'])
def parse_booking_intent():
    """Parse user message to extract city and place for direct booking"""
    try:
        data = request.get_json()
        message = data.get("message", "").strip().lower()
        
        logger.info(f"[PARSE_BOOKING_INTENT] Parsing message: {message}")
        
        # Extract city and place from message
        # Pattern: "book/ticket for [PLACE] in/at [CITY]"
        
        city_found = None
        place_found = None
        
        # Try to find city first
        for city_key, city_data in TOURIST_PLACES_DB.items():
            city_name_lower = city_data['name'].lower()
            if city_name_lower in message or city_key in message:
                city_found = (city_key, city_data)
                logger.info(f"[PARSE_BOOKING_INTENT] City found: {city_key}")
                break
        
        if not city_found:
            logger.info(f"[PARSE_BOOKING_INTENT] No city found in message")
            return jsonify({
                "success": False,
                "message": "No city detected in your message"
            }), 200
        
        city_key, city_data = city_found
        city_name = city_data['name']
        places = city_data.get('places', [])
        
        # Try to find place name from the cities
        message_without_city = message.replace(city_key, "").replace(city_name.lower(), "")
        
        for place_obj in places:
            place_name_lower = place_obj['name'].lower()
            if place_name_lower in message or place_name_lower in message_without_city:
                place_found = place_obj
                logger.info(f"[PARSE_BOOKING_INTENT] Place found: {place_obj['name']}")
                break
        
        if place_found:
            # Found both city and place - return place details
            response_text, places_list = get_formatted_places_response(city_key, city_data)
            return jsonify({
                "success": True,
                "city_key": city_key,
                "city_name": city_name,
                "place_name": place_found['name'],
                "place_description": place_found.get('description', 'No description available'),
                "reply": response_text,
                "places": places_list
            }), 200
        else:
            # Found city but not place - return city with places for selection
            response_text, places_list = get_formatted_places_response(city_key, city_data)
            logger.info(f"[PARSE_BOOKING_INTENT] City found but place not specific, returning places for selection")
            return jsonify({
                "success": True,
                "city_key": city_key,
                "city_name": city_name,
                "place_name": None,
                "places": places_list,
                "reply": response_text
            }), 200
        
    except Exception as e:
        logger.error(f"[PARSE_BOOKING_INTENT] Error: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/booking-summary', methods=['POST'])
def booking_summary():
    """Generate booking summary before payment"""
    try:
        data = request.get_json()
        
        place = data.get('place', '')
        city = data.get('city', '')
        time_slot = data.get('time_slot', '')
        date = data.get('date', '')
        num_tickets = data.get('num_tickets', 1)
        ticket_price = data.get('ticket_price', 1)
        
        # Calculate total
        total_price = int(ticket_price) * int(num_tickets)
        
        # Create summary
        summary = f"""📋 <b>BOOKING SUMMARY</b>
        
📍 <b>Place:</b> {place}
🏙️ <b>City:</b> {city}
⏰ <b>Time:</b> {time_slot}
📅 <b>Date:</b> {date}
🎫 <b>Tickets:</b> {num_tickets}
💰 <b>Price per Ticket:</b> ₹{ticket_price}
💵 <b>Total Amount:</b> ₹{total_price}
"""
        
        return jsonify({
            "summary": summary,
            "total_price": total_price
        }), 200
    
    except Exception as e:
        logger.error(f"Booking summary error: {str(e)}", exc_info=True)
        return jsonify({
            "error": str(e)
        }), 500


@app.route('/booking-form', methods=['POST'])
def booking_form():
    """Booking form endpoint - Fire base-free implementation"""
    logger.info("="*60)
    logger.info("BOOKING FORM ENDPOINT CALLED")
    logger.info("="*60)
    
    try:
        logger.info("Step 1: Parsing request JSON...")
        data = request.json
        logger.info(f"Step 2: Request parsed: {list(data.keys())}")
        
        name = data.get('name', '')
        email = data.get('email', '')
        phone = data.get('phone', '')
        num_tickets = data.get('num_tickets', 1)
        place = data.get('place', 'Tourism Place')
        time_slot = data.get('time_slot', '10:00 AM')
        
        logger.info(f"Step 3: Creating booking for: {name}, {place}, {time_slot}")
        
        # Bypass create_booking to avoid any Firebase initialization
        logger.info("Step 4: Before imports...")
        import json
        import uuid
        from datetime import datetime as dt
        logger.info("Step 5: After imports...")
        
        booking_id = str(uuid.uuid4())[:12]
        bookings_file = os.path.join(os.path.dirname(__file__), 'bookings.json')
        
        logger.info(f"Step 6: Booking ID generated: {booking_id}")
        
        # Load existing bookings
        logger.info("Step 7: Loading existing bookings...")
        try:
            with open(bookings_file, 'r') as f:
                bookings = json.load(f)
            logger.info(f"Step 8: Loaded {len(bookings)} existing bookings")
        except Exception as load_err:
            logger.info(f"Step 8b: No existing bookings file, creating new: {load_err}")
            bookings = {}
        
        # Create new booking
        logger.info("Step 9: Creating booking data...")
        booking_data = {
            "booking_id": booking_id,
            "name": name,
            "place": place,
            "date": '2026-03-15',
            "time": time_slot,
            "created_at": dt.now().isoformat(),
            "payment_status": "pending",
            "order_id": None,
            "payment_id": None,
            "ticket_id": None
        }
        logger.info("Step 10: Adding booking to dictionary...")
        
        bookings[booking_id] = booking_data
        
        # Save to file
        logger.info("Step 11: Saving to file...")
        with open(bookings_file, 'w') as f:
            json.dump(bookings, f, indent=2)
        logger.info("Step 12: File saved successfully!")
        
        logger.info(f"Booking created with ID: {booking_id}")
        
        response_data = {
            'success': True,
            'booking_id': booking_id,
            'name': name,
            'email': email,
            'place': place,
            'time_slot': time_slot,
            'num_tickets': num_tickets
        }
        logger.info(f"Step 13: Returning response...")
        return jsonify(response_data)
    except Exception as e:
        logger.error(f"ERROR in booking endpoint: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/test-razorpay', methods=['GET'])
def test_razorpay():
    """Test Razorpay configuration"""
    try:
        key_id = config.RAZORPAY_KEY_ID if hasattr(config, 'RAZORPAY_KEY_ID') else ''
        key_secret = config.RAZORPAY_KEY_SECRET if hasattr(config, 'RAZORPAY_KEY_SECRET') else ''
        
        key_id_set = bool(key_id and key_id != '' and key_id != 'YOUR_KEY')
        key_secret_set = bool(key_secret and key_secret != '' and key_secret != 'YOUR_SECRET')
        
        result = {
            'razorpay_key_id_set': key_id_set,
            'razorpay_key_secret_set': key_secret_set,
            'key_id_preview': key_id[:15] + '...' if key_id_set else 'NOT SET',
            'razorpay_connection': 'SUCCESS' if (key_id_set and key_secret_set) else 'FAILED: Keys not configured'
        }
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e), 'razorpay_connection': 'ERROR'}), 500

@app.route('/create-razorpay-order', methods=['POST'])
def create_razorpay_order_endpoint():
    """Create a Razorpay order"""
    try:
        logger.info("=== RAZORPAY ORDER CREATION REQUEST ===")
        
        data = request.json
        logger.info(f"Request data: {data}")
        
        amount = float(data.get('amount', 500))  # Amount in rupees
        name = data.get('name', '')
        email = data.get('email', '')
        phone = data.get('phone', '')
        place = data.get('place', '')
        
        logger.info(f"Amount: {amount} INR")
        logger.info(f"Customer: {name}, {email}, {phone}")
        logger.info(f"Place: {place}")
        
        # Check if Razorpay keys are configured
        if not config.RAZORPAY_KEY_ID or not config.RAZORPAY_KEY_SECRET:
            logger.error("Razorpay keys are not configured!")
            return jsonify({
                'success': False, 
                'error': 'Razorpay keys not configured in environment'
            }), 500
        
        receipt_id = str(uuid.uuid4())[:20]
        logger.info(f"Receipt ID: {receipt_id}")
        
        notes = {
            'name': name,
            'email': email,
            'phone': phone,
            'place': place
        }
        
        logger.info("Creating Razorpay order...")
        order = create_razorpay_order(amount, receipt_id, notes)
        
        logger.info(f"Order created successfully: {order['id']}")
        
        return jsonify({
            'success': True,
            'order_id': order['id'],
            'amount': amount,
            'currency': 'INR',
            'key_id': config.RAZORPAY_KEY_ID,
            'name': name,
            'email': email,
            'phone': phone
        })
    except Exception as e:
        logger.error(f"Error creating Razorpay order: {str(e)}", exc_info=True)
        return jsonify({
            'success': False, 
            'error': str(e)
        }), 500

@app.route('/verify-payment', methods=['POST'])
def verify_payment():
    """Verify Razorpay payment signature and save payment status"""
    try:
        logger.info("=== PAYMENT VERIFICATION START ===")
        data = request.json
        razorpay_order_id = data.get('razorpay_order_id', '')
        razorpay_payment_id = data.get('razorpay_payment_id', '')
        razorpay_signature = data.get('razorpay_signature', '')
        booking_id = data.get('booking_id', '')
        
        logger.info(f"Order ID: {razorpay_order_id}")
        logger.info(f"Payment ID: {razorpay_payment_id}")
        logger.info(f"Booking ID: {booking_id}")
        
        # Verify signature
        is_valid = verify_payment_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
        
        if is_valid:
            logger.info("✅ Signature verification successful!")
            
            # Generate QR code with booking details passed from frontend
            qr_code_data = None
            try:
                # Get booking details from request
                name = data.get('name', 'Guest')
                email = data.get('email', '')
                phone = data.get('phone', '')
                place = data.get('place', 'Tourism Place')
                city = data.get('city', '')
                time_slot = data.get('time', '')
                date = data.get('date', '')
                tickets = data.get('tickets', 1)
                total_amount = data.get('total_amount', 0)
                
                # Create QR code data string with all booking information
                qr_data = f"""BOOKING TICKET
Ticket ID: {booking_id}
━━━━━━━━━━━━━━━━━
Name: {name}
Email: {email}
Phone: {phone}
━━━━━━━━━━━━━━━━━
Place: {place}
City: {city}
Date: {date}
Time: {time_slot}
Tickets: {tickets}
Total: ₹{total_amount}
━━━━━━━━━━━━━━━━━
Payment ID: {razorpay_payment_id}
Status: CONFIRMED"""
                
                # Generate QR code as base64
                qr_code_data = generate_qr_code_base64(qr_data)
                logger.info(f"✅ QR Code generated for booking: {booking_id}")
                
                # Save booking data to file for records
                try:
                    bookings_file = os.path.join(os.path.dirname(__file__), 'bookings.json')
                    bookings = {}
                    
                    # Load existing bookings if file exists
                    if os.path.exists(bookings_file):
                        with open(bookings_file, 'r') as f:
                            bookings = json.load(f)
                    
                    # Save new booking
                    bookings[booking_id] = {
                        'name': name,
                        'email': email,
                        'phone': phone,
                        'place': place,
                        'city': city,
                        'date': date,
                        'time': time_slot,
                        'tickets': tickets,
                        'total_amount': total_amount,
                        'payment_status': 'completed',
                        'order_id': razorpay_order_id,
                        'payment_id': razorpay_payment_id,
                        'timestamp': datetime.now().isoformat()
                    }
                    
                    # Write back to file
                    with open(bookings_file, 'w') as f:
                        json.dump(bookings, f, indent=2)
                    
                    logger.info(f"✅ Booking saved to file: {booking_id}")
                except Exception as save_error:
                    logger.warning(f"Could not save booking to file: {str(save_error)}")
                    
            except Exception as e:
                logger.error(f"QR code generation error: {str(e)}", exc_info=True)
            
            summary = "✅ Booking Confirmed!\n\n🎉 Your ticket has been successfully booked.\n📲 Check your email for the booking details."
            return jsonify({
                'success': True,
                'summary': summary,
                'qr_code': qr_code_data,
                'message': 'Payment verified successfully',
                'booking_id': booking_id,
                'payment_id': razorpay_payment_id
            })
        else:
            logger.error("❌ Signature verification failed")
            
            return jsonify({
                'success': False,
                'message': 'Payment verification failed'
            }), 400
    except Exception as e:
        logger.error(f"Verification error: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== RAZORPAY WEBHOOK ENDPOINT (for production) =====
@app.route('/razorpay-webhook', methods=['POST'])
def razorpay_webhook():
    """
    Razorpay webhook endpoint for handling payment notifications
    This endpoint receives events from Razorpay server directly
    """
    try:
        logger.info("="*70)
        logger.info("📨 RAZORPAY WEBHOOK RECEIVED")
        logger.info("="*70)
        
        # Get webhook data
        webhook_body = request.get_data(as_text=True)
        webhook_signature = request.headers.get('X-Razorpay-Signature', '')
        
        logger.info(f"Webhook signature: {webhook_signature[:20]}...")
        
        # Import payment functions
        from payment import verify_webhook_signature
        
        # Verify webhook signature for security
        if not config.RAZORPAY_WEBHOOK_SECRET:
            logger.warning("⚠️ WEBHOOK SECRET NOT CONFIGURED - SKIPPING VERIFICATION")
            logger.warning("⚠️ For production, please configure RAZORPAY_WEBHOOK_SECRET in .env")
        else:
            is_valid = verify_webhook_signature(webhook_body, webhook_signature)
            if not is_valid:
                logger.error("❌ WEBHOOK SIGNATURE VERIFICATION FAILED")
                return jsonify({'success': False, 'error': 'Invalid signature'}), 400
        
        # Parse webhook data
        event_data = json.loads(webhook_body)
        event_type = event_data.get('event', '')
        payload = event_data.get('payload', {})
        
        logger.info(f"Event type: {event_type}")
        
        # Handle different webhook events
        if event_type == 'payment.authorized':
            logger.info("✅ PAYMENT AUTHORIZED")
            payment_data = payload.get('payment', {})
            payment_id = payment_data.get('id', '')
            logger.info(f"Payment ID: {payment_id}")
            
        elif event_type == 'payment.captured':
            logger.info("✅ PAYMENT CAPTURED - BOOKING CONFIRMED")
            payment_data = payload.get('payment', {})
            payment_id = payment_data.get('id', '')
            order_id = payment_data.get('order_id', '')
            amount = payment_data.get('amount', 0) / 100  # Convert from paise
            logger.info(f"Payment ID: {payment_id}")
            logger.info(f"Order ID: {order_id}")
            logger.info(f"Amount: ₹{amount} INR")
            
        elif event_type == 'payment.failed':
            logger.error("❌ PAYMENT FAILED")
            payment_data = payload.get('payment', {})
            payment_id = payment_data.get('id', '')
            reason = payment_data.get('description', '')
            logger.error(f"Payment ID: {payment_id}")
            logger.error(f"Reason: {reason}")
            
        elif event_type == 'refund.created':
            logger.info("💳 REFUND INITIATED")
            refund_data = payload.get('refund', {})
            refund_id = refund_data.get('id', '')
            payment_id = refund_data.get('payment_id', '')
            amount = refund_data.get('amount', 0) / 100  # Convert from paise
            logger.info(f"Refund ID: {refund_id}")
            logger.info(f"Payment ID: {payment_id}")
            logger.info(f"Amount: ₹{amount} INR")
        
        else:
            logger.info(f"Unhandled event type: {event_type}")
        
        logger.info(f"{'='*70}\n")
        
        # Always return 200 OK to acknowledge receipt
        return jsonify({'success': True, 'message': 'Webhook received'}), 200
        
    except json.JSONDecodeError as e:
        logger.error(f"❌ Invalid webhook JSON: {str(e)}")
        return jsonify({'success': False, 'error': 'Invalid JSON'}), 400
    except Exception as e:
        logger.error(f"❌ Webhook error: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/process-payment', methods=['POST'])
def process_payment():
    """Payment processing endpoint (legacy)"""
    try:
        data = request.json
        session_id = data.get('session_id', '')
        
        summary = "✅ Booking Confirmed!\n\n🎉 Your ticket has been successfully booked.\n📲 Check your email for the booking details."
        
        return jsonify({
            'success': True,
            'summary': summary,
            'qr_code': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGQAAADZ6VFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIGFqYXRyb2ouZGUgKGMpIGJ5IFBhc2NhbCBaaXRzY2hlAAAtDQo=',
            'payment': {}
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/debug', methods=['GET'])
def debug():
    """Debug page showing Razorpay configuration"""
    key_id_status = 'success' if config.RAZORPAY_KEY_ID else 'error'
    key_secret_status = 'success' if config.RAZORPAY_KEY_SECRET else 'error'
    key_display = config.RAZORPAY_KEY_ID[:15] + '...' if config.RAZORPAY_KEY_ID else 'NOT SET'
    secret_display = 'SET' if config.RAZORPAY_KEY_SECRET else 'NOT SET'
    
    return f"""
    <html>
    <head>
        <title>Payment Debug</title>
        <style>
            body {{ font-family: Arial; padding: 20px; background: #f5f5f5; }}
            .card {{ background: white; padding: 20px; border-radius: 8px; margin: 10px 0; }}
            .success {{ color: green; font-weight: bold; }}
            .error {{ color: red; font-weight: bold; }}
            button {{ padding: 10px 20px; margin: 5px; background: #128c7e; color: white; border: none; cursor: pointer; border-radius: 4px; }}
            #result {{ margin-top: 20px; padding: 10px; background: #e8f5e9; border-radius: 4px; white-space: pre-wrap; }}
        </style>
    </head>
    <body>
        <h1>Payment System Debug</h1>
        
        <div class="card">
            <h2>1. Razorpay Configuration</h2>
            <p>Key ID: <span class="{key_id_status}">{key_display}</span></p>
            <p>Key Secret: <span class="{key_secret_status}">{secret_display}</span></p>
        </div>
        
        <div class="card">
            <h2>2. Test Order Creation</h2>
            <button onclick="testOrderCreation()">Create Test Order (Rs. 100)</button>
            <div id="result"></div>
        </div>
        
        <div class="card">
            <h2>3. Frontend Script Check</h2>
            <button onclick="testFrontend()">Check Razorpay.js</button>
            <div id="result2"></div>
        </div>
        
        <script>
        async function testOrderCreation() {{
            const resultDiv = document.getElementById('result');
            resultDiv.textContent = 'Creating test order...';
            
            try {{
                const response = await fetch('http://127.0.0.1:5000/create-razorpay-order', {{
                    method: 'POST',
                    headers: {{'Content-Type': 'application/json'}},
                    body: JSON.stringify({{
                        amount: 100,
                        name: 'Test User',
                        email: 'test@example.com',
                        phone: '9876543210',
                        place: 'Test Place'
                    }})
                }});
                
                const data = await response.json();
                resultDiv.textContent = 'Success:\\n' + JSON.stringify(data, null, 2);
            }} catch (error) {{
                resultDiv.textContent = 'Error: ' + error.message;
            }}
        }}
        
        function testFrontend() {{
            const resultDiv = document.getElementById('result2');
            if (typeof window.Razorpay !== 'undefined') {{
                resultDiv.textContent = 'Razorpay.js is loaded!';
            }} else {{
                resultDiv.textContent = 'Razorpay.js NOT loaded';
            }}
        }}
        </script>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    </body>
    </html>
    """

@app.route('/restart-chat', methods=['POST'])
def restart_chat():
    try:
        return jsonify({'success': True, 'message': 'Chat restarted'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ===== NEW FLOW ENDPOINTS =====
@app.route('/get-time-slots', methods=['POST'])
def get_time_slots():
    """Get available time slots for booking"""
    try:
        from conversation_state import TIME_SLOTS
        
        return jsonify({
            "success": True,
            "time_slots": TIME_SLOTS,
            "message": "Select your preferred time slot"
        }), 200
    except Exception as e:
        logger.error(f"Error getting time slots: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/get-available-dates', methods=['POST'])
def get_available_dates():
    """Get available dates for the next 30 days"""
    try:
        from datetime import datetime, timedelta
        
        dates = []
        today = datetime.now()
        
        # Get next 30 days
        for i in range(30):
            date = today + timedelta(days=i)
            formatted_date = date.strftime('%Y-%m-%d')
            display_date = date.strftime('%a, %b %d, %Y')  # e.g., "Mon, Mar 15, 2026"
            dates.append({
                "value": formatted_date,
                "display": display_date
            })
        
        return jsonify({
            "success": True,
            "dates": dates,
            "message": "Select your preferred date"
        }), 200
    except Exception as e:
        logger.error(f"Error getting dates: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/confirm-selection', methods=['POST'])
def confirm_selection():
    """Confirm the place, time, and date selection"""
    try:
        data = request.get_json()
        
        city = data.get('city', '')
        place = data.get('place', '')
        time_slot = data.get('time_slot', '')
        date = data.get('date', '')
        
        session_id = data.get('session_id', '')
        
        if session_id:
            from conversation_state import update_session_state
            update_session_state(session_id, {
                "selected_place": place,
                "selected_time": time_slot,
                "selected_date": date,
                "state": "CONFIRMATION"
            })
        
        confirmation_msg = f"""✅ <b>SELECTION CONFIRMED!</b>

📍 <b>Place:</b> {place}
🏙️ <b>City:</b> {city}
⏰ <b>Time Slot:</b> {time_slot}
📅 <b>Date:</b> {date}

Would you like to proceed with booking?
"""
        
        return jsonify({
            "success": True,
            "confirmation_message": confirmation_msg,
            "city": city,
            "place": place,
            "time_slot": time_slot,
            "date": date
        }), 200
    except Exception as e:
        logger.error(f"Error confirming selection: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/show-booking-form', methods=['POST'])
def show_booking_form():
    """Show booking form after user confirms"""
    try:
        data = request.get_json()
        
        city = data.get('city', '')
        place = data.get('place', '')
        time_slot = data.get('time_slot', '')
        date = data.get('date', '')
        
        form_message = f"""📝 <b>COMPLETE YOUR BOOKING</b>

Please fill in your details:
- Full Name
- Email Address
- Phone Number (10 digits)
- Number of Tickets (1-10)

<b>Booking Details:</b>
📍 Place: {place}
⏰ Time: {time_slot}
📅 Date: {date}
"""
        
        return jsonify({
            "success": True,
            "form_message": form_message,
            "city": city,
            "place": place,
            "time_slot": time_slot,
            "date": date
        }), 200
    except Exception as e:
        logger.error(f"Error showing booking form: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ===== TEXT-TO-SPEECH ENDPOINT =====
@app.route('/text-to-speech', methods=['POST'])
def text_to_speech():
    """Convert text to speech using ElevenLabs API"""
    try:
        from elevenlabs.client import ElevenLabs
        
        data = request.json
        text = data.get('text', '')
        language = data.get('language', 'en')
        
        if not text or text.strip() == '':
            return jsonify({'success': False, 'error': 'No text provided'}), 400
        
        api_key = config.ELEVENLABS_API_KEY
        if not api_key:
            logger.error("ElevenLabs API key not configured")
            return jsonify({
                'success': False,
                'error': 'ElevenLabs API key not configured. Set ELEVENLABS_API_KEY environment variable.'
            }), 500
        
        # Language to voice ID mapping for ElevenLabs (using standard voices)
        voice_mapping = {
            'en': '21m00Tcm4TlvDq8ikWAM',      # Rachel - English
            'hi': 'V4XiGx0BI0zzYLQKVBL2',      # Hindi voice
            'es': 'l3Phc0Rm47gJ1jEqEk1s',      # Spanish voice
            'fr': '2rVw8GWvXZe0o7J8ydnU',      # French voice
            'de': 'B7EfNfKn9LjKQpHJ8tGm',      # German voice  
            'it': 'QjyMKvKVlKKcLQb0ZkqF',      # Italian voice
            'pt': 'rnSAGNBW1YaSt2gzuC8c',      # Portuguese voice
            'ja': 'pnhwF5rk5pE0W5V8LgbA',      # Japanese voice
            'zh': 'dZD5sBXd24Uh7PkNJfFB',      # Chinese voice
            'ar': 'Cgw0CtWEJUhCGi-oXL5h',      # Arabic voice
        }
        
        voice_id = voice_mapping.get(language, '21m00Tcm4TlvDq8ikWAM')  # Default to English
        
        logger.info(f"TTS Request - Language: {language}, Voice: {voice_id}, Text length: {len(text)}")
        
        # Initialize ElevenLabs client
        client = ElevenLabs(api_key=api_key)
        
        # Generate audio using the multilingual model
        audio_generator = client.generate(
            text=text[:2000],  # Limit to 2000 characters
            voice=voice_id,
            model="eleven_multilingual_v2"  # Use multilingual model for better language support
        )
        
        # Collect audio bytes
        audio_bytes = b''.join(audio_generator)
        
        if not audio_bytes:
            logger.error("No audio data generated")
            return jsonify({
                'success': False,
                'error': 'Failed to generate audio'
            }), 500
        
        # Convert audio to base64
        import base64
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        logger.info(f"✅ TTS conversion successful - Generated {len(audio_bytes)} bytes of audio")
        
        return jsonify({
            'success': True,
            'audio': audio_base64,
            'message': 'Audio generated successfully',
            'language': language,
            'voice_id': voice_id
        }), 200
        
    except ImportError as e:
        logger.error(f"ElevenLabs library not installed: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'ElevenLabs library not installed. Run: pip install elevenlabs'
        }), 500
    except Exception as e:
        logger.error(f"TTS conversion error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': f'TTS conversion failed: {str(e)}'
        }), 500


@app.route('/supported-languages', methods=['GET'])
def supported_languages():
    """Get list of supported languages for TTS"""
    languages = {
        'en': 'English',
        'hi': 'Hindi (हिन्दी)',
        'es': 'Spanish (Español)',
        'fr': 'French (Français)',
        'de': 'German (Deutsch)',
        'it': 'Italian (Italiano)',
        'pt': 'Portuguese (Português)',
        'ja': 'Japanese (日本語)',
        'zh': 'Chinese (中文)',
        'ar': 'Arabic (العربية)'
    }
    return jsonify({'languages': languages}), 200


# ===== RUN APP =====
if __name__ == '__main__':
    app.run(
        host='127.0.0.1',
        port=5000,
        debug=False
    )