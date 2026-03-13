// Tourism Chatbot - Complete Interactive Multi-step Booking Workflow
// New Flow: Location -> Places (buttons) -> Description + Time -> Date -> Confirmation -> BOOK NOW -> Form -> Summary -> Payment

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
  ticketPrice: 500,
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

  if (bookingState.step === 'initial' || bookingState.step === 'city_search') {
    await searchCity(message);
  }
}

async function searchCity(message) {
  addMessage(message, true);
  msgInput.value = '';
  msgInput.disabled = true;

  try {
    const response = await fetch("http://127.0.0.1:5000/chat", {
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
      const welcomeMsg = `🌍 <b>Welcome to Tourism Ticket Booking!</b>\n\n${data.reply}\n\n<b>💡 Tip:</b> Type any city name from the list above to explore amazing places!`;
      addMessage(welcomeMsg, false);
      msgInput.disabled = false;
    }
  } catch (error) {
    console.error(error);
    addMessage("⚠️ <b>Oops!</b> Server error. Please try again.", false);
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
    
    const response = await fetch("http://127.0.0.1:5000/place-details", {
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
      bookingState.ticketPrice = 500; // Default price
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
  confirmText.innerHTML = '<b style="color: #128C7E; margin-top: 12px; display: block;">All correct? 👍</b>';
  wrapper.appendChild(confirmText);
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '10px';
  buttonContainer.style.marginTop = '15px';
  buttonContainer.style.justifyContent = 'space-between';
  
  // CONFIRM BUTTON
  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'booking-btn';
  confirmBtn.innerHTML = '✅ Confirm & Book';
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
  cancelBtn.innerHTML = '❌ Change';
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
    <p style="margin: 3px 0; color: #333;"><b>Price per ticket:</b> ₹<span id="inline_price_per_ticket">500</span></p>
    <p style="margin: 3px 0; color: #128c7e; font-weight: bold;"><b>Total:</b> ₹<span id="inline_total_price">500</span></p>
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
    const ticketPrice = 500;
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
  
  addMessage("✅ Details Confirmed!", true);
  bookingState.step = 'summary';
  
  setTimeout(() => {
    showBookingSummary();
  }, 500);
}

function updatePriceDisplay() {
  const ticketsSelect = document.getElementById('num_tickets');
  const priceDisplay = document.getElementById('priceDisplay');
  const pricePerTicketSpan = document.getElementById('pricePerTicket');
  const totalPriceSpan = document.getElementById('totalPrice');
  
  if (ticketsSelect.value) {
    const numTickets = parseInt(ticketsSelect.value);
    const ticketPrice = 500;
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
    const response = await fetch('http://127.0.0.1:5000/create-razorpay-order', {
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
    const verifyResponse = await fetch('http://127.0.0.1:5000/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
        booking_id: Date.now().toString()
      })
    });
    
    const result = await verifyResponse.json();
    
    if (result.success) {
      addMessage(result.summary, false);
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

// ===== KEYBOARD AND LOAD EVENTS =====
document.addEventListener('DOMContentLoaded', function() {
  msgInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      send();
    }
  });
  
  // Initialize with welcome message
  addMessage("🌍 <b>Welcome to Tourism Bot!</b>", false);
  setTimeout(() => {
    const welcome = `🤖 <b>Tourism Booking Bot</b>

Discover & book amazing attractions instantly!

✅ Browse attractions by city
✅ Select time slots & dates
✅ Fill your personal details
✅ Secure payment with Razorpay

📍 Try cities like:
Delhi • Agra • Jaipur • Mumbai • Goa • Bangalore • Hyderabad • Varanasi • Kerala • Shimla • Manali • Rishikesh • Udaipur • Jodhpur • Mysore • Chiang Mai`;
    addMessage(welcome, false);
  }, 600);
});

// Handle send button click
if (document.querySelector('.send-btn')) {
  document.querySelector('.send-btn').addEventListener('click', send);
}
