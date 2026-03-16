import razorpay
import hmac
import hashlib
import logging
import json
from backend.config import config
from dotenv import load_dotenv
from datetime import datetime

# Setup logging
logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Load environment variables from .env file
load_dotenv()

# Log configuration on startup
logger.info("="*70)
logger.info("RAZORPAY PAYMENT MODULE INITIALIZATION")
logger.info("="*70)

if config.RAZORPAY_KEY_ID and config.RAZORPAY_KEY_SECRET:
    logger.info(f"✅ Razorpay Key ID found: {config.RAZORPAY_KEY_ID[:10]}...")
else:
    logger.warning("⚠️ Razorpay keys not properly configured!")

# Initialize Razorpay client with environment variables
try:
    client = razorpay.Client(auth=(
        config.RAZORPAY_KEY_ID, 
        config.RAZORPAY_KEY_SECRET
    ))
    logger.info("✅ Razorpay client initialized successfully")
except Exception as e:
    logger.error(f"❌ Failed to initialize Razorpay client: {str(e)}")
    client = None


# ===== ORDER CREATION FUNCTIONS =====

def create_razorpay_order(amount, receipt_id, notes=None):
    """
    Create a Razorpay order for payment processing
    
    Args:
        amount (float): Amount in INR (will be converted to paise)
        receipt_id (str): Unique receipt identifier
        notes (dict): Additional notes/metadata for the order
        
    Returns:
        dict: Razorpay order object with order_id and other details
        
    Raises:
        Exception: If order creation fails
    """
    try:
        if not client:
            logger.error("❌ Razorpay client not initialized")
            raise Exception("Razorpay client not initialized. Please check your API keys in .env file.")
        
        if amount <= 0:
            raise ValueError("Amount must be greater than 0")
        
        logger.info(f"\n{'='*60}")
        logger.info("📝 CREATING NEW ORDER")
        logger.info(f"{'='*60}")
        logger.info(f"Amount: ₹{amount} INR")
        logger.info(f"Receipt ID: {receipt_id}")
        
        # Prepare order data
        order_data = {
            "amount": int(amount * 100),  # Convert to paise (₹100 = 10000 paise)
            "currency": "INR",
            "receipt": receipt_id,
            "payment_capture": 1  # Auto-capture payment after authorization
        }
        
        # Add notes if provided
        if notes:
            order_data["notes"] = notes
            logger.info(f"Order metadata: {json.dumps(notes, indent=2)}")
        
        # Create order via Razorpay API
        logger.info("Sending order creation request to Razorpay...")
        order = client.order.create(order_data)
        
        logger.info(f"✅ ORDER CREATED SUCCESSFULLY")
        logger.info(f"Order ID: {order['id']}")
        logger.info(f"Amount: ₹{amount} INR")
        logger.info(f"Status: {order['status']}")
        logger.info(f"{'='*60}\n")
        
        return order
        
    except razorpay.BadRequestError as e:
        error_msg = f"Razorpay Bad Request: {str(e)}"
        logger.error(f"❌ {error_msg}")
        raise Exception(error_msg)
    except razorpay.ServerError as e:
        error_msg = f"Razorpay Server Error: {str(e)}"
        logger.error(f"❌ {error_msg}")
        raise Exception(error_msg)
    except ValueError as e:
        error_msg = f"Invalid parameter: {str(e)}"
        logger.error(f"❌ {error_msg}")
        raise Exception(error_msg)
    except Exception as e:
        error_msg = f"Error creating Razorpay order: {str(e)}"
        logger.error(f"❌ {error_msg}", exc_info=True)
        raise Exception(error_msg)


# ===== PAYMENT VERIFICATION FUNCTIONS =====

