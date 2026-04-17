/* games/initial-quiz/game.js */

'use strict';

// ══════════════════════════════════════════════════════════════
// 초성 추출 함수
// ══════════════════════════════════════════════════════════════

function getInitials(word) {
  var initials = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  return word.split('').map(function(ch) {
    var code = ch.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return ch;
    return initials[Math.floor(code / 588)];
  }).join('');
}

// ══════════════════════════════════════════════════════════════
// SVG ITEM LIBRARY — each returns SVG string, viewBox="0 0 60 60"
// ══════════════════════════════════════════════════════════════

function svgApple() {
  return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">'
    + '<path d="M30 8 Q38 2 42 10 Q36 12 30 8Z" fill="#66BB6A" stroke="#388E3C" stroke-width="1"/>'
    + '<line x1="30" y1="8" x2="30" y2="14" stroke="#6D4C41" stroke-width="2.5" stroke-linecap="round"/>'
    + '<path d="M30 14 Q10 12 8 30 Q8 48 30 52 Q52 48 52 30 Q50 12 30 14Z" fill="#EF5350" stroke="#C62828" stroke-width="1.5"/>'
    + '<ellipse cx="20" cy="24" rx="6" ry="4" fill="rgba(255,255,255,0.3)" transform="rotate(-20,20,24)"/>'
    + '<path d="M27 14 Q30 11 33 14" fill="none" stroke="#C62828" stroke-width="1.2"/>'
    + '</svg>';
}

function svgBanana() {
  return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">'
    + '<path d="M12 48 Q8 28 18 16 Q26 6 44 8 Q50 8 52 12 Q50 14 44 12 Q28 10 22 20 Q14 32 18 48Z" fill="#FFEE58" stroke="#F9A825" stroke-width="2" stroke-linejoin="round"/>'
    + '<path d="M12 48 Q14 52 18 50 Q14 46 12 48Z" fill="#F9A825"/>'
    + '<path d="M44 8 Q50 8 52 12 Q48 10 44 8Z" fill="#F9A825"/>'
    + '<path d="M22 18 Q30 12 40 14" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="3" stroke-linecap="round"/>'
    + '</svg>';
}

function svgGrape() {
  return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">'
    + '<line x1="30" y1="4" x2="30" y2="12" stroke="#6D4C41" stroke-width="2.5" stroke-linecap="round"/>'
    + '<path d="M30 8 Q22 4 20 10 Q26 12 30 8Z" fill="#66BB6A" stroke="#388E3C" stroke-width="1"/>'
    + '<circle cx="22" cy="20" r="8" fill="#9C27B0" stroke="#6A1B9A" stroke-width="1.2"/>'
    + '<circle cx="38" cy="20" r="8" fill="#9C27B0" stroke="#6A1B9A" stroke-width="1.2"/>'
    + '<circle cx="14" cy="33" r="8" fill="#AB47BC" stroke="#6A1B9A" stroke-width="1.2"/>'
    + '<circle cx="30" cy="33" r="8" fill="#9C27B0" stroke="#6A1B9A" stroke-width="1.2"/>'
    + '<circle cx="46" cy="33" r="8" fill="#AB47BC" stroke="#6A1B9A" stroke-width="1.2"/>'
    + '<circle cx="22" cy="46" r="8" fill="#9C27B0" stroke="#6A1B9A" stroke-width="1.2"/>'
    + '<circle cx="38" cy="46" r="8" fill="#AB47BC" stroke="#6A1B9A" stroke-width="1.2"/>'
    + '<circle cx="19" cy="17" r="2.5" fill="rgba(255,255,255,0.4)"/>'
    + '<circle cx="35" cy="17" r="2.5" fill="rgba(255,255,255,0.4)"/>'
    + '</svg>';
}

function svgStrawberry() {
  return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">'
    + '<path d="M30 12 Q24 4 20 10 Q28 14 30 12Z" fill="#4CAF50" stroke="#2E7D32" stroke-width="1"/>'
    + '<path d="M30 12 Q36 4 40 10 Q32 14 30 12Z" fill="#66BB6A" stroke="#2E7D32" stroke-width="1"/>'
    + '<path d="M30 12 Q18 6 18 14 Q24 14 30 12Z" fill="#4CAF50" stroke="#2E7D32" stroke-width="1"/>'
    + '<path d="M30 12 Q42 6 42 14 Q36 14 30 12Z" fill="#66BB6A" stroke="#2E7D32" stroke-width="1"/>'
    + '<path d="M30 14 Q46 16 50 30 Q52 44 30 56 Q8 44 10 30 Q14 16 30 14Z" fill="#F44336" stroke="#C62828" stroke-width="1.5"/>'
    + '<ellipse cx="24" cy="28" rx="1.5" ry="2" fill="#FFCC80" transform="rotate(-15,24,28)"/>'
    + '<ellipse cx="30" cy="24" rx="1.5" ry="2" fill="#FFCC80" transform="rotate(5,30,24)"/>'
    + '<ellipse cx="36" cy="28" rx="1.5" ry="2" fill="#FFCC80" transform="rotate(15,36,28)"/>'
    + '<ellipse cx="22" cy="36" rx="1.5" ry="2" fill="#FFCC80" transform="rotate(-10,22,36)"/>'
    + '<ellipse cx="30" cy="36" rx="1.5" ry="2" fill="#FFCC80"/>'
    + '<ellipse cx="38" cy="36" rx="1.5" ry="2" fill="#FFCC80" transform="rotate(10,38,36)"/>'
    + '</svg>';
}

