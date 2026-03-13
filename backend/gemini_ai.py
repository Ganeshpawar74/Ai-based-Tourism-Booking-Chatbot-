# Tourism Database Response Handler
# No external APIs - uses only hardcoded city database

from tourist_database import find_city_by_name, get_formatted_places_response, TOURIST_PLACES_DB

def get_ai_response(user_message):
    """
    Get response from dummy tourist database
    Returns response with city places or helpful guidance
    NO GEMINI API - Completely offline
    """
    try:
        # First, check if the user is asking about a city we have in our database
        city_key, city_data = find_city_by_name(user_message)
        
        if city_key and city_data:
            # User is asking about a city we have in our database
            response_text, places_list = get_formatted_places_response(city_key, city_data)
            
            # Return formatted response with button data
            return {
                "text": response_text,
                "places": places_list,
                "is_city_query": True,
                "city_key": city_key
            }
        
        # If not a city query, provide helpful guidance
        response_text = """<b>🤖 Tourism Booking Bot</b>

I can help you discover amazing tourist places in major Indian cities!

<b>🎟️ What I can do:</b>
• Show top 5 tourist places in any city
• Display ticket prices and timings
• Provide place descriptions and ratings
• Help you book tickets and generate QR codes

<b>✨ Just type a city name</b> like:
"Delhi", "Jaipur", "Agra", "Mumbai", "Goa", etc.

Let me know which city you'd like to explore!"""

        return {
            "text": response_text,
            "places": [],
            "is_city_query": False
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            "text": f"⚠️ Error: {str(e)}",
            "places": [],
            "is_city_query": False
        }
