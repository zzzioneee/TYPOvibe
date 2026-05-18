# Day 18 — 말하면 그려줌

**날짜**: 2026.05.19  
**태그**: Voice, GPT-Image-1, Web Speech API, Interactive

## 개요

Neuralink가 생각만으로 로봇 팔을 움직이는 시연을 발표했고, 국내에서는 몸이 불편한 만화가 천계영 님이 음성인식으로 AI를 학습시켜 만화를 그려내고 있다.  
"말"이 이미 손을 대신하는 시대 — 그렇다면 음성으로 장면을 설명하면 그 자리에서 그림이 그려지면 어떨까?

마이크를 누르고 말하면 GPT-Image-1이 "세상에서 가장 하찮은 그림판 스타일"로 실시간으로 그려준다.  
@withgrdnrush의 [세상에서 가장 하찮은 프롬프트]에서 영감받은 고정 스타일.

## 기술 스택

- **Web Speech API** (SpeechRecognition) — 브라우저 내장 음성인식, 설치 불필요
- **OpenAI GPT-Image-1** — 이미지 생성 (base64 응답)
- **localStorage** — API 키 로컬 저장 (외부 전송 없음)
- 순수 HTML/CSS/JS, 의존성 없음

## 구현 포인트

- 음성인식 `continuous: true` + `interimResults: true` → 말하는 중에도 실시간 텍스트 표시
- 버튼 누르면 시작, 다시 누르면 종료 → 종료 시 자동으로 generateImage 호출
- 고정 스타일 프롬프트 + 사용자 음성 텍스트 결합: "MS Paint, 5초에 그린 것 같은 하찮은 그림"
- 히스토리 썸네일로 최근 8장 접근 가능
- `quality: 'low'` 설정으로 빠른 응답

## FROM

- [Neuralink 음성인식 로봇팔 시연 기사](https://blog.secondbrush.co.kr/dailyprompt-751/?ref=daily-prompt-newsletter)
- [@withgrdnrush — 세상에서 가장 하찮은 프롬프트](https://www.threads.net/@withgrdnrush)
