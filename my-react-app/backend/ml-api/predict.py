# predict.py
import sys
import json
import pickle
from urllib.parse import urlparse

# Load pre-trained model (로드는 최초 1회)
with open("best_model.pkl", "rb") as f:
    model = pickle.load(f)

# 간단한 feature extractor (URL 하나당 9개 특징 추출)
def extract_features(url):
    parsed = urlparse(url)
    host = parsed.hostname or ""
    shortener_domains = {"bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly"}
    suspicious_kw = ["login", "verify", "confirm", "account", "discount", "free"]

    return [
        len(url),
        host.count("-"),
        int(any(kw in url.lower() for kw in suspicious_kw)),
        int(host.split(".")[-1] != "com"),
        int(parsed.scheme == "https"),
        max(len(host.split(".")) - 2, 0),
        int(host.replace(".", "").isdigit()),
        int("@" in url),
        int(host in shortener_domains),
    ]

# 입력받기 (Node에서 STDIN으로 JSON 넘겨줌)
urls = json.loads(sys.stdin.read())

features = [extract_features(url) for url in urls]
labels = model.predict(features)
probs = model.predict_proba(features)

results = []
for i, url in enumerate(urls):
    confidence = round(max(probs[i]), 3)
    results.append({
        "url": url,
        "label": int(labels[i]),
        "confidence": confidence
    })

# 출력
print(json.dumps(results))
