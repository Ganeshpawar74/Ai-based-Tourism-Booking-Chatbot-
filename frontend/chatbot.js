// Tourism Chatbot - Complete Interactive Multi-step Booking Workflow
// New Flow: Location -> Places (buttons) -> Description + Time -> Date -> Confirmation -> BOOK NOW -> Form -> Summary -> Payment

// API Configuration - Dynamic based on environment
const API_BASE_URL = window.location.origin;

const chatbox = document.getElementById('chatbox');
const msgInput = document.getElementById('msg');
const typingIndicator = document.getElementById('typingIndicator');

// Booking workflow state
let bookingState = {
  step: 'initial', // initial, city_search, place_selection, place_details, time_selection, date_selection, confirmation, book_now, form_fill, summary, payment
  selectedCity: null,
  selectedCityKey: null,
  selectedPlace: null,
  selectedPlaceDetails: null,
  selectedTime: null,
  selectedDate: null,
  ticketPrice: 1,
  userDetails: {
    name: '',
    email: '',
    phone: '',
    tickets: 1
  }
};

function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getSessionId() {
  if (!window.sessionId) {
    window.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  return window.sessionId;
}

// ===== MAIN SEND MESSAGE FUNCTION =====
async function send() {
  const message = msgInput.value.trim();
  if (message === '') return;

  // Identify user intent and handle accordingly
  const intent = identifyUserIntent(message);
  
  if (intent.type === 'greeting') {
    // User says Hi, Hello, etc. - Greet and ask for location
    await handleGreeting(message);
  } else if (intent.type === 'booking_intent') {
    // User says "I want to book" - Greet and ask for location
    await handleBookingIntent(message);
  } else if (intent.type === 'place_booking') {
    // User specifies city and place - Direct to booking
    await handleDirectPlaceBooking(message, intent);
  } else if (bookingState.step === 'initial' || bookingState.step === 'city_search') {
    // Default city search
    await searchCity(message);
  }
}

// ===== IDENTIFY USER INTENT =====
function identifyUserIntent(message) {
  const msgLower = message.toLowerCase();
  
  // Check for greeting intent
  const greetingKeywords = ['hi', 'hello', 'hey', 'hola', 'namaste', 'greetings'];
  if (greetingKeywords.some(keyword => msgLower.startsWith(keyword))) {
    return { type: 'greeting' };
  }
  
  // Check for booking intent
  const bookingKeywords = ['i want to book', 'book', 'booking', 'reserve', 'ticket', 'i need', 'can i book'];
  if (bookingKeywords.some(keyword => msgLower.includes(keyword))) {
    // Check if it also contains a place/city combination
    if (msgLower.includes('for') || msgLower.includes('at') || msgLower.includes('in')) {
      return { type: 'place_booking', text: message };
    }
    return { type: 'booking_intent' };
  }
  
  // Default - city search
  return { type: 'city_search', text: message };
}

// ===== HANDLE GREETING =====
async function handleGreeting(message) {
  addMessage(message, true);
  msgInput.value = '';
  msgInput.disabled = true;
  bookingState.step = 'city_search';
  
  setTimeout(() => {
    addMessage("👋 <b>Hi there!</b> Welcome! Thanks for choosing us! 🎉\n\nI'm excited to help you book your perfect tourism experience.\n\n📍 <b>Which city would you like to explore?</b>\n\nPopular choices: Delhi • Agra • Jaipur • Mumbai • Goa • Bangalore • Hyderabad • Pune • Nashik • And many more!", false);
  }, 300);
  
  setTimeout(() => {
    msgInput.disabled = false;
  }, 800);
}

// ===== HANDLE BOOKING INTENT =====
async function handleBookingIntent(message) {
  addMessage(message, true);
  msgInput.value = '';
  msgInput.disabled = true;
  bookingState.step = 'city_search';
  
  setTimeout(() => {
    addMessage("🎫 <b>Great!</b> I'd love to help you book a ticket! Let me get some details.\n\n📍 <b>Which city would you like to visit?</b>\n\nAvailable cities: Delhi • Agra • Jaipur • Mumbai • Goa • Bangalore • Hyderabad • Varanasi • Kerala • Shimla • Manali • Rishikesh • Udaipur • Jodhpur • Mysore • Pune • Nashik • Aurangabad • Lucknow • Jaisalmer • Pushkar • Mount Abu • Kanyakumari • Hampi • Darjeeling • Khajuraho", false);
  }, 300);
  
  setTimeout(() => {
    msgInput.disabled = false;
  }, 800);
}

// ===== HANDLE DIRECT PLACE BOOKING =====
async function handleDirectPlaceBooking(message, intent) {
  addMessage(message, true);
  msgInput.value = '';
  msgInput.disabled = true;
  
  try {
    // Send to backend to parse city and place
    const response = await fetch(`${API_BASE_URL}/parse-booking-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message })
    });
    
    const data = await response.json();
    
    if (data.success && data.city_key && data.place_name) {
      // Found both city and place
      bookingState.step = 'place_description';
      bookingState.selectedCity = data.city_name;
      bookingState.selectedCityKey = data.city_key;
      bookingState.selectedPlace = data.place_name;
      
      setTimeout(() => {
        addMessage(`✨ <b>Perfect!</b> I found the place you're looking for in ${data.city_name}!`, false);
      }, 300);
      
      setTimeout(() => {
        // Show place description
        const descriptionHTML = `
          <b style="color: #128C7E; font-size: 15px;">${data.place_name}</b>
          <div style="margin-top: 10px; color: #333; font-size: 13px; line-height: 1.6;">
            ${data.place_description}
          </div>
          <div style="margin-top: 12px; padding: 10px; background: #e8f5e9; border-radius: 6px; font-size: 12px; color: #074e3e;">
            ⏰ Now select your preferred time and date to continue!
          </div>
        `;
        addMessage(descriptionHTML, false);
      }, 600);
      
      setTimeout(() => {
        addTimeSlotButtons();
      }, 1200);
    } else if (data.city_key && data.places) {
      // Found city but not specific place - show place selection
      bookingState.step = 'place_selection';
      bookingState.selectedCity = data.city_name;
      bookingState.selectedCityKey = data.city_key;
      
      setTimeout(() => {
        addMessage(`✨ <b>Great!</b> Found ${data.city_name}! Now let's pick a place.\n\n${data.reply}`, false);
      }, 300);
      
      setTimeout(() => {
        addPlaceSelectionButtons(data.places);
      }, 800);
    } else {
      // City not found
      const welcomeMsg = `Hmm, I couldn't find that location! 🤔\n\n${data.reply}\n\n💡 <b>Tip:</b> Try saying: "Book a ticket for Red Fort in Delhi" or just type the city name!`;
      addMessage(welcomeMsg, false);
      msgInput.disabled = false;
    }
  } catch (error) {
    console.error(error);
    addMessage("⚠️ Let me parse that differently. Please type the city name first!", false);
    msgInput.disabled = false;
  }
}

