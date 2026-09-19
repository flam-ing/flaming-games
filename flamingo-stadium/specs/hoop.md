# hoop — 링 던지기 (원작: Ekans' Hoop Hurl, Pokémon Stadium 1 / N64 Kids Club)

> 이 문서만 보고 게임을 다시 만들 수 있도록 쓴 설계 스펙. 확정 사실은 그대로, 출처가 침묵하는 항목은 `불명 — 추정:` 으로 표기하고 반드시 수치를 제안했다.
> 원작 영상 참고: https://www.youtube.com/watch?v=WYVnwu-wVQQ (N64 Gameplay: Ekans' Hoop Hurl)

---

## 1. 한 줄 요약 · 등장 캐릭터와 플라밍고 대체안

**한 줄 요약**: 4마리의 아보(Ekans)가 화면 아래에 나란히 서서, 3×3 = 9개 구멍에서 두더지 게임(Whack-A-Mole)처럼 불쑥불쑥 솟아오르는 디그다(Diglett)에게 60초 동안 자기 몸을 고리(hoop)처럼 말아 **링 토스(ring toss)** 로 던져 걸면 점수를 얻는 게임. StrategyWiki 표현 그대로 "combines a ring toss with Whack-A-Mole".

| 원작 요소 | 원작 역할 | 플라밍고 대체안 (셸 포즈 활용) |
|---|---|---|
| Ekans ×4 (플레이어) | 화면 하단에 4마리 나란히. 조준 방향으로 몸을 살짝 틀고, 던지면 몸을 동그랗게 말아 고리가 되어 날아간다. | 플레이어 플라밍고 4마리, 슬롯 색상(`palette.players`). 대기 `idle`, 조준 시 `idle` + `rot`로 몸 각도(조준 각도 그대로 회전), 던지는 순간 `hit`(몸을 젖히는 모션) 0.15s, 던져진 투사체는 **분리된 `ball` 포즈 플라밍고**(공처럼 말린 모습 = 고리)를 날린다. 던진 뒤 본체는 `idle`로 복귀. |
| Ekans의 몸(투사체 고리) | 착지 시 링처럼 디그다를 감싼다 | `ball` 포즈, 비행 중 `rot`를 계속 돌려(360°/0.5s) 회전하는 고리 느낌. 착지 시 스케일 0.9→1.0 튕김. 히트 시 디그다 위에 링(타원) 라인을 그려 "감쌌다"는 것을 표현 |
| Diglett (표준, 갈색) | 9개 구멍에서 랜덤 팝업, 1점 | **`dig` 포즈 플라밍고**(땅에 머리 박고 있는 모양)를 갈색/모래색 톤으로 작게(스케일 0.55). 팝업 시 땅속에서 y축으로 솟아오르고 내려갈 때 다시 가라앉는다. |
| Gold Diglett (금색, 희귀) | 2점 | 같은 `dig` 포즈에 `palette.gold` 색 + 반짝 파티클(별 3~4개 주기 0.4s). |
| 구멍 9개 (3×3) | 필드 | 타원형 어두운 갈색 구멍 9개, 그리드 배치 |
| 피격된 디그다 | 링에 걸리면 `dizzy` 상태로 잠시 보였다가 땅속으로 사라짐 | 히트 순간 `dizzy` 포즈 0.4s 후 하강 |

---

## 2. 인원 · 시간 · 라운드

- **4인 동시 플레이** (사람 1~4명 + 나머지 CPU). 모두 같은 필드를 공유하며 **같은 디그다를 두고 경쟁**한다(free-for-all). 한 디그다는 먼저 건 1명만 점수를 가져가고 즉시 사라진다(KoopaTV: "Once a Diglett is hit, it becomes unavailable for other players").
- **제한 시간: 60초** (Bulbapedia·Serebii·StrategyWiki 일치). 단판 1라운드. 타이머 0에 즉시 종료.
- 라운드 구조: `Ready → Go!`(약 2초) → 60초 플레이 → `Finish!` 정지 1.5초 → 결과. 원작은 Kids Club에서 단판 또는 "Who's the Champion?(누가 제일 잘하나)" 연승 모드로 묶이지만, 우리는 셸이 순위 화면을 그리므로 단판만 구현.
- 셸 설정: **`duration: 0`** + 게임 자체 60초 타이머(2차 비평가 수정). 이유: `common/stadium.js`는 `duration>0`이면 타이머 0에서 **즉시 `finish()`→`result()`** 를 부르고 좌상단에 자기 HUD(`43.2s`/`BEST`)를 그린다. 그러면 §7의 "끝!" 1.5초 정지, 비행 중 고리 판정(보강 11), 상단 중앙 큰 타이머(§6)가 모두 불가능하다. 따라서 `duration:0`으로 두고 게임이 `timer`를 60에서 감산, 0이 되면 `phase='finish'`(1.5s, 새 투척 금지, 비행 중 고리만 판정) 뒤 `g.finish()`를 부른다. `g.timeLeft`는 쓰지 않는다.
- **시작 카운트다운은 셸이 담당**: 셸이 `3·2·1` 오버레이(`sfx.count`)와 `GO!`(0.8s, `sfx.go`)를 그리므로 게임 안에서 "준비…/시작!"을 또 그리지 않는다. `update()` 첫 호출 = 플레이 시작. 첫 디그다는 플레이 시작 0.3s 후 팝업.

