"""
Flask backend for Cloudburst Prediction via Hydrological Analysis.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS

from model.hydrology import calculate_discharge, calculate_hii, classify_risk
from model.rainfall_model import predict_rainfall, train_and_evaluate

app = Flask(__name__)
CORS(app)

# Train once at server startup for quick inference.
ml_model, model_metrics = train_and_evaluate()


@app.get("/health")
def health():
    """Simple health check endpoint."""
    return jsonify({"status": "ok"})


@app.post("/predict")
def predict():
    """
    Accept input JSON and return prediction response.

    Required fields:
    - rainfall
    - area
    - slope

    Optional fields for ML weather features:
    - temperature (default 25)
    - humidity (default 70)
    - wind_speed (default 12)
    - pressure (default 1005)
    """

@app.get("/")
def home():
    return "Cloudburst Prediction API is running"


    data = request.get_json(silent=True) or {}
    try:
        observed_rainfall = float(data.get("rainfall", 0))
        area = float(data["area"])
        slope = float(data["slope"])

        weather_features = {
            "temperature": float(data.get("temperature", 25)),
            "humidity": float(data.get("humidity", 70)),
            "wind_speed": float(data.get("wind_speed", 12)),
            "pressure": float(data.get("pressure", 1005)),
        }

        predicted_rainfall = predict_rainfall(ml_model, weather_features)

        # Blend observed and predicted rainfall to use both user input and model insight.
        effective_rainfall = (observed_rainfall + predicted_rainfall) / 2.0
        runoff_coefficient = min(0.95, 0.35 + (slope / 100.0))

        discharge = calculate_discharge(runoff_coefficient, effective_rainfall, area)
        hii = calculate_hii(discharge, slope, area)
        risk_level = classify_risk(hii)

        return jsonify(
            {
                "predicted_rainfall": round(predicted_rainfall, 2),
                "discharge": round(discharge, 2),
                "hii": round(hii, 2),
                "risk_level": risk_level,
                "model_metrics": model_metrics,
            }
        )
    except KeyError as exc:
        return jsonify({"error": f"Missing required field: {exc}"}), 400
    except ValueError:
        return jsonify({"error": "Invalid numeric input provided."}), 400


if __name__ == "__main__":
    app.run(debug=True)