async function searchCity(message) {
  addMessage(message, true);
  msgInput.value = '';
  msgInput.disabled = true;

  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message, session_id: getSessionId() })
    });

    const data = await response.json();

    // If city is found
    if (data.is_city_query && data.places && data.places.length > 0) {
      bookingState.step = 'place_selection';
      bookingState.selectedCity = data.city_key?.charAt(0).toUpperCase() + data.city_key?.slice(1) || 'Unknown';
      bookingState.selectedCityKey = data.city_key;
      
      // Show city info with enhanced formatting
      setTimeout(() => {
        addMessage(`✨ <b>Great choice!</b> You selected <b>${bookingState.selectedCity}</b>!\n\n${data.reply}`, false);
      }, 300);
      
      // Show places as CLICKABLE BUTTONS (NAMES ONLY)
      setTimeout(() => {
        addPlaceSelectionButtons(data.places);
      }, 800);
    } else {
      // City not found - show more helpful message
      const welcomeMsg = `Hmm, I couldn't find that city! 🤔\n\n${data.reply}\n\n💡 <b>Tip:</b> Just type any city from the list to get started! Or try: "Book a ticket for Taj Mahal in Agra"`;
      addMessage(welcomeMsg, false);
      msgInput.disabled = false;
    }
  } catch (error) {
    console.error(error);
    addMessage("⚠️ Oops! Let me try that again. Please check your internet and try again! 📶", false);
    msgInput.disabled = false;
  }
}

// ===== ADD MESSAGE TO CHAT =====
function addMessage(text, isUser) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;
  
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper';
  
  if (!isUser) {
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = '🤖';
    messageDiv.appendChild(avatar);
  }
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.innerHTML = text.replace(/\n/g, '<br>');
  wrapper.appendChild(contentDiv);
  
  const timeDiv = document.createElement('div');
  timeDiv.className = 'message-time';
  timeDiv.textContent = getCurrentTime();
  wrapper.appendChild(timeDiv);
  
  messageDiv.appendChild(wrapper);
  chatbox.appendChild(messageDiv);
  
  setTimeout(() => {
    chatbox.scrollTop = chatbox.scrollHeight;
  }, 50);

  // If text-to-speech is enabled, enqueue this message and speak it
  if (ttsEnabled) {
    const plainText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    enqueueMessage(plainText, isUser, nextMessageId);
  }

  // Track message IDs so we don't repeat reading the same message
  messageDiv.dataset.msgId = nextMessageId;
  nextMessageId += 1;
}

// ===== STEP 1: PLACE SELECTION (CLICKABLE BUTTONS - NAMES ONLY) =====
function addPlaceSelectionButtons(places) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message bot';
  
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper';
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = '🎯';
  messageDiv.appendChild(avatar);
  
  const instruction = document.createElement('div');
  instruction.className = 'message-content';
  instruction.innerHTML = '<b style="font-size: 15px;">📍 Choose a place:</b>';
  instruction.style.marginBottom = '12px';
  instruction.style.fontWeight = '600';
  wrapper.appendChild(instruction);
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.flexDirection = 'column';
  buttonContainer.style.gap = '8px';
  buttonContainer.style.marginTop = '8px';
  
  places.forEach((place, index) => {
    const btn = document.createElement('button');
    btn.className = 'booking-btn place-selection-btn';
    btn.innerHTML = `<span style="font-size: 18px; margin-right: 8px;">📍</span>${place}`;
    btn.onclick = () => selectPlace(place);
    btn.style.cssText = `
      padding: 12px 14px;
      background: linear-gradient(135deg, #128C7E 0%, #00A884 100%);
      color: white;
      border: none;
      border-radius: 20px;
      cursor: pointer;
      font-weight: 550;
      font-size: 14px;
      transition: all 0.2s ease;
      text-align: center;
      box-shadow: 0 2px 8px rgba(18, 140, 126, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    btn.onmouseover = () => {
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = '0 6px 14px rgba(18, 140, 126, 0.25)';
    };
    btn.onmouseout = () => {
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = '0 2px 8px rgba(18, 140, 126, 0.15)';
    };
    buttonContainer.appendChild(btn);
  });
  
  wrapper.appendChild(buttonContainer);
  const timeDiv = document.createElement('div');
  timeDiv.className = 'message-time';
  timeDiv.textContent = getCurrentTime();
  wrapper.appendChild(timeDiv);
  messageDiv.appendChild(wrapper);
  chatbox.appendChild(messageDiv);

  // Track message IDs so text-to-speech can read this message once
  messageDiv.dataset.msgId = nextMessageId;
  nextMessageId += 1;

  // If TTS is enabled, read out the option list
  if (ttsEnabled) {
    const optionText = `Choose a place: ${places.join(', ')}`;
    enqueueMessage(optionText, false, parseInt(messageDiv.dataset.msgId, 10));
  }
  
  setTimeout(() => {
    chatbox.scrollTop = chatbox.scrollHeight;
  }, 50);
}

// ===== STEP 2: SELECT PLACE AND GET DETAILS =====
function selectPlace(placeName) {
  bookingState.selectedPlace = placeName;
  bookingState.step = 'place_details';
  
  addMessage(`📍 Selected: ${placeName}`, true);
  msgInput.value = '';
  msgInput.disabled = true;
  
  // Fetch place details from backend
  fetchPlaceDetails();
}

async function fetchPlaceDetails() {
  try {
    console.log("[DEBUG] Sending place-details request:");
    console.log("[DEBUG] selectedCity:", bookingState.selectedCity);
    console.log("[DEBUG] selectedPlace:", bookingState.selectedPlace);
    
    const response = await fetch(`${API_BASE_URL}/place-details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        city: bookingState.selectedCity, 
        place: bookingState.selectedPlace 
      })
    });

    const data = await response.json();
    console.log("[DEBUG] Response status:", response.status, response.ok);
    console.log("[DEBUG] Response data:", data);
    
    // Check if response contains an error
    if (data.error) {
      console.error("[ERROR] Backend returned error:", data.error);
      addMessage(`❌ ${data.error}`, false);
      msgInput.disabled = false;
      return;
    }
    
    // Check if response is successful and has required data
    if (response.ok && data.place && data.description && data.city) {
      bookingState.selectedPlaceDetails = data;
      bookingState.ticketPrice = 1; // Default price
      bookingState.step = 'time_selection';
      
      // Show place name and description in an attractive card
      const placeCard = `
        <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); padding: 14px; border-radius: 12px; border-left: 4px solid #128C7E;">
          <b style="font-size: 16px; color: #128C7E;">✨ ${data.place}</b><br/>
          <div style="margin-top: 10px; color: #333; line-height: 1.6; font-size: 14px;">${data.description}</div>
        </div>
      `;
      addMessage(placeCard, false);
      
      // Show time slot selection after a short delay
      setTimeout(() => {
        addMessage("⏰ <b>When would you like to visit?</b>", false);
        addTimeSlotButtons();
      }, 1000);
    } else {
      addMessage("❌ Could not load place details. Please try again or select another place.", false);
      msgInput.disabled = false;
    }
    
  } catch (error) {
    console.error("[EXCEPTION]", error);
    addMessage("⚠️ Connection error. Please check your internet connection and try again.", false);
    msgInput.disabled = false;
  }
}

