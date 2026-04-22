"""
Standalone script to train and evaluate rainfall model.

Run:
    python backend/model/train_model.py
"""

from rainfall_model import train_and_evaluate


def main() -> None:
    model, metrics = train_and_evaluate()
    print("Model trained successfully.")
    print(f"MAE: {metrics['mae']:.3f}")
    print(f"RMSE: {metrics['rmse']:.3f}")
    print(f"R2 Score: {metrics['r2_score']:.3f}")
    print("Prediction vs Actual plot saved in backend/outputs/")
    # Keeps variable used to avoid lint warning in some environments.
    _ = model


if __name__ == "__main__":
    main()