function svgWatermelon() {
  return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">'
    + '<path d="M8 32 Q8 8 30 8 Q52 8 52 32Z" fill="#4CAF50" stroke="#2E7D32" stroke-width="1.5"/>'
    + '<path d="M12 32 Q12 12 30 12 Q48 12 48 32Z" fill="#A5D6A7"/>'
    + '<path d="M16 32 Q16 16 30 16 Q44 16 44 32Z" fill="#EF5350"/>'
    + '<ellipse cx="24" cy="26" rx="2" ry="3" fill="#333" transform="rotate(-15,24,26)"/>'
    + '<ellipse cx="30" cy="23" rx="2" ry="3" fill="#333"/>'
    + '<ellipse cx="36" cy="26" rx="2" ry="3" fill="#333" transform="rotate(15,36,26)"/>'
    + '<line x1="8" y1="32" x2="52" y2="32" stroke="#2E7D32" stroke-width="2"/>'
    + '<path d="M8 32 Q30 38 52 32" fill="none" stroke="#388E3C" stroke-width="1"/>'
    + '</svg>';
}

function svgCat() {
  return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">'
    + '<polygon points="10,22 18,6 24,20" fill="#FF8A65" stroke="#E64A19" stroke-width="1.5" stroke-linejoin="round"/>'
    + '<polygon points="36,20 42,6 50,22" fill="#FF8A65" stroke="#E64A19" stroke-width="1.5" stroke-linejoin="round"/>'
    + '<polygon points="13,21 18,10 23,21" fill="#FFCCBC"/>'
    + '<polygon points="38,21 42,10 47,21" fill="#FFCCBC"/>'
    + '<ellipse cx="30" cy="34" rx="22" ry="20" fill="#FF8A65" stroke="#E64A19" stroke-width="1.5"/>'
    + '<ellipse cx="22" cy="30" rx="4" ry="4.5" fill="#fff"/>'
    + '<ellipse cx="38" cy="30" rx="4" ry="4.5" fill="#fff"/>'
    + '<circle cx="22" cy="31" r="2.5" fill="#333"/>'
    + '<circle cx="38" cy="31" r="2.5" fill="#333"/>'
    + '<circle cx="23" cy="30" r="1" fill="#fff"/>'
    + '<circle cx="39" cy="30" r="1" fill="#fff"/>'
    + '<ellipse cx="30" cy="38" rx="3" ry="2" fill="#FF7043"/>'
    + '<path d="M27 40 Q30 44 33 40" fill="none" stroke="#E64A19" stroke-width="1.5" stroke-linecap="round"/>'
    + '<line x1="8" y1="37" x2="24" y2="39" stroke="#BF360C" stroke-width="1" stroke-linecap="round"/>'
    + '<line x1="8" y1="40" x2="24" y2="40" stroke="#BF360C" stroke-width="1" stroke-linecap="round"/>'
    + '<line x1="36" y1="39" x2="52" y2="37" stroke="#BF360C" stroke-width="1" stroke-linecap="round"/>'
    + '<line x1="36" y1="40" x2="52" y2="40" stroke="#BF360C" stroke-width="1" stroke-linecap="round"/>'
    + '</svg>';
}

function svgDog() {
  return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">'
    + '<ellipse cx="14" cy="30" rx="9" ry="13" fill="#A1887F" stroke="#6D4C41" stroke-width="1.5"/>'
    + '<ellipse cx="46" cy="30" rx="9" ry="13" fill="#A1887F" stroke="#6D4C41" stroke-width="1.5"/>'
    + '<ellipse cx="30" cy="30" rx="20" ry="19" fill="#BCAAA4" stroke="#6D4C41" stroke-width="1.5"/>'
    + '<ellipse cx="30" cy="38" rx="10" ry="7" fill="#D7CCC8" stroke="#6D4C41" stroke-width="1.2"/>'
    + '<circle cx="22" cy="27" r="4" fill="#fff"/>'
    + '<circle cx="38" cy="27" r="4" fill="#fff"/>'
    + '<circle cx="22" cy="28" r="2.5" fill="#333"/>'
    + '<circle cx="38" cy="28" r="2.5" fill="#333"/>'
    + '<circle cx="23" cy="27" r="1" fill="#fff"/>'
    + '<circle cx="39" cy="27" r="1" fill="#fff"/>'
    + '<ellipse cx="30" cy="35" rx="4" ry="3" fill="#4E342E"/>'
    + '<path d="M26 41 Q30 48 34 41" fill="#EF9A9A" stroke="#E57373" stroke-width="1"/>'
    + '</svg>';
}

function svgRabbit() {
  return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">'
    + '<ellipse cx="20" cy="14" rx="6" ry="13" fill="#F8BBD9" stroke="#E91E8C" stroke-width="1.5"/>'
    + '<ellipse cx="40" cy="14" rx="6" ry="13" fill="#F8BBD9" stroke="#E91E8C" stroke-width="1.5"/>'
    + '<ellipse cx="20" cy="14" rx="3.5" ry="10" fill="#F48FB1"/>'
    + '<ellipse cx="40" cy="14" rx="3.5" ry="10" fill="#F48FB1"/>'
    + '<ellipse cx="30" cy="36" rx="20" ry="18" fill="#F8BBD9" stroke="#E91E8C" stroke-width="1.5"/>'
    + '<circle cx="22" cy="32" r="4" fill="#fff"/>'
    + '<circle cx="38" cy="32" r="4" fill="#fff"/>'
    + '<circle cx="22" cy="33" r="2.2" fill="#CE93D8"/>'
    + '<circle cx="38" cy="33" r="2.2" fill="#CE93D8"/>'
    + '<circle cx="23" cy="32" r="0.9" fill="#fff"/>'
    + '<circle cx="39" cy="32" r="0.9" fill="#fff"/>'
    + '<ellipse cx="30" cy="40" rx="2.5" ry="2" fill="#E91E8C"/>'
    + '<path d="M27 42 Q30 46 33 42" fill="none" stroke="#C2185B" stroke-width="1.5" stroke-linecap="round"/>'
    + '</svg>';
}