---

## 3. 조작

### 원작 (N64)
| N64 입력 | 기능 |
|---|---|
| **십자키(Control Pad) ←/→** | 좌우 조준. 아보 본체가 그 방향으로 몸을 튼다 (Dualshockers: "The only indicator you have is the subtle difference in the angle of the Ekans at the bottom of your screen" → 조준선/커서가 없고 캐릭터 각도만 보인다). |
| **십자키 ↑/↓** | 각도(높낮이) 조정 (Bulbapedia: "Up/Down to adjust the angle"). |
| **아날로그 스틱: 아래로 당겼다가 위로 튕기기(flick)** | 던지기. 튕기는 **속도·거리(=스틱을 밀고 있던 시간)** 에 따라 비거리 결정 — "A small flick will send Ekans to the front while a full one sends it to the back"(Serebii). KoopaTV: "Pull back and flick the Control Stick to launch EKANS". 일본 위키(アニヲタWiki): "弾いた時間で近距離・中距離・遠距離かが変わる" → **비거리는 연속값이 아니라 앞/가운데/뒷줄 3단계로 양자화**된다(비평가 확인). 너무 세게 튕기면 뒷줄을 넘어 화면 밖으로 날아간다(pkmn.net: "If you nudge it you'll get an Ekans off the back of the screen"). |
| A / B / C 버튼 | 사용 안 함(출처 없음). 매뉴얼 원문(p.28): "Aim for the DIGLETT that come up out of the ground and hurl your EKANS hoop at [them]" — 버튼 언급 없음. |

핵심 특징: 조준(십자키)과 파워(스틱 플릭)를 **양손으로 동시에** 다루며, 조준 커서가 없어 "very touchy"(ScreenRant)하다. 비거리 = 파워, 좌우 = 조준. 원작은 던진 뒤 아보가 돌아올 때까지(~1초) 다음 투척 불가 — 불명, 추정: 투척 후 약 0.8~1.0초 쿨다운.

### 우리 액션 매핑 (`up down left right a b`)
| 액션 | 기능 | 입력 방식 |
|---|---|---|
| `left`/`right` | 좌우 조준. 홀드 시 조준각 θ가 **100°/s**로 연속 이동, 범위 **±60°**(2차 비평가 수정: 기존 ±35°로는 가장자리 자리(1P x=150)에서 반대편 열(x=680)에 닿을 수 없었음). **착지 x = px + D_row × tan θ**, D_row = 뒷줄 500 / 가운데줄 450 / 앞줄 400(가상 투척 깊이, 화면 y가 아님). 이 식이면 어느 자리에서도 9구멍 전부 도달 가능(최대 필요각 53°)하고, tan의 비선형성 때문에 가장자리 자리가 멀리 있는 열을 노릴 때 같은 각도 오차가 더 큰 x 오차가 되어 원작의 "자리가 중요하다"가 자연히 재현된다. **조준선을 그리지 않는다**(원작 재현). 본체 `rot` = θ×0.5(최대 30°, 과장 방지), 발끝에 흐릿한(알파 0.35) 방향 화살 28px만 그린다. | 홀드 |
| `down` | 원작의 "스틱을 아래로 당기기" = **파워 차지 시작**. 누르고 있는 동안 파워 게이지 0→1 (0.9초에 가득). 가득 찬 뒤 0.35초 더 누르면 **오버차지**(1.0→1.25, 0.3초)로 넘어가 뒷줄 너머 미스가 된다(§3 매핑 참조). 왕복 없음. | 홀드 |
| `down` 떼기 **또는** `up` 누르기 | 원작의 "위로 튕기기" = **던지기**. 차지 중 `up`을 치거나 `down`을 떼면 그 시점 파워로 투척. `down`을 0.12초 미만으로 짧게 누르면 파워 0.15(최소, 맨 앞줄). | 릴리즈/탭 |
| `a` | `down`+릴리즈의 대체 입력(편의): 홀드 = 차지, 릴리즈 = 투척. 초보자용. 안내문구에는 "A 버튼을 길게 눌러 힘을 모으고 떼면 던지기"로 표기. | 홀드/릴리즈 |
| `b` | 사용 안 함 |
| `up` (차지 중이 아닐 때) | 무시 |

