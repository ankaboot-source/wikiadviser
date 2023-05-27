from fastapi.responses import HTMLResponse
from fastapi import FastAPI, Request, Form
import sentiment_analysis as se

app = FastAPI()

@app.get("/sentiment_analysis")
async def index(request: Request,  text: str):
    sentiment_scores = se.get_textblob_sentiment_scores(text)
    print(sentiment_scores)
    return {'scores': sentiment_scores}
