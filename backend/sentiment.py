"""News headline sentiment scoring via VADER — rule-based, no model download required."""

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

_analyzer = SentimentIntensityAnalyzer()


def score_text(text: str) -> float:
    if not text:
        return 0.0
    return _analyzer.polarity_scores(text)["compound"]


def label_for(compound: float) -> str:
    if compound >= 0.15:
        return "Positive"
    if compound <= -0.15:
        return "Negative"
    return "Neutral"


def score_headlines(items: list[dict]) -> list[dict]:
    scored = []
    for item in items:
        compound = score_text(item.get("title", ""))
        scored.append({**item, "sentiment": round(compound, 3), "sentimentLabel": label_for(compound)})
    return scored


def aggregate_sentiment(scored_items: list[dict]) -> dict:
    if not scored_items:
        return {"compound": 0.0, "label": "Neutral", "count": 0}
    avg = sum(i["sentiment"] for i in scored_items) / len(scored_items)
    return {"compound": round(avg, 3), "label": label_for(avg), "count": len(scored_items)}