입력 규칙:
- 투척 후 **쿨다운 0.9초** 동안 모든 투척 입력 무효(고리가 날아가 착지·되돌아오는 시간). 조준은 쿨다운 중에도 가능.
- 차지 중 조준 변경 가능(원작과 동일, 십자키와 스틱이 독립).
- 연타 요소 없음. 타이밍 요소: 디그다가 올라와 있는 시간(§5) 안에 도착해야 하므로 "언제 던지느냐"가 핵심.
- 파워→비거리 매핑은 **3줄에 완전히 양자화**(원작 확인: 近/中/遠 3단계): 파워 0.00~0.38 → 앞줄(row 2), 0.38~0.62 → 가운데줄(row 1), 0.62~1.00 → 뒷줄(row 0), **1.00 초과(오버차지) → 뒷줄 너머 화면 밖으로 날아가 미스**. 착지 y는 해당 줄의 y에 정확히 맞추고(구간 내 보간 없음), x만 조준각으로 연속 결정. 가운데줄 구간을 가장 좁게 잡아 원작의 "가운데줄이 사람에게 제일 어렵다"(ScreenRant)와 "very touchy"를 재현한다. 오버차지: 게이지가 1.0에 도달한 뒤에도 계속 누르고 있으면 0.35초 뒤 1.0을 넘어 1.25까지 오르며(게이지 빨갛게 점멸), 그 상태로 놓으면 뒷줄을 넘겨 화면 상단 밖으로 사라진다(pkmn.net의 "off the back of the screen" 재현).

---

## 4. 규칙과 점수

- 점수 단위: **정수 점(point)**. 시작 0.
- 가산: 던진 고리의 착지점이 **올라와 있는** 디그다의 히트 반경 안이면 성공. **히트 반경(2차 비평가 추가, 수치 없던 항목)**: 착지 y는 줄에 스냅되므로 판정은 x 거리만 본다. `|landX − holeX| ≤ 30 × rowScale` → 뒷줄 22px / 가운데줄 27px / 앞줄 32px. 구멍 간격(뒷줄 130, 앞줄 200)의 약 1/6이라 이웃 구멍과 겹치지 않는다. 같은 줄에 올라온 디그다가 둘 이상이면 가장 가까운 것 하나만 판정.
  - 보통 디그다 **+1**
  - 금색 디그다 **+2** (Bulbapedia "Gold Diglett are worth two points")
  - StrategyWiki는 "colored or golden Diglett worth more points"라고 하지만, Bulbapedia·Serebii·KoopaTV·일본 위키(ニコニコ大百科 "金色のディグダは2点", アニヲタWiki "メタル化したディグダ…2点") 모두 **금(메탈)색 1종·2점**만 언급한다 → **다른 색은 없음으로 확정**(비평가 확인). 금색만 구현. 금색은 "every once in a while"/"rare" — 드물게 등장.
- 히트한 디그다는 즉시(0.4초 dizzy 연출 후) 사라지고 그 구멍은 비게 된다. 같은 디그다에 두 명이 동시에 착지하면 **먼저 착지한 사람**(프레임 순서, 같은 프레임이면 슬롯 번호가 작은 쪽) 1명만 득점.
- 감산·페널티: **없음**. 빗나가도 점수 변화 없음(쿨다운 시간 손실이 유일한 페널티).
- 이미 내려가는 중(하강 애니메이션)인 디그다는 히트 판정 없음. 아직 올라오는 중(상승 애니메이션 진행률 ≥ 0.5)이면 판정 있음 — 불명, 추정.
- 승리: 60초 후 **최고 점수**(pkmn.net: "The person with the most points at the end of the time wins"). 동점: KoopaTV "ties are possible" — **원작은 동점을 그대로 인정(공동 순위, 타이브레이크 없음)** (비평가 확인). 우리는 셸 순위 화면에 동점 그대로 넘긴다(`lowerIsBetter` 아님).
- 원작 점수 예시(YouTube 영상 기준, 60초): 사람 초보 2~5점, 익숙한 사람 8~12점, Hard CPU 6~10점 정도. 불명 — 추정치. 스펙 목표: Normal CPU 평균 6점, 사람 숙련자 10점 내외가 되도록 팝업 빈도를 맞춘다.
- **자리(슬롯) 영향**: 원작에서 유일하게 "어느 자리인지가 중요한" 미니게임 (StrategyWiki). 가장자리 자리는 반대편 열이 멀고 비스듬해 불리, 가운데 자리(2P·3P)가 유리. 우리도 4명을 하단에 균등 배치해 자연스럽게 재현(별도 보정 없음).

---

## 5. 난이도 곡선 · CPU 난이도

원작은 "시간에 따라 빨라진다"는 언급이 어떤 출처에도 없음. 불명 — 추정: 디그다 팝업 빈도는 일정하되 후반에 소폭 상승하도록 아래 수치를 쓴다.

**필드**: 3×3 구멍. 각 구멍은 독립 타이머.
- 동시에 올라와 있는 디그다: 최대 3마리(초반), 40초 이후 최대 4마리.
- 팝업 간격(전체): 0~20s 평균 1.4s, 20~40s 1.2s, 40~60s 1.0s (±30% 지터).
- 디그다 체류 시간(완전히 올라온 뒤 내려가기 전까지): 0~30s 2.2s, 30~60s 1.8s. 상승 0.25s, 하강 0.25s.
- 금색 디그다 확률: 팝업당 12%. 체류 시간은 보통보다 짧은 1.4s(놓치기 쉽게).
- 같은 구멍 재등장 최소 대기 0.8s.
- 마지막 5초는 팝업 최대 4마리·간격 0.8s로 "막판 러시".

