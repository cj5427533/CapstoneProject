// server.js
const express = require("express");
const { spawn } = require("child_process");
const path = require("path");
const supabase = require("../config/supabase");
const app = express();
app.use(express.json());

app.post("/api/ml/predict", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL이 필요합니다." });
  }

  const urls = [url]; // 단일 URL을 배열로 변환

  const py = spawn("python3", [path.join(__dirname, "predict.py")]);
  let data = "";

  py.stdin.write(JSON.stringify(urls));
  py.stdin.end();

  py.stdout.on("data", (chunk) => {
    data += chunk.toString();
  });

  py.stderr.on("data", (err) => {
    console.error("Python 에러:", err.toString());
  });

  py.on("close", async () => {
    try {
      const results = JSON.parse(data);
      const result = results[0]; // 단일 URL이므로 0번 인덱스
      const { label, confidence } = result;

      // Supabase에 결과 저장
      const { data: saved, error } = await supabase
        .from("ml_prediction_results")
        .insert([
          {
            url,
            label,
            confidence,
            requested_by: req.ip || req.headers["x-forwarded-for"] || "unknown",
          },
        ])
        .select();

      if (error) {
        console.error("Supabase 저장 오류:", error);
        // 저장 실패해도 예측 결과는 반환
        return res.json({
          url,
          label,
          confidence,
          saved: false,
          error: "예측 결과 저장 실패",
        });
      }

      res.json({
        url,
        label,
        confidence,
        saved: true,
        id: saved?.[0]?.id,
      });
    } catch (e) {
      console.error("예측 처리 중 오류:", e);
      res.status(500).json({ error: "예측 처리 중 오류 발생" });
    }
  });
});

app.listen(3001, () => {
  console.log("✅ ML API 서버 실행 중: http://localhost:3001");
});
