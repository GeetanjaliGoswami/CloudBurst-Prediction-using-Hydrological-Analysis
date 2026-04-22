# Cloudburst Prediction via Hydrological Analysis


- **Machine Learning rainfall prediction** (Random Forest)
- **Hydrological simulation** using `Q = C x I x A`
- **Hydrological Impact Index (HII)** + risk classification
- **Flask REST API** backend
- **HTML/CSS/JavaScript** frontend with Chart.js visualization

---

## 1) Project Structure

```text
cloudburst_prediction_hydrological_analysis/
├── backend/
│   ├── app.py
│   ├── data/
│   │   └── sample_weather_data.csv
│   ├── model/
│   │   ├── __init__.py
│   │   ├── hydrology.py
│   │   ├── rainfall_model.py
│   │   └── train_model.py
│   └── outputs/
│       └── prediction_vs_actual.png  (generated after training)
├── frontend/
│   ├── index.html
│   ├── script.js
│   └── style.css
├── requirements.txt
└── README.md
```

---

## 2) System Architecture Diagram (for report)

```mermaid
flowchart TD
    A[Historical Weather + Rainfall Data] --> B[ML Model: Random Forest]
    C[User Input: rainfall, area, slope] --> D[Flask API /predict]
    B --> D
    D --> E[Hydrological Model Q = C x I x A]
    E --> F[Hydrological Impact Index (HII)]
    F --> G[Risk Classification: Low / Medium / High]
    G --> H[Frontend Dashboard + Chart]
```

---

## 3) Step-by-Step Setup Instructions

### Prerequisites
- Python 3.10+
- pip

### Install
1. Open terminal in project folder:
   ```bash
   cd cloudburst_prediction_hydrological_analysis
   ```
2. Create virtual environment:
   ```bash
   python -m venv .venv
   ```
3. Activate virtual environment:
   - Windows:
     ```bash
     .venv\Scripts\activate
     ```
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

---

## 4) How to Run the Project

### A) Train and Evaluate ML Model
```bash
python backend/model/train_model.py
```
This prints MAE, RMSE, R2 score and generates:
- `backend/outputs/prediction_vs_actual.png`

### B) Run Flask Backend
```bash
python backend/app.py
```
Server starts at:
- `http://127.0.0.1:5000`

### C) Run Frontend
- Open `frontend/index.html` in browser (double click)
- Enter rainfall, area, slope
- Click **Predict**

---

## 5) API Endpoint

### POST `/predict`
**Request JSON**
```json
{
  "rainfall": 80,
  "area": 25,
  "slope": 18
}
```

**Response JSON (example)**
```json
{
  "predicted_rainfall": 38.4,
  "discharge": 728.5,
  "hii": 33.0,
  "risk_level": "Low",
  "model_metrics": {
    "mae": 3.1,
    "rmse": 4.2,
    "r2_score": 0.89
  }
}
```

---

## 6) Frontend Integration Example (fetch API)

```javascript
fetch("http://127.0.0.1:5000/predict", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ rainfall: 80, area: 25, slope: 18 })
})
  .then((res) => res.json())
  .then((data) => console.log(data));
```

---

## 7) Sample Test Inputs and Expected-Type Outputs

1. **Input**: rainfall=70, area=20, slope=10  
   **Output Type**: Medium discharge, low-to-medium HII, usually Low/Medium risk

2. **Input**: rainfall=120, area=30, slope=25  
   **Output Type**: High discharge, higher HII, usually Medium/High risk

3. **Input**: rainfall=180, area=40, slope=35  
   **Output Type**: Very high discharge, high HII, usually High risk

---