function svgFish() {
  return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">'
    + '<polygon points="52,20 60,12 60,48 52,40" fill="#29B6F6" stroke="#0288D1" stroke-width="1.2"/>'
    + '<ellipse cx="28" cy="30" rx="26" ry="16" fill="#4FC3F7" stroke="#0288D1" stroke-width="1.5"/>'
    + '<ellipse cx="26" cy="33" rx="16" ry="8" fill="#B3E5FC"/>'
    + '<circle cx="10" cy="27" r="5" fill="#fff" stroke="#0288D1" stroke-width="1.2"/>'
    + '<circle cx="10" cy="27" r="3" fill="#333"/>'
    + '<circle cx="9" cy="26" r="1.2" fill="#fff"/>'
    + '<path d="M4 31 Q6 34 8 31" fill="none" stroke="#0277BD" stroke-width="1.5" stroke-linecap="round"/>'
    + '<path d="M22 22 Q26 18 30 22" fill="none" stroke="#0288D1" stroke-width="1.2"/>'
    + '<path d="M30 22 Q34 18 38 22" fill="none" stroke="#0288D1" stroke-width="1.2"/>'
    + '<path d="M26 28 Q30 24 34 28" fill="none" stroke="#0288D1" stroke-width="1.2"/>'
    + '</svg>';
}

function svgBird() {
  return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">'
    + '<ellipse cx="30" cy="36" rx="18" ry="14" fill="#FFCC02" stroke="#F9A825" stroke-width="1.5"/>'
    + '<ellipse cx="18" cy="34" rx="10" ry="6" fill="#FFB300" stroke="#F9A825" stroke-width="1.2" transform="rotate(-20,18,34)"/>'
    + '<circle cx="42" cy="24" r="13" fill="#FFCC02" stroke="#F9A825" stroke-width="1.5"/>'
    + '<circle cx="47" cy="21" r="4" fill="#fff" stroke="#F9A825" stroke-width="1"/>'
    + '<circle cx="47" cy="21" r="2.5" fill="#333"/>'
    + '<circle cx="46" cy="20" r="1" fill="#fff"/>'
    + '<polygon points="55,25 62,30 55,31" fill="#FF6F00" stroke="#E65100" stroke-width="1"/>'
    + '<polygon points="12,42 4,52 14,48 6,56 20,48" fill="#FFB300" stroke="#F9A825" stroke-width="1.2" stroke-linejoin="round"/>'
    + '</svg>';
}

function svgStar() {
  return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">'
    + '<polygon points="30,4 36,21 55,21 40,32 46,50 30,39 14,50 20,32 5,21 24,21" fill="#FFD600" stroke="#F9A825" stroke-width="2" stroke-linejoin="round"/>'
    + '<ellipse cx="24" cy="20" rx="5" ry="3" fill="rgba(255,255,255,0.35)" transform="rotate(-25,24,20)"/>'
    + '</svg>';
}

function svgHeart() {
  return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">'
    + '<path d="M30 52 Q6 36 6 20 Q6 8 18 8 Q24 8 30 16 Q36 8 42 8 Q54 8 54 20 Q54 36 30 52Z" fill="#E91E63" stroke="#880E4F" stroke-width="2"/>'
    + '<ellipse cx="20" cy="18" rx="6" ry="4" fill="rgba(255,255,255,0.3)" transform="rotate(-30,20,18)"/>'
    + '</svg>';
}

function svgMoon() {
  return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">'
    + '<path d="M36 6 Q20 10 16 24 Q12 38 24 50 Q38 56 50 46 Q60 38 56 26 Q44 38 32 34 Q18 28 22 16 Q24 8 36 6Z" fill="#FFF176" stroke="#F9A825" stroke-width="1.5"/>'
    + '<circle cx="42" cy="14" r="2" fill="#FFD600"/>'
    + '<circle cx="50" cy="22" r="1.5" fill="#FFD600"/>'
    + '<circle cx="46" cy="30" r="1" fill="#FFD600"/>'
    + '</svg>';
}

function svgCloud() {
  return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">'
    + '<circle cx="20" cy="34" r="12" fill="#B3E5FC" stroke="#29B6F6" stroke-width="1.5"/>'
    + '<circle cx="32" cy="28" r="15" fill="#E1F5FE" stroke="#29B6F6" stroke-width="1.5"/>'
    + '<circle cx="44" cy="34" r="11" fill="#B3E5FC" stroke="#29B6F6" stroke-width="1.5"/>'
    + '<rect x="10" y="34" width="38" height="14" fill="#E1F5FE"/>'
    + '<line x1="9" y1="45" x2="55" y2="45" stroke="#E1F5FE" stroke-width="3"/>'
    + '<ellipse cx="28" cy="24" rx="7" ry="3" fill="rgba(255,255,255,0.6)" transform="rotate(-10,28,24)"/>'
    + '</svg>';
}

function svgTree() {
  return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">'
    + '<rect x="24" y="44" width="12" height="14" rx="3" fill="#795548" stroke="#5D4037" stroke-width="1.5"/>'
    + '<polygon points="6,48 30,20 54,48" fill="#388E3C" stroke="#1B5E20" stroke-width="1.5" stroke-linejoin="round"/>'
    + '<polygon points="10,36 30,12 50,36" fill="#43A047" stroke="#2E7D32" stroke-width="1.5" stroke-linejoin="round"/>'
    + '<polygon points="16,26 30,6 44,26" fill="#66BB6A" stroke="#388E3C" stroke-width="1.5" stroke-linejoin="round"/>'
    + '<polygon points="30,4 32,10 38,10 33,13 35,19 30,16 25,19 27,13 22,10 28,10" fill="#FFD600" stroke="#F9A825" stroke-width="0.8"/>'
    + '</svg>';
}