// ===== STEP 3: TIME SLOT SELECTION =====
function addTimeSlotButtons() {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message bot';
  
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper';
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = '🕐';
  messageDiv.appendChild(avatar);
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.flexDirection = 'column';
  buttonContainer.style.gap = '8px';
  buttonContainer.style.marginTop = '8px';
  
  const timeSlots = [
    { time: "8:00 - 10:00 AM", emoji: "🌅" },
    { time: "10:00 AM - 12:00 PM", emoji: "☀️" },
    { time: "12:00 PM - 2:00 PM", emoji: "🌞" },
    { time: "2:00 PM - 4:00 PM", emoji: "🌤️" },
    { time: "4:00 PM - 6:00 PM", emoji: "🌅" }
  ];
  
  timeSlots.forEach(slot => {
    const btn = document.createElement('button');
    btn.className = 'booking-btn time-slot-btn';
    btn.innerHTML = `<span style="font-size: 18px; margin-right: 8px;">${slot.emoji}</span> ${slot.time}`;
    btn.onclick = () => selectTimeSlot(slot.time);
    btn.style.cssText = `
      padding: 12px 14px;
      background: linear-gradient(135deg, #128C7E 0%, #00A884 100%);
      color: white;
      border: none;
      border-radius: 20px;
      cursor: pointer;
      font-weight: 500;
      font-size: 14px;
      transition: all 0.3s ease;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(18, 140, 126, 0.15);
    `;
    btn.onmouseover = () => {
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = '0 6px 16px rgba(18, 140, 126, 0.25)';
    };
    btn.onmouseout = () => {
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = '0 2px 8px rgba(18, 140, 126, 0.15)';
    };
    buttonContainer.appendChild(btn);
  });
  
  wrapper.appendChild(buttonContainer);
  const timeDiv = document.createElement('div');
  timeDiv.className = 'message-time';
  timeDiv.textContent = getCurrentTime();
  wrapper.appendChild(timeDiv);
  messageDiv.appendChild(wrapper);
  chatbox.appendChild(messageDiv);
  
  setTimeout(() => {
    chatbox.scrollTop = chatbox.scrollHeight;
  }, 50);
}

function selectTimeSlot(time) {
  bookingState.selectedTime = time;
  bookingState.step = 'date_selection';
  addMessage(`⏰ Selected: ${time}`, true);
  msgInput.value = '';
  msgInput.disabled = true;
  
  setTimeout(() => {
    addMessage("📅 <b>Select your visit date:</b>", false);
    addDatePicker();
  }, 500);
}

// ===== STEP 4: DATE SELECTION (DATE PICKER) =====
function addDatePicker() {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message bot';
  
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper';
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = '📅';
  messageDiv.appendChild(avatar);
  
  const headerText = document.createElement('div');
  headerText.innerHTML = '<b style="font-size: 14px; color: #128C7E;">Pick your date:</b>';
  headerText.style.marginBottom = '10px';
  wrapper.appendChild(headerText);
  
  const formContainer = document.createElement('div');
  formContainer.style.marginTop = '8px';
  formContainer.style.padding = '14px';
  formContainer.style.backgroundColor = '#e8f5e9';
  formContainer.style.borderRadius = '12px';
  formContainer.style.border = '1px solid #B2DFDB';
  
  // Date input
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  
  // Set minimum date to today
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];
  dateInput.min = minDate;
  
  // Set maximum date to 30 days from now
  const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  dateInput.max = maxDate.toISOString().split('T')[0];
  
  dateInput.style.cssText = 'width: 100%; padding: 12px; border: 2px solid #128C7E; border-radius: 8px; font-size: 14px; box-sizing: border-box; cursor: pointer; font-family: inherit; background: white; color: #333;';
  formContainer.appendChild(dateInput);
  
  // Submit button
  const submitBtn = document.createElement('button');
  submitBtn.innerHTML = '✅ Confirm Date';
  submitBtn.style.cssText = `
    width: 100%;
    padding: 12px;
    margin-top: 10px;
    background: linear-gradient(135deg, #128C7E 0%, #00A884 100%);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.3s ease;
    box-shadow: 0 3px 8px rgba(18, 140, 126, 0.2);
  `;
  submitBtn.onmouseover = () => {
    submitBtn.style.boxShadow = '0 6px 16px rgba(18, 140, 126, 0.35)';
    submitBtn.style.transform = 'translateY(-2px)';
  };
  submitBtn.onmouseout = () => {
    submitBtn.style.boxShadow = '0 3px 8px rgba(18, 140, 126, 0.2)';
    submitBtn.style.transform = 'translateY(0)';
  };
  submitBtn.onclick = () => {
    if (dateInput.value) {
      const selectedDate = new Date(dateInput.value);
      const formattedDate = selectedDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
      selectDate(formattedDate, dateInput.value);
    } else {
      alert('Please select a date!');
    }
  };
  formContainer.appendChild(submitBtn);
  
  wrapper.appendChild(formContainer);
  const timeDiv = document.createElement('div');
  timeDiv.className = 'message-time';
  timeDiv.textContent = getCurrentTime();
  wrapper.appendChild(timeDiv);
  messageDiv.appendChild(wrapper);
  chatbox.appendChild(messageDiv);
  
  setTimeout(() => {
    chatbox.scrollTop = chatbox.scrollHeight;
  }, 100);
}

function selectDate(displayDate, dateValue) {
  bookingState.selectedDate = displayDate;
  bookingState.step = 'confirmation';
  addMessage(`📅 Selected: ${displayDate}`, true);
  msgInput.value = '';
  msgInput.disabled = true;
  
  setTimeout(() => {
    addConfirmationButtons();
  }, 500);
}