**CPU 난이도(원작: Easy / Normal / Hard / Hyper. Very Hard는 Stadium 2에만 있음)**
| 난이도 | 반응 지연 | 조준 오차 | 파워 오차 | 금색 우선 | 헛던지기(빈 구멍에 던짐) |
|---|---|---|---|---|---|
| Easy | 0.9~1.3s | ±9° | ±0.25 | 안 함 | 25% |
| Normal | 0.55~0.85s | ±5° | ±0.14 | 50% | 10% |
| Hard | 0.3~0.5s | ±2.5° | ±0.07 | 항상 | 3% |
| Hyper | 0.12~0.2s | ±1° | ±0.03 | 항상, 가장 가까운 것 계산 | 0% |

우리 셸에는 난이도 선택이 없으므로 **기본은 Normal**, CPU 3명에게 Normal / Hard / Easy를 각각 배정해 원작의 "누구는 잘하고 누구는 못하는" 느낌을 낸다(슬롯 순서대로 2P=Hard, 3P=Normal, 4P=Easy). 불명 — 설계 결정.

---

## 6. 화면 구성

- **카메라**: 약간 높은 곳에서 필드를 내려다보는 **3/4 뒤쪽 시점(back view, 약 30° 부감)**. 4마리 아보는 화면 하단에서 등을 보이며 서 있고, 구멍 그리드는 화면 중앙~상단에 원근으로 깔린다(뒷줄이 작고 앞줄이 크다). 원작 영상 기준.
- **필드**: 밝은 녹색 잔디 평지, 3×3 구멍(어두운 갈색 타원). 그리드 크기(960×540 기준): 뒷줄 y=190, 가운데줄 y=270, 앞줄 y=360; 열 x = 중앙 480 기준 ±(뒷줄 130 / 가운데줄 165 / 앞줄 200). 뒷줄 스케일 0.75, 가운데 0.9, 앞 1.05.
- **플레이어 배치**: 하단 y=470, x = 150 / 370 / 590 / 810 (1P→4P 왼쪽→오른쪽). 각 위에 `drawPlayerTag`.
- **HUD**:
  - 상단 중앙: 남은 시간 큰 숫자(예 "43")와 "초"(게임 자체 타이머, `duration:0`이므로 셸 HUD는 안 뜸). 마지막 10초는 빨간색+`sfx.tick`.
  - 각 플레이어 바로 아래(y=515): 플레이어 색 상자에 점수 "7점". 원작도 각 아보 아래/근처에 개인 점수를 표시하는 패널이 있다(불명 — 추정: 하단 4칸 점수판).
  - 차지 중인 플레이어 머리 위에 세로 파워 게이지(폭 8, 높이 40). 원작에는 게이지가 없지만(스틱 플릭이므로) 키보드 재현을 위해 추가 — 색은 플레이어 색.
