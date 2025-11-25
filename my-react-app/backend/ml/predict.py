# predict.py
import sys
import json
import pickle
import os
import warnings
import math
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
        # 기본 confidence는 예측된 클래스의 확률
        base_confidence = max(probs[i])
        
        # URL 특징 기반 confidence 보정
        # 확률 분포의 차이를 반영하여 더 정확한 confidence 계산
        prob_diff = abs(probs[i][0] - probs[i][1])  # 두 클래스 확률 차이
        
        # URL 특징 분석
        url_features = features[i]
        parsed = urlparse(url)
        host = parsed.hostname or ""
        
        # 특징 기반 confidence 조정
        adjustment = 0.0
        
        # 1. 확률 차이가 클수록 confidence 증가 (모델이 확신할수록)
        if prob_diff > 0.5:
            adjustment += 0.1
        elif prob_diff > 0.3:
            adjustment += 0.05
        elif prob_diff < 0.1:
            adjustment -= 0.1  # 확률 차이가 작으면 불확실성 증가
        
        # 2. URL 길이 기반 조정 (너무 짧거나 긴 URL은 의심)
        url_len = url_features[0]
        if url_len < 10 or url_len > 200:
            adjustment -= 0.05
        
        # 3. 하이픈 개수 기반 조정 (하이픈이 많으면 의심)
        hyphens = url_features[1]
        if hyphens > 3:
            adjustment -= 0.05
        elif hyphens == 0:
            adjustment += 0.02
        
        # 4. 의심 키워드 기반 조정
        has_suspicious_kw = url_features[2]
        if has_suspicious_kw:
            adjustment -= 0.08
        
        # 5. TLD 기반 조정
        non_com_tld = url_features[3]
        if non_com_tld:
            adjustment -= 0.05
        
        # 6. HTTPS 기반 조정
        has_https = url_features[4]
        if has_https:
            adjustment += 0.03
        
        # 7. 서브도메인 개수 기반 조정
        subdomains = url_features[5]
        if subdomains > 3:
            adjustment -= 0.05
        
        # 8. IP 주소 사용 여부
        is_ip = url_features[6]
        if is_ip:
            adjustment -= 0.1
        
        # 9. URL 단축 서비스 사용 여부
        is_shortener = url_features[8]
        if is_shortener:
            adjustment -= 0.1
        
        # confidence 보정 적용 (0~1 범위 유지)
        adjusted_confidence = base_confidence + adjustment
        adjusted_confidence = max(0.1, min(0.99, adjusted_confidence))
        
        # 확률 분포의 엔트로피를 고려한 최종 confidence 계산
        # 엔트로피가 낮을수록(확신할수록) confidence 증가
        entropy = -sum(p * math.log2(p) if p > 0 else 0 for p in probs[i])
        max_entropy = math.log2(len(probs[i]))  # 최대 엔트로피 (균등 분포)
        entropy_normalized = entropy / max_entropy if max_entropy > 0 else 0
        
        # 최종 confidence: 보정된 confidence와 엔트로피 기반 confidence의 가중 평균
        # 엔트로피가 낮을수록(1 - entropy_normalized가 높을수록) confidence 증가
        final_confidence = adjusted_confidence * 0.7 + (1 - entropy_normalized) * 0.3
        final_confidence = max(0.1, min(0.99, final_confidence))
        
        results.append({
            "url": url,
            "label": int(labels[i]),
            "confidence": round(final_confidence, 3)
        })

# 출력
print(json.dumps(results))