// ===== STEP 5: CONFIRMATION =====
function addConfirmationButtons() {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message bot';
  
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper';
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = '✅';
  messageDiv.appendChild(avatar);
  
  const confirmMsg = `<b style="font-size: 16px;">✅ Review Your Booking</b>`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.innerHTML = confirmMsg;
  contentDiv.style.marginBottom = '12px';
  wrapper.appendChild(contentDiv);
  
  // Create details card
  const detailsCard = document.createElement('div');
  detailsCard.style.cssText = `
    background: #f0f0f0;
    border-radius: 12px;
    padding: 14px;
    margin: 8px 0;
    border-left: 4px solid #128C7E;
  `;
  
  const details = [
    { icon: '📍', label: 'Place', value: bookingState.selectedPlace },
    { icon: '🏙️', label: 'City', value: bookingState.selectedCity },
    { icon: '🕐', label: 'Time', value: bookingState.selectedTime },
    { icon: '📅', label: 'Date', value: bookingState.selectedDate }
  ];
  
  details.forEach((detail, index) => {
    const detailRow = document.createElement('div');
    detailRow.style.cssText = `
      display: flex;
      align-items: center;
      margin: 10px 0;
      font-size: 14px;
    `;
    
    const icon = document.createElement('span');
    icon.textContent = detail.icon;
    icon.style.marginRight = '10px';
    icon.style.fontSize = '18px';
    
    const label = document.createElement('span');
    label.innerHTML = `<b>${detail.label}:</b>`;
    label.style.width = '70px';
    label.style.color = '#128C7E';
    
    const value = document.createElement('span');
    value.textContent = detail.value;
    value.style.color = '#333';
    value.style.fontWeight = '500';
    
    detailRow.appendChild(icon);
    detailRow.appendChild(label);
    detailRow.appendChild(value);
    detailsCard.appendChild(detailRow);
  });
  
  wrapper.appendChild(detailsCard);
  
  // Confirmation message
  const confirmText = document.createElement('div');
  confirmText.innerHTML = '<b style="color: #128C7E; margin-top: 12px; display: block;">✨ Look good? Let\'s proceed!</b>';
  wrapper.appendChild(confirmText);
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '10px';
  buttonContainer.style.marginTop = '15px';
  buttonContainer.style.justifyContent = 'space-between';
  
  // CONFIRM BUTTON
  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'booking-btn';
  confirmBtn.innerHTML = '✅ Yes, Let\'s Go!';
  confirmBtn.onclick = () => proceedToBooking();
  confirmBtn.style.cssText = `
    flex: 1;
    padding: 12px 16px;
    background: linear-gradient(135deg, #128C7E 0%, #00A884 100%);
    color: white;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
    transition: all 0.3s ease;
    box-shadow: 0 3px 8px rgba(18, 140, 126, 0.3);
  `;
  confirmBtn.onmouseover = () => {
    confirmBtn.style.transform = 'translateY(-3px)';
    confirmBtn.style.boxShadow = '0 6px 16px rgba(18, 140, 126, 0.4)';
  };
  confirmBtn.onmouseout = () => {
    confirmBtn.style.transform = 'translateY(0)';
    confirmBtn.style.boxShadow = '0 3px 8px rgba(18, 140, 126, 0.3)';
  };
  buttonContainer.appendChild(confirmBtn);
  
  // CANCEL BUTTON
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'booking-btn';
  cancelBtn.innerHTML = '✏️ Edit';
  cancelBtn.onclick = () => cancelBooking();
  cancelBtn.style.cssText = `
    flex: 1;
    padding: 12px 16px;
    background: linear-gradient(135deg, #E8E8E8 0%, #D0D0D0 100%);
    color: #333;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
    transition: all 0.3s ease;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  `;
  cancelBtn.onmouseover = () => {
    cancelBtn.style.transform = 'translateY(-3px)';
    cancelBtn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  };
  cancelBtn.onmouseout = () => {
    cancelBtn.style.transform = 'translateY(0)';
    cancelBtn.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.1)';
  };
  buttonContainer.appendChild(cancelBtn);
  
  wrapper.appendChild(buttonContainer);
  const timeDiv = document.createElement('div');
  timeDiv.className = 'message-time';
  timeDiv.textContent = getCurrentTime();
  wrapper.appendChild(timeDiv);
  messageDiv.appendChild(wrapper);
  chatbox.appendChild(messageDiv);
  
  setTimeout(() => {
    chatbox.scrollTop = chatbox.scrollHeight;
  }, 100);
}

function cancelBooking() {
  addMessage("❌ Booking cancelled.", true);
  bookingState.step = 'initial';
  msgInput.disabled = false;
  msgInput.placeholder = "Enter a city name...";
  
  setTimeout(() => {
    addMessage("🌍 <b>Welcome back!</b> Which city would you like to explore?", false);
  }, 500);
}

// ===== STEP 6: BOOK NOW =====
function proceedToBooking() {
  addMessage("✅ Confirmed!", true);
  bookingState.step = 'book_now';
  msgInput.disabled = true;
  
  setTimeout(() => {
    showBookNowButton();
  }, 500);
}

function showBookNowButton() {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message bot';
  
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper';
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = '🎫';
  messageDiv.appendChild(avatar);
  
  const cheerMsg = document.createElement('div');
  cheerMsg.className = 'message-content';
  cheerMsg.innerHTML = '<b style="font-size: 15px;">✨ Great! Your booking is ready!</b><div style="margin-top: 8px; font-size: 14px;">Proceed to complete your payment</div>';
  cheerMsg.style.marginBottom = '12px';
  wrapper.appendChild(cheerMsg);
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.justifyContent = 'center';
  buttonContainer.style.marginTop = '10px';
  
  const bookNowBtn = document.createElement('button');
  bookNowBtn.innerHTML = '🎫 Proceed to Booking';
  bookNowBtn.onclick = () => openBookingForm();
  bookNowBtn.style.cssText = `
    padding: 14px 24px;
    background: linear-gradient(135deg, #FF6B6B 0%, #FF8E72 100%);
    color: white;
    border: none;
    border-radius: 25px;
    cursor: pointer;
    font-weight: 700;
    font-size: 15px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
  `;
  bookNowBtn.onmouseover = () => {
    bookNowBtn.style.transform = 'scale(1.05)';
    bookNowBtn.style.boxShadow = '0 8px 20px rgba(255, 107, 107, 0.4)';
  };
  bookNowBtn.onmouseout = () => {
    bookNowBtn.style.transform = 'scale(1)';
    bookNowBtn.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.3)';
  };
  buttonContainer.appendChild(bookNowBtn);
  
  wrapper.appendChild(buttonContainer);
  const timeDiv = document.createElement('div');
  timeDiv.className = 'message-time';
  timeDiv.textContent = getCurrentTime();
  wrapper.appendChild(timeDiv);
  messageDiv.appendChild(wrapper);
  chatbox.appendChild(messageDiv);
  
  setTimeout(() => {
    chatbox.scrollTop = chatbox.scrollHeight;
  }, 100);
}

