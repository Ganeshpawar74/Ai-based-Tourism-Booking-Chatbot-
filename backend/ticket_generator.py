import qrcode
import uuid
import base64
from io import BytesIO
from config import config

def generate_ticket(name, place, date, time):
    """Generate a ticket with QR code"""

    ticket_id = str(uuid.uuid4())

    data = f"""
    Ticket ID: {ticket_id}
    Name: {name}
    Place: {place}
    Date: {date}
    Time: {time}
    """

    img = qrcode.make(data)

    path = f"ticket_{ticket_id}.png"

    img.save(path)

    return path


def generate_qr_code_base64(data):
    """Generate QR code and return as base64 string"""
    qr = qrcode.QRCode(
        version=config.QR_CODE_VERSION,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=config.QR_CODE_BOX_SIZE,
        border=config.QR_CODE_BORDER,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    # Create image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    buffered.seek(0)
    base64_string = base64.b64encode(buffered.getvalue()).decode()
    
    return f"data:image/png;base64,{base64_string}"