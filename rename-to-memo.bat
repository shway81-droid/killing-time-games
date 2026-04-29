@echo off
REM Rename kakao/ -> memo/ after Claude Code session is closed.
REM Usage: 1) Claude Code 종료 → 2) 이 파일 더블클릭 → 3) Claude Code를 memo 폴더에서 다시 열기

setlocal
cd /d "%~dp0"

if not exist "kakao" (
  if exist "memo" (
    echo [SKIP] kakao 폴더가 이미 없고 memo 폴더가 존재합니다. 이미 변경 완료.
  ) else (
    echo [ERROR] kakao 폴더도 memo 폴더도 없습니다. 경로 확인 필요.
  )
  pause
  exit /b 0
)

if exist "memo" (
  echo [ERROR] memo 폴더가 이미 존재합니다. 충돌 방지를 위해 자동 진행하지 않습니다.
  echo 수동으로 정리한 뒤 다시 실행해주세요.
  pause
  exit /b 1
)

echo Renaming kakao -^> memo ...
ren kakao memo

if errorlevel 1 (
  echo [FAIL] Rename 실패. Claude Code가 아직 켜져있을 가능성이 높습니다.
  echo Claude Code를 완전히 종료한 뒤 다시 시도해주세요.
) else (
  echo [OK] kakao -^> memo 변경 완료.
  echo 이제 Claude Code에서 memo 폴더를 열어 작업 계속하시면 됩니다.
)

pause