function svgFlower() {
  return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">'
    + '<line x1="30" y1="36" x2="30" y2="56" stroke="#4CAF50" stroke-width="3" stroke-linecap="round"/>'
    + '<path d="M30 48 Q22 42 24 36 Q30 40 30 48Z" fill="#66BB6A" stroke="#388E3C" stroke-width="1"/>'
    + '<ellipse cx="30" cy="18" rx="6" ry="10" fill="#FF80AB"/>'
    + '<ellipse cx="30" cy="18" rx="6" ry="10" fill="#FF80AB" transform="rotate(45,30,30)"/>'
    + '<ellipse cx="30" cy="18" rx="6" ry="10" fill="#FF4081" transform="rotate(90,30,30)"/>'
    + '<ellipse cx="30" cy="18" rx="6" ry="10" fill="#FF80AB" transform="rotate(135,30,30)"/>'
    + '<circle cx="30" cy="30" r="9" fill="#FFCC02" stroke="#F9A825" stroke-width="1.5"/>'
    + '<circle cx="30" cy="30" r="5" fill="#FF8F00"/>'
    + '</svg>';
}

function svgCar() {
  return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">'
    + '<rect x="4" y="30" width="52" height="18" rx="5" fill="#EF5350" stroke="#B71C1C" stroke-width="1.5"/>'
    + '<path d="M14 30 Q18 18 28 16 L36 16 Q44 18 46 30Z" fill="#EF9A9A" stroke="#B71C1C" stroke-width="1.5"/>'
    + '<rect x="18" y="20" width="10" height="9" rx="2" fill="#B3E5FC" stroke="#0288D1" stroke-width="1"/>'
    + '<rect x="31" y="20" width="10" height="9" rx="2" fill="#B3E5FC" stroke="#0288D1" stroke-width="1"/>'
    + '<circle cx="15" cy="48" r="7" fill="#333" stroke="#555" stroke-width="1.5"/>'
    + '<circle cx="45" cy="48" r="7" fill="#333" stroke="#555" stroke-width="1.5"/>'
    + '<circle cx="15" cy="48" r="3.5" fill="#888"/>'
    + '<circle cx="45" cy="48" r="3.5" fill="#888"/>'
    + '<ellipse cx="56" cy="36" rx="3" ry="2.5" fill="#FFEE58" stroke="#F9A825" stroke-width="1"/>'
    + '</svg>';
}

function svgRocket() {
  return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">'
    + '<path d="M22 52 Q24 58 30 56 Q36 58 38 52 Q34 54 30 52 Q26 54 22 52Z" fill="#FF6D00"/>'
    + '<path d="M24 50 Q26 56 30 54 Q34 56 36 50 Q32 52 30 50 Q28 52 24 50Z" fill="#FFD600"/>'
    + '<path d="M16 44 Q10 50 12 56 L22 48Z" fill="#1565C0" stroke="#0D47A1" stroke-width="1"/>'
    + '<path d="M44 44 Q50 50 48 56 L38 48Z" fill="#1565C0" stroke="#0D47A1" stroke-width="1"/>'
    + '<rect x="20" y="22" width="20" height="28" rx="4" fill="#1E88E5" stroke="#0D47A1" stroke-width="1.5"/>'
    + '<path d="M20 22 Q20 6 30 4 Q40 6 40 22Z" fill="#EF5350" stroke="#B71C1C" stroke-width="1.5"/>'
    + '<circle cx="30" cy="34" r="7" fill="#B3E5FC" stroke="#0288D1" stroke-width="1.5"/>'
    + '<circle cx="30" cy="34" r="4" fill="#E3F2FD"/>'
    + '</svg>';
}

function svgHouse() {
  return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">'
    + '<polygon points="30,4 58,26 2,26" fill="#EF5350" stroke="#B71C1C" stroke-width="1.5" stroke-linejoin="round"/>'
    + '<rect x="40" y="10" width="7" height="12" rx="1" fill="#795548" stroke="#5D4037" stroke-width="1"/>'
    + '<rect x="6" y="26" width="48" height="30" rx="2" fill="#FFF9C4" stroke="#F9A825" stroke-width="1.5"/>'
    + '<rect x="23" y="38" width="14" height="18" rx="3" fill="#795548" stroke="#5D4037" stroke-width="1.5"/>'
    + '<circle cx="35" cy="47" r="1.8" fill="#FFD600"/>'
    + '<rect x="9" y="32" width="10" height="10" rx="2" fill="#B3E5FC" stroke="#29B6F6" stroke-width="1.2"/>'
    + '<line x1="14" y1="32" x2="14" y2="42" stroke="#29B6F6" stroke-width="1"/>'
    + '<line x1="9" y1="37" x2="19" y2="37" stroke="#29B6F6" stroke-width="1"/>'
    + '<rect x="41" y="32" width="10" height="10" rx="2" fill="#B3E5FC" stroke="#29B6F6" stroke-width="1.2"/>'
    + '<line x1="46" y1="32" x2="46" y2="42" stroke="#29B6F6" stroke-width="1"/>'
    + '<line x1="41" y1="37" x2="51" y2="37" stroke="#29B6F6" stroke-width="1"/>'
    + '</svg>';
}

