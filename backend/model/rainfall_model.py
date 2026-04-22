"""
Rainfall ML pipeline using Random Forest.

Includes:
- sample data loading
- preprocessing (missing values + normalization)
- train/test split
- model training
- metrics reporting
- prediction-vs-actual plot
"""

from pathlib import Path
from typing import Dict, Tuple

import matplotlib.pyplot as plt
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, r2_score, root_mean_squared_error
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import MinMaxScaler


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "sample_weather_data.csv"
PLOT_PATH = BASE_DIR / "outputs" / "prediction_vs_actual.png"


def load_data() -> pd.DataFrame:
    """Load historical weather data from CSV."""
    return pd.read_csv(DATA_PATH)


def build_pipeline() -> Pipeline:
    """Build preprocessing + model pipeline."""
    return Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", MinMaxScaler()),
            (
                "model",
                RandomForestRegressor(
                    n_estimators=200,
                    max_depth=8,
                    random_state=42,
                ),
            ),
        ]
    )


def train_and_evaluate() -> Tuple[Pipeline, Dict[str, float]]:
    """Train model and return pipeline with evaluation metrics."""
    data = load_data()
    feature_cols = ["temperature", "humidity", "wind_speed", "pressure"]
    target_col = "rainfall"

    x = data[feature_cols]
    y = data[target_col]

    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.2, random_state=42
    )

    pipeline = build_pipeline()
    pipeline.fit(x_train, y_train)

    predictions = pipeline.predict(x_test)
    metrics = {
        "mae": float(mean_absolute_error(y_test, predictions)),
        "rmse": float(root_mean_squared_error(y_test, predictions)),
        "r2_score": float(r2_score(y_test, predictions)),
    }

    save_prediction_plot(y_test.reset_index(drop=True), predictions)
    return pipeline, metrics


def save_prediction_plot(actual: pd.Series, predicted) -> None:
    """Save prediction vs actual rainfall graph for report/demo."""
    PLOT_PATH.parent.mkdir(parents=True, exist_ok=True)
    plt.figure(figsize=(8, 5))
    plt.plot(actual.values, label="Actual Rainfall", marker="o")
    plt.plot(predicted, label="Predicted Rainfall", marker="x")
    plt.title("Rainfall Prediction: Actual vs Predicted")
    plt.xlabel("Test Sample")
    plt.ylabel("Rainfall (mm)")
    plt.legend()
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(PLOT_PATH)
    plt.close()


def predict_rainfall(model: Pipeline, weather_features: Dict[str, float]) -> float:
    """Predict rainfall from weather feature dictionary."""
    sample = pd.DataFrame([weather_features])
    prediction = model.predict(sample)[0]
    return float(prediction)