// ===== STEP 7: BOOKING FORM (INLINE IN CHAT) =====
function openBookingForm() {
  addMessage("📝 Let me collect your details...", true);
  bookingState.step = 'form_fill';
  msgInput.disabled = true;
  
  // Create inline form in chat
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message bot';
  
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper';
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = '📋';
  messageDiv.appendChild(avatar);
  
  // Compact form container
  const formContainer = document.createElement('div');
  formContainer.style.cssText = `
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    padding: 14px;
    border-radius: 12px;
    margin: 10px 0;
    border: 1px solid #ddd;
  `;
  
  // Form title
  const formTitle = document.createElement('h3');
  formTitle.textContent = 'Complete Your Booking';
  formTitle.style.cssText = 'margin: 0 0 12px 0; font-size: 15px; color: #075e54; font-weight: 600;';
  formContainer.appendChild(formTitle);
  
  // Form element
  const form = document.createElement('form');
  form.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';
  form.onsubmit = (e) => submitInlineBookingForm(e);
  
  // Name field
  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'Full Name *';
  nameLabel.style.cssText = 'font-size: 12px; font-weight: 600; color: #333; margin-bottom: 3px;';
  form.appendChild(nameLabel);
  
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.id = 'inline_name';
  nameInput.placeholder = 'Enter your name';
  nameInput.required = true;
  nameInput.style.cssText = `
    padding: 10px;
    border: 1px solid #888;
    border-radius: 6px;
    font-size: 13px;
    font-family: inherit;
  `;
  form.appendChild(nameInput);
  
  // Email field
  const emailLabel = document.createElement('label');
  emailLabel.textContent = 'Email *';
  emailLabel.style.cssText = 'font-size: 12px; font-weight: 600; color: #333; margin-bottom: 3px; margin-top: 5px;';
  form.appendChild(emailLabel);
  
  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.id = 'inline_email';
  emailInput.placeholder = 'your@email.com';
  emailInput.required = true;
  emailInput.style.cssText = `
    padding: 10px;
    border: 1px solid #888;
    border-radius: 6px;
    font-size: 13px;
    font-family: inherit;
  `;
  form.appendChild(emailInput);
  
  // Phone field
  const phoneLabel = document.createElement('label');
  phoneLabel.textContent = 'Phone Number *';
  phoneLabel.style.cssText = 'font-size: 12px; font-weight: 600; color: #333; margin-bottom: 3px; margin-top: 5px;';
  form.appendChild(phoneLabel);
  
  const phoneInput = document.createElement('input');
  phoneInput.type = 'tel';
  phoneInput.id = 'inline_phone';
  phoneInput.placeholder = '10-digit number';
  phoneInput.required = true;
  phoneInput.style.cssText = `
    padding: 10px;
    border: 1px solid #888;
    border-radius: 6px;
    font-size: 13px;
    font-family: inherit;
  `;
  form.appendChild(phoneInput);
  
  // Tickets field
  const ticketsLabel = document.createElement('label');
  ticketsLabel.textContent = 'Number of Tickets *';
  ticketsLabel.style.cssText = 'font-size: 12px; font-weight: 600; color: #333; margin-bottom: 3px; margin-top: 5px;';
  form.appendChild(ticketsLabel);
  
  const ticketsSelect = document.createElement('select');
  ticketsSelect.id = 'inline_num_tickets';
  ticketsSelect.required = true;
  ticketsSelect.style.cssText = `
    padding: 10px;
    border: 1px solid #888;
    border-radius: 6px;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
  `;
  ticketsSelect.onchange = updateInlinePriceDisplay;
  
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select tickets';
  ticketsSelect.appendChild(defaultOption);
  
  for (let i = 1; i <= 10; i++) {
    const option = document.createElement('option');
    option.value = i.toString();
    option.textContent = `${i} Ticket${i > 1 ? 's' : ''}`;
    ticketsSelect.appendChild(option);
  }
  form.appendChild(ticketsSelect);
  
  // Price display
  const priceDiv = document.createElement('div');
  priceDiv.id = 'inline_price_display';
  priceDiv.style.cssText = `
    display: none;
    background: #e8f5e9;
    padding: 8px;
    border-radius: 6px;
    font-size: 12px;
    margin-top: 5px;
  `;
  priceDiv.innerHTML = `
    <p style="margin: 3px 0; color: #333;"><b>Price per ticket:</b> ₹<span id="inline_price_per_ticket">1</span></p>
    <p style="margin: 3px 0; color: #128c7e; font-weight: bold;"><b>Total:</b> ₹<span id="inline_total_price">1</span></p>
  `;
  form.appendChild(priceDiv);
  
  // Button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = 'display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end;';
  
  // Confirm button (changed from "Proceed to Payment")
  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'submit';
  confirmBtn.textContent = '✅ CONFIRM';
  confirmBtn.style.cssText = `
    padding: 10px 16px;
    background: linear-gradient(135deg, #128C7E 0%, #00A884 100%);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    font-size: 12px;
    transition: all 0.3s ease;
  `;
  confirmBtn.onmouseover = () => {
    confirmBtn.style.transform = 'scale(1.05)';
    confirmBtn.style.boxShadow = '0 6px 15px rgba(18, 140, 126, 0.4)';
  };
  confirmBtn.onmouseout = () => {
    confirmBtn.style.transform = 'scale(1)';
    confirmBtn.style.boxShadow = 'none';
  };
  buttonContainer.appendChild(confirmBtn);
  
  form.appendChild(buttonContainer);
  formContainer.appendChild(form);
  
  wrapper.appendChild(formContainer);
  const timeDiv = document.createElement('div');
  timeDiv.className = 'message-time';
  timeDiv.textContent = getCurrentTime();
  wrapper.appendChild(timeDiv);
  messageDiv.appendChild(wrapper);
  chatbox.appendChild(messageDiv);
  
  setTimeout(() => {
    chatbox.scrollTop = chatbox.scrollHeight;
  }, 100);
}

function closeBookingForm() {
  const modal = document.getElementById('bookingModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function updateInlinePriceDisplay() {
  const ticketsSelect = document.getElementById('inline_num_tickets');
  const priceDisplay = document.getElementById('inline_price_display');
  const pricePerTicketSpan = document.getElementById('inline_price_per_ticket');
  const totalPriceSpan = document.getElementById('inline_total_price');
  
  if (ticketsSelect.value) {
    const numTickets = parseInt(ticketsSelect.value);
    const ticketPrice = 1;
    const total = ticketPrice * numTickets;
    
    pricePerTicketSpan.textContent = `${ticketPrice}`;
    totalPriceSpan.textContent = `${total}`;
    priceDisplay.style.display = 'block';
  } else {
    priceDisplay.style.display = 'none';
  }
}

function submitInlineBookingForm(event) {
  event.preventDefault();
  
  const name = document.getElementById('inline_name').value.trim();
  const email = document.getElementById('inline_email').value.trim();
  const phone = document.getElementById('inline_phone').value.trim();
  const numTickets = parseInt(document.getElementById('inline_num_tickets').value);
  
  // Validate
  if (!name || !email || !phone || !numTickets) {
    alert('Please fill in all fields');
    return;
  }
  
  if (phone.length !== 10 || isNaN(phone)) {
    alert('Please enter a valid 10-digit phone number');
    return;
  }
  
  bookingState.userDetails = {
    name: name,
    email: email,
    phone: phone,
    tickets: numTickets
  };
  
  // Build booking summary message
  const totalPrice = bookingState.ticketPrice * numTickets;
  const bookingSummaryText = `📊 BOOKING SUMMARY

👤 Personal Details:
📝 Name: ${name}
📧 Email: ${email}
📞 Phone: ${phone}

🎫 Booking Details:
📍 Place: ${bookingState.selectedPlace}
🏙️ City: ${bookingState.selectedCity}
⏰ Time: ${bookingState.selectedTime}
📅 Date: ${bookingState.selectedDate}
🎟️ Tickets: ${numTickets}

💰 Price Calculation:
Price per Ticket: ₹${bookingState.ticketPrice}
Total Tickets: ${numTickets}
Total Amount: ₹${totalPrice}`;

  // Send booking summary to webhook
  sendFormDataToWebhook({
    message: bookingSummaryText,
    timestamp: new Date().toISOString()
  });
  
  addMessage("✅ Details Confirmed!", true);
  bookingState.step = 'summary';
  
  setTimeout(() => {
    showBookingSummary();
  }, 500);
}

async function sendFormDataToWebhook(data) {
  try {
    console.log('📤 Sending form data to webhook...', data);
    
    const response = await fetch('https://ganeshpp.app.n8n.cloud/webhook-test/3eeb735a-9ad3-478d-b734-0afd35e1827c', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
      mode: 'cors'
    });
    
    console.log('📭 Webhook response status:', response.status);
    
    if (response.ok) {
      console.log('✅ Form data sent to webhook successfully');
      const responseData = await response.json().catch(() => null);
      console.log('✅ Webhook response data:', responseData);
    } else {
      console.error('⚠️ Webhook response error:', response.status, response.statusText);
      const errorData = await response.text().catch(() => null);
      console.error('⚠️ Error details:', errorData);
    }
  } catch (error) {
    console.error('⚠️ Error sending data to webhook:', error);
    console.error('⚠️ Error details:', error.message);
  }
}

