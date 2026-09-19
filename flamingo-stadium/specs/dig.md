# dig — 파! 파! 파! (원작: Dig! Dig! Dig!, Pokémon Stadium 1 · N64 Kids Club)

표기 규칙: **[확인]** = 복수 출처에서 확인된 사실 / **[추정]** = 출처가 침묵하여 영상 기억·유사 미니게임 관례로 추정한 값. 구현자는 [추정] 값을 그대로 기본값으로 쓰되 상수로 빼 둘 것.

---

## 1. 한 줄 요약 + 등장 포켓몬과 플라밍고 대체안

**한 줄 요약 [확인]**: 모래두지(Sandshrew) 4마리가 나란히 서서 땅을 파 내려가고, **지하 우물(underground well / water)에 가장 먼저 닿는 쪽이 승리**하는 순수 연타 레이스. 연타는 **L·R 숄더 버튼을 번갈아** 눌러야 하며, 같은 버튼 반복이나 동시 누름은 진행되지 않는다. 사고 요소·장애물·아이템 없음(“절대적으로 정신적 도전이 없는, 손가락 속도만의 게임” — Smogon). 체감은 **손에 쥐가 날 정도의 연타** — Screenrant는 “controls extremely frustrating to keep up with… can cause hand cramps or damage controller buttons”라며 최하위(9위)로 꼽았고, KoopaTV는 “가장 기본적이고 쉬운 미니게임, 타이밍 변주 전혀 없음”이라 평했다. 둘 다 맞다: 규칙은 단순하지만 요구 연타 속도는 높다 [확인].

