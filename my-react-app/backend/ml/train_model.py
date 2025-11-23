# train_model.py
import os
import pickle

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# 현재 파일(train_model.py) 기준 경로
BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, "url_features.csv")
MODEL_PATH = os.path.join(BASE_DIR, "best_model.pkl")

def load_data():
    df = pd.read_csv(DATA_PATH)

    # 우리가 쓸 feature 컬럼들 (predict.py의 extract_features 순서와 동일하게 맞춰줌)
    feature_cols = [
        "Length",
        "Hyphens",
        "SuspiciousKW",
        "NonComTLD",
        "HTTPS",
        "Subdomains",
        "IPAddress",
        "ContainsAt",
        "Shortener",
    ]

    X = df[feature_cols].values
    y = df["label"].values

    return X, y

def train_and_save_model():
    X, y = load_data()

    # 간단히 train/test 나눠서 성능 한 번 보고 저장
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # RandomForest 모델 (예전에 썼던 것과 비슷한 기본 설정)
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=None,
        random_state=42,
        n_jobs=-1,
    )

    model.fit(X_train, y_train)

    # 간단 성능 출력
    y_pred = model.predict(X_test)
    print("=== Classification Report ===")
    print(classification_report(y_test, y_pred, digits=3))

    # 학습된 모델을 best_model.pkl로 저장
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)

    print(f"\n✅ 모델 저장 완료: {MODEL_PATH}")

if __name__ == "__main__":
    train_and_save_model()
