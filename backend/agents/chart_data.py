from __future__ import annotations

import math
from typing import Any, Literal

from pydantic import BaseModel, Field, ValidationError, field_validator

SECTION_BUSINESS = "Business Overview + Segment Breakdown"
SECTION_FINANCIAL = "Financial Performance"

CHART_SECTIONS = frozenset({SECTION_BUSINESS, SECTION_FINANCIAL})


class BarDataset(BaseModel):
    label: str
    values: list[float] = Field(min_length=2, max_length=2)

    @field_validator("values")
    @classmethod
    def positive_finite(cls, v: list[float]) -> list[float]:
        for n in v:
            if not math.isfinite(n) or n <= 0:
                raise ValueError("values must be positive finite numbers")
        return v


class BarChartData(BaseModel):
    type: Literal["bar"]
    labels: list[str] = Field(min_length=2, max_length=2)
    datasets: list[BarDataset] = Field(min_length=1, max_length=2)

    @field_validator("labels")
    @classmethod
    def fy_labels(cls, v: list[str]) -> list[str]:
        normalized = [s.strip().upper().replace(" ", "") for s in v]
        if normalized != ["FY24", "FY25"]:
            raise ValueError("labels must be FY24 and FY25")
        return v


class DonutSegment(BaseModel):
    label: str
    value: float

    @field_validator("value")
    @classmethod
    def positive_finite(cls, v: float) -> float:
        if not math.isfinite(v) or v <= 0:
            raise ValueError("segment value must be positive")
        return v


class DonutChartData(BaseModel):
    type: Literal["donut"]
    segments: list[DonutSegment] = Field(min_length=2)


def validate_chart_data(section_title: str, raw: Any) -> dict[str, Any] | None:
    if raw is None:
        return None
    if not isinstance(raw, dict):
        return None

    try:
        if section_title == SECTION_FINANCIAL:
            if raw.get("type") != "bar":
                return None
            return BarChartData.model_validate(raw).model_dump()
        if section_title == SECTION_BUSINESS:
            if raw.get("type") != "donut":
                return None
            return DonutChartData.model_validate(raw).model_dump()
    except (ValidationError, ValueError):
        return None
    return None