- **색감**: 원작은 한낮의 초록 잔디 + 하늘색 상단 + 갈색 흙. 디그다 갈색(#a0522d)·분홍 코, 금색 디그다 `palette.gold`. 우리 배경: `bg(ctx)` 위에 잔디 사다리꼴(#7ec850 → #5aa63c 그라데이션), 뒤로 옅은 하늘색 띠와 관중석 실루엣.

---

## 7. 연출

- **시작**: 셸의 `3·2·1 → GO!` 오버레이를 그대로 쓴다(게임 내 "준비/시작" 텍스트 없음 — 2차 비평가 수정, 중복 연출 방지). 카운트다운 동안 `draw()`는 조용한 필드(디그다 없음, 4마리 `idle`)를 그린다. 첫 팝업은 플레이 시작 0.3s 후. 원작 아나운서 "Ready… Go!"는 셸 GO!로 대체.
- **조준**: 본체 `rot`가 조준각을 따라가며, 좌우 키를 누르는 동안 `sfx.tap` 없이 무음(원작도 무음). 차지 중 `sfx.beep(300+power*400, 0.05)`를 0.15s마다 짧게(파워 상승 피드백).
- **투척**: 본체 `hit` 포즈 0.15s + `sfx.pop`. 고리(`ball`)는 포물선(높이 = 60 + 파워×90 px) 비행, 비행시간 0.45 + 파워×0.25 s, 그림자(타원)가 착지 예정 지점으로 이동.
- **성공**: 착지 지점 디그다에 링 타원(흰색 두께 3, 0.5초 유지) + 디그다 `dizzy` 0.4s + 위로 "+1"/"+2"(금색은 큰 글씨) 플로팅 텍스트 1.0s + `sfx.good` + 플레이어 색 파티클 12개. 금색 히트 시 `sfx.win` 짧게 대신 `sfx.good`×2(0.1s 간격).
- **실패**: 고리가 땅에 부딪혀 0.15s 튕기고 사라짐, `sfx.bad`(볼륨 낮게). "빗나감" 텍스트는 원작에 없으므로 **표시하지 않음**. 디그다가 고리 착지 직전에 내려가면 자동 미스.
- **10초 남음**: 타이머 빨강 + 매초 `sfx.tick`.
- **종료**: "끝!" 텍스트 1.5s, 모든 디그다 하강, 최고 점수 플레이어 `jump` 포즈, 나머지 `idle`(꼴찌 `sleep`). `sfx.win`. 그 후 셸 결과 화면.
- 아나운서 대사(원작): 시작 "Ready, Go!", 종료 "Finish!" / "Time's up!" 요지. 우리는 텍스트로만.

---

## 8. AI 행동 모델 제안

상태기계: `WAIT → PICK → AIM → CHARGE → THROW → COOL`.
1. `WAIT`: 올라와 있는(또는 상승 진행률 ≥0.3인) 디그다가 생기면 **반응 지연 τ**(난이도별 §5) 후 `PICK`.
2. `PICK`: 후보 = 현재 보이는 디그다 중 남은 체류시간 ≥ (비행시간 + 0.2s)인 것. 점수/거리 가중 `score = val*2 - dist/300`; 금색 우선 확률만큼 금색 가중 +3. 헛던지기 확률 p_miss에 걸리면 무작위 빈 구멍을 목표로 삼는다.
3. `AIM`: 목표 각도 θ* = atan((holeX − px) / D_row) + N(0, σ_angle) (§3의 착지식 역산). 조준 회전 속도는 사람과 같은 90°/s.
4. `CHARGE`: 목표 파워 = row에 맞는 구간 중앙값 + N(0, σ_power). 게이지 속도는 사람과 동일(0.9s에 만땅), 목표치에 도달하면 릴리즈.
5. `COOL` 0.9s 후 `WAIT`.
난이도 수치는 §5 표 그대로. 추가: Easy는 목표 디그다가 사라져도 계속 던진다(재평가 안 함), Normal 이상은 `AIM` 중 목표가 사라지면 다시 `PICK`. Hyper는 착지 시각 예측까지 하여 남은 체류시간 판정을 정확히(오차 0) 계산.
기대 성적(60초): Easy 2~4점, Normal 5~7점, Hard 8~11점, Hyper 12~15점.

---

## 9. 초보자 한 줄 설명 · 제목

- 한 줄 설명(한국어): **"←→로 조준하고 A를 길게 눌러 힘을 모아 떼면 던지기! 구멍에서 튀어나온 두더지에게 고리를 걸면 1점, 금색은 2점."**
- 제목: **링 던지기** (기존 제목 유지 — 원작 "Hoop Hurl"의 직역이며 8자 이내). 대안: "플라밍고 링토스"(8자).

---

## 10. 출처 · 신뢰도 · 불명 항목

| 출처 | 내용 | 신뢰도 |
|---|---|---|
| https://bulbapedia.bulbagarden.net/wiki/Ekans'_Hoop_Hurl | 60초, 1점/금색 2점, 십자키 조준·↑↓각도·스틱 아래 투척, 4인, Easy/Normal/Hard/Hyper | 0.9 |
| https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Stadium_series_mini-games | 동일 요약, Who's the Champion?, Hyper 해금 조건 | 0.9 |
| https://bulbapedia.bulbagarden.net/wiki/Walkthrough:Pok%C3%A9mon_Stadium/Part_5 | 60초, 금색 보너스 | 0.8 |
| https://strategywiki.org/wiki/Pok%C3%A9mon_Stadium/Mini-Games | 링토스+두더지, 9개 구멍, 4마리 하단 정렬, 자리 중요, 색/금색 디그다 | 0.85 |
| https://www.serebii.net/stadium/kidsclub.shtml | 스틱 플릭 크기=비거리(작게=앞줄, 크게=뒷줄), 60초, 난이도 4종 | 0.85 |
| https://www.koopatv.org/2023/06/pokemon-stadium-kids-club-minigame-tier.html | "Pull back and flick", 히트된 디그다는 다른 플레이어 사용 불가, 속도 경쟁 | 0.7 |
| https://www.dualshockers.com/pokemon-stadium-every-mini-game-ranked/ | 조준 표시 없음(아보 각도만), 디그다 이동 | 0.6 |
| https://screenrant.com/pokemon-stadium-every-minigame-ranked-worst-best/ | free-for-all, 금색 보너스, 가운데줄이 어렵다 | 0.6 |
| https://www.cbr.com/best-mini-games-from-pokemon-stadium-1-2-ranked/ | 3×3 그리드, 스틱 당겼다 놓기 | 0.6 |
| https://www.youtube.com/watch?v=WYVnwu-wVQQ | 실제 플레이 영상(카메라·배치·연출 참고) | 0.7 (본문 파싱 실패, 기억·타 출처 보강) |
| GameFAQs 미니게임 가이드(50319, 7475) | 403으로 접근 실패 | — |

**불명 항목(추정으로 채움)**: 디그다 체류시간·팝업 간격·최대 동시 수, 시간에 따른 가속 여부, 투척 쿨다운 길이, 비행시간, "colored Diglett"의 색·점수, 상승 중 판정 여부, 동점 처리, 원작 실제 점수 분포, 개인 점수판 정확한 위치, 아나운서 정확한 대사, CPU 난이도별 실제 행동 수치, Very Hard 존재 여부(Stadium 1에는 없음으로 판단).

---

## 비평가 보강

독립적으로 재확인한 출처: Bulbapedia(Ekans'_Hoop_Hurl, 시리즈 미니게임, 공략 Part 5), Serebii Kids' Club, KoopaTV, DualShockers, ScreenRant, TheGamer, pkmn.net Stadium 1 미니게임, Gogglebob SBC#51, 일본어 ニコニコ大百科·アニヲタWiki(검색 요약), N64 매뉴얼 OCR 전문(archive.org `pokemon-stadium-n64-manual`). StrategyWiki·GameFAQs(50319, 7475)·fandom·manualzz는 403/402로 직접 접근 불가(검색 요약만 사용).

### 수정한 항목(본문 인라인 반영)
1. **비거리 3단계 양자화(확정)** — §3. 일본 위키 "弾いた時間で近距離・中距離・遠距離かが変わる": 원작은 스틱을 민 *시간*에 따라 앞/가운데/뒤 **3개 이산 거리**로 떨어진다. 기존 스펙의 "구간 안에서 선형 보간해 y 연속" 문장을 삭제하고, 착지 y를 줄 y에 스냅하도록 고쳤다. 우리의 "홀드 시간 = 파워" 매핑이 원작 입력 모델과 사실상 같다는 점도 확인됨.
2. **오버슛 미스(추가)** — §3. pkmn.net "If you nudge it you'll get an Ekans off the back of the screen": 너무 세게 던지면 뒷줄을 넘어 화면 밖으로 나간다. 게이지 가득 후 0.35s 유지 시 오버차지(1.0→1.25) → 뒷줄 너머 미스. 이것이 원작의 "touchy"함을 키보드로 옮기는 핵심 장치다.
3. **가운데줄이 가장 어렵다(확정)** — ScreenRant "leaving the middle row of Digletts all but unobtainable for human players". 가운데 구간을 0.38~0.62(폭 0.24)로 가장 좁게 잡음. 앞줄 0~0.38, 뒷줄 0.62~1.00.
4. **금색 외 '색깔 디그다' 없음(해결)** — §4. 4개 이상 출처가 금(메탈)색 2점만 언급. 다른 색 미구현 확정.
5. **동점 처리(해결)** — §4. KoopaTV "ties are possible": 원작은 타이브레이크 없이 공동 순위. 셸에 동점 그대로 전달.
6. **A/B/C 미사용(재확인)** — 매뉴얼 원문에도 버튼 언급 없음. 우리의 `a` 홀드=차지 매핑은 편의 추가임을 유지.

### 추가한 항목(원작 재현에 필요)
7. **디그다는 "끊임없이 움직인다"** — DualShockers "Diglett who are constantly moving", Gogglebob "the targets are moving diglett". 필드가 비어 있는 순간이 거의 없어야 한다: 어떤 순간에도 올라와 있거나 상승 중인 디그다가 **최소 1마리**는 있도록 스포너에 하한을 둔다(빈 필드 0.4초 초과 시 즉시 강제 팝업). §5의 팝업 간격은 유지하되 이 하한을 추가.
8. **속도 경쟁(선점)의 체감** — KoopaTV "Once a Diglett is hit, it becomes unavailable for other players, making speed critical". 같은 디그다를 향해 날아가던 다른 플레이어의 고리는 **빈 구멍에 떨어져 미스**(자동 실패, `sfx.bad`). 선점당했음을 보여주기 위해 착지 지점에 작은 흙먼지 파티클만 표시.
9. **금색 등장 빈도** — Bulbapedia "rare", StrategyWiki "every once in a while": 팝업당 12%는 다소 잦다. **10%로 하향**하고, 60초에 최소 3마리·최대 8마리가 되도록 클램프(10초 이상 금색이 없으면 다음 팝업을 금색으로 강제, 직전 금색 이후 4초 이내 재등장 금지).
10. **조준 표시 없음(확정)** — DualShockers "The only indicator you have is the subtle difference in the angle of the Ekans". §3의 발끝 방향 화살(28px)은 유지하되 **알파 0.35의 흐릿한 표시**로 낮춘다. TheGamer "a careful balance of aiming and power" — 조준과 파워가 둘 다 실수 요인이어야 한다.
11. **타이머 0 시점의 비행 중 고리** — 출처 없음. 추정: `duration:60`이 끝나도 이미 던진 고리는 착지까지 판정(최대 0.7s), 그동안 새 투척은 불가. "끝!" 연출 1.5s 안에 흡수되므로 셸 결과에 영향 없음.
12. **Hyper CPU의 위력** — KoopaTV(1차 비평가 인용 "sometimes impossible"; 2차 비평가 재독해에서는 Hyper도 "manageable"로 요약됨 — 해석 상충, 요지는 "Hyper도 이길 수 있다"). §5 Hyper 수치(반응 0.12~0.2s, 오차 ±1°)로 12~15점 기대치 유지가 타당. 다만 우리 기본 배정(2P Hard/3P Normal/4P Easy)에서는 Hyper 미사용 — 사람이 1명일 때만 4P를 Hard 대신 Hyper로 올리는 옵션은 두지 않는다(셸에 난이도 선택이 없으므로).
13. **원작 모드 구조(참고)** — 매뉴얼 p.28: 단판 "Choose any game" / "Who's the Best?"(첫 게임은 무작위, 이후 승수가 가장 적은 사람이 다음 게임 선택, 정해진 승수 선착). Hyper 해금 = Hard COM 상대 5연승(Bulbapedia·Serebii). 우리 구현 범위 밖, 스펙 §2와 일치.
14. **↑/↓ 각도 조정(원작 십자키)** — Bulbapedia "Up/Down to adjust the angle". 우리 매핑에서는 `up`을 투척 트리거, `down`을 차지로 썼으므로 별도 고도 조정은 **구현하지 않는다**(비거리가 3단계라 고도 조정의 실효가 없음). 명시적 설계 결정.
15. **N64 컨트롤러 특유의 조작감** — 십자키+스틱을 왼손 두 손잡이로 동시에 잡는 불편함(TheGamer)은 키보드로 재현 불가. 대신 "조준 중 차지, 차지 중 조준" 동시 입력을 허용해 양손 동시 조작 감각만 남긴다(§3 입력 규칙 그대로).
16. **기존 games/hoop.html 계약 위반 명시** — `input.down('ArrowLeft')`, `input.down('Space')` 키 코드 직접 사용(계약 금지), 1:1 라이벌 구조, 기둥·바람·10/30/50점, 45초. 전부 폐기하고 이 스펙대로 4슬롯·`g.p(i)` 액션 입력으로 재작성해야 한다.

### 여전히 추정인 항목(출처 없음, 스펙 수치 사용)
디그다 체류시간·팝업 간격·동시 최대 수(§5), 시간 가속 여부, 쿨다운 0.9s·비행시간, 상승 중 판정, CPU 난이도별 실제 행동 수치, 아나운서 정확 대사, 개인 점수판 정확 위치. 이들은 원작 감을 좌우하지만 어느 공개 출처에도 수치가 없으므로 §5·§7 값을 그대로 쓰고, 플레이테스트에서 "Normal CPU 5~7점 / 숙련자 10점 내외"가 나오도록 팝업 간격만 조정한다.

### 추가 출처
| 출처 | 내용 | 신뢰도 |
|---|---|---|
| https://pkmn.net/?action=content&id=509&page=viewpage | 스틱 매우 민감, 살짝 건드려도 화면 뒤로 날아감, 시간 종료 시 최다 득점자 승 | 0.7 |
| https://www.thegamer.com/pokemon-stadium-best-minigames-ranked/ | 조준+파워 균형, 금색 디그다 큰 점수, 컨트롤러 그립 | 0.6 |
| https://www.gogglebob.com/2026/05/29/sbc-51-ivysaur-pokemon-stadium-1-2 | 움직이는 디그다 표적, 아날로그 숙련 테스트 | 0.5 |
| アニヲタWiki(ポケモンスタジアムシリーズのミニゲーム, 검색 요약) | 弾いた時間で近/中/遠 3단계, 메탈 디그다 2점 | 0.7 |
| ニコニコ大百科(ポケモンスタジアムのミニゲーム一覧, 검색 요약) | 금색 디그다 2점, 제한시간 내 최다 득점 승 | 0.7 |
| N64 매뉴얼 OCR (archive.org pokemon-stadium-n64-manual) | Kids Club 모드 구조, Hoop Hurl 한 줄 설명 | 0.9 |

---

## 비평가 보강 (2차 — 완전성 검토)

2차 비평가가 **직접 다시 열어 본 출처**: Bulbapedia `Ekans'_Hoop_Hurl`·`Pokémon_Stadium_series_mini-games`, Serebii Kids' Club, KoopaTV 티어 글, pkmn.net Stadium 1 미니게임, DualShockers, ScreenRant, TheGamer. StrategyWiki·GameFAQs(50319, 7475)·fandom·ニコニコ·アニヲタ·archive.org 매뉴얼 본문·TCRF·IGN은 이번에도 403/402/404로 원문 확인 불가(1차 비평가의 검색 요약 인용은 그대로 두되 "미검증"으로 본다). 웹 검색 예산 소진으로 추가 검색은 하지 못했다.

### 원문 재확인 결과(스펙과 일치)
- Bulbapedia: "Control Pad Left/Right to aim and Up/Down to adjust the angle, Control Stick Down to throw." / "In 60 seconds, players must toss as many Ekans around as many Diglett as they can. Gold Diglett are worth two points." / COM 난이도 Easy·Normal·Hard, Hyper는 "Who's The Champion?"에서 Hard로 5연승 시 해금. → §2·§4·§5 일치.
- Serebii: "Control Stick: Throw (Flick Down to Up)", "D-Pad: Aim", "A small flick will send Ekans to the front while a full one sends it to the back", "You have 60 seconds to get the most hits." → §3 홀드 시간=비거리 모델과 일치. (Bulbapedia의 "Stick Down"과 Serebii의 "Flick Down to Up"은 같은 동작의 두 표현.)
- KoopaTV: "Aim using the + Control Pad. Pull back and flick the Control Stick to launch EKANS. The one with the highest score wins." / "Ties are possible." / 히트된 디그다는 다른 플레이어가 못 씀. → §4 동점·선점 규칙 확인.
- DualShockers: "Diglett who are constantly moving", 조준 표시는 아보 각도뿐. ScreenRant: free-for-all, 금색 보너스, 가운데줄이 사람에게 거의 불가능. pkmn.net: 스틱 매우 민감, 살짝 건드려도 화면 뒤로 날아감, 시간 종료 시 최다 득점 승. TheGamer: 컨트롤러 왼쪽 두 손잡이를 잡는 조작, 조준+파워 균형. → 모두 기존 인용과 동일.
- **주의**: Bulbapedia 시리즈 페이지의 "Last player standing wins, or if five rounds pass, the player with the fewest misses wins"는 Clefairy Says 등 다른 미니게임 규칙이다. Hoop Hurl에는 라운드·미스 카운트가 없으므로 적용하지 않는다(혼동 방지용 명시).

### 고친 항목(본문 인라인 반영)
1. **조준 모델이 물리적으로 불가능했던 것 수정(§3, §8)** — 기존 "각도 ±35°"로는 1P(x=150)가 앞줄 반대편 구멍(x=680)에 도달하려면 78°가 필요해 **절대 못 맞추는 구멍**이 생겼다. 착지식을 `landX = px + D_row·tanθ`(D_row 500/450/400), θ∈[−60°,60°], 회전속도 100°/s로 바꿔 9구멍 전부 도달 가능하게 했고, tan의 비선형성으로 가장자리 자리 불리(StrategyWiki "자리가 중요")를 자연스럽게 재현한다. CPU `AIM`도 이 식의 역산으로 목표각을 계산.
2. **히트 반경 수치 추가(§4)** — 기존 스펙에 반경 값이 없었다. `30 × rowScale`(22/27/32px), x 거리만 판정, 같은 줄 다중 디그다는 최근접 1개만.
3. **`duration:60` → `duration:0`(§2, §6)** — 셸 코드를 확인한 결과 `duration>0`이면 타이머 0에 즉시 `result()`가 호출되고 셸 자체 HUD 타이머가 좌상단에 그려진다. 스펙의 "끝!" 1.5초 정지·비행 중 고리 판정·상단 중앙 큰 타이머가 전부 불가능하므로 게임 자체 타이머로 전환하고 `g.finish()`를 직접 부르도록 고쳤다.
4. **시작 연출 중복 제거(§7)** — 셸이 이미 `3·2·1`+`GO!`(0.8s)를 그린다. 게임 안 "준비…/시작!"을 삭제. 첫 팝업은 플레이 시작 0.3s 후.
5. **Hyper 난이도 서술 완화(보강 12)** — KoopaTV 원문 재독해에서 Hyper도 "manageable"로 요약됨. 수치는 유지하되 "이길 수 없는 CPU"로 만들지 않도록 기대치 상한 15점을 넘기지 않는다.

### 추가로 확정한 세부(빌드 시 그대로 적용)
6. **투척 방향 부호·시각** — θ>0이 오른쪽. `left` 홀드 시 θ 감소. 차지 중에도 조준 변경 가능(원작 양손 동시 조작). 조준각은 투척 후에도 유지된다(리셋 없음 — 원작에서 아보 각도가 남아 있는 것과 같음, 추정).
7. **비행 중 고리 그리기 순서** — 뒷줄 구멍 → 뒷줄 디그다 → 가운데 → 앞줄 → 비행 고리(그림자 먼저) → 플레이어 4마리 → HUD. 고리가 뒷줄로 갈수록 `scale`을 1.0→0.75로 줄여 원근 일치.
8. **타이머 0 직후** — `phase='finish'` 1.5s: 새 투척·차지 입력 무시, 비행 중 고리는 착지까지 정상 판정, 디그다는 전부 하강, 종료 텍스트 "끝!" + 최고득점자 `jump`. 이후 `g.finish()` → 셸 결과 화면. 동점은 셸 `ranks` 계산이 공동 순위를 처리하므로 그대로 넘긴다.
9. **CPU도 오버차지 가능** — 파워 오차 N(0, σ_power)로 목표가 1.0을 넘으면 그대로 오버차지 미스가 되게 두어(Easy에서 가끔 발생) 원작의 "화면 뒤로 날아가는 아보"를 CPU에게서도 볼 수 있게 한다.
10. **동시 착지 우선순위** — 같은 프레임 동시 판정은 슬롯 번호 순(1P 우선)으로 처리(기존 §4 유지). 프레임 순서가 다르면 먼저 착지한 쪽.

### 여전히 미해결(공개 출처 부재 — §5·§7 추정치 그대로 사용)
디그다 체류시간·팝업 간격·최대 동시 수, 시간 가속, 쿨다운 0.9s·비행시간, 상승 중 판정, CPU 난이도별 실제 수치, 아나운서 정확 대사, 개인 점수판 정확 위치, "colored Diglett"(StrategyWiki 원문 미확인 — 금색 1종만 구현 유지). GameFAQs 두 가이드와 StrategyWiki는 여전히 403.

**판정**: 위 수정으로 조준 도달 불능·판정 반경 누락·셸 타이머 충돌·시작 연출 중복이라는 빌드 차단 요소가 제거되었으므로, 이 스펙만으로 구현 가능(ready).
