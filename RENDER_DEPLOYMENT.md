# Render Deployment Guide

This project is configured for deployment on **Render**.

## Prerequisites
- Render account (https://render.com)
- GitHub repository connected to Render
- Environment variables configured

## Deployment Steps

### 1. Connect GitHub Repository
1. Go to https://dashboard.render.com/
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Select the branch (main)

### 2. Configure Service
- **Name**: tourism-chatbot-api
- **Runtime**: Python 3.11
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn -w 4 -b 0.0.0.0:$PORT backend.app:app`

### 3. Set Environment Variables
In the Render dashboard, add these environment variables:
```
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
FLASK_ENV=production
PYTHONUNBUFFERED=true
```

### 4. Deploy
Click "Deploy" and Render will automatically:
- Pull your code from GitHub
- Install dependencies
- Start the application
- Provide you with a live URL

## Service Configuration
The `render.yaml` file contains the complete service configuration:
- 4 Gunicorn workers for better performance
- Automatic port binding
- Production environment settings
- Environment variable definitions

## Accessing Your App
Once deployed, your application will be available at:
```
https://your-service-name.onrender.com
```

## Monitoring & Logs
- View logs in Render dashboard under "Logs"
- Check application health in "Health" section
- Monitor resource usage in "Metrics"

## Redeployment
Any push to the main branch will trigger automatic redeployment.

## Troubleshooting
- **Build fails**: Check requirements.txt for compatibility
- **App crashes**: Check environment variables in Render dashboard
- **Port issues**: Render assigns PORT dynamically, handled by Gunicorn
- **Static files not loading**: Ensure frontend directory path is correct

## Notes
- Vercel configuration has been removed
- Use `gunicorn` as the production server (included in requirements.txt)
- Application runs on port defined by Render (via $PORT variable)