| 원작 요소 | 역할 | 플라밍고 대체안 (셸 포즈) |
|---|---|---|
| 모래두지 ×4 (색 구분 없음, 1P~4P 라벨) | 플레이어 캐릭터 | 플라밍고 ×4, `palette.players[i]` 색. 대기 `idle`, 파는 중 `dig`(누를 때마다 0.12s 재생, 좌우 `flip` 교대), 성공 `fly`(물줄기에 튀어 오름) → 착지 후 `jump` 반복, 패배 `dizzy`(젖은 채 눈 돌아감) |
| 땅(지층) | 파 내려가는 매질 | 갈색 지층 6단계 그라데이션. 파인 자리는 어두운 터널(#3a2414) |
| 지하 우물/수맥 | 골 지점 | 화면 하단 파란 수면(파도 사인파). 도달 시 **간헐천(geyser)** 기둥이 터널을 타고 솟구침 |
| 파낸 흙 (입력마다 튀는 흙덩이) | 피드백 | 입력마다 3~5개의 흙 파티클(반경 3~6px)을 위쪽으로 튀김 |
| 심판/아나운서 텍스트 | 연출 | 한국어 텍스트 오버레이 (7절) |

---

## 2. 인원·시간·라운드

- **4인 동시 플레이 [확인]**: 1~4명 사람 + 나머지 CPU. 셸 규칙대로 항상 4슬롯 생성.
- **제한 시간: 없음(원작 화면에 타이머 없음) [확인·추정 혼합]**. 종료 조건은 “누군가 물에 닿는 순간”. 1위가 결정되면 나머지는 그 자리에서 정지하고 **도달 깊이로 2~4위 판정** [추정].
- **라운드 구조**: 단판 1라운드. `duration: 0`, 게임이 `g.finish()`를 직접 호출.
- **안전장치 [추정]**: 45초가 지나도 아무도 도달 못 하면(사람이 전혀 안 누르는 경우) 강제 종료, 깊이 순 판정. (Easy CPU도 25초면 도달하므로 실제로는 거의 발동하지 않음.)
- **한 판 길이 목표 [확인→수정]**: KoopaTV 실측 “이기는 데 **약 8초**”, “10초 미만”. 즉 사람이 6~7회/s로 꾸준히 교대하면 **8초 안팎**에 도달해야 한다. Hyper CPU는 그보다 약간 늦은 9.5초 전후, Hard 12초 전후로 잡는다(아래 수치). ~~12~20초~~는 너무 느림.

---

## 3. 조작

원작 N64 [확인]:

| N64 | 기능 |
|---|---|
| **L 버튼** | 한 삽(한 칸) 파기 — 직전 입력이 R일 때만 유효 |
| **R 버튼** | 한 삽 파기 — 직전 입력이 L일 때만 유효 |
| A / B / 스틱 / C | **사용 안 함** |
| L+R 동시 | **아무 일도 일어나지 않음** (“If you press L and R at the same time, your Sandshrew will do nothing.”) |

우리 매핑:

| 우리 액션 | 역할 |
|---|---|
| `left` | = L |
| `right` | = R |
| `a` / `b` | [추가안] `a`=L, `b`=R 로도 인정(한 손 연타용). left/right 계열과 a/b 계열은 **같은 시퀀스**를 공유한다(즉 left 다음 b도 유효). |
| `up`/`down` | 없음 |

입력 규칙 (정확히 이대로):
1. 입력은 `hit()`(눌린 프레임)만 사용. 홀드 무효. 타이밍 창 없음 — 순수 연타.
2. 상태 `last ∈ {null, 'L', 'R'}`. 첫 입력은 L·R 어느 쪽이든 유효.
3. 눌린 버튼 == `last` → **무효(진행 0)**. 페널티 없음(깊이가 줄지 않음). 원작 화면 안내문 원문 [확인]: “Tap the L and R Buttons back and forth to make SANDSHREW DIG. **Tapping the same button twice makes SANDSHREW stop.**” — 즉 같은 버튼 반복은 ‘정지’이지 감점이 아니다. 시각 피드백은 `dig` 애니메이션이 재생되지 않고 그 자리에 멈춘 상태(추가 흔들림 없음)가 원작에 가장 가깝다. `last`는 그대로 유지(같은 키를 두 번 눌러도 다음에 반대 키를 누르면 즉시 유효).
4. 같은 프레임에 L·R 둘 다 `hit` → **둘 다 무시**, `last` 유지 [확인]. 단 원작은 이때 “Sandshrew gets confused”(Pokémon Fandom Wiki) — 진행은 0이지만 **캐릭터가 눈에 띄게 어리둥절한 반응**을 한다. 우리 구현: `dizzy` 포즈 0.25s 표시(입력 잠금 없음, 깊이 불변) [확인+추정].
5. 유효 입력 1회 = 깊이 +1 STEP, `dig` 포즈 0.12s, 흙 파티클, `sfx.tap`.
6. 입력 간 최소 간격 제한 없음(프레임당 최대 1회). 60fps 기준 이론상 30 alternations/s(TASVideos “30 Hz”).
7. 도달(`done`) 이후 입력 무시.

---

## 4. 규칙과 점수

- **점수 단위 [추정]**: 원작 HUD에 숫자 점수 없음. 내부적으로는 **깊이(칸)**. 화면에는 `깊이 m` 로 표시(1 STEP = 0.5 m, 총 25 m).
- **총 깊이 [추정→보정]**: **DEPTH = 50 칸**(= 유효 alternations 50회). 근거: 원작 한 판 ≈8초(KoopaTV) ÷ 사람 평균 교대 6~6.5회/s ≈ 50회. 사람이 미친 듯이 누르면(8~9/s) 6초, 초보(4/s) 12.5초.
- **가산**: 유효 교대 입력 1회 = +1칸. 그 외 가산 없음. 보너스 아이템·황금 없음(현재 dig.html의 황금/바위는 **원작에 없으므로 제거**).
- **감산/페널티**: 없음. 실수는 “시간 손실”만.
- **승리 판정**: `depth >= DEPTH` 를 먼저 만족한 플레이어. 같은 프레임 동시 도달 시 **공동 1위(무승부)** — Bulbapedia: “Rock Harden is the only mini-game where players don't get points if they tie”, 즉 Dig을 포함한 다른 미니게임은 동률자 모두에게 승점을 준다 [확인·추론]. 동시 도달자 전원 간헐천 연출 + 동일 1위 점수.
- **2~4위**: 종료 시점 깊이 내림차순. 깊이 동률은 **공동 순위**(같은 점수) [추정 — 원작 Who’s the Best는 1위 승점만 세므로 2~4위 구분 자체가 없음].
- `result()`: `scores = [1위 100, 2위 60, 3위 30, 4위 10]` 로 순위 점수화(공동 순위는 같은 값), `text: '{이름} 우물 도달! ({t.toFixed(2)}초)'`.
- **원작 점수 예시 [확인]**: “Who’s the Best?” 토너먼트에서는 미니게임 1승 = 1포인트, 목표 승수는 **5·6·7·8·9 중 선택**(Serebii/Fandom), 먼저 달성이 챔피언. 이 셸에서는 단판이므로 위 순위 점수만 사용.

---

## 5. 난이도 곡선

- **원작 [확인]**: 시간 경과에 따른 가속·지층 변화 **없음**. 한 삽의 이동량은 처음부터 끝까지 동일. 어렵게 만드는 유일한 변수는 **CPU 난이도**(“can be made harder by increasing the COM difficulty” — CBR).
- **CPU 난이도 [확인]**: Stadium 1 Kids Club은 **Easy / Normal / Hard + 숨김 Hyper** 4단계(“Very Hard”는 Stadium 2 용어이며 원작에는 없음). Hyper는 Hard에서 Who’s the Champion 5연승 시 해금.
- 행동 차이(요지, 출처 힌트: “as long as you keep a steady rhythmic pace… you’ll win — even on Hyper. Don’t tire yourself out.” — GameFAQs; “Even the computer players on Hyper mode can be defeated rather easily” — Serebii/KoopaTV; Smogon 유저 “Hyper를 매번 위험 없이 이김”): Hyper조차 **일정한 리듬을 유지하는 사람**(≈6/s)에게 진다. 즉 Hyper 목표 속도 ≈ 5.2/s, Hard ≈ 4.2/s, Normal ≈ 3.2/s, Easy ≈ 2.2/s [추정]. 8절에 수치.
- 셸에는 난이도 선택 UI가 없으므로 **CPU 3명을 Normal / Hard / Hyper 로 섞어** 배치(슬롯 1=Hard, 2=Normal, 3=Hyper) [추정안]. 사람이 2명 이상이면 남는 CPU부터 Hard→Hyper 순.

---

## 6. 화면 구성

- **카메라 [확인+추정]**: **정면 횡단면(side-view cross-section)** 고정 카메라. 스크롤 없음 — 지표면(위)부터 우물(아래)까지 한 화면. 960×540에서:
  - y 0~110: 하늘(#8fd3ff → #cfefff 그라데이션), 작은 구름 2~3개, 지평선 풀 라인(#6cbf4a) at y=110.
  - y 110~470: 지층. 60px 마다 색이 조금씩 어두워지는 6단(#c2905a, #b07f4c, #9a6b3d, #855934, #6e472a, #593821).
  - y 470~540: 지하수(#2f7fd9), 수면에 진폭 3px 사인파, 물결 하이라이트.
- **플레이어 배치**: 4개 세로 레인, 레인 중심 x = 150, 370, 590, 810 (간격 220). 각 플라밍고 scale 0.55, 지표에서 시작. 깊이 d 일 때 캐릭터 y = 110 + d × 7.2px (50칸 = 360px). 캐릭터가 지나간 자리는 폭 70px 터널(#3a2414)로 남는다.
- **HUD**: 각 레인 상단 하늘 영역(y=20)에 `drawPlayerTag` 배지 + 그 아래(y=46) `깊이 12.5 m` 텍스트. 화면 우측 상단(x=940, 우측정렬, y=28)에 경과 시간 `00.00`(원작엔 없지만 결과 문구용, 작게). 항상 4명 상태 보임(계약 요건).
- **깊이 게이지 [추정]**: 각 레인 왼쪽 가장자리에 폭 8px 세로 바(지표→물)로 진행률 표시. 원작에는 없어도 가독성용으로 허용.
- **색감**: 원작은 밝은 만화풍 갈색 흙 + 파란 하늘. 채도 높게. 터널 내부는 어둡게.

---

## 7. 연출

1. **시작 [확인·요지]**: 셸 타이틀 뒤 `init()` → 화면 중앙 “준비…”(0.8s, `sfx.count`) → “시작!”(0.5s, `sfx.go`). “시작!” 표시 시점부터 입력 유효. 표시 전 입력은 무시(`last`도 갱신 안 함).
2. **파는 중**: 유효 입력마다 `dig` 포즈 0.12s + 좌우 flip 교대(왼발/오른발 느낌) + 흙 파티클 3~5개 + `sfx.tap`. 무효(같은 키) 입력은 소리 없음 [원작 무반응] — 옵션으로 아주 작은 `sfx.beep(220,0.03,'square',0.05)`.
3. **CPU 표현**: CPU도 동일 애니메이션. 실수(같은 키) 시 헛손질 흔들림만.
4. **도달(1위) [확인+추정]**: 물에 닿는 순간 `sfx.good` + `sfx.win`. 그 레인 터널을 따라 **물기둥(간헐천)**이 0.35s 만에 지표 위 140px까지 솟고(폭 40px, #6fb8ff, 상단에 흰 물방울 8~12개), 플라밍고는 `fly` 포즈로 물기둥 꼭대기까지 밀려 올라간 뒤 **물기둥 꼭대기에 올라탄 채 `jump` 포즈로 머무른다**(KoopaTV: “the winning Sandshrew appears atop a geyser… seems to enjoy itself”; 착지 연출은 원작에 없음). 화면 중앙 큰 텍스트 **“{이름} 우물 도달!”** (금색, 1.2s 유지). 나머지 3명은 즉시 정지 → 파던 자리에서 `idle`로 대기(패자 젖음·dizzy 연출은 출처 근거 없음 — 보강 9항).
5. **종료**: 도달 후 **2.0s** 대기 후 `g.finish()` → 셸 순위 화면. `sfx.lose`는 사람이 1위가 아닐 때만 종료 직전 한 번.
6. **아나운서 대사 요지 [추정]**: 원작 Kids Club 아나운서는 “Ready… Go!”, 우승 시 “{Player} wins!” 류의 짧은 콜만 한다. 우리 텍스트: 시작 “준비… 시작!”, 종료 “{이름} 우물 도달!”, 안전장치 종료 시 “시간 종료!”.
7. **howto 문구(한국어)**: `['← → 를 번갈아 눌러 땅을 파세요', '같은 버튼을 연속으로 누르면 헛삽질!', '두 버튼을 동시에 누르면 안 파집니다', '지하 우물에 먼저 닿으면 승리']`

---

## 8. AI 행동 모델 제안 (수치)

CPU는 “목표 리듬 + 지터 + 실수” 모델. 매 입력마다 다음 입력까지 대기시간을 뽑는다.

| 난이도 | 평균 교대 속도 (회/s) | 입력 간격 평균 (ms) | 간격 지터 (표준편차, ms) | 실수 확률 (같은 키 반복) | 반응 지연 (Go! 후 첫 입력, ms) | 50칸 예상 도달 (s) |
|---|---|---|---|---|---|---|
| Easy | 2.2 | 455 | ±110 | 12 % | 600~900 | ≈ 26 |
| Normal | 3.2 | 312 | ±70 | 8 % | 400~650 | ≈ 17 |
| Hard | 4.2 | 238 | ±45 | 4 % | 250~400 | ≈ 12.5 |
| Hyper | 5.2 | 192 | ±25 | 1.5 % | 120~200 | ≈ 9.8 |

(보정 근거: 원작 한 판 ≈8초. 사람 6~6.5회/s가 8초에 도달하고, Hyper는 그보다 1.5~2초 늦어 “꾸준하면 이긴다”가 성립. Hard는 초보 4회/s(12.5초)와 비슷해 접전이 되도록.)

세부:
- 실수 = 직전과 같은 키를 누름(진행 0) → 그 다음 입력은 반드시 올바른 키. 실수 시 추가로 **회복 지연 +150ms**(사람이 “어?” 하는 느낌).
- 정확도 = 1 − 실수 확률. Hard/Hyper는 시작 후 3초간 실수 확률 ×0.5(초반 집중), 10초 이후 ×1.5(피로) [추정, 원작의 “Don’t tire yourself out” 뉘앙스].
- 간격은 정규분포로 뽑되 최소 90ms 클램프.
- 사람 참조 속도: 초보 3~4/s, 숙련 6~8/s → Hard까지는 초보도 이기고, Hyper는 6/s 이상을 꾸준히 유지해야 이김.
- 같은 난이도 CPU가 매판 똑같이 끝나지 않도록 판마다 속도에 ±6 % 개체 편차.

---

## 9. 초보자 한 줄 설명 & 제목

- 한 줄 설명: **“← → 를 번갈아 빠르게 눌러 땅을 파고, 지하 우물에 가장 먼저 닿으세요!”**
- 게임 제목 한국어안: **「파! 파! 파!」** (기존 유지 — 원작 “Dig! Dig! Dig!”의 3연타 리듬을 그대로 옮긴 표기, 6자). 대안: 「땅파기 레이스」.

---

## 10. 출처와 신뢰도, 불명 항목

| 출처 | 얻은 정보 | 신뢰도 |
|---|---|---|
| https://bulbapedia.bulbagarden.net/wiki/Dig!_Dig!_Dig! | 모래두지, “Tap L and R alternatively to dig”, 지하 우물 먼저 도달, 4인, Easy/Normal/Hard/Hyper | 0.95 |
| https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Stadium_series_mini-games | 동일 설명 + Hyper 해금 조건, Who’s the Champion 요지 | 0.9 |
| https://www.serebii.net/stadium/kidsclub.shtml | L: Dig / R: Dig, 지하 간헐천(geyser), 난이도 3+Hyper, 1~4인 | 0.85 |
| GameFAQs Mini-Game Guide (JosiahIsBack) https://gamefaqs.gamespot.com/n64/198312-pokemon-stadium/faqs/50319 — 검색 스니펫 경유 | L·R 동시 누름 무효, “일정한 리듬이면 Hyper도 이긴다” | 0.8 |
| https://www.smogon.com/forums/threads/the-dig-dig-dig-method.3466831/ | 순수 속도 게임, 손가락 비동기화가 주 실패 원인 | 0.7 |
| https://www.cbr.com/best-mini-games-from-pokemon-stadium-1-2-ranked/ | 4인 모두 모래두지, 물이 솟을 때까지 좌우 숄더 교대, COM 난이도로만 난도 조절 | 0.7 |
| https://www.gamegrin.com/articles/ranking-the-pokemon-stadium-mini-games-25-years-later/ , https://screenrant.com/pokemon-stadium-every-minigame-ranked-worst-best/ | 동시 누름 시 정지, 모래두지 4마리가 땅 파는 스크린샷 설명 | 0.6 |
| https://strategywiki.org/wiki/Pok%C3%A9mon_Stadium/Mini-Games | “가장 먼저 바닥에 닿는 쪽 승리” | 0.6 |
| https://www.koopatv.org/2023/06/pokemon-stadium-kids-club-minigame-tier.html | 게임 내 안내문 원문(같은 버튼 두 번 = 정지), 한 판 ≈8초, 우승자 간헐천 위 | 0.85 |
| https://pokemon.fandom.com/wiki/List_of_Pok%C3%A9mon_Stadium_1_and_2_minigames (스니펫) | 동시 누름 시 “confused”, 물 먼저 도달 승리, Who’s the Best 승수 5~9 | 0.7 |
| https://tasvideos.org/Forum/Topics/4752 | “30 Hz” 연타 언급(프레임당 교대 가능 시사) | 0.4 |
| https://www.youtube.com/watch?v=ZZ4TGGw3mhk | 영상(본문 추출 실패, 리뷰어 비교용 참고) | — |

**불명 항목(비평가 보강 후 상태)**:
1. 우물까지의 정확한 입력 횟수/한 삽 이동량 (→ 한 판 ≈8초 실측에서 역산해 **50칸**, 여전히 [추정])
2. 제한 시간 유무·무입력 시 종료 규칙 (→ 없음 [확인: 모든 출처에 타이머 언급 없음], 45s 안전장치 [추정])
3. 카메라 스크롤 여부 (→ 고정 한 화면)
4. 동시 도달 시 판정 (→ **공동 1위** [확인·추론]), 2~4위 판정 기준 (→ 깊이 순, 동률 공동 [추정])
5. CPU 난이도별 실제 연타 속도·실수율 수치 (→ 8절 표)
6. 아나운서 정확한 대사(→ 원작 Kids Club 공통 “Ready… Go!” / 종료 “Finish!” [추정·2차 보강 5항]), 패자 모션(→ 제자리 `idle` 정지 [추정]), 종료 후 대기 시간(→ 2.0s [추정])
7. 같은 키 반복 시 시각·음향 피드백 유무 (→ **정지** [확인: 게임 내 안내문], 동시 누름은 **어리둥절 반응** [확인: Fandom])

---

## 비평가 보강

독립 검증 출처(2026-09-09 직접 열람): Bulbapedia(Dig! Dig! Dig! 항목·시리즈 미니게임 목록·Walkthrough Part 5), Serebii Kids’ Club, KoopaTV Kids Club 티어 리스트(게임 내 안내문 원문·소요 시간 실측), Smogon “The Dig! Dig! Dig! Method”, CBR, GameGrin, Pokémon Fandom Wiki(검색 스니펫), GameFAQs JosiahIsBack 가이드(검색 스니펫). StrategyWiki·GameFAQs 원문·TCRF·Screenrant는 403/CAPTCHA로 이번에도 직접 열람 실패.

### 수정한 항목 (본문 인라인 반영)
1. **한 판 길이 8초** — KoopaTV: “Winning takes approximately eight seconds”, “less than ten seconds”. 스펙의 12~20초는 원작보다 두 배 느려 ‘손이 아플 만큼 빠른 연타 게임’이라는 체감이 사라진다. → 총 깊이 **60칸 → 50칸**, CPU 표 전면 재조정(Hyper ≈9.8s, Hard ≈12.5s, Normal ≈17s, Easy ≈26s), 안전장치 60s → 45s.
2. **같은 버튼 반복 = ‘정지’** — 게임 내 안내문 원문 확인: “Tapping the same button twice makes SANDSHREW stop.” 헛손질 흔들림 연출은 원작에 없으므로 기본은 ‘애니메이션 없이 멈춤’. 소리 없음.
3. **동시 누름 = ‘어리둥절’ 반응** — Fandom: “if you press L and R at the same time, Sandshrew gets confused”; GameFAQs: “will do nothing”. 진행 0 + `dizzy` 0.25s 시각 반응(입력 잠금 없음). 사람이 리듬을 잃었음을 즉시 알 수 있는 유일한 피드백이므로 반드시 넣을 것.
4. **동시 도달은 공동 1위** — Bulbapedia가 “Rock Harden만 동률 시 무득점”이라고 명시 → 나머지 미니게임(Dig 포함)은 동률자 모두 승점. 슬롯 순 우선 규칙 삭제.
5. **Who’s the Best 목표 승수 5~9 선택** — Serebii/Fandom. 단판 셸에는 영향 없지만 원작 점수 체계 기록.

### 추가한 항목
6. **CPU가 ‘쉬운 상대’인 것이 원작 체감** — Serebii·KoopaTV·Smogon 세 출처가 일치: Hyper조차 꾸준한 교대에 진다. CPU를 사람보다 빠르게 튜닝하지 말 것. 재미 요소는 “내 손가락이 꼬이면 진다”이지 “CPU가 빠르다”가 아니다. 사람 슬롯이 1명일 때 CPU 3명은 **Normal / Hard / Hyper**로 섞되(5절), Hyper도 표의 5.2회/s를 넘기지 않는다.
7. **입력 폴링 요구사항** — 원작은 프레임 단위(30Hz)로 L/R 엣지를 읽는다. 셸 `hit()`은 60fps 엣지이므로 그대로 쓰되, **한 프레임에 left→right 두 엣지가 들어와도 1회만 인정**(프레임당 최대 1칸). 키 리피트(홀드) 절대 무효.
8. **간헐천 연출 [확인]** — KoopaTV: “The winning Sandshrew appears atop a geyser after breaking through water”. 우승자는 물기둥 꼭대기에 올라탄 채 정지(7절 4항의 `fly`→`jump` 착지 대신 **물기둥 위에서 `jump` 포즈로 머무름**이 원작에 더 가깝다). 물기둥은 우승자 레인에서만 솟는다.
9. **패자 모션 [추정, 출처 침묵]** — 원작 출처 어디에도 패자 연출 언급 없음. 물에 젖는 연출은 근거가 없으므로 **패자는 파던 자리에서 `idle`로 정지**가 기본. `dizzy`는 동시 누름 피드백 전용으로 남긴다(7절 4항의 패자 dizzy 삭제 권고).
10. **HUD 최소주의** — 원작 HUD는 플레이어 라벨(1P/2P/COM)뿐이고 깊이 숫자·타이머·게이지가 없다. 계약상 4명 상태 표시가 필요하므로 6절의 깊이 텍스트·게이지는 유지하되 작게(14~16px), 경과 시간 표시는 결과 문구용으로만 계산하고 화면에는 **표시하지 않는 것을 권장**(원작 느낌 우선).
11. **현재 games/dig.html 과의 차이(전면 재작성 필요)** — (a) 황금(+3칸)·바위(4회 타격) 없음 → 제거. (b) `DEPTH=100`·`STEP=44px` 스크롤 카메라 → 50칸·고정 화면. (c) `input.hit('ArrowLeft')` 키코드 직접 사용은 계약 위반 → `g.p(i).hit('left'/'right'/'a'/'b')`. (d) 1P만 사람인 구조(`player: i===0`, `palette.rivals`) → `g.slots()`·`g.isHuman(i)` 기반 4슬롯. (e) `result()`가 `{score, win}` 단일값 반환 → `{scores:[4], text}` 형식. (f) howto 문구의 ‘바위·황금·보물상자’ 삭제, 7절 7항 문구 사용. (g) 안전장치 `SAFETY=45`는 유지 가능.
12. **난이도 램프 없음 재확인** — 시간 경과 가속·지층 경도 변화·아이템·방해 요소는 모든 출처에서 부재. 구현 시 “후반 지층이 단단하다” 같은 창작 금지.
13. **템포 체크리스트(구현 검수용)** — 사람 6.5회/s 꾸준 → 7.7초 도달 / Hyper 단독 9~10.5초 / Hard 11.5~13.5초 / “준비…시작!” 1.3초 + 종료 대기 2.0초 포함 한 판 총 12~16초.


## 비평가 보강 (2차 · 2026-09-10 독립 재검증)

이번에 직접 열람 성공: Bulbapedia 「Dig! Dig! Dig!」·「Pokémon Stadium series mini-games」·「Kids Club」, Serebii Kids’ Club, KoopaTV 티어 리스트, Smogon “The Dig! Dig! Dig! Method”, CBR, Screenrant. 403/402로 실패: StrategyWiki, GameFAQs(JosiahIsBack), Pokémon Fandom, Nintendo Fandom, GameGrin, TCRF, Neoseeker, 일본어 포켓몬 위키(ポケモンスタジアム2), YouTube. 웹 검색 예산 소진으로 추가 검색 불가 — 아래 [확인]은 전부 직접 열람한 7개 출처 기준.

### 1차 보강 내용 검증 결과
- 1차 보강 1~5·8·12항은 전부 **재확인됨**. 원문 대조: Bulbapedia “As Sandshrew, players need to dig to the underground well before the others. Tap L and R alternatively to dig.” / Serebii “L Button: Dig, R Button: Dig … The first Pokémon to hit the underwater geyser is the winner.” / KoopaTV 게임 내 안내문 “Tap the L and R Buttons back and forth to make SANDSHREW DIG. The first one to hit water wins. Tapping the same button twice makes SANDSHREW stop.” + “You should win in about eight seconds.” + “Even the computer players on Hyper mode can be defeated rather easily.” / Bulbapedia “Rock Harden is the only mini-game where players don't get points if they tie when they play in the ‘Who's The Champion?’ mode.” / CBR “repeatedly and alternatively pressing the left and right shoulder buttons until water spouts from the hole… quick-paced”.
- **오류 발견 없음.** 단, 7절 4항이 1차 보강 8·9항과 모순(착지 후 jump / 패자 dizzy)이었으므로 본문을 보강안에 맞춰 **인라인 수정**했다(우승자는 물기둥 위에 머무름, 패자는 idle 정지).
- 이 셸에서 “Who’s the Champion”의 승수 선택(5~9)은 Bulbapedia에서 “predetermined number of wins”까지만 확인. 5·6·7·8·9 구체 수치는 Serebii/Fandom 1차 스니펫 기준으로 [확인] → [확인·단일출처]로 강등. 단판 셸에는 영향 없음.

### 추가한 항목
1. **체감(feel) 정의 [확인]** — 1절에 인라인 추가. 평가가 극단적으로 갈린다: KoopaTV “가장 기본·쉬움, 8초”, Screenrant “따라가기 극도로 힘듦, 손에 쥐”. 구현 목표는 이 둘을 동시에 만족시키는 것: **규칙은 3줄, 요구 연타는 초당 6회 이상**. 즉 사람 4회/s(초보)면 Hard에 지고 Hyper에는 확실히 지며, 6.5회/s면 8초 안에 모두 이긴다. 8절 표가 이 조건을 만족하는지 구현 후 실측할 것(체크리스트 13항).
2. **입력 리듬의 ‘탈동기화’가 유일한 실패 요인 [확인 — Smogon]** — “Your right finger might tap faster than your left… throw you out of the rhythm of digging and into a mad-tap frenzy.” 따라서 같은 키 반복(3절 규칙 3)이 **아무 시각·청각 피드백 없이 조용히 무시**되는 것이 원작의 핵심 체감이다(플레이어가 “왜 안 파지지?”를 스스로 눈치채야 함). 옵션 beep(7절 2항)은 **기본 OFF**로 명시.
3. **원작 컨트롤러 감각의 대체 [추정]** — KoopaTV “tactile feel… is pleasurable”(숄더 버튼의 딸깍 감). 키보드에서는 `sfx.tap`을 매 유효 입력에 **지연 없이(같은 프레임)** 재생하고, 좌/우 입력에 따라 피치를 살짝 다르게(예: L=880Hz, R=990Hz, 30ms) 해서 교대 리듬이 귀로 확인되게 한다. 이것이 헛삽질(무음)과의 대비를 만든다.
4. **CPU 모델 검증 조건 [확인+추정]** — “Hyper도 꾸준한 사람에게 진다”(Serebii·KoopaTV·Smogon 3출처 일치)를 정량 조건으로 고정: **Hyper CPU 단독 도달 시간 ≥ 9.0초**, **Hard ≥ 11.5초**. 8절 표의 실수율·지터로 시뮬레이션했을 때 5퍼센타일(가장 빠른 판)이 이 값을 밑돌면 속도를 낮출 것. CPU 개체 편차 ±6%는 유지.
5. **아나운서·종료 텍스트 [추정, Kids Club 공통 관례]** — Stadium 1 Kids Club 미니게임은 공통으로 시작 “Ready… Go!”, 종료 시 “Finish!” 표시 후 각 캐릭터 머리 위에 순위(1st~4th)가 뜬다. 우리 구현: “준비…”(0.8s) → “시작!”(0.5s) → 종료 순간 “{이름} 우물 도달!”(1.2s) → 남은 0.8s 동안 각 레인 배지 아래 `1위~4위` 표시(공동 순위는 같은 숫자) → `g.finish()`. 총 종료 대기 2.0s는 1차 보강 그대로.
6. **카메라 대안 명시 [추정, 미해결]** — 원작이 고정 화면인지 하강 스크롤인지는 이번에도 어느 출처도 언급하지 않음. 기본은 6절의 **고정 횡단면**(계약상 4명 상태 상시 표시에 유리, 50칸×7.2px=360px가 한 화면에 들어감). 만약 리뷰어가 영상 대조 후 스크롤이 맞다고 판단하면 **세로 패럴랙스 20% 이하**(선두 깊이에 따라 배경 지층만 최대 60px 상승)로 제한하고 캐릭터·HUD·수면은 화면 안에 유지할 것.
7. **HUD 라벨 [확인]** — 원작은 사람은 `1P`~`4P`, 컴퓨터는 `COM` 라벨만 표시(Serebii/CBR 스크린샷 서술). 셸 `drawPlayerTag`가 “2P CPU” 배지를 그리므로 그대로 사용, 별도 라벨 창작 금지.
8. **결과 점수 확정 [추정]** — 4절 `scores=[100,60,30,10]`은 순위 내림차순 정렬만 보장하면 되며 값 자체는 자유. 동시 도달(공동 1위) 시 두 명 모두 100, 다음 순위는 **건너뛰지 않고** 60(셸이 동점 처리하므로 값만 같으면 됨). `text`는 1위가 한 명이면 “{이름} 우물 도달! (7.83초)”, 공동이면 “{이름}·{이름} 동시 도달!”.
9. **안전장치 종료 텍스트** — 45초 무도달 시 “시간 종료!”(0.8s) 후 깊이 순 판정. 모두 0칸(아무도 안 누름)이면 전원 공동 1위가 아니라 **전원 4위(scores 전부 10)** 로 처리해 “아무것도 안 하면 이긴다”를 막는다 [추정·셸 적합성].
10. **미해결 잔여 항목(구현에 지장 없음)** — (a) 정확한 총 입력 횟수(50칸은 8초 실측 역산), (b) 카메라 스크롤 여부, (c) 원작 Hyper의 실제 연타 속도 수치. 셋 다 상수(`DEPTH`, `CAM_PARALLAX`, `CPU_TABLE`)로 빼서 영상 대조 후 조정 가능하게 둔다.

## 구현 노트 (2026-09-10 · games/dig.html v2 재작성)

스펙 그대로: 50칸·7.2px/칸·고정 횡단면, `left/a`=L·`right/b`=R 공유 시퀀스, 같은 버튼 반복 = 무음 정지(`MISS_BEEP=false`), 동시 누름 = `dizzy` 0.25s, 프레임당 최대 1칸, 도달 시 간헐천 + `fly`→`jump` 탑승, "{이름} 우물 도달!" 1.2s → 레인별 순위 0.8s → `g.finish()`, 45s 안전장치("시간 종료!", 전원 0칸이면 전원 0점·레인 '—'·"(무승부)"), 순위 점수 100/60/30/10(공동 순위 동일값), CPU 표(Normal/Hard/Hyper, 개체 편차 ±6%, 초반 ×0.5·10s 이후 ×1.5 실수율, 실수 후 +150ms). 시뮬레이션(4,000판) 단독 도달 p5/p50: Hyper 9.25/9.96s, Hard 11.79/12.94s, Normal 16.1/17.9s → 2차 보강 4항 조건 충족.

의도적 편차:
1. **"준비…/시작!" 오버레이 생략** — 셸이 이미 3·2·1 카운트다운과 "GO!"(0.8s)를 그리므로 1.3s를 더 얹으면 이중 카운트다운이 된다. "GO!" 표시 시점 = 입력 유효 시점으로 동일하게 처리.
2. **CPU 삽질 효과음은 한 옥타브 아래·볼륨 0.012** — 사람(L 880Hz / R 990Hz, 0.05)의 교대 리듬이 CPU 비프에 묻히지 않게.
3. **플라밍고 scale 0.6, 간헐천 꼭대기 y=60(지표 위 50px)** — 0.55는 960px 캔버스에서 너무 작고, "지표 위 140px"은 화면 밖(y=-30)이라 우승자가 보이지 않는다. 우승 레인의 깊이/순위 라벨은 태그 옆(x+58, 좌정렬)으로 비켜 그리고, 꼭대기에 물왕관 파티클 + 탑승 후 바운스·0.3s 좌우 뒤집기.
4. **경과 시간 미표시** — 2차 보강 10항 권고대로 결과 문구에만 사용.
5. **도달 시 `sfx.good`만, 팡파르는 셸 `finish()`가 한 번** — 이중 징글 방지.
6. **레인 순위 라벨 = 1 + (나보다 깊은 수)** — 셸 결과 화면의 표준 경쟁 순위와 일치. 점수는 공동 순위 동일값(2차-8) 유지.
7. **한 프레임 L+R** — 직전 입력의 반대 키 1칸만 인정(빠른 롤 관용), 첫 입력이면 어리둥절.

알려진 셸 한계: 전원 0칸 시간 종료에서 점수가 전원 0으로 같아 셸(stadium.js)이 공동 1위로 보고 제목을 '승리!'로 표시한다. 셸 수정 금지라 게임 쪽 문구(무승부)·레인 '—'·0점(최고기록 저장 없음)으로만 보정.
