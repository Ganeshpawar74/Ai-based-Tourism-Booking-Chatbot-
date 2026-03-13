#!/usr/bin/env python
"""Minimal Flask app for testing"""
from flask import Flask, request, jsonify
from flask_cors import CORS

# Direct imports - NO gemini or genai
from tourist_database import find_city_by_name, get_formatted_places_response, TOURIST_PLACES_DB

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return "Tourism Bot API Running ✅"

@app.route('/test', methods=['GET'])
def test():
    return jsonify({"status": "ok", "message": "Bot is working"})

@app.route('/chat', methods=['POST'])
def chat():
    try:
        print("✅ Chat endpoint called")
        
        data = request.get_json()
        print(f"✅ Data received: {data}")
        
        user_message = data.get("message", "").strip() if data else ""
        print(f"✅ User message: {user_message}")
        
        if not user_message:
            return jsonify({"reply": "Please enter a message"})
        
        # Find city in database
        print("✅ About to search for city")
        city_key, city_data = find_city_by_name(user_message)
        print(f"✅ City search result: {city_key}")
        
        if city_key and city_data:
            print("✅ City found, getting places")
            response_text, places_list = get_formatted_places_response(city_key, city_data)
            print(f"✅ Got {len(places_list)} places")
            
            return jsonify({
                "reply": response_text,
                "places": places_list,
                "is_city_query": True,
                "city_key": city_key
            })
        else:
            print("❌ City not found")
            return jsonify({
                "reply": "City not found. Try: Delhi, Jaipur, Agra, Mumbai, Goa, Bangalore, Hyderabad, Varanasi, Kerala, Shimla, Manali, Rishikesh, Udaipur, Jodhpur, Mysore, Chiang Mai",
                "places": [],
                "is_city_query": False
            })
    except Exception as e:
        print(f"❌ EXCEPTION CAUGHT: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"reply": f"Error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=False, host='127.0.0.1', port=5000)
