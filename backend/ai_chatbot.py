from transformers import pipeline
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
# load AI model
chatbot = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

def get_ai_response(message):
    """
    Uses zero-shot classification to understand user intent
    """
    # Define possible user intents
    candidate_labels = ["booking_inquiry", "location_inquiry", "payment", "time_slot_selection"]
    
    # Classify the user's message
    result = chatbot(message, candidate_labels)
    top_intent = result['labels'][0]
    confidence = result['scores'][0]
    
    # Route based on classified intent
    if top_intent == "booking_inquiry" and confidence > 0.5:
        if "taj mahal" in message.lower():
            return "Taj Mahal tickets available. Choose time: 9AM, 11AM, 2PM."
        elif "ajanta" in message.lower():
            return "Ajanta Caves slots: 10AM, 12PM, 3PM."
        else:
            return "Sure! Which place would you like to visit?"
    
    elif top_intent == "location_inquiry" and confidence > 0.5:
        if "taj mahal" in message.lower():
            return "Taj Mahal - One of the seven wonders. Available slots: 9AM, 11AM, 2PM."
        elif "ajanta" in message.lower():
            return "Ajanta Caves - Historic Buddhist caves. Available slots: 10AM, 12PM, 3PM."
        else:
            return "What destination are you interested in?"
    
    elif top_intent == "time_slot_selection" and confidence > 0.5:
        return "Please choose your preferred time slot from the available options."
    
    elif top_intent == "payment" and confidence > 0.5:
        return "Proceeding to payment. Please confirm your booking details."
    
    else:
        # Fallback for low confidence or unclear intent
        return "I'm not sure I understood that. Could you clarify if you want to book tickets, know about a location, select a time, or proceed with payment?"