# Flamingo Party

Flaming Games 안에서 실행하는 3D 미니게임 컬렉션입니다. 로컬 정적 서버 또는 배포 사이트의 `flamingo-party/`를 열면 됩니다. 같은 기기의 키보드, 게임패드, 1P 터치 입력을 지원하며 빈 자리는 CPU가 플레이합니다.

## 현재 범위와 상태

가정용·휴대용 본편/외전/재수록판 18개에서 작품별 40개를 선정했고, Mario Party-e 11개와 Jamboree TV의 추가 20개를 별도 컬렉션에 포함했습니다. **총 751개는 선정 항목 수이며 구현 완료 수가 아닙니다.** 홈페이지는 실제 등록된 구현과 검증한 원작 버전만 플레이 가능으로 표시합니다. 미구현 항목에는 규칙·출처와 제작 대기 상태를 표시합니다.

재수록판에는 원작과 다른 타이머, 점수, 판정이 존재합니다. `registry.js`의 `supportedTitles` 허용 목록으로 판별하며, 이름이 같다는 이유만으로 검증하지 않은 버전을 공개하지 않습니다. 같은 게임의 재수록 항목 수와 고유 게임 수를 UI에서 구분합니다.

캐릭터·경기장·코스·모형은 새로 제작했습니다. 원작의 모션·스타일러스 조작을 키보드나 게임패드로 바꾼 부분, 새로 만든 레벨이나 단순화한 부분은 각 게임 설명에 표시합니다. 각 항목의 `sourceUrl`에서 원작 규칙을 확인할 수 있습니다. 선정은 조작의 재미, 전략, 역할과 규칙의 다양성, 재수록 이력을 고려한 편집 판단이며 인기 투표 순위가 아닙니다.

전용 장치가 필요한 아케이드 7작과 홍보용 Flash 게임도 조사 범위에 기록했습니다. 완전한 목록이나 개별 규칙이 검증되지 않은 자료는 게임 구현으로 세지 않습니다. 상세 범위와 예외는 사이트 하단에서 확인할 수 있습니다.

## 구조

- `catalog.json`: 20개 컬렉션, 선정 규칙·원작 조작·승리 조건·출처
- `core.js`: 렌더러와 분리된 시뮬레이션, 입력, 시드 RNG, 점수·결과
- `view.js`, `bird.js`: Three.js 렌더링, 재사용 도형, 플라밍고 모델
- `games/*.js`: 원작별 독립 규칙과 검증한 버전 목록
- `registry.js`: 구현 연결, 원작 버전 허용 목록, 변경 사항 설명
- `app.js`: 작품·검색·상태 필터, 게임 시작/종료/재시작, 키보드·터치·게임패드

Three.js와 MIT 라이선스는 기존 `../flamingo-stadium/common/vendor/`를 공유합니다. 설치나 번들 빌드가 필요 없습니다. 제목 폰트는 Google Fonts를 사용하고 네트워크가 없으면 시스템 폰트로 대체됩니다.

## 검증

저장소 루트에서 정적 서버를 실행합니다.

```sh
python3 -m http.server 8787 --bind 127.0.0.1
node flamingo-party/scripts/simulate.mjs
```

시뮬레이션 검사는 등록된 모든 수록 버전을 두 시드에서 실행해 자연 종료, 결과 인덱스, 좌표·점수·렌더 파라미터의 유한성, 제한시간을 확인합니다. 원작에 고정 시간이 없는 게임은 구현에 임의의 패배 타이머를 추가하지 않으며 테스트 실행에만 상한을 둡니다. 결과는 Git에서 제외한 `scripts/out/simulation.json`에 저장합니다. 원작 규칙 대조 및 실제 브라우저 렌더·입력·모바일 검증은 이 검사와 별도로 수행합니다.

## 원작 목록 자료

- [Mario Party 시리즈 전체 출시작](https://www.mariowiki.com/Mario_Party_(series))
- [Super Mario Party 공식 미니게임 소개](https://media.nintendo.com/supermarioparty/minigames/)
- [Mario Party Superstars 공식 미니게임 소개](https://mariopartysuperstars.nintendo.com/minigames/)
- [Jamboree TV 공식 소개](https://www.nintendo.com/us/store/products/super-mario-party-jamboree-nintendo-switch-2-edition-plus-jamboree-tv-switch-2/)

개별 게임 규칙의 출처는 `catalog.json`에 각각 기재했습니다.