function updatePriceDisplay() {
  const ticketsSelect = document.getElementById('num_tickets');
  const priceDisplay = document.getElementById('priceDisplay');
  const pricePerTicketSpan = document.getElementById('pricePerTicket');
  const totalPriceSpan = document.getElementById('totalPrice');
  
  if (ticketsSelect.value) {
    const numTickets = parseInt(ticketsSelect.value);
    const ticketPrice = 1;
    const total = ticketPrice * numTickets;
    
    pricePerTicketSpan.textContent = `₹${ticketPrice}`;
    totalPriceSpan.textContent = `₹${total}`;
    priceDisplay.style.display = 'block';
  }
}

function submitBookingForm(event) {
  event.preventDefault();
  
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const numTickets = parseInt(document.getElementById('num_tickets').value);
  
  // Validate
  if (!name || !email || !phone || !numTickets) {
    alert('Please fill in all fields');
    return;
  }
  
  if (phone.length !== 10 || isNaN(phone)) {
    alert('Please enter a valid 10-digit phone number');
    return;
  }
  
  bookingState.userDetails = {
    name: name,
    email: email,
    phone: phone,
    tickets: numTickets
  };
  
  // Build booking summary message
  const totalPrice = bookingState.ticketPrice * numTickets;
  const bookingSummaryText = `📊 BOOKING SUMMARY

👤 Personal Details:
📝 Name: ${name}
📧 Email: ${email}
📞 Phone: ${phone}

🎫 Booking Details:
📍 Place: ${bookingState.selectedPlace}
🏙️ City: ${bookingState.selectedCity}
⏰ Time: ${bookingState.selectedTime}
📅 Date: ${bookingState.selectedDate}
🎟️ Tickets: ${numTickets}

💰 Price Calculation:
Price per Ticket: ₹${bookingState.ticketPrice}
Total Tickets: ${numTickets}
Total Amount: ₹${totalPrice}`;

  // Send booking summary to webhook
  sendFormDataToWebhook({
    message: bookingSummaryText,
    timestamp: new Date().toISOString()
  });
  
  closeBookingForm();
  bookingState.step = 'summary';
  
  setTimeout(() => {
    showBookingSummary();
  }, 500);
}

// ===== STEP 8: BOOKING SUMMARY =====
async function showBookingSummary() {
  const totalPrice = bookingState.ticketPrice * bookingState.userDetails.tickets;
  
  const summaryMsg = `
<b>📊 BOOKING SUMMARY</b>

<b>👤 Personal Details:</b>
📝 Name: ${bookingState.userDetails.name}
📧 Email: ${bookingState.userDetails.email}
📞 Phone: ${bookingState.userDetails.phone}

<b>🎫 Booking Details:</b>
📍 Place: ${bookingState.selectedPlace}
🏙️ City: ${bookingState.selectedCity}
⏰ Time: ${bookingState.selectedTime}
📅 Date: ${bookingState.selectedDate}
🎟️ Tickets: ${bookingState.userDetails.tickets}

<b>💰 Price Calculation:</b>
Price per Ticket: ₹${bookingState.ticketPrice}
Total Tickets: ${bookingState.userDetails.tickets}
<b>Total Amount: ₹${totalPrice}</b>
  `.trim();
  
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message bot';
  
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper';
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = '📋';
  messageDiv.appendChild(avatar);
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.innerHTML = summaryMsg;
  wrapper.appendChild(contentDiv);
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '10px';
  buttonContainer.style.marginTop = '15px';
  buttonContainer.style.justifyContent = 'center';
  buttonContainer.style.flexWrap = 'wrap';
  
  // PROCEED TO PAYMENT BUTTON
  const paymentBtn = document.createElement('button');
  paymentBtn.textContent = '💳 PROCEED TO PAYMENT';
  paymentBtn.onclick = () => proceedToPayment(totalPrice);
  paymentBtn.style.cssText = `
    padding: 14px 24px;
    background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
    color: white;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
    transition: all 0.3s ease;
  `;
  paymentBtn.onmouseover = () => {
    paymentBtn.style.transform = 'translateY(-3px)';
    paymentBtn.style.boxShadow = '0 10px 25px rgba(76, 175, 80, 0.4)';
  };
  paymentBtn.onmouseout = () => {
    paymentBtn.style.transform = 'translateY(0)';
    paymentBtn.style.boxShadow = 'none';
  };
  buttonContainer.appendChild(paymentBtn);
  
  wrapper.appendChild(buttonContainer);
  const timeDiv = document.createElement('div');
  timeDiv.className = 'message-time';
  timeDiv.textContent = getCurrentTime();
  wrapper.appendChild(timeDiv);
  messageDiv.appendChild(wrapper);
  chatbox.appendChild(messageDiv);
  
  setTimeout(() => {
    chatbox.scrollTop = chatbox.scrollHeight;
  }, 100);
}

