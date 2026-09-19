# Flamingo Stadium — 게임 작성 계약 (v3 · Flaming Games)

게임 진입점은 `games/<id>.html` 한 파일로 유지한다. 새 게임은 `games/_template.html` 구조를 복사한다. 게임 규칙·입력은 바닐라 JS의 `STADIUM.Game` 계약을 사용하며, 3D 표현에는 `common/vendor/`에 보관한 로컬 Three.js 모듈을 사용할 수 있다. 런타임 CDN 의존성을 추가하지 않고 버전·출처·라이선스를 함께 기록한다. 공용 셸 변경은 기존 21종의 입력·상태·결과 호환성을 유지한다.

## 셸 API (`common/stadium.js` → `window.STADIUM`)

- `Game({ id, title, howto:[...], duration, init(), update(dt), draw(ctx), result() })` → `g`
  - `duration` 초. `0`이면 무제한이며 게임이 직접 `g.finish()`를 부른다.
  - 셸은 첫 프레임에 `init()`을 한 번 부르고(타이틀 화면 뒤에 게임 장면을 그리기 위해; 이때 `g`는 이미 할당돼 있음), 시작할 때마다 다시 부른다. `draw()`는 `init()` 이후에만 호출된다.
  - `g.W=960, g.H=540, g.time, g.timeLeft, g.humans, g.slots(), g.isHuman(i), g.nameOf(i), g.p(i)`.
- **플레이어 슬롯 4개 고정**: `slots()` → `[{i, name:'1P'.., color, human:boolean, keys}]`. 사람 수(1~4)는 타이틀에서 숫자키로 정하고 셸이 저장한다. 게임은 **항상 4명(또는 그 게임의 최대 인원)을 만들고**, `human`이면 입력을, 아니면 CPU AI를 쓴다. 1P가 항상 사람이고 사람은 0..humans-1 슬롯.
- **입력**: `g.p(i).hit('a')` (그 프레임에 눌림), `g.p(i).down('a')` (누르고 있음), 액션은 `up down left right a b`. `g.p(i).axis()` → `{x,y}`. 키 코드는 절대 직접 쓰지 말 것(`input.hit('Space')` 금지). 안내 문구에는 키 이름 대신 `A 버튼`, `←→` 처럼 액션 이름을 쓴다(각 플레이어 키는 타이틀에 표시됨).
- **결과**: `result()`는 `{ scores:[4개 숫자], text:'', lowerIsBetter?:true }`를 돌려준다. 셸이 순위 화면을 그린다. 탈락/실패한 플레이어는 낮은 점수를 주면 된다.
- 그리기: `drawFlamingo(ctx,x,y,scale,pose,t,color,{flip,rot,alpha})`, 포즈 `idle jump run sleep dig eat dizzy harden fly ball hit`. `drawPlayerTag(ctx,x,y,i)`는 "1P"/"2P CPU" 배지. `bg, text, rr, rand, clamp, lerp, palette(players[4], gold, red, ...)`.
- 효과음: `sfx.tap good bad win lose tick count go hit pop`, `sfx.beep(freq,dur,type,vol)`.

## 선택형 3D 표현 API

- `common/view3d.js`와 `common/view3d.css`를 게임 페이지에서 불러온다. 연결부는 로컬 `common/stadium3d.js`를 동적으로 로드하며 실패하면 2D로 폴백한다.
- `const view = STADIUM_3D.create(kind, () => g)`로 연결한다. 현재 `kind`는 `splash`, `run`, `topsy`를 지원한다. `g`가 할당된 이후 그리기 콜백이 실행된다.
- 게임의 `draw(ctx)`에서 `view.draw(ctx, frame)`을 호출한다. `true`면 3D 장면을 그렸으므로 게임별 점수·안내 HUD를 얹고 반환한다. `false`면 기존 2D 그리기를 수행한다.
- `frame`은 게임의 현재 상태를 읽기 전용으로 전달한다. 공통 값은 `time`, `players`, `ended`이며 종목별 추가 값과 좌표 변환은 `common/stadium3d.js`의 해당 렌더 함수에 맞춘다. 렌더러에서 입력·점수·물리·승패를 갱신하지 않는다.
- `view.labels(ctx, players)`는 3D 투영 위치에 기존 플레이어 이름표를 그린다. 카메라·캐릭터·환경은 렌더러가, 타이틀·카운트다운·결과와 실제 게임 규칙은 기존 셸과 게임 코드가 담당한다.
- 3D/2D 전환은 같은 경기 상태를 유지한다. `?view=3d` 또는 `?view=2d`로 초기 화면을 지정할 수 있고, UI에서 바꾼 선호는 브라우저에 저장한다.
- 로컬 ES 모듈 사용으로 개발 시 HTTP 서버를 사용한다. 렌더러 오류·미지원 WebGL 환경에서도 원래 2D 게임을 플레이할 수 있어야 한다.

## 품질 기준

- 원작(포켓몬 스타디움 1·2) 미니게임의 **규칙·조작·점수·시간·난이도 곡선·화면 구성·연출 타이밍**을 `specs/<id>.md`에 맞춰 최대한 그대로 재현한다. 캐릭터만 플라밍고로 바꾼다.
- CPU는 원작처럼 난이도 있는 상대여야 한다(무작위가 아니라 반응 지연·정확도 모델).
- 화면 문구는 전부 한국어. 한 화면에 각 플레이어의 상태(점수/체력/순위)가 항상 보여야 한다.
- 파일 300줄 이내 권장. 콘솔 에러 0. `sh scripts/smoke.sh <id>`와 `node scripts/play.mjs <id> <port>`를 통과해야 한다.

## 정적 호스팅 경로

GitHub Pages의 `games/id.html`과 Vercel의 `games/id/`를 함께 지원합니다. 각 게임의 head가 clean URL에서 `<base href="../">`를 먼저 설정합니다. 스타일시트와 공용 스크립트는 이 base 설정 후 동기식 parser 삽입으로 로드합니다. 이는 브라우저의 speculative preload가 base 적용 전 잘못된 `games/common/` 경로를 요청하는 것을 막고, 공용 스크립트 실행 후 게임 코드가 실행되도록 합니다. 로딩 문자열은 고정된 로컬 경로만 사용합니다. 새 게임도 `_template.html`의 로딩 순서를 유지하세요.
