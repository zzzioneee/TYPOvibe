---
inclusion: auto
description: "Confluence 긴 페이지 업데이트 시 content 전송 규칙"
---

# Confluence 긴 페이지 업데이트 규칙

Confluence MCP 도구(`mcp_mcp_atlassian_confluence_update_page`)로 페이지를 업데이트할 때, content가 길면(약 5000자 이상) 파라미터가 잘려서 전송 실패가 반복된다.

## 해결 방법

content가 길 것으로 예상되면 MCP 도구 대신 Python 스크립트로 Confluence REST API를 직접 호출한다.

### 스크립트 패턴

```python
import json, urllib.request, base64, os

PAGE_ID = "대상_페이지_ID"
CONFLUENCE_URL = "Confluence_URL"  # mcp.json의 CONFLUENCE_URL에서 /wiki 제거

# credentials는 ~/.kiro/settings/mcp.json에서 읽기
with open(os.path.expanduser("~/.kiro/settings/mcp.json")) as f:
    cfg = json.load(f)
env = cfg["mcpServers"]["mcp-atlassian"]["env"]
email = env["CONFLUENCE_USERNAME"]
token = env["CONFLUENCE_API_TOKEN"]
confluence_url = env["CONFLUENCE_URL"].replace("/wiki", "")

auth = base64.b64encode(f"{email}:{token}".encode()).decode()
headers = {"Authorization": f"Basic {auth}", "Content-Type": "application/json", "Accept": "application/json"}

# 1. GET 현재 페이지
req = urllib.request.Request(f"{confluence_url}/wiki/rest/api/content/{PAGE_ID}?expand=body.storage,version", headers=headers)
with urllib.request.urlopen(req) as resp:
    page = json.loads(resp.read())

version = page["version"]["number"]
title = page["title"]
body = page["body"]["storage"]["value"]

# 2. 내용 수정 (replace 등)
new_body = body.replace("old", "new")

# 3. PUT 업데이트
update = {
    "version": {"number": version + 1, "message": "업데이트 설명"},
    "title": title,
    "type": "page",
    "body": {"storage": {"value": new_body, "representation": "storage"}}
}
req = urllib.request.Request(f"{confluence_url}/wiki/rest/api/content/{PAGE_ID}", data=json.dumps(update).encode(), headers=headers, method="PUT")
with urllib.request.urlopen(req) as resp:
    result = json.loads(resp.read())
    print(f"Updated to version {result['version']['number']}")
```

### 판단 기준

- 페이지를 `get_page`로 가져왔을 때 content 길이가 길면 → Python 스크립트 방식 사용
- 짧은 페이지(새로 만든 직후 등)는 MCP 도구로 충분
- MCP 도구로 시도했는데 content missing 에러가 나면 → 즉시 Python 스크립트로 전환 (재시도 금지)

### 주의사항

- 스크립트는 임시 파일로 생성 후 실행하고, 완료 후 삭제한다
- credentials는 절대 하드코딩하지 않고 mcp.json에서 읽는다
- content_format은 항상 storage (XHTML)를 유지한다

---

# 플레이체 생성기 프로젝트 Confluence 규칙

## 페이지 구조

- 상위 페이지: `1041586678` — "260323 [플레이체 생성기] AI 기반 PLAY체 그래픽 자동 생성 시스템"
- 하위 페이지는 상위 페이지 아래에 차곡차곡 쌓임
- 모든 페이지는 `2026-03` (ID: `1041449356`) 하위에 위치

## 제목 규칙

- 상위: `YYMMDD [프로젝트명] 큰 개념의 작업 내용`
- 하위: `YYMMDD 작업 내용` (대괄호 태그 생략 — 위계상 중복)

## 본문 템플릿 (storage format XHTML)

모든 페이지는 아래 구조를 따른다:

1. summary table (colgroup 스타일, thead 없이 tbody 안에 th 행)
2. `ac:layout-section` two_equal: 왼쪽 toc + 오른쪽 info 매크로
3. `<hr/>` 구분선
4. 이모지 h2 섹션들 (📋, ✨, ⚙️, 🏗️, 🎨, 📊, 📌, 🔧, 🔄 등)
5. 문체: `~요` 체 (casual polite Korean)

## 하위 페이지 생성 시 작업 기록 업데이트 규칙

하위 페이지를 새로 생성할 때마다, 반드시 상위 페이지(`1041586678`)의 "🔄 작업 기록" 섹션 `<ul>` 목록에 새 페이지 링크를 추가한다.

링크 형식 (storage format):
```xml
<li><ac:link><ri:page ri:content-title="페이지 제목"/></ac:link></li>
```

새 항목은 목록의 맨 아래(최신이 아래)에 추가한다. Python 스크립트로 상위 페이지를 GET → `</ul>` 앞에 새 `<li>` 삽입 → PUT 하면 된다.

## 접어두기(expand) 간격 규칙

expand 매크로 사이에 `<p><br/></p>` 를 넣지 않는다. 바로 붙여서 간격 없이 표시한다.