// ===== STEP 9: PAYMENT =====
async function proceedToPayment(totalPrice) {
  addMessage("Processing payment...", true);
  bookingState.step = 'payment';
  msgInput.disabled = true;
  
  try {
    // Create Razorpay order
    const response = await fetch(`${API_BASE_URL}/create-razorpay-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: totalPrice,
        name: bookingState.userDetails.name,
        email: bookingState.userDetails.email,
        phone: bookingState.userDetails.phone,
        place: bookingState.selectedPlace
      })
    });
    
    const orderData = await response.json();
    
    if (orderData.success && orderData.order_id) {
      // Open Razorpay checkout
      openRazorpayCheckout(orderData, totalPrice);
    } else {
      addMessage('❌ Payment setup failed. Please try again.', false);
      msgInput.disabled = false;
    }
  } catch (error) {
    console.error(error);
    addMessage('⚠️ Error processing payment. Please try again.', false);
    msgInput.disabled = false;
  }
}

function openRazorpayCheckout(orderData, totalPrice) {
  const options = {
    key: orderData.key_id,
    amount: totalPrice * 100, // Amount in paise
    currency: 'INR',
    name: bookingState.selectedPlace,
    description: `Booking at ${bookingState.selectedPlace}`,
    order_id: orderData.order_id,
    handler: function(response) {
      verifyPayment(response, orderData.order_id);
    },
    prefill: {
      name: bookingState.userDetails.name,
      email: bookingState.userDetails.email,
      contact: bookingState.userDetails.phone
    },
    theme: {
      color: '#128C7E'
    }
  };
  
  const rzp = new Razorpay(options);
  rzp.open();
}

async function verifyPayment(response, orderId) {
  try {
    const totalPrice = bookingState.ticketPrice * bookingState.userDetails.tickets;
    
    const verifyResponse = await fetch(`${API_BASE_URL}/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
        booking_id: Date.now().toString(),
        // Pass booking details for QR code generation
        name: bookingState.userDetails.name,
        email: bookingState.userDetails.email,
        phone: bookingState.userDetails.phone,
        place: bookingState.selectedPlace,
        city: bookingState.selectedCity,
        time: bookingState.selectedTime,
        date: bookingState.selectedDate,
        tickets: bookingState.userDetails.tickets,
        price_per_ticket: bookingState.ticketPrice,
        total_amount: totalPrice
      })
    });
    
    const result = await verifyResponse.json();
    
    if (result.success) {
      addMessage(result.summary, false);
      
      // Display QR code if available
      if (result.qr_code) {
        setTimeout(() => {
          displayQRCode(result.qr_code);
        }, 800);
      }
      
      msgInput.disabled = false;
      bookingState.step = 'completed';
      
      // Clear the form
      document.getElementById('bookingForm').reset();
    } else {
      addMessage('❌ Payment verification failed. Please try again.', false);
      msgInput.disabled = false;
    }
  } catch (error) {
    console.error(error);
    addMessage('⚠️ Error verifying payment. Please contact support.', false);
    msgInput.disabled = false;
  }
}

function displayQRCode(qrCodeBase64) {
  const totalPrice = bookingState.ticketPrice * bookingState.userDetails.tickets;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message bot';
  
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper';
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = '🎫';
  messageDiv.appendChild(avatar);
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  // Booking summary with user details
  const summaryHTML = `
    <b style="font-size: 15px; color: #128C7E;">📊 YOUR BOOKING DETAILS</b>
    <div style="margin-top: 10px; font-size: 13px; line-height: 1.8; color: #333;">
      <b>👤 Name :</b> ${bookingState.userDetails.name}<br>
      <b>📧 Email:</b> ${bookingState.userDetails.email}<br>
      <b>📞 Phone:</b> ${bookingState.userDetails.phone}<br>
      <br>
      <b>📍 Place:</b> ${bookingState.selectedPlace}<br>
      <b>🏙️ City:</b> ${bookingState.selectedCity}<br>
      <b>⏰ Time:</b> ${bookingState.selectedTime}<br>
      <b>📅 Date:</b> ${bookingState.selectedDate}<br>
      <b>🎟️ Tickets:</b> ${bookingState.userDetails.tickets}<br>
      <br>
      <b style="font-size: 14px; color: #4CAF50;">💰 Total Amount: ₹${totalPrice}</b>
    </div>
  `;
  
  const summaryDiv = document.createElement('div');
  summaryDiv.innerHTML = summaryHTML;
  summaryDiv.style.cssText = `
    background: #f0f8f7;
    padding: 10px;
    border-radius: 8px;
    border-left: 4px solid #128C7E;
    margin-bottom: 12px;
    font-size: 13px;
  `;
  contentDiv.appendChild(summaryDiv);
  
  // QR Code Section
  const qrTitle = document.createElement('div');
  qrTitle.innerHTML = '<b style="font-size: 14px; color: #128C7E; text-align: center;">🎫 Your Booking QR Code:</b>';
  qrTitle.style.marginBottom = '12px';
  contentDiv.appendChild(qrTitle);
  
  const qrContainer = document.createElement('div');
  qrContainer.style.cssText = `
    display: flex;
    justify-content: center;
    align-items: center;
    background: #ffffff;
    padding: 12px;
    border-radius: 12px;
    border: 2px solid #128C7E;
    margin: 10px 0;
  `;
  
  const qrImage = document.createElement('img');
  qrImage.src = qrCodeBase64;
  qrImage.alt = 'Booking QR Code';
  qrImage.style.cssText = `
    max-width: 100%;
    width: 180px;
    height: 180px;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(18, 140, 126, 0.2);
  `;
  qrContainer.appendChild(qrImage);
  
  contentDiv.appendChild(qrContainer);
  
  const instrDiv = document.createElement('div');
  instrDiv.innerHTML = '<div style="margin-top: 10px; font-size: 12px; color: #074e3e; text-align: center; background: #e8f5e9; padding: 8px; border-radius: 6px;"><b>📸 Important:</b> Screenshot this QR code and show it at the venue for entry.</div>';
  contentDiv.appendChild(instrDiv);
  
  wrapper.appendChild(contentDiv);
  
  const timeDiv = document.createElement('div');
  timeDiv.className = 'message-time';
  timeDiv.textContent = getCurrentTime();
  wrapper.appendChild(timeDiv);
  
  messageDiv.appendChild(wrapper);
  chatbox.appendChild(messageDiv);
  
  setTimeout(() => {
    chatbox.scrollTop = chatbox.scrollHeight;
  }, 100);
}

// ===== EMOJI AND MENU FUNCTIONS =====
function toggleEmojiPicker() {
  const emojiPicker = document.getElementById('emojiPicker');
  if (emojiPicker) {
    emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
  }
}

function insertEmoji(emoji) {
  msgInput.value += emoji;
  msgInput.focus();
}

function toggleMenu() {
  // Placeholder for menu toggle
  console.log('Menu toggled');
}

// ===== TEXT-TO-SPEECH FUNCTIONS (Web Speech API) =====
let ttsEnabled = false;
let isSpeaking = false;
let currentUtterance = null;
let ttsQueue = [];

// Track message IDs to prevent re-reading the same message repeatedly
let nextMessageId = 0;
let lastReadMessageId = -1;

// Runtime config (adjust via UI)
let ttsTargetLang = 'hi-IN'; // default language
let ttsRate = 1.5; // speaking speed (1.0 = normal)
let ttsTranslateToHindi = true; // translate to Hindi when using hi-IN

function setTtsLanguage(lang) {
  ttsTargetLang = lang;
  ttsTranslateToHindi = lang.startsWith('hi');
  console.log(`🔈 TTS language set to ${lang} (translate=${ttsTranslateToHindi})`);
}

