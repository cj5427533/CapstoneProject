# predict.py
import sys
import json
import pickle
import os
import warnings
from urllib.parse import urlparse

# scikit-learn 버전 호환성 경고 무시
warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')

# 상대 경로로 모델 로드
BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "best_model.pkl")

# Load pre-trained model (로드는 최초 1회)
# 버전 호환성 경고를 무시하고 로드
model = None
try:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
except Exception as e:
    # 모델 로드 실패 시 경고만 출력하고 계속 진행
    # (기본 규칙 기반 예측 사용)
    print(f"경고: ML 모델 로드 실패 ({str(e)[:100]}). 기본 규칙 기반 예측을 사용합니다.", file=sys.stderr)
    model = None

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

results = []

if model is None:
    # 모델이 없을 때 기본 규칙 기반 예측
    for url in urls:
        features = extract_features(url)
        # 간단한 규칙 기반 예측
        # 의심스러운 키워드, 짧은 URL, 비표준 TLD 등
        suspicious_score = 0
        if features[2] == 1:  # 의심스러운 키워드
            suspicious_score += 0.3
        if features[1] > 2:  # 하이픈이 많음
            suspicious_score += 0.2
        if features[3] == 1:  # 비표준 TLD
            suspicious_score += 0.2
        if features[8] == 1:  # URL 단축 서비스
            suspicious_score += 0.3
        
        label = 1 if suspicious_score > 0.5 else 0
        confidence = max(suspicious_score, 1 - suspicious_score)
        
        results.append({
            "url": url,
            "label": label,
            "confidence": round(confidence, 3)
        })
else:
    # ML 모델 사용
    features = [extract_features(url) for url in urls]
    labels = model.predict(features)
    probs = model.predict_proba(features)
    
    for i, url in enumerate(urls):
        confidence = round(max(probs[i]), 3)
        results.append({
            "url": url,
            "label": int(labels[i]),
            "confidence": confidence
        })

# 출력
print(json.dumps(results))