function svgAirplane() {
  return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">'
    + '<!-- body -->'
    + '<path d="M6 32 Q16 28 30 30 Q44 32 56 28 Q58 30 56 32 Q44 36 30 34 Q16 32 6 36 Z" fill="#42A5F5" stroke="#1565C0" stroke-width="1.5"/>'
    + '<!-- nose -->'
    + '<path d="M50 30 Q60 30 58 30" fill="none"/>'
    + '<ellipse cx="52" cy="30" rx="8" ry="4" fill="#64B5F6" stroke="#1565C0" stroke-width="1"/>'
    + '<!-- main wing -->'
    + '<path d="M26 30 Q30 14 38 10 L40 14 Q36 18 32 32 Z" fill="#1E88E5" stroke="#1565C0" stroke-width="1.2"/>'
    + '<path d="M26 32 Q30 46 38 50 L40 46 Q36 42 32 30 Z" fill="#1E88E5" stroke="#1565C0" stroke-width="1.2"/>'
    + '<!-- tail wing -->'
    + '<path d="M10 30 Q12 22 18 18 L20 22 Q16 24 14 32 Z" fill="#42A5F5" stroke="#1565C0" stroke-width="1"/>'
    + '<path d="M10 32 Q12 38 18 42 L20 38 Q16 36 14 30 Z" fill="#42A5F5" stroke="#1565C0" stroke-width="1"/>'
    + '<!-- window -->'
    + '<circle cx="38" cy="30" r="3.5" fill="#B3E5FC" stroke="#0288D1" stroke-width="1"/>'
    + '<circle cx="30" cy="30" r="3" fill="#B3E5FC" stroke="#0288D1" stroke-width="1"/>'
    + '</svg>';
}

// ══════════════════════════════════════════════════════════════
// WORD POOL
// Each entry: { word, svgFn }
// initials is computed automatically via getInitials()
// ══════════════════════════════════════════════════════════════

var WORD_POOL = [
  { word: '사과',   svgFn: svgApple      },  // ㅅㄱ
  { word: '바나나', svgFn: svgBanana     },  // ㅂㄴㄴ
  { word: '포도',   svgFn: svgGrape      },  // ㅍㄷ
  { word: '딸기',   svgFn: svgStrawberry },  // ㄷㄱ
  { word: '수박',   svgFn: svgWatermelon },  // ㅅㅂ
  { word: '고양이', svgFn: svgCat        },  // ㄱㅇㅇ
  { word: '강아지', svgFn: svgDog        },  // ㄱㅇㅈ
  { word: '토끼',   svgFn: svgRabbit     },  // ㅌㄲ
  { word: '물고기', svgFn: svgFish       },  // ㅁㄱㄱ
  { word: '새',     svgFn: svgBird       },  // ㅅ
  { word: '별',     svgFn: svgStar       },  // ㅂ
  { word: '하트',   svgFn: svgHeart      },  // ㅎㅌ
  { word: '달',     svgFn: svgMoon       },  // ㄷ
  { word: '구름',   svgFn: svgCloud      },  // ㄱㄹ
  { word: '나무',   svgFn: svgTree       },  // ㄴㅁ
  { word: '꽃',     svgFn: svgFlower     },  // ㄲ
  { word: '자동차', svgFn: svgCar        },  // ㅈㄷㅊ
  { word: '로켓',   svgFn: svgRocket     },  // ㄹㅋ
  { word: '집',     svgFn: svgHouse      },  // ㅈ
  { word: '비행기', svgFn: svgAirplane   },  // ㅂㅎㄱ
];

// Pre-compute initials for each word
WORD_POOL.forEach(function(entry) {
  entry.initials = getInitials(entry.word);
});

// ══════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════

var TOTAL_ROUNDS   = 10;
var ITEMS_PER_ZONE = 4;   // 2×2 grid

var PLAYER_CONFIG = [
  { label: 'P1', hex: '#00BCD4', bgTint: 'rgba(0,188,212,0.14)' },
  { label: 'P2', hex: '#FF5722', bgTint: 'rgba(255,87,34,0.14)'  },
  { label: 'P3', hex: '#9C27B0', bgTint: 'rgba(156,39,176,0.14)' },
  { label: 'P4', hex: '#4CAF50', bgTint: 'rgba(76,175,80,0.14)'  },
];

// ══════════════════════════════════════════════════════════════
// SOUND
// ══════════════════════════════════════════════════════════════

