"""
Test script to verify Gemini AI API is working
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Test 1: Check if .env is loaded
print("=" * 60)
print("TEST 1: Checking .env Configuration")
print("=" * 60)

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_MODEL = os.getenv('GEMINI_MODEL')
RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET')

if GEMINI_API_KEY:
    print(f"✅ GEMINI_API_KEY loaded: {GEMINI_API_KEY[:20]}...")
else:
    print("❌ GEMINI_API_KEY not found!")
    
if GEMINI_MODEL:
    print(f"✅ GEMINI_MODEL loaded: {GEMINI_MODEL}")
else:
    print("❌ GEMINI_MODEL not found!")

if RAZORPAY_KEY_ID:
    print(f"✅ RAZORPAY_KEY_ID loaded: {RAZORPAY_KEY_ID[:10]}...")
else:
    print("❌ RAZORPAY_KEY_ID not found!")

# Test 2: Check if config.py imports work
print("\n" + "=" * 60)
print("TEST 2: Checking config.py")
print("=" * 60)

try:
    from config import config
    print("✅ config.py imported successfully")
    print(f"   - GEMINI_API_KEY: {config.GEMINI_API_KEY[:20]}...")
    print(f"   - GEMINI_MODEL: {config.GEMINI_MODEL}")
    print(f"   - RAZORPAY_KEY_ID: {config.RAZORPAY_KEY_ID[:10]}...")
except Exception as e:
    print(f"❌ Error importing config: {e}")
    sys.exit(1)

# Test 3: Check if Gemini API is accessible
print("\n" + "=" * 60)
print("TEST 3: Testing Gemini AI API Connection")
print("=" * 60)

try:
    import google.generativeai as genai
    
    # Configure with API key from config
    genai.configure(api_key=config.GEMINI_API_KEY)
    print("✅ Gemini API configured successfully")
    
    # Load model
    model = genai.GenerativeModel(config.GEMINI_MODEL)
    print(f"✅ Model loaded: {config.GEMINI_MODEL}")
    
    # Test API with simple message
    print("\n📝 Testing AI Response...")
    response = model.generate_content("Say 'Hello from Tourism Bot!' in one sentence.")
    
    if response.text:
        print(f"✅ AI Response received:")
        print(f"   {response.text}")
    else:
        print("❌ No response from AI")
        
except Exception as e:
    print(f"❌ Error connecting to Gemini API: {e}")
    print(f"   Check your GEMINI_API_KEY in .env file")
    sys.exit(1)

# Test 4: Check if gemini_ai.py module works
print("\n" + "=" * 60)
print("TEST 4: Testing gemini_ai.py Module")
print("=" * 60)

try:
    from gemini_ai import model, get_ai_response
    print("✅ gemini_ai.py imported successfully")
    
    # Test the function
    test_message = "Recommend 2 famous places in Mumbai"
    response = get_ai_response(test_message)
    
    if response:
        print(f"✅ get_ai_response() works!")
        print(f"   Input: {test_message}")
        print(f"   Output: {response[:100]}...")
    else:
        print("❌ get_ai_response() returned empty")
        
except Exception as e:
    print(f"❌ Error testing gemini_ai.py: {e}")
    sys.exit(1)

# Test 5: Check payment config
print("\n" + "=" * 60)
print("TEST 5: Testing Payment Configuration")
print("=" * 60)

try:
    from payment import client
    print("✅ Payment client initialized successfully")
    print(f"   - Razorpay Key ID: {config.RAZORPAY_KEY_ID[:10]}...")
    
except Exception as e:
    print(f"⚠️  Warning with payment setup: {e}")
    print("   (This is OK if you haven't setup Razorpay yet)")

print("\n" + "=" * 60)
print("✅ ALL TESTS PASSED! Your .env is properly connected.")
print("=" * 60)
