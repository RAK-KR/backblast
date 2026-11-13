# BACKBLAST

https://rak-kr.github.io/backblast/

반동으로만 움직이는 2D 보스전 — 튜토리얼 + 보스 3단계 (울림종 → 불씨 화로 → 잿빛 수호자)

- 좌클릭: 주무기 연사 (작은 반동, 과열)
- 우클릭 / Space: 산탄 (큰 반동, 바닥에 닿으면 충전)
- F: 극딜 스킬 (게이지 가득 찼을 때, 5초간 반동 없음·무제한 사격)
- R: 재시작 · Esc: 일시정지

## 파일 구조
- `index.html` · `css/style.css`
- `js/config.js` 밸런스 수치
- `js/weapons.js` 무기·드랍 테이블
- `js/player.js` 플레이어 (반동 이동)
- `js/bosses.js` 보스별 수치·패턴 구성 (난이도 조절은 여기)
- `js/boss.js` 보스 공통 패턴 동작
- `js/bossart.js` 보스 그림
- `js/tutorial.js` 튜토리얼 단계
- `js/hazards.js` 레이저·충격파·탄환·기뢰
- `js/game.js` 전투 진행·HUD
- `js/render.js` 배경
- `js/fx.js` 파티클·데미지 숫자
- `js/audio.js` 효과음
- `js/ui.js` 메뉴·결과·장비 화면
- `js/save.js` 저장
- `js/main.js` 시작점

ES 모듈을 쓰므로 GitHub Pages 같은 웹 주소에서 실행해야 합니다 (파일을 더블클릭하면 동작하지 않습니다).