var sound = createSoundManager({
  ding: function(ctx) {
    [523, 659, 784].forEach(function(freq, i) {
      var osc  = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      var t = ctx.currentTime + i * 0.1;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  },
  buzz: function(ctx) {
    var osc  = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  },
  fanfare: function(ctx) {
    [392, 523, 659, 784, 1047].forEach(function(freq, i) {
      var osc  = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      var t = ctx.currentTime + i * 0.13;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  },
  tick: function(ctx) {
    var osc  = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  }
});

// ══════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════

var playerCount   = 2;
var currentRound  = 0;
var scores        = [];
var phase         = 'idle';   // idle | active | resolved
var targetWord    = null;     // entry from WORD_POOL
var roundDQ       = [];       // player indices disqualified this round
var roundResolved = false;
var nextRoundTimer = null;
var gameActive    = false;

// ══════════════════════════════════════════════════════════════
// DOM REFS
// ══════════════════════════════════════════════════════════════

var introScreen       = document.getElementById('introScreen');
var countdownScreen   = document.getElementById('countdownScreen');
var countdownNumber   = document.getElementById('countdownNumber');
var gameScreen        = document.getElementById('gameScreen');
var resultScreen      = document.getElementById('resultScreen');
var backBtn           = document.getElementById('backBtn');
var playBtn           = document.getElementById('playBtn');
var closeBtn          = document.getElementById('closeBtn');
var retryBtn          = document.getElementById('retryBtn');
var homeBtn           = document.getElementById('homeBtn');
var soundToggleIntro  = document.getElementById('soundToggleIntro');
var zonesWrap         = document.getElementById('zonesWrap');
var roundBadge        = document.getElementById('roundBadge');
var targetChoseongBox = document.getElementById('targetChoseongBox');
var roundStatus       = document.getElementById('roundStatus');
var resultTitle       = document.getElementById('resultTitle');
var resultWinner      = document.getElementById('resultWinner');
var resultScoresWrap  = document.getElementById('resultScoresWrap');

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function showScreen(el) {
  [introScreen, countdownScreen, gameScreen, resultScreen].forEach(function(s) {
    s.classList.remove('active');
  });
  el.classList.add('active');
}

var countdownInterval = null;
function startCountdown(onDone) {
  showScreen(countdownScreen);
  var count = 3;
  countdownNumber.textContent = count;
  countdownInterval = setInterval(function() {
    count--;
    if (count <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      onDone();
    } else {
      countdownNumber.textContent = count;
      countdownNumber.style.animation = 'none';
      countdownNumber.offsetHeight;
      countdownNumber.style.animation = '';
    }
  }, 1000);
}

function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function isDQ(playerIdx) {
  return roundDQ.indexOf(playerIdx) !== -1;
}

function setDQ(playerIdx) {
  if (!isDQ(playerIdx)) roundDQ.push(playerIdx);
}

function updateSoundToggle() {
  soundToggleIntro.textContent = sound.isMuted() ? '🔇' : '🔊';
}

function clearNextRoundTimer() {
  if (nextRoundTimer !== null) {
    clearTimeout(nextRoundTimer);
    nextRoundTimer = null;
  }
}

function cleanup() {
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  gameActive = false;
  clearNextRoundTimer();
}

// ══════════════════════════════════════════════════════════════
// 초성 SVG renderer — large bold text on dark rounded rect
// ══════════════════════════════════════════════════════════════

function makeChoseongSvg(initials, width, height, fontSize) {
  width    = width    || 140;
  height   = height   || 76;
  fontSize = fontSize || 48;

  // Dynamically shrink font for longer strings
  var len = initials.length;
  if (len >= 4) fontSize = Math.round(fontSize * 0.72);
  else if (len === 3) fontSize = Math.round(fontSize * 0.84);

  return '<svg viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '" xmlns="http://www.w3.org/2000/svg">'
    + '<rect width="' + width + '" height="' + height + '" rx="16" fill="#3E2723"/>'
    + '<rect x="3" y="3" width="' + (width - 6) + '" height="' + (height - 6) + '" rx="13" fill="none" stroke="rgba(255,204,128,0.3)" stroke-width="1.5"/>'
    + '<text x="' + (width / 2) + '" y="' + (height / 2 + fontSize * 0.36) + '"'
    + ' text-anchor="middle"'
    + ' font-size="' + fontSize + '"'
    + ' font-weight="900"'
    + ' font-family="\'Noto Sans KR\', \'Apple SD Gothic Neo\', sans-serif"'
    + ' fill="#FFCC80"'
    + ' letter-spacing="' + (len > 2 ? 2 : 6) + '">'
    + initials
    + '</text>'
    + '</svg>';
}

// ══════════════════════════════════════════════════════════════
// SOUND TOGGLE
// ══════════════════════════════════════════════════════════════

onTap(soundToggleIntro, function() {
  sound.toggleMute();
  updateSoundToggle();
});
updateSoundToggle();

// ══════════════════════════════════════════════════════════════
// PLAYER COUNT SELECT
// ══════════════════════════════════════════════════════════════

document.querySelectorAll('.player-btn').forEach(function(btn) {
  onTap(btn, function() {
    document.querySelectorAll('.player-btn').forEach(function(b) {
      b.classList.remove('active');
    });
    btn.classList.add('active');
    playerCount = parseInt(btn.getAttribute('data-count'), 10);
  });
});

// ══════════════════════════════════════════════════════════════
// NAV BUTTONS
// ══════════════════════════════════════════════════════════════

onTap(backBtn,  function() { cleanup(); goHome(); });
onTap(playBtn,  function() { startCountdown(function() { startGame(); }); });
onTap(closeBtn, function() { cleanup(); goHome(); });
onTap(retryBtn, function() { startCountdown(function() { startGame(); }); });
onTap(homeBtn,  function() { cleanup(); goHome(); });

// ══════════════════════════════════════════════════════════════
// ZONE BUILDING
// ══════════════════════════════════════════════════════════════

function buildZones() {
  zonesWrap.innerHTML = '';
  zonesWrap.className = 'zones-wrap p' + playerCount;

  for (var i = 0; i < playerCount; i++) {
    var cfg  = PLAYER_CONFIG[i];
    var zone = document.createElement('div');
    zone.className = 'zone state-idle';
    zone.dataset.player = i;
    zone.style.background = cfg.bgTint;

    var header = document.createElement('div');
    header.className = 'zone-header';

    var label = document.createElement('div');
    label.className = 'zone-label';
    label.style.color = cfg.hex;
    label.textContent = cfg.label;

    var scoreEl = document.createElement('div');
    scoreEl.className = 'zone-score';
    scoreEl.setAttribute('data-score-for', i);
    scoreEl.textContent = '0점';
    scoreEl.style.color = cfg.hex;

    header.appendChild(label);
    header.appendChild(scoreEl);

    var grid = document.createElement('div');
    grid.className = 'item-grid';
    grid.setAttribute('data-grid-for', i);

    zone.appendChild(header);
    zone.appendChild(grid);
    zonesWrap.appendChild(zone);
  }
}

function getZone(idx) {
  return zonesWrap.querySelector('.zone[data-player="' + idx + '"]');
}

function updateZoneScore(idx) {
  var el = zonesWrap.querySelector('[data-score-for="' + idx + '"]');
  if (el) el.textContent = scores[idx] + '점';
}

// ══════════════════════════════════════════════════════════════
// ROUND ITEM GENERATION
// ══════════════════════════════════════════════════════════════

function generateRoundItems(correctEntry) {
  // Pick (ITEMS_PER_ZONE - 1) wrong items distinct from correct
  var pool  = WORD_POOL.filter(function(e) { return e.word !== correctEntry.word; });
  var wrong = shuffle(pool).slice(0, ITEMS_PER_ZONE - 1);
  var items = wrong.slice();
  var insertIdx = Math.floor(Math.random() * ITEMS_PER_ZONE);
  items.splice(insertIdx, 0, correctEntry);
  return items;
}

function populateZoneGrid(playerIdx, items) {
  var grid = zonesWrap.querySelector('[data-grid-for="' + playerIdx + '"]');
  if (!grid) return;
  grid.innerHTML = '';

  items.forEach(function(entry) {
    var btn = document.createElement('div');
    btn.className = 'item-btn';
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-label', entry.word);
    btn.setAttribute('data-word', entry.word);

    // SVG picture only — no word label
    btn.innerHTML = entry.svgFn();

    onTap(btn, function(e) {
      e.stopPropagation();
      handleItemTap(playerIdx, entry.word, btn, e);
    });

    grid.appendChild(btn);
  });
}

// ══════════════════════════════════════════════════════════════
// RIPPLE
// ══════════════════════════════════════════════════════════════

function spawnRipple(zone, e) {
  var rect = zone.getBoundingClientRect();
  var src  = (e.touches && e.touches[0]) ? e.touches[0] : e;
  var x = (src ? src.clientX : rect.left + rect.width  / 2) - rect.left;
  var y = (src ? src.clientY : rect.top  + rect.height / 2) - rect.top;
  var size = Math.max(rect.width, rect.height);
  var r = document.createElement('span');
  r.className = 'zone-ripple';
  r.style.left      = x + 'px';
  r.style.top       = y + 'px';
  r.style.width     = size + 'px';
  r.style.height    = size + 'px';
  r.style.marginLeft = (-size / 2) + 'px';
  r.style.marginTop  = (-size / 2) + 'px';
  zone.appendChild(r);
  r.addEventListener('animationend', function() { r.remove(); });
}

// ══════════════════════════════════════════════════════════════
// TAP HANDLER
// ══════════════════════════════════════════════════════════════

function handleItemTap(playerIdx, word, btn, e) {
  if (phase !== 'active') return;
  if (isDQ(playerIdx))    return;
  if (roundResolved)       return;

  var zone      = getZone(playerIdx);
  spawnRipple(zone, e);

  var isCorrect = (word === targetWord.word);

  if (isCorrect) {
    roundResolved = true;
    phase = 'resolved';
    sound.play('ding');

    scores[playerIdx]++;
    updateZoneScore(playerIdx);

    btn.classList.add('item-correct-flash');

    zone.classList.remove('state-idle', 'state-active', 'state-dq', 'state-wrong');
    zone.classList.add('state-correct');

    // Dim other zones
    for (var i = 0; i < playerCount; i++) {
      if (i === playerIdx) continue;
      var z = getZone(i);
      if (z && !isDQ(i)) {
        z.classList.remove('state-active');
        z.classList.add('state-idle');
      }
    }

    var cfg = PLAYER_CONFIG[playerIdx];
    roundStatus.textContent = cfg.label + ' 정답! +1점';
    roundStatus.className   = 'round-status correct';

    scheduleNextOrEnd();

  } else {
    sound.play('buzz');
    setDQ(playerIdx);

    // Deduct 1 point (floor at 0)
    scores[playerIdx] = Math.max(0, scores[playerIdx] - 1);
    updateZoneScore(playerIdx);

    // Show "-1" flash
    var penalty = document.createElement('div');
    penalty.className = 'penalty-flash';
    penalty.textContent = '-1';
    zone.style.position = 'relative';
    zone.appendChild(penalty);
    penalty.addEventListener('animationend', function() { penalty.remove(); });

    btn.classList.add('item-wrong-flash');
    setTimeout(function() {
      if (gameActive) btn.classList.remove('item-wrong-flash');
    }, 400);

    zone.classList.remove('state-active', 'state-correct', 'state-idle');
    zone.classList.add('state-dq', 'state-wrong');
    setTimeout(function() {
      if (gameActive) zone.classList.remove('state-wrong');
    }, 420);

    roundStatus.textContent = PLAYER_CONFIG[playerIdx].label + ' 오답! 실격 -1점';
    roundStatus.className   = 'round-status wrong';

    setTimeout(function() {
      if (gameActive && phase === 'active') {
        roundStatus.textContent = '';
        roundStatus.className   = 'round-status';
      }
    }, 900);

    // Check if everyone is disqualified
    var allOut = true;
    for (var j = 0; j < playerCount; j++) {
      if (!isDQ(j)) { allOut = false; break; }
    }
    if (allOut) {
      roundResolved = true;
      phase = 'resolved';
      roundStatus.textContent = '전원 실격 — 다음 라운드';
      roundStatus.className   = 'round-status wrong';
      scheduleNextOrEnd();
    }
  }
}

// ══════════════════════════════════════════════════════════════
// GAME FLOW
// ══════════════════════════════════════════════════════════════

function startGame() {
  cleanup();
  gameActive = true;

  scores = [];
  for (var i = 0; i < playerCount; i++) { scores.push(0); }
  currentRound  = 0;
  roundResolved = false;
  roundDQ       = [];
  phase         = 'idle';

  showScreen(gameScreen);
  buildZones();

  nextRoundTimer = setTimeout(function() {
    nextRoundTimer = null;
    nextRound();
  }, 300);
}

function nextRound() {
  currentRound++;
  roundDQ       = [];
  roundResolved = false;
  phase         = 'idle';

  roundBadge.textContent  = currentRound + ' / ' + TOTAL_ROUNDS;
  roundStatus.textContent = '준비...';
  roundStatus.className   = 'round-status';

  // Show "?" placeholder in 초성 box
  targetChoseongBox.innerHTML = makeChoseongSvg('?', 140, 76, 52);

  // Reset zones to idle
  for (var i = 0; i < playerCount; i++) {
    var z = getZone(i);
    if (z) {
      z.className = 'zone state-idle';
      z.style.background = PLAYER_CONFIG[i].bgTint;
      var grid = z.querySelector('.item-grid');
      if (grid) grid.innerHTML = '';
    }
  }

  sound.play('tick');

  // Short pause then reveal 초성 and items
  nextRoundTimer = setTimeout(function() {
    nextRoundTimer = null;

    // Pick target word (avoid repeating the same word twice in a row if possible)
    var pool = WORD_POOL.slice();
    if (targetWord && pool.length > 1) {
      pool = pool.filter(function(e) { return e.word !== targetWord.word; });
    }
    targetWord = pool[Math.floor(Math.random() * pool.length)];

    // Render 초성 in center panel
    targetChoseongBox.innerHTML = makeChoseongSvg(targetWord.initials);

    roundStatus.textContent = '';
    roundStatus.className   = 'round-status';

    // Populate each zone independently
    for (var p = 0; p < playerCount; p++) {
      var items = generateRoundItems(targetWord);
      populateZoneGrid(p, items);
      var zone = getZone(p);
      if (zone) {
        zone.classList.remove('state-idle', 'state-correct', 'state-wrong', 'state-dq');
        zone.classList.add('state-active');
      }
    }

    phase = 'active';
  }, 700);
}

function scheduleNextOrEnd() {
  clearNextRoundTimer();
  nextRoundTimer = setTimeout(function() {
    nextRoundTimer = null;
    if (currentRound >= TOTAL_ROUNDS) {
      showResult();
    } else {
      nextRound();
    }
  }, 1600);
}

// ══════════════════════════════════════════════════════════════
// RESULT SCREEN
// ══════════════════════════════════════════════════════════════

function rankMedalSvg(rank) {
  // Returns inline SVG medal for ranks 0,1,2; plain text for 3+
  var colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  if (rank > 2) return '<span style="font-weight:900;font-size:1.1rem;">' + (rank + 1) + '위</span>';
  var c = colors[rank];
  return '<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle">'
    + '<circle cx="14" cy="16" r="11" fill="' + c + '" stroke="rgba(0,0,0,0.18)" stroke-width="1.5"/>'
    + '<circle cx="14" cy="16" r="7.5" fill="rgba(255,255,255,0.25)"/>'
    + '<text x="14" y="20.5" text-anchor="middle" font-size="10" font-weight="900" font-family="sans-serif" fill="rgba(0,0,0,0.6)">'
    + (rank + 1) + '</text>'
    + '<rect x="10" y="2" width="8" height="8" rx="2" fill="' + c + '" stroke="rgba(0,0,0,0.15)" stroke-width="1"/>'
    + '<rect x="6" y="5" width="16" height="3" rx="1.5" fill="' + c + '" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>'
    + '</svg>';
}

function showResult() {
  sound.play('fanfare');

  var maxScore = 0;
  for (var i = 0; i < playerCount; i++) {
    if (scores[i] > maxScore) maxScore = scores[i];
  }
  var winners = [];
  for (var j = 0; j < playerCount; j++) {
    if (scores[j] === maxScore) winners.push(j);
  }

  resultTitle.textContent = '게임 종료!';

  if (winners.length === 1) {
    var cfg = PLAYER_CONFIG[winners[0]];
    resultWinner.textContent = cfg.label + ' 최종 우승!';
    resultWinner.style.color = cfg.hex;
  } else {
    resultWinner.textContent = '공동 우승: ' + winners.map(function(w) {
      return PLAYER_CONFIG[w].label;
    }).join(', ');
    resultWinner.style.color = '#8D6E63';
  }

  // Sort by score descending
  var order = [];
  for (var k = 0; k < playerCount; k++) { order.push(k); }
  order.sort(function(a, b) { return scores[b] - scores[a]; });

  resultScoresWrap.innerHTML = '';
  order.forEach(function(p, rank) {
    var row = document.createElement('div');
    row.className = 'result-score-row' + (scores[p] === maxScore ? ' winner-row' : '');

    var rankEl = document.createElement('span');
    rankEl.className = 'result-score-rank';
    rankEl.innerHTML = rankMedalSvg(rank);

    var dot = document.createElement('span');
    dot.className = 'result-score-dot';
    dot.style.background = PLAYER_CONFIG[p].hex;

    var name = document.createElement('span');
    name.className = 'result-score-name';
    name.textContent = PLAYER_CONFIG[p].label;

    var pts = document.createElement('span');
    pts.className = 'result-score-pts';
    pts.textContent = scores[p] + '점';

    row.appendChild(rankEl);
    row.appendChild(dot);
    row.appendChild(name);
    row.appendChild(pts);
    resultScoresWrap.appendChild(row);
  });

  showScreen(resultScreen);
}