def verify_payment_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
    """
    Verify Razorpay payment signature for security
    
    This function validates that the payment response came from Razorpay
    and hasn't been tampered with using HMAC-SHA256 signature verification.
    
    Args:
        razorpay_order_id (str): Order ID from Razorpay
        razorpay_payment_id (str): Payment ID from Razorpay
        razorpay_signature (str): Signature from Razorpay webhook/response
        
    Returns:
        bool: True if signature is valid, False otherwise
    """
    try:
        logger.info(f"\n{'='*60}")
        logger.info("🔐 VERIFYING PAYMENT SIGNATURE")
        logger.info(f"{'='*60}")
        logger.info(f"Order ID: {razorpay_order_id}")
        logger.info(f"Payment ID: {razorpay_payment_id}")
        
        # Create the message to verify
        message = f"{razorpay_order_id}|{razorpay_payment_id}"
        
        # Generate signature using HMAC-SHA256
        generated_signature = hmac.new(
            config.RAZORPAY_KEY_SECRET.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        logger.info(f"Expected signature: {generated_signature[:20]}...")
        logger.info(f"Received signature: {razorpay_signature[:20]}...")
        
        # Compare signatures
        is_valid = generated_signature == razorpay_signature
        
        if is_valid:
            logger.info("✅ SIGNATURE VERIFICATION PASSED")
            logger.info(f"{'='*60}\n")
        else:
            logger.error("❌ SIGNATURE VERIFICATION FAILED")
            logger.error("Payment signature does not match - possible tampering!")
            logger.info(f"{'='*60}\n")
        
        return is_valid
        
    except Exception as e:
        error_msg = f"Error verifying payment signature: {str(e)}"
        logger.error(f"❌ {error_msg}", exc_info=True)
        raise Exception(error_msg)


def get_payment_details(payment_id):
    """
    Fetch payment details from Razorpay using payment ID
    
    Args:
        payment_id (str): Razorpay payment ID
        
    Returns:
        dict: Payment details from Razorpay
    """
    try:
        if not client:
            raise Exception("Razorpay client not initialized")
        
        logger.info(f"Fetching payment details for ID: {payment_id}")
        payment = client.payment.fetch(payment_id)
        
        logger.info(f"✅ Payment details fetched successfully")
        logger.info(f"Status: {payment.get('status')}")
        logger.info(f"Amount: ₹{payment.get('amount')/100} INR")
        
        return payment
        
    except Exception as e:
        error_msg = f"Error fetching payment details: {str(e)}"
        logger.error(f"❌ {error_msg}", exc_info=True)
        raise Exception(error_msg)


def get_order_details(order_id):
    """
    Fetch order details from Razorpay using order ID
    
    Args:
        order_id (str): Razorpay order ID
        
    Returns:
        dict: Order details from Razorpay
    """
    try:
        if not client:
            raise Exception("Razorpay client not initialized")
        
        logger.info(f"Fetching order details for ID: {order_id}")
        order = client.order.fetch(order_id)
        
        logger.info(f"✅ Order details fetched successfully")
        logger.info(f"Status: {order.get('status')}")
        logger.info(f"Amount: ₹{order.get('amount')/100} INR")
        
        return order
        
    except Exception as e:
        error_msg = f"Error fetching order details: {str(e)}"
        logger.error(f"❌ {error_msg}", exc_info=True)
        raise Exception(error_msg)


# ===== REFUND FUNCTIONS (for customer refunds) =====

def refund_payment(payment_id, refund_amount=None, notes=None):
    """
    Process refund for a payment
    
    Args:
        payment_id (str): Razorpay payment ID to refund
        refund_amount (float): Amount in INR (if None, refunds full payment)
        notes (str): Reason for refund
        
    Returns:
        dict: Refund response from Razorpay
    """
    try:
        if not client:
            raise Exception("Razorpay client not initialized")
        
        logger.info(f"\n{'='*60}")
        logger.info("💳 PROCESSING REFUND")
        logger.info(f"{'='*60}")
        logger.info(f"Payment ID: {payment_id}")
        
        refund_data = {}
        
        if refund_amount:
            refund_data["amount"] = int(refund_amount * 100)  # Convert to paise
            logger.info(f"Refund amount: ₹{refund_amount} INR")
        else:
            logger.info("Refund amount: Full payment")
        
        if notes:
            refund_data["notes"] = {"reason": notes}
            logger.info(f"Reason: {notes}")
        
        # Process refund
        refund = client.payment.refund(payment_id, refund_data)
        
        logger.info(f"✅ REFUND PROCESSED SUCCESSFULLY")
        logger.info(f"Refund ID: {refund['id']}")
        logger.info(f"Status: {refund['status']}")
        logger.info(f"{'='*60}\n")
        
        return refund
        
    except Exception as e:
        error_msg = f"Error processing refund: {str(e)}"
        logger.error(f"❌ {error_msg}", exc_info=True)
        raise Exception(error_msg)


# ===== UTILITY FUNCTIONS =====

def get_razorpay_webhook_secret():
    """
    Get Razorpay webhook secret from environment
    
    Returns:
        str: Webhook secret key
    """
    webhook_secret = config.__dict__.get('RAZORPAY_WEBHOOK_SECRET', '')
    if not webhook_secret:
        logger.warning("⚠️ Razorpay webhook secret not configured")
    return webhook_secret


def verify_webhook_signature(webhook_body, webhook_signature):
    """
    Verify Razorpay webhook signature for security
    
    Args:
        webhook_body (str): Raw webhook body from Razorpay
        webhook_signature (str): X-Razorpay-Signature header value
        
    Returns:
        bool: True if webhook signature is valid
    """
    try:
        webhook_secret = get_razorpay_webhook_secret()
        
        if not webhook_secret:
            logger.warning("⚠️ Cannot verify webhook - secret not configured")
            return False
        
        generated_signature = hmac.new(
            webhook_secret.encode('utf-8'),
            webhook_body.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        is_valid = generated_signature == webhook_signature
        
        if is_valid:
            logger.info("✅ Webhook signature verified successfully")
        else:
            logger.warning("⚠️ Webhook signature verification failed")
        
        return is_valid
        
    except Exception as e:
        logger.error(f"❌ Error verifying webhook signature: {str(e)}")
        return False


def log_payment_status(payment_id, status):
    """
    Log payment status for audit trail
    
    Args:
        payment_id (str): Payment ID
        status (str): Payment status (captured, failed, etc.)
    """
    try:
        log_data = {
            "timestamp": datetime.now().isoformat(),
            "payment_id": payment_id,
            "status": status
        }
        logger.info(f"📋 Payment Log: {json.dumps(log_data)}")
    except Exception as e:
        logger.error(f"Error logging payment status: {str(e)}")


# ===== BACKWARD COMPATIBILITY =====

def create_payment(amount):
    """
    Legacy function for backward compatibility
    Creates a simple order without notes
    
    Args:
        amount (float): Amount in INR
        
    Returns:
        dict: Razorpay order object
    """
    logger.warning("⚠️ Using legacy create_payment() - consider using create_razorpay_order()")
    receipt_id = datetime.now().strftime("%Y%m%d%H%M%S")
    return create_razorpay_order(amount, receipt_id)


logger.info("✅ Payment module loaded successfully\n")