function setTtsRate(rate) {
  ttsRate = rate;
  console.log(`🔈 TTS speed set to ${rate}`);
}

// Check if browser supports Web Speech API
const synth = window.speechSynthesis || null;
let availableVoices = [];

function loadVoices() {
  if (!synth) return;
  availableVoices = synth.getVoices() || [];
}

if (synth) {
  // Some browsers load voices asynchronously
  loadVoices();
  if (typeof synth.onvoiceschanged === 'function') {
    synth.onvoiceschanged = loadVoices;
  }
}

function toggleTextToSpeech() {
  const speakerBtn = document.getElementById('speakerBtn');
  
  if (!synth) {
    alert('Speech synthesis is not supported in this browser.');
    return;
  }

  if (ttsEnabled) {
    // Turn off speech
    ttsEnabled = false;
    synth.cancel();
    ttsQueue = [];
    isSpeaking = false;
    speakerBtn.classList.remove('active');
    console.log('🔇 Text-to-speech stopped');
  } else {
    // Turn on speech
    ttsEnabled = true;
    speakerBtn.classList.add('active');
    console.log('🔊 Text-to-speech enabled');

    // Clear any leftover queue and read unread messages
    ttsQueue = [];
    enqueueExistingMessages();
    processTtsQueue();
  }
}

function enqueueExistingMessages() {
  const messageElements = document.querySelectorAll('.message');
  messageElements.forEach(msgDiv => {
    const msgId = parseInt(msgDiv.dataset.msgId || '-1', 10);
    if (isNaN(msgId) || msgId <= lastReadMessageId) return;

    const contentDiv = msgDiv.querySelector('.message-content');
    if (!contentDiv) return;

    const text = contentDiv.innerText || contentDiv.textContent;
    if (!text || !text.trim()) return;

    ttsQueue.push({
      id: msgId,
      text: text.trim(),
      isUser: msgDiv.classList.contains('user')
    });
  });
}

function enqueueMessage(text, isUser, msgId) {
  if (!ttsEnabled) return;
  if (!text || !text.trim()) return;
  if (typeof msgId !== 'number') {
    msgId = nextMessageId++;
  }
  if (msgId <= lastReadMessageId) return;

  ttsQueue.push({ id: msgId, text: text.trim(), isUser });
  processTtsQueue();
}

async function processTtsQueue() {
  if (!ttsEnabled || isSpeaking || ttsQueue.length === 0) return;

  isSpeaking = true;

  while (ttsEnabled && ttsQueue.length > 0) {
    const item = ttsQueue.shift();

    // Only read new messages once
    if (item.id <= lastReadMessageId) continue;

    const prefix = item.isUser ? 'You said: ' : 'Bot says: ';
    const textToRead = cleanTextForSpeech(item.text);

    console.log(`📖 Speaking: ${textToRead}`);
    await speakText(prefix, textToRead);

    lastReadMessageId = item.id;

    // Small pause between messages
    await new Promise(res => setTimeout(res, 250));
  }

  isSpeaking = false;
  if (!ttsEnabled) {
    document.getElementById('speakerBtn')?.classList.remove('active');
  }
  console.log('✅ Finished speaking queued messages');
}

function cleanTextForSpeech(text) {
  // Remove HTML tags
  let cleaned = text.replace(/<[^>]*>/g, ' ');
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  // Remove emojis and special Unicode characters
  cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2300}-\u{23FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

async function translateToHindi(text) {
  try {
    const encoded = encodeURIComponent(text);
    const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|hi`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText;
    }
  } catch (err) {
    console.warn('Translation failed, using original text.', err);
  }
  return text;
}

function getPreferredVoice() {
  if (!availableVoices || availableVoices.length === 0) return null;

  // Prefer voices based on target language
  const lang = ttsTargetLang.toLowerCase();

  // Try to find a voice that matches the exact language tag
  let voice = availableVoices.find(v => v.lang.toLowerCase() === lang);
  if (voice) return voice;

  // For Hindi, prefer any voice with 'hi' or 'india' in the name/lang
  if (lang.startsWith('hi')) {
    voice = availableVoices.find(v => v.lang.toLowerCase().startsWith('hi')) ||
            availableVoices.find(v => /india|hindi/i.test(v.name));
    if (voice) return voice;
  }

  // For Indian English, prefer en-IN voices
  if (lang.startsWith('en')) {
    voice = availableVoices.find(v => v.lang.toLowerCase().includes('en-in')) ||
            availableVoices.find(v => /india|indian/i.test(v.name));
    if (voice) return voice;
  }

  // Fall back to a female voice if available
  voice = availableVoices.find(v => /female/i.test(v.name));
  if (voice) return voice;

  // Otherwise return first available voice
  return availableVoices[0];
}

function speakText(prefix, messageText) {
  return new Promise(async (resolve) => {
    if (!synth) {
      console.error('Speech Synthesis API not supported');
      resolve();
      return;
    }

    let finalText = messageText;
    if (ttsTranslateToHindi && ttsTargetLang.startsWith('hi')) {
      finalText = await translateToHindi(messageText);
    }

    const utterance = new SpeechSynthesisUtterance(`${prefix}${finalText}`);
    utterance.rate = ttsRate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = ttsTargetLang;

    const preferredVoice = getPreferredVoice();
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      console.log('🎤 Speaking started');
      currentUtterance = utterance;
    };

    utterance.onend = () => {
      console.log('🎤 Speaking ended');
      currentUtterance = null;
      resolve();
    };

    utterance.onerror = (event) => {
      console.error('Speech error:', event.error);
      currentUtterance = null;
      resolve();
    };

    synth.speak(utterance);
  });
}

// ===== KEYBOARD AND LOAD EVENTS =====
document.addEventListener('DOMContentLoaded', function() {
  msgInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      send();
    }
  });
  
  // Initialize TTS language selector
  const ttsLangSelect = document.getElementById('ttsLanguageSelect');
  if (ttsLangSelect) {
    ttsLangSelect.value = ttsTargetLang;
    ttsLangSelect.addEventListener('change', (event) => {
      setTtsLanguage(event.target.value);
    });
  }

  // Ensure the initial voice set matches the default language
  setTtsLanguage(ttsTargetLang);
  
  // Initialize with welcome message
  addMessage("👋 Hey there! Welcome to your travel buddy! 🌍", false);
  setTimeout(() => {
    const welcome = `I'm your Tourism Bot, and I'm here to help you discover amazing attractions and book tickets instantly! 🎫

Here's what I can do for you:
✨ Explore attractions by city
🕒 Pick your preferred time slot
📅 Choose the perfect date
👤 Save your details securely
💳 Complete payment instantly

Ready to explore? Just type any city name!

Popular destinations: Delhi • Agra • Jaipur • Mumbai • Goa • Bangalore • Hyderabad • Varanasi • Kerala • Shimla • Manali`;
    addMessage(welcome, false);
  }, 800);
});

// Handle send button click
if (document.querySelector('.send-btn')) {
  document.querySelector('.send-btn').addEventListener('click', send);
}
