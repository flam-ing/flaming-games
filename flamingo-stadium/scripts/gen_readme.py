"""Regenerate the migrated Stadium README from the maintained hub data."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE_COMMIT = 'a48b22be4494773f5c6beefe3d6cc7718ac2f266'
SOURCE_URL = 'https://github.com/minwoo19930301/flamingo-stadium'
data = json.loads(re.sub(r'^window\.GAMES_DATA=|;\s*$', '', (ROOT / 'games.js').read_text(encoding='utf-8').strip()))
rows = []
for i, game in enumerate(data, 1):
    mode = '3D + 2D' if game.get('render3d') else '2D'
    rows.append(f"| {i:02d} | [{game['title']}](games/{game['id']}.html) | {mode} | {game['orig']} (Stadium {game['series']}) | {game['controls']} |")
table = '\n'.join(rows)
md = f'''# Flamingo Stadium 🦩 · Flaming Games

포켓몬 스타디움 1·2 「키즈 클럽」에서 영감받은 **21종의 플라밍고 미니게임**을 [Flaming Games](../README.md)의 `flamingo-stadium/`으로 통합했습니다. 게임 21개, 공용 셸, 원작 조사 스펙 21개, 개발·검증 스크립트를 함께 가져왔습니다.

**스플래시 · 달려라 플라밍고 · 빙글빙글 링아웃**은 로우폴리 3D 경기장을 추가했습니다. 같은 게임에서 `2D로 보기` / `3D로 보기`로 전환하며, 기존 조작·게임 규칙·CPU·점수·기록을 공유합니다. WebGL 렌더러를 사용할 수 없는 브라우저에서는 클래식 2D로 플레이합니다. 나머지 18종은 기존 2D 버전입니다.

## 출처와 경로

- 원본 저장소: [{SOURCE_URL}]({SOURCE_URL})
- 가져온 커밋: [`{SOURCE_COMMIT}`]({SOURCE_URL}/commit/{SOURCE_COMMIT})
- 통합 저장소: [flam-ing/flaming-games](https://github.com/flam-ing/flaming-games)
- 통합 위치: `flamingo-stadium/`; 원본의 게임 ID와 `games/<id>.html` 경로를 유지합니다.
- 배포 후 허브 경로: `/flamingo-stadium/` (GitHub Pages에서는 저장소 경로 아래 `/flaming-games/flamingo-stadium/`).
- 기존 원본 저장소와 배포본은 이 통합으로 삭제하거나 변경하지 않습니다.

## 로컬 실행

3D는 로컬 ES 모듈을 불러오므로 파일을 직접 여는 대신 HTTP 서버를 사용합니다. 저장소 루트에서:

```sh
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000/flamingo-stadium/`을 엽니다. 설치·빌드 과정은 없습니다. Three.js는 `common/vendor/`에 버전과 라이선스를 포함해 보관하며 Stadium 실행 중 CDN이나 외부 에셋을 불러오지 않습니다. 3D 선택 링크에 `?view=3d`, 2D 선택 링크에 `?view=2d`를 붙일 수도 있습니다.

## 함께 플레이하기

**한 키보드로 1~4명이 같이 합니다.** 타이틀·결과 화면에서 숫자 `1~4`로 사람 수를 선택하고, 타이틀에서 `K`로 각자 키를 바꿉니다. 사람이 아닌 자리는 CPU가 채웁니다. 플레이어 설정과 최고 기록은 현재 브라우저의 localStorage에 저장됩니다. 원본 사이트와 통합 사이트는 주소가 다르므로 원본의 저장 기록이 자동으로 옮겨지지는 않습니다.

3D를 추가한 세 게임에는 시작·인원 선택·키 설정 버튼과 작은 화면/터치 기기용 **1P 터치 버튼**도 있습니다. 나머지 게임과 2~4P 동시 플레이는 키보드를 사용합니다.

| 플레이어 | 방향 | A | B |
|---|---|---|---|
| 1P | 방향키 | SPACE | ENTER |
| 2P | W A S D | C | V |
| 3P | I J K L | , | . |
| 4P | T F G H | B | N |

## 게임 목록

| # | 게임 | 화면 | 원작 미니게임 | 조작 |
|---|---|---|---|---|
{table}

각 게임의 원작 규칙·점수·연출 조사 스펙은 `specs/<id>.md`에 보존되어 있습니다. 포켓몬 이름은 원작 미니게임을 식별하기 위한 참고이며, 게임 캐릭터와 경기장은 플라밍고 테마입니다.

## 구조

- `index.html` — 3D 추천, 종목 검색·필터, 키보드 안내, Flaming Games 복귀 링크.
- `common/stadium.js` — 기존 공용 셸: 타이틀·키 설정·카운트다운·타이머·순위·플레이어 입력·WebAudio·기록 저장.
- `common/style.css` — 기본 2D 게임 스타일.
- `common/view3d.js`, `common/view3d.css` — 선택형 3D 연결, 2D 전환·자동 폴백, 시작·플레이어·터치 UI.
- `common/stadium3d.js` — 공유 3D 경기장 렌더러. 게임 상태를 받아 그리고 규칙이나 점수를 변경하지 않습니다.
- `common/vendor/` — 로컬 Three.js 모듈, 버전·출처 문서, MIT 라이선스.
- `games/*.html` — 게임당 HTML 하나. 기존 `STADIUM.Game({{...}})` 계약을 유지합니다. [CONTRACT.md](CONTRACT.md) 참고.
- `games.js` — 제목·조작·시리즈·3D 지원 여부를 담은 허브 데이터.
- `specs/*.md` — 원작 미니게임 조사 스펙 21개.
- `scripts/` — 메타데이터 생성 및 브라우저 검증 스크립트.

## 생성 및 검증

Stadium 디렉터리에서:

```sh
python3 scripts/gen_games_js.py
python3 scripts/gen_readme.py
sh scripts/smoke.sh            # 헤드리스 Chrome: 콘솔 에러 및 타이틀 스크린샷
sh scripts/play.sh --humans 2  # 시작 → 카운트다운 → 플레이 → 스크린샷
# 전체 21종, clean URL, 4인 입력, 3D 전환·터치·폴백 회귀 검증
npm install --no-save --package-lock=false playwright-core
node scripts/integration.mjs
```

검증에는 로컬 Chrome이 필요하고 `play.sh`에는 `playwright-core`도 필요합니다. `CHROME`, `PW_MODULE` 환경변수로 경로를 지정할 수 있습니다. `integration.mjs`도 같은 환경변수를 지원하고, 첫 인자로 배포된 Stadium 허브 URL을 넘겨 검사할 수 있습니다. GitHub Pages 주소는 `.html` 경로로 자동 검사하며, 다른 정적 호스트에서도 `QA_CLEAN_URLS=0`으로 같은 방식을 선택할 수 있습니다. 통합 검증 보고서는 `scripts/out/integration-report.json`에 저장됩니다. 실행 결과는 `scripts/out/`에 생성됩니다. 3D 화면 확인 시 WebGL을 지원하는 브라우저를 사용하고, 세 게임 각각의 3D/2D 전환과 키보드 입력을 확인하세요.

## 새 게임 추가

`games/_template.html`을 복사해 `Game` 설정을 채우고, `scripts/gen_games_js.py`의 `ORDER`에 게임을 등록한 뒤 생성 스크립트를 실행합니다. 3D 지원 게임을 늘리면 생성기의 `render3d` 목록과 렌더러·허브 추천 데이터를 함께 갱신합니다.
'''
(ROOT / 'README.md').write_text(md, encoding='utf-8')
print('README written:', len(data), 'games')
