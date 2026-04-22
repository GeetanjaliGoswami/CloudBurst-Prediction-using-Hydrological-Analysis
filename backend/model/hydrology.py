"""
Hydrology utility functions for cloudburst prediction.

This module keeps all hydrological calculations in one place so the
functions are easy to test and reuse with ML predictions.
"""


def calculate_discharge(runoff_coefficient: float, rainfall_intensity: float, area: float) -> float:
    """
    Calculate river discharge using the Rational Method formula:
    Q = C * I * A

    Args:
        runoff_coefficient: Runoff coefficient (dimensionless).
        rainfall_intensity: Rainfall intensity (mm/hr).
        area: Catchment area (km^2 or chosen unit).

    Returns:
        Calculated discharge value.
    """
    return runoff_coefficient * rainfall_intensity * area


def calculate_hii(discharge: float, slope: float, area: float) -> float:
    """
    Calculate Hydrological Impact Index (HII).

    Simple normalized index for academic demonstration:
        HII = (discharge * (1 + slope_factor)) / (area + 1)

    Args:
        discharge: Calculated discharge from hydrological model.
        slope: Terrain slope in degrees.
        area: Catchment area.

    Returns:
        HII score.
    """
    slope_factor = slope / 45.0
    return (discharge * (1.0 + slope_factor)) / (area + 1.0)


def classify_risk(hii: float) -> str:
    """
    Classify hydrological risk level from HII score.
    Thresholds are intentionally simple for a B.Tech demo.
    """
    if hii < 50:
        return "Low"
    if hii < 120:
        return "Medium"
    return "High"
