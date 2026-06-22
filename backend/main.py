import os
import joblib
import pandas as pd
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Determine absolute path to model
model_path = os.path.join(os.path.dirname(__file__), "models", "fraud_detection_model.joblib")
model = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI Lifespan Context Manager.
    Loads the machine learning model from disk once on server startup, 
    avoiding overhead on subsequent requests.
    """
    global model
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Trained model not found at: {model_path}")
    try:
        model = joblib.load(model_path)
        print(f"Successfully loaded Credit Card Fraud model from {model_path}")
    except Exception as e:
        print(f"Failed to load joblib model: {e}")
        raise e
    yield
    # Cleanup operations (if any) can be performed here on shutdown

# Initialize FastAPI application
app = FastAPI(
    title="Credit Card Fraud Detection Backend API",
    description=(
        "A microservice that loads a pre-trained RandomForest model "
        "and exposes a prediction API endpoint."
    ),
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS Middleware
# Allows the React client (typically running on localhost:5173) to perform cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TransactionRequest(BaseModel):
    """
    Pydantic request body schema representing the transaction data payload 
    sent by the Vite + React + TypeScript frontend.
    """
    time: float = Field(..., description="Seconds elapsed since block start (0 - 172800)")
    amount: float = Field(..., description="Transaction flat amount in USD")
    v1: float = Field(..., description="PCA Latent space variable V1")
    v2: float = Field(..., description="PCA Latent space variable V2")
    v3: float = Field(..., description="PCA Latent space variable V3")
    v4: float = Field(..., description="PCA Latent space variable V4")
    v5: float = Field(..., description="PCA Latent space variable V5")
    v11: float = Field(..., description="PCA Latent space variable V11")
    v12: float = Field(..., description="PCA Latent space variable V12")
    v14: float = Field(..., description="PCA Latent space variable V14")
    v17: float = Field(..., description="PCA Latent space variable V17")

class PredictionResponse(BaseModel):
    """
    Pydantic response schema matching the interface constraints of the frontend.
    """
    prediction: int = Field(..., description="0 for Legitimate, 1 for Fraudulent")
    probability: float = Field(..., description="Probability score of fraud (range: 0.0 - 1.0)")

@app.get("/health")
def health():
    """
    Health check endpoint to verify backend service readiness.
    """
    return {
        "status": "healthy",
        "model_loaded": model is not None
    }

@app.post("/api/predict", response_model=PredictionResponse)
@app.post("/predict", response_model=PredictionResponse)
def predict(tx: TransactionRequest):
    """
    POST prediction endpoint.
    Accepts transaction data, maps the 11 provided features onto the 30-feature vector
    expected by the scikit-learn model, runs model inference, and returns prediction
    results.
    """
    if model is None:
        raise HTTPException(
            status_code=503, 
            detail="Machine learning model is not loaded. Please check backend server logs."
        )

    try:
        # Define the 30 features in the exact order scikit-learn expects
        feature_names = [
            'Time', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10',
            'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17', 'V18', 'V19', 'V20',
            'V21', 'V22', 'V23', 'V24', 'V25', 'V26', 'V27', 'V28', 'Amount'
        ]

        # Initialize full 30 feature space with 0.0 defaults (PCA features are zero-centered)
        features_dict = {feat: 0.0 for feat in feature_names}

        # Map frontend inputs to the respective key indices
        features_dict['Time'] = tx.time
        features_dict['Amount'] = tx.amount
        features_dict['V1'] = tx.v1
        features_dict['V2'] = tx.v2
        features_dict['V3'] = tx.v3
        features_dict['V4'] = tx.v4
        features_dict['V5'] = tx.v5
        features_dict['V11'] = tx.v11
        features_dict['V12'] = tx.v12
        features_dict['V14'] = tx.v14
        features_dict['V17'] = tx.v17

        # Convert to Pandas DataFrame using the exact column ordering list to prevent scikit-learn warning
        df = pd.DataFrame([features_dict], columns=feature_names)

        # Perform Model Inference
        # prediction: array containing integer class prediction (0 or 1)
        # probabilities: array containing probabilities of [Class 0, Class 1]
        prediction = int(model.predict(df)[0])
        probabilities = model.predict_proba(df)[0]
        probability_score = float(probabilities[1])

        return PredictionResponse(
            prediction=prediction,
            probability=round(probability_score, 4)
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Inference pipeline execution failure: {str(e)}"
        )
