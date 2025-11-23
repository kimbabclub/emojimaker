// 전역 변수
let generatedImages = [];
let currentSettings = {};


// DOM 요소
const fontSelect = document.getElementById('fontSelect');
const textColorModeSelect = document.getElementById('textColorMode');
const textColorInput = document.getElementById('textColor');
const gradientColor1Input = document.getElementById('gradientColor1');
const gradientColor2Input = document.getElementById('gradientColor2');
const strokeColorModeSelect = document.getElementById('strokeColorMode');
const strokeGradientColor1Input = document.getElementById('strokeGradientColor1');
const strokeGradientColor2Input = document.getElementById('strokeGradientColor2');
const strokeColorInput = document.getElementById('strokeColor');
const strokeWidthInput = document.getElementById('strokeWidth');
const strokeWidthValue = document.getElementById('strokeWidthValue');
const outerStrokeWidthInput = document.getElementById('outerStrokeWidth');
const outerStrokeColorInput = document.getElementById('outerStrokeColor');
const outerStrokeColorModeSelect = document.getElementById('outerStrokeColorMode');
const outerStrokeGradientColor1Input = document.getElementById('outerStrokeGradientColor1');
const outerStrokeGradientColor2Input = document.getElementById('outerStrokeGradientColor2');
const aspectRatioInputs = document.querySelectorAll('input[name="aspectRatio"]');
const batchInput = document.getElementById('batchInput');
const disableLineBreakCheckbox = document.getElementById('disableLineBreak');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const mealKitBtn = document.getElementById('mealKitBtn');
const progress = document.getElementById('progress');

// 설정 관리 DOM 요소
// 설정 관리 UI 제거됨
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const previewGrid = document.getElementById('previewGrid');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 실시간 미리보기 캔버스
const livePreview1 = document.getElementById('livePreview1');
const livePreview2 = document.getElementById('livePreview2');
const livePreview3 = document.getElementById('livePreview3');
const livePreview4 = document.getElementById('livePreview4');
const livePreview5 = document.getElementById('livePreview5');
const livePreview6 = document.getElementById('livePreview6');
const liveCtx1 = livePreview1 ? livePreview1.getContext('2d') : null;
const liveCtx2 = livePreview2 ? livePreview2.getContext('2d') : null;
const liveCtx3 = livePreview3 ? livePreview3.getContext('2d') : null;
const liveCtx4 = livePreview4 ? livePreview4.getContext('2d') : null;
const liveCtx5 = livePreview5 ? livePreview5.getContext('2d') : null;
const liveCtx6 = livePreview6 ? livePreview6.getContext('2d') : null;

// 미리보기 텍스트 입력
const livePreviewTextInput = document.getElementById('livePreviewText');
const applyLivePreviewBtn = document.getElementById('applyLivePreviewBtn');

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadFonts();
    } catch (_) {}
    setupEventListeners();
    syncTextModeAndDirection();
    syncStrokeModeUI();
    syncOuterStrokeModeUI();
    // 마지막 설정 불러오기 (폰트 로드 후)
    loadLastSettings();
    // 기본 미리보기 텍스트 설정
    if (livePreviewTextInput && !livePreviewTextInput.value) {
        livePreviewTextInput.value = '미리보기';
    }
    updateLivePreviews(); // 초기 미리보기
});

// 폰트 목록 로드
async function loadFonts() {
    let availableFonts = [];
    
    // Font Access API 사용 (Chrome 103+)
    try {
        if ('queryLocalFonts' in window) {
            try {
                // 권한 확인
                const status = await navigator.permissions.query({ name: 'local-fonts' });
                
                // 권한이 거부된 경우 직접 시도 (prompt 상태일 수 있음)
                if (status.state === 'denied') {
                    // 거부된 경우에도 한 번 시도
                    try {
                        const localFonts = await window.queryLocalFonts();
                        const localFontNames = [...new Set(localFonts.map(font => font.family))];
                        availableFonts = localFontNames.sort();
                    } catch (e) {
                        // 권한 거부로 실패
                    }
                } else {
                    // granted 또는 prompt 상태
                    const localFonts = await window.queryLocalFonts();
                    const localFontNames = [...new Set(localFonts.map(font => font.family))];
                    availableFonts = localFontNames.sort();
                }
            } catch (permErr) {
                // permissions.query가 실패하면 직접 시도
                try {
                    const localFonts = await window.queryLocalFonts();
                    const localFontNames = [...new Set(localFonts.map(font => font.family))];
                    availableFonts = localFontNames.sort();
                } catch (e) {
                    // Font Access API 사용 불가
                }
            }
        }
    } catch (err) {
        // Font Access API 사용 불가
    }
    
    // 드롭다운에 폰트 추가
    if (fontSelect) {
        fontSelect.innerHTML = '';
        if (availableFonts.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '폰트를 불러올 수 없습니다 (Font Access API 권한 필요)';
            fontSelect.appendChild(option);
        } else {
            availableFonts.forEach(font => {
                const option = document.createElement('option');
                option.value = font;
                option.textContent = font;
                option.style.fontFamily = font;
                fontSelect.appendChild(option);
            });
            // 기본값 설정 (첫 번째 폰트)
            fontSelect.value = availableFonts[0];
        }
    }
    // 시스템 폰트 로딩 대기 후 미리보기 갱신 시도
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch(_) {}
    try { updateLivePreviews(); } catch(_) {}
}

// 텍스트 너비 측정 (폰트 감지용)
function getTextWidth(text, fontSize, fontFamily) {
    const testCanvas = document.createElement('canvas');
    const testCtx = testCanvas.getContext('2d');
    testCtx.font = `${fontSize} ${fontFamily}`;
    return testCtx.measureText(text).width;
}


// 텍스트 줄바꿈 로직
// 색상 보간 함수
function interpolateColor(color1, color2, factor) {
    // hex 색상을 RGB로 변환
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    
    return `rgb(${r}, ${g}, ${b})`;
}

// 그라디언트 생성 함수
function createGradient(ctx, width, height, direction, color1, color2) {
    let gradient;
    
    switch (direction) {
        case 'horizontal':
            gradient = ctx.createLinearGradient(0, 0, width, 0);
            break;
        case 'diagonal':
            gradient = ctx.createLinearGradient(0, 0, width, height);
            break;
        case 'vertical':
        default:
            gradient = ctx.createLinearGradient(0, 0, 0, height);
            break;
    }
    
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    
    return gradient;
}

function createPerLineGradient(ctx, line, canvasWidth, strokeExt, fontSize, direction, color1, color2) {
    let gradient;
    switch (direction) {
        case 'horizontal':
            gradient = ctx.createLinearGradient(-canvasWidth / 2, 0, canvasWidth / 2, 0);
            gradient.addColorStop(0, color1);
            gradient.addColorStop(1, color2);
            break;
        case 'diagonal': {
            const metrics = ctx.measureText(line);
            const ascent = metrics.actualBoundingBoxAscent || fontSize * 1;
            const descent = metrics.actualBoundingBoxDescent || fontSize * 0;
            const half = (ascent + descent) / 2 + strokeExt + 2;
            gradient = ctx.createLinearGradient(-half, -half, half, half);
            gradient.addColorStop(0, color1);
            gradient.addColorStop(1, color2);
            break;
        }
        case 'vertical': {
            const metrics = ctx.measureText(line);
            const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
            const descent = metrics.actualBoundingBoxDescent || fontSize * 0.2;
            // textBaseline = 'alphabetic' 기준: 텍스트는 baseline(0) 위로 -ascent, 아래로 +descent
            // 텍스트 범위를 확실히 포함하도록 그라디언트 생성
            const top = -ascent - strokeExt;
            const bottom = descent + strokeExt;
            // 그라디언트를 텍스트 범위를 포함하도록 생성
            gradient = ctx.createLinearGradient(0, top, 0, bottom);
            const halfColor = interpolateColor(color1, color2, 0.5);
            // 시작 색과 끝 색을 더 위아래로 배치하여 비중 감소, 끝 색 비중 증가
            gradient.addColorStop(0, color1);
            gradient.addColorStop(0.5, halfColor); // 중간 색 위치를 0.5로 조절
            gradient.addColorStop(1, color2);
            break;
        }
        default: {
            const metrics = ctx.measureText(line);
            const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
            const descent = metrics.actualBoundingBoxDescent || fontSize * 0.2;
            // textBaseline = 'alphabetic' 기준: 텍스트는 baseline(0) 위로 -ascent, 아래로 +descent
            // 텍스트 범위를 확실히 포함하도록 그라디언트 생성
            const top = -ascent - strokeExt - 1;
            const bottom = descent + strokeExt + 1;
            // 그라디언트를 텍스트 범위를 포함하도록 생성
            gradient = ctx.createLinearGradient(0, top, 0, bottom);
            gradient.addColorStop(0, color1);
            gradient.addColorStop(1, color2);
            break;
        }
    }
    return gradient;
}

function splitText(text, disableLineBreak = false) {
    // 줄바꿈 비활성화 옵션이 체크되어 있으면 모든 텍스트를 한 줄로 반환
    if (disableLineBreak) {
        return [text];
    }
    
    // 1) 파이프(|)로 앞뒤가 둘러싸인 경우: 줄바꿈 무시하고 한 줄로 표시
    // 정규식: ^\|.*\|$ - 시작과 끝이 |로 둘러싸임
    // 추가 조건: .+ 로 실제 내용이 있어야 함 (빈 문자열 방지)
    if (/^\|.+\|$/.test(text)) {
        // 양쪽 끝의 파이프 제거하고 한 줄로 반환
        return [text.substring(1, text.length - 1)];
    }
    
    // 2) 띄어쓰기가 있는 경우: 띄어쓰기 2번(이상)으로 줄바꿈
    if (text.includes('  ')) {
        const parts = text.split(/\s{2,}/).map(part => part.trim()).filter(part => part.length > 0);
        if (parts.length > 1) {
            return parts;
        }
    }
    if (text.includes(' ')) {
        return [text.replace(/\s+/g, ' ').trim()];
    }
    
    // 3) 띄어쓰기가 없는 경우: 기존 로직대로 글자 수 기준으로 줄바꿈 (최대 2줄)
    const length = text.length;
    
    if (length <= 3) {
        // 3글자 이하는 줄바꿈 없음
        return [text];
    } else if (length === 4) {
        // 4글자는 2/2
        return [text.substring(0, 2), text.substring(2)];
    } else if (length === 5) {
        // 5글자는 2/3
        return [text.substring(0, 2), text.substring(2)];
    } else if (length === 6) {
        // 6글자는 3/3
        return [text.substring(0, 3), text.substring(3)];
    } else if (length === 7) {
        // 7글자는 3/4
        return [text.substring(0, 3), text.substring(3)];
    } else {
        // 8글자 이상은 상단보다 하단에 많게 (최대 2줄)
        const firstLineLength = Math.floor(length / 2);
        return [text.substring(0, firstLineLength), text.substring(firstLineLength)];
    }
}

// 마지막 설정 자동 저장
function autoSaveLastSettings() {
    try {
        const settings = {
            font: fontSelect.value || '',
            textColorMode: textColorModeSelect.value || 'solid',
            textColor: textColorInput.value || '#000000',
            gradientColor1: gradientColor1Input.value || '#ff0000',
            gradientColor2: gradientColor2Input.value || '#0000ff',
            strokeColorMode: strokeColorModeSelect.value || 'solid',
            strokeGradientColor1: strokeGradientColor1Input.value || '#000000',
            strokeGradientColor2: strokeGradientColor2Input.value || '#ffffff',
            strokeColor: strokeColorInput.value || '#000000',
            strokeWidth: strokeWidthInput.value || '4',
            outerStrokeColorMode: outerStrokeColorModeSelect.value || 'solid',
            outerStrokeGradientColor1: outerStrokeGradientColor1Input.value || '#ffffff',
            outerStrokeGradientColor2: outerStrokeGradientColor2Input.value || '#000000',
            outerStrokeColor: outerStrokeColorInput.value || '#ffffff',
            outerStrokeWidth: outerStrokeWidthInput.value || '0',
            aspectRatio: getAspectRatioValue(),
            disableLineBreak: disableLineBreakCheckbox ? disableLineBreakCheckbox.checked : false,
            savedAt: new Date().toISOString()
        };
        localStorage.setItem('lastEmojiSettings', JSON.stringify(settings));
    } catch (err) {
        // 설정 자동 저장 중 오류
    }
}

// 마지막 설정 불러오기
function loadLastSettings() {
    try {
        const saved = localStorage.getItem('lastEmojiSettings');
        if (!saved) return;
        
        const settings = JSON.parse(saved);
        
        // 설정 적용
        if (settings.font && fontSelect.querySelector(`option[value="${settings.font}"]`)) {
            fontSelect.value = settings.font;
        }
        if (settings.textColorMode) textColorModeSelect.value = settings.textColorMode;
        if (settings.textColor) textColorInput.value = settings.textColor;
        if (settings.gradientColor1) gradientColor1Input.value = settings.gradientColor1;
        if (settings.gradientColor2) gradientColor2Input.value = settings.gradientColor2;
        if (settings.strokeColor) strokeColorInput.value = settings.strokeColor || '#000000';
        if (settings.strokeWidth !== undefined) {
            strokeWidthInput.value = settings.strokeWidth || '4';
            refreshStepper('strokeWidth');
        }
        if (settings.outerStrokeColor) outerStrokeColorInput.value = settings.outerStrokeColor || '#ffffff';
        if (settings.outerStrokeWidth !== undefined) {
            outerStrokeWidthInput.value = settings.outerStrokeWidth || '0';
            refreshStepper('outerStrokeWidth');
        }
        if (settings.aspectRatio) setAspectRatioValue(settings.aspectRatio);
        if (disableLineBreakCheckbox && settings.disableLineBreak !== undefined) {
            disableLineBreakCheckbox.checked = settings.disableLineBreak || false;
        }
        
        // UI 업데이트
        syncTextModeAndDirection();
        syncStrokeModeUI();
        syncOuterStrokeModeUI();
    } catch (err) {
        // 설정 불러오기 중 오류
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    setupStepperControls();
    
    // 글자 모드/방향 단일 셀렉트 동기화
    textColorModeSelect.addEventListener('change', () => { 
        syncTextModeAndDirection(); 
        updateGradientUI();
        updateLivePreviews(); 
        autoSaveLastSettings();
    });
    
    // 모든 설정 변경 시 실시간 미리보기 업데이트 및 자동 저장
    fontSelect.addEventListener('change', () => { 
        updateLivePreviews(); 
        autoSaveLastSettings();
    });
    textColorInput.addEventListener('input', () => { 
        updateLivePreviews(); 
        autoSaveLastSettings();
    });
    gradientColor1Input.addEventListener('input', () => { 
        updateLivePreviews(); 
        autoSaveLastSettings();
    });
    gradientColor2Input.addEventListener('input', () => { 
        updateLivePreviews(); 
        autoSaveLastSettings();
    });
    strokeColorModeSelect.addEventListener('change', () => {
        syncStrokeModeUI();
        updateLivePreviews();
        autoSaveLastSettings();
    });
    strokeGradientColor1Input.addEventListener('input', () => {
        updateLivePreviews();
        autoSaveLastSettings();
    });
    strokeGradientColor2Input.addEventListener('input', () => {
        updateLivePreviews();
        autoSaveLastSettings();
    });
    strokeWidthInput.addEventListener('input', () => { 
        updateLivePreviews(); 
        autoSaveLastSettings();
    });
    outerStrokeWidthInput.addEventListener('input', () => { 
        updateLivePreviews(); 
        autoSaveLastSettings();
    });
    outerStrokeColorInput.addEventListener('input', () => { 
        updateLivePreviews(); 
        autoSaveLastSettings();
    });
    outerStrokeColorModeSelect.addEventListener('change', () => {
        syncOuterStrokeModeUI();
        updateLivePreviews();
        autoSaveLastSettings();
    });
    outerStrokeGradientColor1Input.addEventListener('input', () => {
        updateLivePreviews();
        autoSaveLastSettings();
    });
    outerStrokeGradientColor2Input.addEventListener('input', () => {
        updateLivePreviews(); 
        autoSaveLastSettings();
    });
    aspectRatioInputs.forEach(input => input.addEventListener('change', () => {
        updateLivePreviews();
        autoSaveLastSettings();
    }));
    if (disableLineBreakCheckbox) {
        disableLineBreakCheckbox.addEventListener('change', () => { 
            updateLivePreviews(); 
            autoSaveLastSettings();
        });
    }
    
    // 미리보기 텍스트 적용
    if (applyLivePreviewBtn) applyLivePreviewBtn.addEventListener('click', updateLivePreviews);
    if (livePreviewTextInput) livePreviewTextInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') updateLivePreviews(); });
    // 새로고침 버튼 제거됨
    
    
    if (generateBtn) generateBtn.addEventListener('click', generateEmojis);
    if (downloadBtn) downloadBtn.addEventListener('click', downloadZip);
    if (mealKitBtn) mealKitBtn.addEventListener('click', generateMealKit);
    
    // 설정 관리 버튼 이벤트
    // 설정 관리 관련 리스너 제거됨
    
    // 설정 목록 업데이트 (요소가 존재하는 경우에만)
    try {
        updateSavedSettingsList();
    } catch (err) {
        // savedSettingsList 요소가 없으면 무시
    }
}

// 글자 색 모드 셀렉트로 방향까지 동기화하고, 관련 UI 표시를 제어
function syncTextModeAndDirection() {
    const value = textColorModeSelect.value;
    const solidEl = document.getElementById('solidColorGroup');
    const g1El = document.getElementById('gradientGroup');
    const g2El = document.getElementById('gradientGroup2');
    const isSolid = value === 'solid';
    if (solidEl) solidEl.style.display = isSolid ? 'block' : 'none';
    if (g1El) g1El.style.display = isSolid ? 'none' : 'block';
    if (g2El) g2El.style.display = isSolid ? 'none' : 'block';
}

// 실시간 미리보기 업데이트
function updateLivePreviews() {
    const settings = {
        font: (fontSelect && fontSelect.value) ? fontSelect.value : 'sans-serif',
        textColorMode: textColorModeSelect.value || 'solid',
        textColor: textColorInput.value,
        gradientColor1: gradientColor1Input.value,
        gradientColor2: gradientColor2Input.value,
        strokeColorMode: strokeColorModeSelect.value,
        strokeGradientColor1: strokeGradientColor1Input.value,
        strokeGradientColor2: strokeGradientColor2Input.value,
        strokeColor: strokeColorInput.value,
        strokeWidth: parseInt(strokeWidthInput.value),
        outerStrokeColorMode: outerStrokeColorModeSelect.value,
        outerStrokeGradientColor1: outerStrokeGradientColor1Input.value,
        outerStrokeGradientColor2: outerStrokeGradientColor2Input.value,
        outerStrokeColor: outerStrokeColorInput.value,
        outerStrokeWidth: parseInt(outerStrokeWidthInput.value),
        aspectRatio: getAspectRatioValue(),
        disableLineBreak: disableLineBreakCheckbox ? disableLineBreakCheckbox.checked : false
    };
    
    const demoText = (livePreviewTextInput && livePreviewTextInput.value.trim()) || '미리보기';
    // 투명/흰/검정 3가지 케이스만 전면 노출
    updateSinglePreview(livePreview1, liveCtx1, demoText, settings, 'transparent');
    updateSinglePreview(livePreview3, liveCtx3, demoText, settings, 'white');
    updateSinglePreview(livePreview5, liveCtx5, demoText, settings, 'black');
}

// 단일 미리보기 캔버스 업데이트 (벡터 렌더링 방식)
function updateSinglePreview(canvas, ctx, text, settings, bgType = 'transparent') {
    // 기본 크기 (미리보기는 120px 기준)
    const baseSize = 120;
    let width = baseSize;
    let height = baseSize;
    
    // 텍스트 줄바꿈
    const lines = splitText(text, settings.disableLineBreak);
    
    // 자동 조절 모드 확인
    const isAutoFit = settings.aspectRatio === '1:1-fit';
    const isUnlimited = settings.aspectRatio === 'unlimited';
    
    // 제한없음 모드는 모든 글자 수에 대해, 자동 조절 모드는 5글자 이상일 때 캔버스 너비 계산
    if (isUnlimited || (isAutoFit && text.length >= 5)) {
        // 임시 캔버스로 텍스트 너비 측정
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        const lineHeight = 1.1;
        const padding = 0.03;
        const maxAllowedHeight = height * (1 - padding * 2);
        let fontSize = maxAllowedHeight / (lines.length * lineHeight + (lines.length - 1) * 0.1);
        
        tempCtx.font = `bold ${fontSize}px "${settings.font}"`;
        
        // 가장 긴 라인의 너비 측정
        let maxTextWidth = 0;
        lines.forEach(line => {
            const metrics = tempCtx.measureText(line);
            maxTextWidth = Math.max(maxTextWidth, metrics.width);
        });
        
        // 필요한 캔버스 너비 계산 (패딩 포함)
        const requiredWidth = maxTextWidth / (1 - padding * 2);
        
        if (isUnlimited) {
            // 제한없음 모드: 가로 길이 제한 없음
            width = Math.max(requiredWidth, baseSize);
        } else {
            // 자동 조절 모드: 1:1 ~ 2:1 비율 사이로 제한
            width = Math.min(Math.max(requiredWidth, baseSize), baseSize * 2);
        }
        width = Math.round(width);
    }
    
    // 캔버스 크기 설정 (표시 가로 118px 고정, 세로는 비율에 맞춰 조절)
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = '118px';
    const displayH = Math.max(1, Math.round(118 * (height / width)));
    canvas.style.height = displayH + 'px';
    
    // 텍스트를 임시 캔버스에 렌더링
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // 임시 캔버스에 텍스트 렌더링
    drawLivePreview(tempCtx, text, width, height, settings, 'transparent');
    
    // 렌더링 후 마지막 단계에서 중앙 정렬
    const centeredCanvas = preciseCenterAlign(tempCanvas, width, height);
    
    // 배경 그리기
    ctx.clearRect(0, 0, width, height);
    if (bgType === 'white') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
    } else if (bgType === 'black') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
    }
    
    // 중앙 정렬된 텍스트를 미리보기 캔버스에 그리기
    ctx.drawImage(centeredCanvas, 0, 0);
}

// 실시간 미리보기 그리기
function drawLivePreview(ctx, text, width, height, settings, bgType = 'transparent') {
    // 캔버스 초기화
    ctx.clearRect(0, 0, width, height);
    
    // 배경 그리기
    if (bgType === 'white') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
    } else if (bgType === 'black') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
    }
    // 투명 배경은 clearRect만 사용
    
    // 텍스트 줄바꿈
    const lines = splitText(text, settings.disableLineBreak);
    
    // 자동 조절 모드 확인
    const isAutoFit = settings.aspectRatio === '1:1-fit';
    const isUnlimited = settings.aspectRatio === 'unlimited';
    const isShortText = (text.length === 1 || text.length === 3 || text.length === 4) && settings.aspectRatio === '1:1';
    const isSingleChar = text.length === 1 && settings.aspectRatio === '1:1';
    
    // 폰트 크기 자동 조절 (외곽/내부 테두리까지 포함해 캔버스를 넘지 않도록 축소)
    const lineHeight = 1.1;
    const padding = 0; // 픽셀 기반 여백 사용으로 비활성화
    const fittedFontSize = fitFontSizeToBounds(ctx, lines, width, height, settings, { lineHeight, padding, isAutoFit, isUnlimited, isShortText, isSingleChar });
    let fontSize = fittedFontSize;
    
    // 최종 폰트 설정
    ctx.font = `bold ${fontSize}px "${settings.font}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    
    // 텍스트 총 높이 계산 (실제 렌더링 높이 기준)
    const lineSpacing = fontSize * 1.1;
    const totalHeight = lineSpacing * lines.length;
    
    // 스트로크 두께를 고려한 수직 중앙 정렬과 여백 확보
    const baseDim = Math.min(width, height);
    const strokeWidthScaled = (settings.strokeWidth * baseDim) / 128;
    const outerStrokeWidthScaled = (settings.outerStrokeWidth * baseDim) / 128;
    const strokeExt = Math.max(strokeWidthScaled, outerStrokeWidthScaled) / 2;
    const marginPx = 1;
    const allowedWidth = Math.max(0, width - 2 * (strokeExt + marginPx));
    const allowedHeight = Math.max(0, height - 2 * (strokeExt + marginPx));
    let startY = (height - allowedHeight) / 2 + marginPx + strokeExt + lineSpacing / 2;
    // 실제 글리프 메트릭 기반 베이스라인 배열(지원 시 우선 사용)
    const preciseLayout = computeBaselinePositions(ctx, lines, fontSize, height, marginPx, strokeExt);
    const usePreciseLayout = preciseLayout && Array.isArray(preciseLayout.baselines);
    
    // 각 라인의 스케일 계산 및 그리기
    // maxAllowedWidth, strokeWidthScaled 등은 위에서 계산함
    
    // 1단계: 모든 외곽 테두리 그리기
    if (settings.outerStrokeWidth > 0) {
        lines.forEach((line, index) => {
            const y = usePreciseLayout ? preciseLayout.baselines[index] : (startY + (index * lineSpacing));
            
            // 현재 라인의 너비 측정
            const metrics = ctx.measureText(line);
            const textWidth = metrics.width;
            
            // 가로 스케일 계산 (실제 생성과 동일한 로직)
            // 생성 로직과 동일: 자동조절/제한없음/짧은텍스트는 비율 유지, 그 외는 가득 채우기
            let scaleX;
            if (isSingleChar) {
                scaleX = 1.0; // 한 글자는 절대 늘리지 않음
            } else if (isAutoFit || isUnlimited || isShortText) {
                scaleX = Math.min(allowedWidth / textWidth, 1.0);
            } else {
                scaleX = allowedWidth / textWidth;
            }
            
            ctx.save();
            ctx.translate(width / 2, y);
            // 5자 이상 비정방 모드: 세로만 압축해서 높이 한도에 맞춤
            const scaleY = (isAutoFit || isUnlimited || isShortText) ? 1 : Math.min(1, allowedHeight / totalHeight);
            ctx.scale(scaleX, scaleY);
            
            const outerMode = settings.outerStrokeColorMode || 'solid';
            const outerDirection = getDirectionFromMode(outerMode, 'vertical');
            const outerUsesGradient = outerMode !== 'solid';
            ctx.strokeStyle = outerUsesGradient
                ? createPerLineGradient(ctx, line, width, strokeExt, fontSize, outerDirection, settings.outerStrokeGradientColor1, settings.outerStrokeGradientColor2)
                : settings.outerStrokeColor;
            {
                const effScale = effectiveStrokeScale(scaleX, scaleY);
                ctx.lineWidth = outerStrokeWidthScaled / effScale;
            }
            ctx.lineJoin = 'round';
            ctx.miterLimit = 2;
            ctx.strokeText(line, 0, 0);
            
            ctx.restore();
        });
    }
    
    // 2단계: 모든 내부 테두리 그리기
    if (settings.strokeWidth > 0) {
        lines.forEach((line, index) => {
            const y = usePreciseLayout ? preciseLayout.baselines[index] : (startY + (index * lineSpacing));
            
            // 현재 라인의 너비 측정
            const metrics = ctx.measureText(line);
            const textWidth = metrics.width;
            
            // 가로 스케일 계산 (실제 생성과 동일한 로직)
            // 생성 로직과 동일: 자동조절/제한없음/짧은텍스트는 비율 유지, 그 외는 가득 채우기
            let scaleX;
            if (isSingleChar) {
                scaleX = 1.0; // 한 글자는 절대 늘리지 않음
            } else if (isAutoFit || isUnlimited || isShortText) {
                scaleX = Math.min(allowedWidth / textWidth, 1.0);
            } else {
                scaleX = allowedWidth / textWidth;
            }
            
            ctx.save();
            ctx.translate(width / 2, y);
            const scaleY2 = (isAutoFit || isUnlimited || isShortText) ? 1 : Math.min(1, allowedHeight / totalHeight);
            ctx.scale(scaleX, scaleY2);
            
            const strokeMode = settings.strokeColorMode || 'solid';
            const strokeDirection = getDirectionFromMode(strokeMode, 'vertical');
            const strokeUsesGradient = strokeMode !== 'solid';
            ctx.strokeStyle = strokeUsesGradient
                ? createPerLineGradient(ctx, line, width, strokeExt, fontSize, strokeDirection, settings.strokeGradientColor1, settings.strokeGradientColor2)
                : settings.strokeColor;
            {
                const effScale = effectiveStrokeScale(scaleX, scaleY2);
                ctx.lineWidth = strokeWidthScaled / effScale;
            }
            ctx.lineJoin = 'round';
            ctx.miterLimit = 2;
            ctx.strokeText(line, 0, 0);
            
            ctx.restore();
        });
    }
    
    // 3단계: 모든 텍스트 그리기
    lines.forEach((line, index) => {
        const y = usePreciseLayout ? preciseLayout.baselines[index] : (startY + (index * lineSpacing));
        
        // 현재 라인의 너비 측정
        const metrics = ctx.measureText(line);
        const textWidth = metrics.width;
        
        // 가로 스케일 계산 (생성 로직과 동일하게 적용)
        let scaleX;
        if (isSingleChar) {
            scaleX = 1.0; // 한 글자는 절대 늘리지 않음
        } else if (isAutoFit || isUnlimited || isShortText) {
            scaleX = Math.min(allowedWidth / textWidth, 1.0);
        } else {
            scaleX = allowedWidth / textWidth;
        }
        
        ctx.save();
        ctx.translate(width / 2, y);
        const scaleY3 = (isAutoFit || isUnlimited || isShortText) ? 1 : Math.min(1, allowedHeight / totalHeight);
        ctx.scale(scaleX, scaleY3);
        
        if (settings.textColorMode !== 'solid') {
            const textDirection = getDirectionFromMode(settings.textColorMode, 'vertical');
            ctx.fillStyle = createPerLineGradient(ctx, line, width, strokeExt, fontSize, textDirection, settings.gradientColor1, settings.gradientColor2);
        } else {
            ctx.fillStyle = settings.textColor;
        }
        
        ctx.fillText(line, 0, 0);
        
        ctx.restore();
    });
}

// 외곽/내부 테두리까지 포함하여 텍스트가 캔버스를 넘지 않도록 폰트 크기를 맞춤
function fitFontSizeToBounds(ctx, lines, width, height, settings, opts) {
    const { lineHeight, padding, isAutoFit, isUnlimited, isShortText, isSingleChar } = opts;
    // 픽셀 기반 최소 여백(1px)과 스트로크 확장(반폭) 적용
    const baseDim = Math.min(width, height);
    const strokeWidthScaled = (settings.strokeWidth * baseDim) / 128;
    const outerStrokeWidthScaled = (settings.outerStrokeWidth * baseDim) / 128;
    const strokeExt = Math.max(strokeWidthScaled, outerStrokeWidthScaled) / 2; // 반폭
    const marginPx = 1;
    const allowedHeight = Math.max(0, height - 2 * (strokeExt + marginPx));
    const allowedWidth = Math.max(0, width - 2 * (strokeExt + marginPx));
    let fontSize = allowedHeight / (lines.length * lineHeight + (lines.length - 1) * 0.1);
    const maxIterations = 12;
    for (let i = 0; i < maxIterations; i++) {
        ctx.font = `bold ${fontSize}px "${settings.font}"`;
        const lineSpacing = fontSize * 1.1;
        const totalHeight = lineSpacing * lines.length;
        // 수직 한계: 텍스트 총 높이가 허용 높이를 넘는지
        let verticalOverflow = totalHeight > allowedHeight + 0.01;
        // 수평 한계: 각 라인이 스케일/패딩/스트로크 포함하여 맞는지 확인
        let horizontalOverflow = false;
        for (const line of lines) {
            const metrics = ctx.measureText(line);
            const textWidth = metrics.width;
            let scaleX;
            if (isSingleChar) {
                scaleX = 1.0; // 한 글자는 절대 늘리지 않음
            } else if (isAutoFit || isUnlimited || isShortText) {
                scaleX = Math.min(allowedWidth / Math.max(textWidth, 1), 1.0);
            } else {
                scaleX = allowedWidth / Math.max(textWidth, 1);
            }
            const scaledTextWidth = textWidth * scaleX;
            if (scaledTextWidth > allowedWidth + 0.01) {
                horizontalOverflow = true;
                break;
            }
        }
        if (!verticalOverflow && !horizontalOverflow) {
            break; // 충분히 맞춤
        }
        fontSize *= 0.95; // 점진적 축소
    }
    return fontSize;
}

// 라인별 실제 글리프 박스를 이용해 베이스라인 Y 좌표 목록을 계산 (지원되지 않으면 null)
function computeBaselinePositions(ctx, lines, fontSize, height, marginPx, strokeExt) {
    const test = ctx.measureText(lines[0] || '');
    if (test.actualBoundingBoxAscent === undefined || test.actualBoundingBoxDescent === undefined) {
        return null;
    }
    const lineGap = fontSize * 0.1;
    const lineHeights = lines.map(line => {
        const m = ctx.measureText(line);
        const a = m.actualBoundingBoxAscent || 0;
        const d = m.actualBoundingBoxDescent || 0;
        return a + d;
    });
    const totalLinesHeight = lineHeights.reduce((s, h) => s + h, 0);
    const totalGaps = lineGap * Math.max(lines.length - 1, 0);
    const totalVisualHeight = totalLinesHeight + totalGaps + 2 * strokeExt;
    const topPaddingPx = marginPx + strokeExt;
    const firstAscent = (ctx.measureText(lines[0] || '').actualBoundingBoxAscent || 0);
    let currentBaseline = (height - (totalVisualHeight + 2 * marginPx)) / 2 + topPaddingPx + firstAscent;
    const baselines = [];
    for (let i = 0; i < lines.length; i++) {
        if (i === 0) {
            baselines.push(currentBaseline);
        } else {
            currentBaseline += lineHeights[i - 1] + lineGap;
            baselines.push(currentBaseline);
        }
    }
    return { baselines, lineGap, lineHeights };
}

// 이모지 생성
async function generateEmojis() {
    const batchText = batchInput.value.trim();
    if (!batchText) {
        alert('텍스트를 입력해주세요!');
        return;
    }
    
    // 쉼표로 구분하여 텍스트 배열 생성
    const texts = batchText.split(',').map(t => t.trim()).filter(t => t);
    
    if (texts.length === 0) {
        alert('유효한 텍스트를 입력해주세요!');
        return;
    }
    
    // 설정 저장
    currentSettings = {
        font: fontSelect.value,
        textColorMode: textColorModeSelect.value || 'solid',
        textColor: textColorInput.value,
        gradientColor1: gradientColor1Input.value,
        gradientColor2: gradientColor2Input.value,
        strokeColorMode: strokeColorModeSelect.value,
        strokeGradientColor1: strokeGradientColor1Input.value,
        strokeGradientColor2: strokeGradientColor2Input.value,
        strokeColor: strokeColorInput.value,
        strokeWidth: parseInt(strokeWidthInput.value),
        outerStrokeColorMode: outerStrokeColorModeSelect.value,
        outerStrokeGradientColor1: outerStrokeGradientColor1Input.value,
        outerStrokeGradientColor2: outerStrokeGradientColor2Input.value,
        outerStrokeColor: outerStrokeColorInput.value,
        outerStrokeWidth: parseInt(outerStrokeWidthInput.value),
        aspectRatio: getAspectRatioValue(),
        disableLineBreak: disableLineBreakCheckbox ? disableLineBreakCheckbox.checked : false
    };
    
    // 초기화
    generatedImages = [];
    previewGrid.innerHTML = '';
    progress.style.display = 'block';
    downloadBtn.style.display = 'none';
    generateBtn.disabled = true;
    
    // 각 텍스트에 대해 이모지 생성
    for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        progressFill.style.width = `${((i + 1) / texts.length) * 100}%`;
        progressText.textContent = `생성 중... ${i + 1}/${texts.length}`;
        
        const imageData = await generateSingleEmoji(text, currentSettings);
        generatedImages.push({
            text: text,
            blob: imageData.blob,
            dataUrl: imageData.dataUrl
        });
        
        // 미리보기에 추가
        addPreview(text, imageData.dataUrl);
        
        // UI 업데이트를 위한 약간의 지연
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // 완료
    progress.style.display = 'none';
    downloadBtn.style.display = 'block';
    generateBtn.disabled = false;
    progressFill.style.width = '0%';
}

// 단일 이모지 생성
function generateSingleEmoji(text, settings) {
    return new Promise((resolve) => {
        // 기본 크기
        const baseSize = 256;
        let width = baseSize;
        let height = baseSize;
        
        // 텍스트 줄바꿈
        const lines = splitText(text, settings.disableLineBreak);
        
        // 자동 조절 모드 확인
        const isAutoFit = settings.aspectRatio === '1:1-fit';
        const isUnlimited = settings.aspectRatio === 'unlimited';
        const isShortText = (text.length === 1 || text.length === 3 || text.length === 4) && settings.aspectRatio === '1:1';
        const isSingleChar = text.length === 1 && settings.aspectRatio === '1:1';
        
        // 제한없음 모드는 모든 글자 수에 대해, 자동 조절 모드는 5글자 이상일 때 캔버스 너비 계산
        if (isUnlimited || (isAutoFit && text.length >= 5)) {
            // 임시 캔버스로 텍스트 너비 측정
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            const lineHeight = 1.1;
            const padding = 0.03;
            const maxAllowedHeight = height * (1 - padding * 2);
            let fontSize = maxAllowedHeight / (lines.length * lineHeight + (lines.length - 1) * 0.1);
            
            tempCtx.font = `bold ${fontSize}px "${settings.font}"`;
            
            // 가장 긴 라인의 너비 측정
            let maxTextWidth = 0;
            lines.forEach(line => {
                const metrics = tempCtx.measureText(line);
                maxTextWidth = Math.max(maxTextWidth, metrics.width);
            });
            
            // 필요한 캔버스 너비 계산 (패딩 포함)
            const requiredWidth = maxTextWidth / (1 - padding * 2);
            
            if (isUnlimited) {
                // 제한없음 모드: 가로 길이 제한 없음
                width = Math.max(requiredWidth, baseSize);
            } else {
                // 자동 조절 모드: 1:1 ~ 2:1 비율 사이로 제한
                width = Math.min(Math.max(requiredWidth, baseSize), baseSize * 2);
            }
            width = Math.round(width);
        }
        
        // 캔버스 크기 설정
        canvas.width = width;
        canvas.height = height;
        
        // 배경을 투명하게 (clearRect 사용)
        ctx.clearRect(0, 0, width, height);
        
        // 폰트 크기 자동 조절 (외곽/내부 테두리까지 포함해 캔버스를 넘지 않도록 축소)
        const lineHeight = 1.1;
        const padding = 0; // 픽셀 기반 여백 사용
        const fittedFontSize = fitFontSizeToBounds(ctx, lines, width, height, settings, {
            lineHeight,
            padding,
            isAutoFit,
            isUnlimited,
            isShortText,
            isSingleChar
        });
        let fontSize = fittedFontSize;
        
        // 최종 폰트 설정
        ctx.font = `bold ${fontSize}px "${settings.font}"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        
        // 텍스트 총 높이 계산 (실제 렌더링 높이 기준)
        const lineSpacing = fontSize * 1.1;
        const totalHeight = lineSpacing * lines.length;
        
        // 스트로크 두께를 고려한 수직 중앙 정렬과 여백 확보
        const baseDim = Math.min(width, height);
        const strokeWidthScaled = (settings.strokeWidth * baseDim) / 128;
        const outerStrokeWidthScaled = (settings.outerStrokeWidth * baseDim) / 128;
        const strokeExt = Math.max(strokeWidthScaled, outerStrokeWidthScaled) / 2;
        const marginPx = 1;
        const allowedWidth = Math.max(0, width - 2 * (strokeExt + marginPx));
        const allowedHeight = Math.max(0, height - 2 * (strokeExt + marginPx));
        let startY = (height - allowedHeight) / 2 + marginPx + strokeExt + lineSpacing / 2;
        // 실제 글리프 메트릭 기반 베이스라인 배열(지원 시 우선 사용)
        const preciseLayout = computeBaselinePositions(ctx, lines, fontSize, height, marginPx, strokeExt);
        const usePreciseLayout = preciseLayout && Array.isArray(preciseLayout.baselines);
        
        // 각 라인의 스케일 계산 및 그리기 (위에서 계산한 값 사용)
        
        // 1단계: 모든 외곽 테두리 그리기
        if (settings.outerStrokeWidth > 0) {
            lines.forEach((line, index) => {
                const y = usePreciseLayout ? preciseLayout.baselines[index] : (startY + (index * lineSpacing));
                
                // 현재 라인의 너비 측정
                const metrics = ctx.measureText(line);
                const textWidth = metrics.width;
                
                // 가로 스케일 계산 (실제 생성과 동일한 로직)
                // 생성 로직과 동일: 자동조절/제한없음/짧은텍스트는 비율 유지, 그 외는 가득 채우기
                let scaleX;
                if (isSingleChar) {
                    scaleX = 1.0; // 한 글자는 절대 늘리지 않음
                } else if (isAutoFit || isUnlimited || isShortText) {
                    scaleX = Math.min(allowedWidth / textWidth, 1.0);
                } else {
                    scaleX = allowedWidth / textWidth;
                }
                
                ctx.save();
                ctx.translate(width / 2, y);
                // 5자 이상 비정방 모드: 세로만 압축해서 높이 한도에 맞춤
                const scaleY = (isAutoFit || isUnlimited || isShortText) ? 1 : Math.min(1, allowedHeight / totalHeight);
                ctx.scale(scaleX, scaleY);
                
                const outerMode = settings.outerStrokeColorMode || 'solid';
                const outerDirection = getDirectionFromMode(outerMode, 'vertical');
                const outerUsesGradient = outerMode !== 'solid';
                ctx.strokeStyle = outerUsesGradient
                    ? createPerLineGradient(ctx, line, width, strokeExt, fontSize, outerDirection, settings.outerStrokeGradientColor1, settings.outerStrokeGradientColor2)
                    : settings.outerStrokeColor;
                {
                    const effScale = effectiveStrokeScale(scaleX, scaleY);
                    ctx.lineWidth = outerStrokeWidthScaled / effScale;
                }
                ctx.lineJoin = 'round';
                ctx.miterLimit = 2;
                ctx.strokeText(line, 0, 0);
                
                ctx.restore();
            });
        }
        
        // 2단계: 모든 내부 테두리 그리기
        if (settings.strokeWidth > 0) {
            lines.forEach((line, index) => {
                const y = usePreciseLayout ? preciseLayout.baselines[index] : (startY + (index * lineSpacing));
                
                // 현재 라인의 너비 측정
                const metrics = ctx.measureText(line);
                const textWidth = metrics.width;
                
                // 가로 스케일 계산 (실제 생성과 동일한 로직)
                // 생성 로직과 동일: 자동조절/제한없음/짧은텍스트는 비율 유지, 그 외는 가득 채우기
                let scaleX;
                if (isSingleChar) {
                    scaleX = 1.0; // 한 글자는 절대 늘리지 않음
                } else if (isAutoFit || isUnlimited || isShortText) {
                    scaleX = Math.min(allowedWidth / textWidth, 1.0);
                } else {
                    scaleX = allowedWidth / textWidth;
                }
                
                ctx.save();
                ctx.translate(width / 2, y);
                const scaleY2 = (isAutoFit || isUnlimited || isShortText) ? 1 : Math.min(1, allowedHeight / totalHeight);
                ctx.scale(scaleX, scaleY2);
                
                const strokeMode = settings.strokeColorMode || 'solid';
                const strokeDirection = getDirectionFromMode(strokeMode, 'vertical');
                const strokeUsesGradient = strokeMode !== 'solid';
                ctx.strokeStyle = strokeUsesGradient
                    ? createPerLineGradient(ctx, line, width, strokeExt, fontSize, strokeDirection, settings.strokeGradientColor1, settings.strokeGradientColor2)
                    : settings.strokeColor;
                {
                    const effScale = effectiveStrokeScale(scaleX, scaleY2);
                    ctx.lineWidth = strokeWidthScaled / effScale;
                }
                ctx.lineJoin = 'round';
                ctx.miterLimit = 2;
                ctx.strokeText(line, 0, 0);
                
                ctx.restore();
            });
        }
        
        // 3단계: 모든 텍스트 그리기
        lines.forEach((line, index) => {
            const y = usePreciseLayout ? preciseLayout.baselines[index] : (startY + (index * lineSpacing));
            
            // 현재 라인의 너비 측정
            const metrics = ctx.measureText(line);
            const textWidth = metrics.width;
            
            // 가로 스케일 계산 (생성 로직과 동일하게 적용)
            let scaleX;
            if (isSingleChar) {
                scaleX = 1.0; // 한 글자는 절대 늘리지 않음
            } else if (isAutoFit || isUnlimited || isShortText) {
                scaleX = Math.min(allowedWidth / textWidth, 1.0);
            } else {
                scaleX = allowedWidth / textWidth;
            }
            
            ctx.save();
            ctx.translate(width / 2, y);
            const scaleY3 = (isAutoFit || isUnlimited || isShortText) ? 1 : Math.min(1, allowedHeight / totalHeight);
            ctx.scale(scaleX, scaleY3);
            
            if (settings.textColorMode !== 'solid') {
                const textDirection = getDirectionFromMode(settings.textColorMode, 'vertical');
                ctx.fillStyle = createPerLineGradient(ctx, line, width, strokeExt, fontSize, textDirection, settings.gradientColor1, settings.gradientColor2);
            } else {
                ctx.fillStyle = settings.textColor;
            }
            
            ctx.fillText(line, 0, 0);
            
            ctx.restore();
        });
        
        // 렌더링 후 마지막 단계에서 중앙 정렬
        const centeredCanvas = preciseCenterAlign(canvas, width, height);
        
        // emoji로 변환
        centeredCanvas.toBlob((blob) => {
            if (!blob) {
                resolve({
                    blob: null,
                    dataUrl: centeredCanvas.toDataURL('image/png')
                });
                return;
            }
            
            // dataUrl 생성
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve({
                    blob: blob,
                    dataUrl: reader.result
                });
            };
            reader.readAsDataURL(blob);
        }, 'image/png');
    });
}

// 미리보기 추가
function addPreview(text, dataUrl) {
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item';
    
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = text;
    
    const label = document.createElement('p');
    label.textContent = text;
    
    previewItem.appendChild(img);
    previewItem.appendChild(label);
    previewGrid.appendChild(previewItem);
}

// 간단한 한글 로마자화 (개략적 RR 변환)
function romanizeKorean(text) {
    const base = 0xAC00;
    const choseong = ['g','gg','n','d','dd','r','m','b','bb','s','ss','','j','jj','ch','k','t','p','h'];
    const jungseong = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
    const jongseong = ['','g','gg','gs','n','nj','nh','d','r','rg','rm','rb','rs','rt','rp','rh','m','b','bs','s','ss','ng','j','ch','k','t','p','h'];
    let out = '';
    for (const ch of text) {
        const code = ch.charCodeAt(0);
        if (code >= 0xAC00 && code <= 0xD7A3) {
            const diff = code - base;
            const ci = Math.floor(diff / 588);
            const vi = Math.floor((diff % 588) / 28);
            const fi = diff % 28;
            out += choseong[ci] + jungseong[vi] + jongseong[fi];
        } else if (/^[a-zA-Z0-9]$/.test(ch)) {
            out += ch.toLowerCase();
        } else if (ch === ' ' || ch === '_' || ch === '-') {
            out += '_';
        }
    }
    // 연속 밑줄 정리 및 앞뒤 정리
    return out.replace(/_+/g,'_').replace(/^_+|_+$/g,'');
}

// 비등방 스케일에서 시각적 획 두께 보정용 스케일 팩터
function effectiveStrokeScale(scaleX, scaleY) {
    const sx = Math.abs(scaleX) || 0;
    const sy = Math.abs(scaleY) || 0;
    // 스케일의 산술평균을 사용하면 max 편향이 줄어 보다 균일한 두께를 제공
    return Math.max(0.0001, (sx + sy) / 2);
}

// 슬러그화 (한글 포함 텍스트 → 영문 코드)
function toCodeFromText(text) {
    const r = romanizeKorean(text);
    if (r && r.length > 0) return r;
    return sanitizeFilename(text.toLowerCase()).replace(/\W+/g,'_');
}

// ZIP 파일 다운로드
async function downloadZip() {
    if (generatedImages.length === 0) {
        alert('생성된 이모지가 없습니다!');
        return;
    }
    
    downloadBtn.disabled = true;
    downloadBtn.textContent = '📦 압축 중...';
    
    // JSZip 인스턴스 생성
    const zip = new JSZip();
    
    // meta.json 데이터 생성(@meta.json 구조 준용)
    const metaData = {
        metaVersion: 2,
        host: 'json.buttersc.one',
        exportedAt: new Date().toISOString(),
        emojis: []
    };
    
    // 각 이미지를 ZIP에 추가
    generatedImages.forEach((item) => {
        const code = toCodeFromText(item.text);
        const name = `kr_${code}`;
        const fileName = `${name}.png`;
        // 이미지 추가(루트에 저장)
        zip.file(fileName, item.blob);
        // 메타데이터에 추가
        metaData.emojis.push({
            downloaded: true,
            fileName: fileName,
            emoji: {
                name: name,
                category: '텍스트',
                aliases: [item.text]
            }
        });
    });
    
    // meta.json 추가
    zip.file('meta.json', JSON.stringify(metaData, null, 2));
    
    // README는 첨부하지 않음
    
    // ZIP 파일 생성 및 다운로드
    try {
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `custom-emojis-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        downloadBtn.textContent = '✅ 다운로드 완료!';
        setTimeout(() => {
            downloadBtn.textContent = '📦 ZIP 다운로드';
            downloadBtn.disabled = false;
        }, 2000);
    } catch (err) {
        alert('ZIP 파일 생성 중 오류가 발생했습니다: ' + err.message);
        downloadBtn.textContent = '📦 ZIP 다운로드';
        downloadBtn.disabled = false;
    }
}

// 설정 관리 기능 제거됨
function saveSettings() {
    const settingsName = settingsNameInput.value.trim();
    if (!settingsName) {
        alert('설정 이름을 입력해주세요.');
        return;
    }
    
    const settings = {
        font: fontSelect.value,
        textColorMode: textColorModeSelect.value,
        textColor: textColorInput.value,
        gradientColor1: gradientColor1Input.value,
        gradientColor2: gradientColor2Input.value,
        strokeColorMode: strokeColorModeSelect.value || 'solid',
        strokeGradientColor1: strokeGradientColor1Input.value || '#000000',
        strokeGradientColor2: strokeGradientColor2Input.value || '#ffffff',
        strokeColor: strokeColorInput.value || '#000000',
        strokeWidth: strokeWidthInput.value || '4',
        outerStrokeColorMode: outerStrokeColorModeSelect.value || 'solid',
        outerStrokeGradientColor1: outerStrokeGradientColor1Input.value || '#ffffff',
        outerStrokeGradientColor2: outerStrokeGradientColor2Input.value || '#000000',
        outerStrokeColor: outerStrokeColorInput.value || '#ffffff',
        outerStrokeWidth: outerStrokeWidthInput.value || '0',
        aspectRatio: getAspectRatioValue(),
        batchText: batchInput.value,
        disableLineBreak: disableLineBreakCheckbox ? disableLineBreakCheckbox.checked : false,
        savedAt: new Date().toISOString()
    };
    
    try {
        const savedSettings = JSON.parse(localStorage.getItem('emojiSettings') || '{}');
        savedSettings[settingsName] = settings;
        localStorage.setItem('emojiSettings', JSON.stringify(savedSettings));
        
        alert(`"${settingsName}" 설정이 저장되었습니다.`);
        settingsNameInput.value = '';
        updateSavedSettingsList();
    } catch (err) {
        alert('설정 저장 중 오류가 발생했습니다: ' + err.message);
    }
}

function loadSettings() {
    const selectedSetting = savedSettingsList.value;
    if (!selectedSetting) {
        alert('로드할 설정을 선택해주세요.');
        return;
    }
    
    try {
        const savedSettings = JSON.parse(localStorage.getItem('emojiSettings') || '{}');
        const settings = savedSettings[selectedSetting];
        
        if (!settings) {
            alert('선택한 설정을 찾을 수 없습니다.');
            return;
        }
        
        // 설정 적용
        fontSelect.value = settings.font || '';
        textColorModeSelect.value = settings.textColorMode || 'solid';
        textColorInput.value = settings.textColor || '#000000';
        gradientColor1Input.value = settings.gradientColor1 || '#ff0000';
        gradientColor2Input.value = settings.gradientColor2 || '#0000ff';
        strokeColorModeSelect.value = settings.strokeColorMode || 'solid';
        strokeGradientColor1Input.value = settings.strokeGradientColor1 || '#000000';
        strokeGradientColor2Input.value = settings.strokeGradientColor2 || '#ffffff';
        strokeColorInput.value = settings.strokeColor || '#000000';
        strokeWidthInput.value = settings.strokeWidth || '4';
        outerStrokeWidthInput.value = settings.outerStrokeWidth || '0';
        outerStrokeColorInput.value = settings.outerStrokeColor || '#ffffff';
        outerStrokeColorModeSelect.value = settings.outerStrokeColorMode || 'solid';
        outerStrokeGradientColor1Input.value = settings.outerStrokeGradientColor1 || '#ffffff';
        outerStrokeGradientColor2Input.value = settings.outerStrokeGradientColor2 || '#000000';
        if (settings.aspectRatio) setAspectRatioValue(settings.aspectRatio);
        batchInput.value = settings.batchText || '';
        if (disableLineBreakCheckbox) disableLineBreakCheckbox.checked = settings.disableLineBreak || false;
        
        // 그라디언트 모드에 따른 UI 업데이트
        updateGradientUI();
        
        // 미리보기 업데이트
        updateLivePreviews();
        
        alert(`"${selectedSetting}" 설정이 로드되었습니다.`);
    } catch (err) {
        alert('설정 로드 중 오류가 발생했습니다: ' + err.message);
    }
}

function deleteSettings() {
    const selectedSetting = savedSettingsList.value;
    if (!selectedSetting) {
        alert('삭제할 설정을 선택해주세요.');
        return;
    }
    
    if (!confirm(`"${selectedSetting}" 설정을 삭제하시겠습니까?`)) {
        return;
    }
    
    try {
        const savedSettings = JSON.parse(localStorage.getItem('emojiSettings') || '{}');
        delete savedSettings[selectedSetting];
        localStorage.setItem('emojiSettings', JSON.stringify(savedSettings));
        
        alert(`"${selectedSetting}" 설정이 삭제되었습니다.`);
        updateSavedSettingsList();
    } catch (err) {
        alert('설정 삭제 중 오류가 발생했습니다: ' + err.message);
    }
}

function updateSavedSettingsList() {
    const savedSettingsList = document.getElementById('savedSettingsList');
    if (!savedSettingsList) {
        return; // 요소가 없으면 함수 종료
    }
    
    try {
        const savedSettings = JSON.parse(localStorage.getItem('emojiSettings') || '{}');
        const settingsNames = Object.keys(savedSettings);
        
        savedSettingsList.innerHTML = '';
        
        if (settingsNames.length === 0) {
            savedSettingsList.innerHTML = '<option value="">저장된 설정이 없습니다</option>';
        } else {
            settingsNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                savedSettingsList.appendChild(option);
            });
        }
    } catch (err) {
        if (savedSettingsList) {
            savedSettingsList.innerHTML = '<option value="">오류가 발생했습니다</option>';
        }
    }
}

function updateGradientUI() {
    const value = textColorModeSelect.value || 'solid';
    const isGradient = value.startsWith('gradient');
    gradientColor1Input.parentElement.style.display = isGradient ? 'block' : 'none';
    gradientColor2Input.parentElement.style.display = isGradient ? 'block' : 'none';
}

// 설정을 파일로 내보내기
function exportSettingsToFile() {
    try {
        const settings = {
            font: fontSelect.value,
            textColorMode: textColorModeSelect.value,
            textColor: textColorInput.value,
            gradientColor1: gradientColor1Input.value,
            gradientColor2: gradientColor2Input.value,
            strokeColorMode: strokeColorModeSelect.value || 'solid',
            strokeGradientColor1: strokeGradientColor1Input.value || '#000000',
            strokeGradientColor2: strokeGradientColor2Input.value || '#ffffff',
            strokeColor: strokeColorInput.value || '#000000',
            strokeWidth: strokeWidthInput.value || '4',
            outerStrokeColorMode: outerStrokeColorModeSelect.value || 'solid',
            outerStrokeGradientColor1: outerStrokeGradientColor1Input.value || '#ffffff',
            outerStrokeGradientColor2: outerStrokeGradientColor2Input.value || '#000000',
            outerStrokeColor: outerStrokeColorInput.value || '#ffffff',
            outerStrokeWidth: outerStrokeWidthInput.value || '0',
            aspectRatio: getAspectRatioValue(),
            batchText: batchInput.value,
            disableLineBreak: disableLineBreakCheckbox ? disableLineBreakCheckbox.checked : false,
            exportedAt: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `emoji-settings-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('설정이 파일로 내보내기되었습니다.');
    } catch (err) {
        alert('설정 내보내기 중 오류가 발생했습니다: ' + err.message);
    }
}

// 파일에서 설정 가져오기
function importSettingsFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const settings = JSON.parse(e.target.result);
            
            // 설정 적용
            if (settings.font) fontSelect.value = settings.font;
            if (settings.textColorMode) textColorModeSelect.value = settings.textColorMode;
            if (settings.textColor) textColorInput.value = settings.textColor;
            if (settings.gradientColor1) gradientColor1Input.value = settings.gradientColor1;
            if (settings.gradientColor2) gradientColor2Input.value = settings.gradientColor2;
            if (settings.strokeColor) strokeColorInput.value = settings.strokeColor;
            if (settings.strokeWidth !== undefined) {
                strokeWidthInput.value = settings.strokeWidth;
                refreshStepper('strokeWidth');
            }
            if (settings.outerStrokeColor) outerStrokeColorInput.value = settings.outerStrokeColor;
            if (settings.outerStrokeWidth !== undefined) {
                outerStrokeWidthInput.value = settings.outerStrokeWidth;
                refreshStepper('outerStrokeWidth');
            }
            if (settings.aspectRatio) setAspectRatioValue(settings.aspectRatio);
            if (settings.batchText) batchInput.value = settings.batchText;
            if (disableLineBreakCheckbox && settings.disableLineBreak !== undefined) {
                disableLineBreakCheckbox.checked = settings.disableLineBreak || false;
            }
            
            // UI 업데이트
            updateGradientUI();
            updateLivePreviews();
            
            alert('설정이 파일에서 가져오기되었습니다.');
        } catch (err) {
            alert('설정 파일을 읽는 중 오류가 발생했습니다: ' + err.message);
        }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // 파일 입력 초기화 (같은 파일 재선택 가능)
}

// 파일명 정리 (특수문자 제거)
function sanitizeFilename(text) {
    return text
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // 파일명에 사용할 수 없는 문자 제거
        .replace(/\s+/g, '_') // 공백을 언더스코어로
        .substring(0, 50); // 최대 50자
}


// 벡터 오브젝트 방식으로 텍스트를 렌더링하고 중앙 정렬
function renderTextAsVector(text, settings, width, height) {
    // 임시 캔버스로 텍스트 영역 측정
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    // 텍스트 줄바꿈
    const lines = splitText(text, settings.disableLineBreak);
    
    // 자동 조절 모드 확인
    const isAutoFit = settings.aspectRatio === '1:1-fit';
    const isShortText = (text.length === 3 || text.length === 4) && settings.aspectRatio === '1:1';
    
    // 폰트 크기 계산
    const lineHeight = 1.1;
    const padding = 0.03;
    const maxAllowedHeight = height * (1 - padding * 2);
    let fontSize = maxAllowedHeight / (lines.length * lineHeight + (lines.length - 1) * 0.1);
    
    // 임시 캔버스에 폰트 설정
    tempCtx.font = `bold ${fontSize}px "${settings.font}"`;
    
    // 전체 텍스트 영역 측정
    let maxTextWidth = 0;
    let totalTextHeight = 0;
    const lineMetrics = [];
    
    lines.forEach(line => {
        const metrics = tempCtx.measureText(line);
        const lineWidth = metrics.width;
        maxTextWidth = Math.max(maxTextWidth, lineWidth);
        lineMetrics.push({
            text: line,
            width: lineWidth
        });
    });
    
    totalTextHeight = fontSize * lineHeight * lines.length;
    
    // 스케일 계산
    const maxAllowedWidth = width * (1 - padding * 2);
    let finalScaleX = 1;
    
    if (isAutoFit || isUnlimited || isShortText) {
        finalScaleX = Math.min(maxAllowedWidth / maxTextWidth, 1.0);
    } else {
        finalScaleX = maxAllowedWidth / maxTextWidth;
    }
    
    // 실제 렌더링 크기 계산
    const renderWidth = maxTextWidth * finalScaleX;
    const renderHeight = totalTextHeight;
    
    // 스트로크 두께 계산 (절대 픽셀 값)
    const strokeWidthScaled = (settings.strokeWidth * width) / 128;
    const outerStrokeWidthScaled = (settings.outerStrokeWidth * width) / 128;
    
    // 스트로크를 위한 여백 계산
    const maxStrokeWidth = Math.max(strokeWidthScaled, outerStrokeWidthScaled);
    const strokePadding = Math.max(10, maxStrokeWidth * 1.5); // 스트로크 두께의 1.5배 여백
    
    // 벡터 캔버스 생성 (스트로크 여백 포함)
    const vectorCanvas = document.createElement('canvas');
    const vectorCtx = vectorCanvas.getContext('2d');
    
    // 여백을 포함한 크기로 설정
    vectorCanvas.width = width + strokePadding * 2;
    vectorCanvas.height = height + strokePadding * 2;
    
    // 벡터 캔버스에 텍스트 렌더링
    vectorCtx.font = `bold ${fontSize}px "${settings.font}"`;
    vectorCtx.textAlign = 'center';
    vectorCtx.textBaseline = 'middle';
    
    // 각 라인 렌더링 (여백을 고려한 위치)
    const lineSpacing = fontSize * 1.1;
    const startY = vectorCanvas.height / 2; // 여백이 포함된 캔버스의 중앙
    
    lines.forEach((line, index) => {
        const y = startY - (lines.length - 1) * lineSpacing / 2 + index * lineSpacing;
        
        vectorCtx.save();
        vectorCtx.translate(vectorCanvas.width / 2, y);
        
        const outerMode = settings.outerStrokeColorMode || 'solid';
        const outerDirection = getDirectionFromMode(outerMode, 'vertical');
        const strokeMode = settings.strokeColorMode || 'solid';
        const strokeDirection = getDirectionFromMode(strokeMode, 'vertical');
        const fillUsesGradient = settings.textColorMode !== 'solid';
        
        // 캔버스 크기에 맞게 텍스트 변형 (기존 로직 복원)
        if (!isAutoFit && !isUnlimited && !isShortText) {
            // 일반 모드: 가로 스케일링으로 캔버스 가득 채우기
            vectorCtx.scale(finalScaleX, 1);
            
            // 1. 외곽 테두리 (스케일링 보정)
            if (settings.outerStrokeWidth > 0) {
                const gradient = outerMode !== 'solid'
                    ? createPerLineGradient(vectorCtx, line, vectorCanvas.width, strokeExt, fontSize, outerDirection, settings.outerStrokeGradientColor1, settings.outerStrokeGradientColor2)
                    : null;
                vectorCtx.strokeStyle = gradient || settings.outerStrokeColor;
                vectorCtx.lineWidth = outerStrokeWidthScaled / finalScaleX;
                vectorCtx.lineJoin = 'round';
                vectorCtx.miterLimit = 2;
                vectorCtx.strokeText(line, 0, 0);
            }
            
            // 2. 내부 테두리 (스케일링 보정)
            if (settings.strokeWidth > 0) {
                const gradient = strokeMode !== 'solid'
                    ? createPerLineGradient(vectorCtx, line, vectorCanvas.width, strokeExt, fontSize, strokeDirection, settings.strokeGradientColor1, settings.strokeGradientColor2)
                    : null;
                vectorCtx.strokeStyle = gradient || settings.strokeColor;
                vectorCtx.lineWidth = strokeWidthScaled / finalScaleX;
                vectorCtx.lineJoin = 'round';
                vectorCtx.miterLimit = 2;
                vectorCtx.strokeText(line, 0, 0);
            }
        } else {
            // 자동 조절 모드, 제한없음 모드 또는 짧은 텍스트: 폰트 크기만 조절
            const scaledFontSize = fontSize * finalScaleX;
            vectorCtx.font = `bold ${scaledFontSize}px "${settings.font}"`;
            
            // 1. 외곽 테두리
            if (settings.outerStrokeWidth > 0) {
                const gradient = outerMode !== 'solid'
                    ? createPerLineGradient(vectorCtx, line, vectorCanvas.width, strokeExt, scaledFontSize, outerDirection, settings.outerStrokeGradientColor1, settings.outerStrokeGradientColor2)
                    : null;
                vectorCtx.strokeStyle = gradient || settings.outerStrokeColor;
                vectorCtx.lineWidth = outerStrokeWidthScaled;
                vectorCtx.lineJoin = 'round';
                vectorCtx.miterLimit = 2;
                vectorCtx.strokeText(line, 0, 0);
            }
            
            // 2. 내부 테두리
            if (settings.strokeWidth > 0) {
                const gradient = strokeMode !== 'solid'
                    ? createPerLineGradient(vectorCtx, line, vectorCanvas.width, strokeExt, scaledFontSize, strokeDirection, settings.strokeGradientColor1, settings.strokeGradientColor2)
                    : null;
                vectorCtx.strokeStyle = gradient || settings.strokeColor;
                vectorCtx.lineWidth = strokeWidthScaled;
                vectorCtx.lineJoin = 'round';
                vectorCtx.miterLimit = 2;
                vectorCtx.strokeText(line, 0, 0);
            }
        }
        
        // 3. 텍스트 채우기
        const fillGradient = fillUsesGradient
            ? createPerLineGradient(vectorCtx, line, vectorCanvas.width, strokeExt, fontSize, getDirectionFromMode(settings.textColorMode, 'vertical'), settings.gradientColor1, settings.gradientColor2)
            : null;
        vectorCtx.fillStyle = fillGradient || settings.textColor;
        vectorCtx.fillText(line, 0, 0);
        
        vectorCtx.restore();
    });
    
    // 여백이 포함된 벡터 캔버스를 원본 크기로 크롭하고 중앙 정렬
    return preciseCenterAlign(vectorCanvas, width, height);
}

// 실제 콘텐츠를 감지하여 목표 크기로 크롭하고 정확히 중앙 정렬
function preciseCenterAlign(sourceCanvas, targetWidth, targetHeight) {
    const ctx = sourceCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const data = imageData.data;
    
    let minX = sourceCanvas.width;
    let minY = sourceCanvas.height;
    let maxX = 0;
    let maxY = 0;
    
    // 투명하지 않은 픽셀 찾기
    for (let y = 0; y < sourceCanvas.height; y++) {
        for (let x = 0; x < sourceCanvas.width; x++) {
            const alpha = data[(y * sourceCanvas.width + x) * 4 + 3];
            if (alpha > 0) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }
    
    // 콘텐츠가 없으면 목표 크기의 빈 캔버스 반환
    if (minX >= maxX || minY >= maxY) {
        const emptyCanvas = document.createElement('canvas');
        emptyCanvas.width = targetWidth;
        emptyCanvas.height = targetHeight;
        return emptyCanvas;
    }
    
    // 콘텐츠 영역 크기 계산
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    // 목표 크기의 새 캔버스 생성
    const newCanvas = document.createElement('canvas');
    newCanvas.width = targetWidth;
    newCanvas.height = targetHeight;
    const newCtx = newCanvas.getContext('2d');
    
    // 목표 크기에 맞는 중앙 정렬 계산
    const centerX = (targetWidth - contentWidth) / 2;
    const centerY = (targetHeight - contentHeight) / 2;
    
    // 콘텐츠를 목표 크기 캔버스 중앙에 그리기
    newCtx.drawImage(
        sourceCanvas,
        minX, minY, contentWidth, contentHeight,
        centerX, centerY, contentWidth, contentHeight
    );
    
    return newCanvas;
}

// 텍스트 콘텐츠를 감지하여 중앙 정렬된 캔버스 생성 (기존 함수 유지)
function cropToContent(sourceCanvas) {
    const ctx = sourceCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const data = imageData.data;
    
    let minX = sourceCanvas.width;
    let minY = sourceCanvas.height;
    let maxX = 0;
    let maxY = 0;
    
    // 투명하지 않은 픽셀 찾기
    for (let y = 0; y < sourceCanvas.height; y++) {
        for (let x = 0; x < sourceCanvas.width; x++) {
            const alpha = data[(y * sourceCanvas.width + x) * 4 + 3];
            if (alpha > 0) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }
    
    // 콘텐츠가 없으면 원본 반환
    if (minX >= maxX || minY >= maxY) {
        return sourceCanvas;
    }
    
    // 여백 추가 (원본 크기의 5%)
    const padding = Math.max(8, Math.round(sourceCanvas.width * 0.05));
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(sourceCanvas.width, maxX + padding);
    maxY = Math.min(sourceCanvas.height, maxY + padding);
    
    // 콘텐츠 영역 크기 계산
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    // 원본과 동일한 크기의 새 캔버스 생성
    const newCanvas = document.createElement('canvas');
    newCanvas.width = sourceCanvas.width;
    newCanvas.height = sourceCanvas.height;
    const newCtx = newCanvas.getContext('2d');
    
    // 중앙 정렬 계산
    const centerX = (sourceCanvas.width - contentWidth) / 2;
    const centerY = (sourceCanvas.height - contentHeight) / 2;
    
    // 콘텐츠를 새 캔버스 중앙에 그리기
    newCtx.drawImage(
        sourceCanvas,
        minX, minY, contentWidth, contentHeight,
        centerX, centerY, contentWidth, contentHeight
    );
    
    return newCanvas;
}

// 밀키트 생성 함수
async function generateMealKit() {
    try {
        if (!mealKitBtn) {
            throw new Error('밀키트 버튼을 찾을 수 없습니다.');
        }
        
        mealKitBtn.disabled = true;
        mealKitBtn.textContent = '🍱 로딩 중...';
        
        // JSZip 확인
        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip 라이브러리가 로드되지 않았습니다.');
        }
        
        // meta.json 파일 로드
        const response = await fetch('meta.json');
        if (!response.ok) {
            throw new Error('meta.json 파일을 찾을 수 없습니다.');
        }
        
        const metaData = await response.json();
        let emojis = metaData.emojis;
        
        if (!emojis || emojis.length === 0) {
            throw new Error('meta.json에 이모지 정보가 없습니다.');
        }
        
        
        // 현재 설정 저장
        currentSettings = {
            font: fontSelect.value,
            textColorMode: textColorModeSelect.value || 'solid',
            textColor: textColorInput.value,
            gradientColor1: gradientColor1Input.value,
            gradientColor2: gradientColor2Input.value,
            strokeColorMode: strokeColorModeSelect.value,
            strokeGradientColor1: strokeGradientColor1Input.value,
            strokeGradientColor2: strokeGradientColor2Input.value,
            strokeColor: strokeColorInput.value,
            strokeWidth: parseInt(strokeWidthInput.value),
            outerStrokeColorMode: outerStrokeColorModeSelect.value,
            outerStrokeGradientColor1: outerStrokeGradientColor1Input.value,
            outerStrokeGradientColor2: outerStrokeGradientColor2Input.value,
            outerStrokeColor: outerStrokeColorInput.value,
            outerStrokeWidth: parseInt(outerStrokeWidthInput.value),
            aspectRatio: getAspectRatioValue(),
            disableLineBreak: disableLineBreakCheckbox ? disableLineBreakCheckbox.checked : false
        };
        
        // 초기화
        generatedImages = [];
        previewGrid.innerHTML = '';
        progress.style.display = 'block';
        downloadBtn.style.display = 'none';
        
        // JSZip 인스턴스 생성
        const zip = new JSZip();
        
        // 각 이모지 생성
        for (let i = 0; i < emojis.length; i++) {
            const emojiInfo = emojis[i];
            
            // 안전하게 데이터 확인
            if (!emojiInfo || !emojiInfo.emoji || !emojiInfo.emoji.aliases || emojiInfo.emoji.aliases.length === 0) {
                continue; // 이 항목 건너뛰기
            }
            
            const text = emojiInfo.emoji.aliases[0]; // 첫 번째 alias를 텍스트로 사용
            const fileName = emojiInfo.fileName || `emoji_${i}.png`; // fileName이 없으면 기본값 사용
            
            progressFill.style.width = `${((i + 1) / emojis.length) * 100}%`;
            progressText.textContent = `밀키트 생성 중... ${i + 1}/${emojis.length}`;
            
            // 이모지 이미지 생성
            const imageData = await generateSingleEmoji(text, currentSettings);
            
            // ZIP에 추가
            zip.file(fileName, imageData.blob);
            
            // 미리보기에 추가
            addPreview(text, imageData.dataUrl);
            
            // UI 업데이트를 위한 약간의 지연
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // meta.json을 ZIP에 추가
        zip.file('meta.json', JSON.stringify(metaData, null, 2));
        
        // ZIP 파일 생성 및 다운로드
        progressText.textContent = 'ZIP 압축 중...';
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mealkit-emojis-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // 완료
        progress.style.display = 'none';
        progressFill.style.width = '0%';
        
        mealKitBtn.textContent = '✅ 밀키트 생성 완료!';
        setTimeout(() => {
            mealKitBtn.textContent = '🍱 밀키트 생성';
            mealKitBtn.disabled = false;
        }, 2000);
        
    } catch (err) {
        alert('밀키트 생성 중 오류가 발생했습니다: ' + err.message);
        if (progress) {
            progress.style.display = 'none';
        }
        if (progressFill) {
            progressFill.style.width = '0%';
        }
        if (mealKitBtn) {
            mealKitBtn.textContent = '🍱 밀키트 생성';
            mealKitBtn.disabled = false;
        }
    }
}

function refreshStepper(targetId, triggerPreview = false) {
    const input = document.getElementById(targetId);
    const stepper = document.querySelector(`.stepper[data-target="${targetId}"]`);
    if (!input || !stepper) return;
    const min = parseInt(input.getAttribute('min') || '0', 10);
    const max = parseInt(input.getAttribute('max') || '20', 10);
    let value = parseInt(input.value, 10);
    if (Number.isNaN(value)) value = min;
    value = Math.min(Math.max(value, min), max);
    input.value = value;
    const valueDisplay = stepper.querySelector('.stepper-value');
    if (valueDisplay) valueDisplay.textContent = value;
    const decrementBtn = stepper.querySelector('[data-action="decrement"]');
    const incrementBtn = stepper.querySelector('[data-action="increment"]');
    if (decrementBtn) decrementBtn.disabled = value <= min;
    if (incrementBtn) incrementBtn.disabled = value >= max;
    if (triggerPreview) {
        updateLivePreviews();
        autoSaveLastSettings();
    }
}

function setupStepperControls() {
    const steppers = document.querySelectorAll('.stepper[data-target]');
    steppers.forEach(stepper => {
        const targetId = stepper.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;
        const step = parseInt(input.getAttribute('step') || '1', 10);
        const decrementBtn = stepper.querySelector('[data-action="decrement"]');
        const incrementBtn = stepper.querySelector('[data-action="increment"]');
        if (decrementBtn) {
            decrementBtn.addEventListener('click', () => {
                const current = parseInt(input.value, 10) || 0;
                input.value = current - step;
                refreshStepper(targetId, true);
            });
        }
        if (incrementBtn) {
            incrementBtn.addEventListener('click', () => {
                const current = parseInt(input.value, 10) || 0;
                input.value = current + step;
                refreshStepper(targetId, true);
            });
        }
        refreshStepper(targetId, false);
    });
}

function getDirectionFromMode(mode, fallback = 'vertical') {
    if (!mode) return fallback;
    if (mode === 'solid') return fallback;
    if (mode.startsWith('gradient-')) {
        const dir = mode.split('-')[1];
        if (dir === 'horizontal' || dir === 'vertical' || dir === 'diagonal') {
            return dir;
        }
    }
    return fallback;
}

function syncStrokeModeUI() {
    const value = strokeColorModeSelect.value;
    const solidEl = document.getElementById('strokeSolidColorGroup');
    const gradientEl = document.getElementById('strokeGradientGroup');
    const isSolid = value === 'solid';
    if (solidEl) solidEl.style.display = isSolid ? 'block' : 'none';
    if (gradientEl) gradientEl.style.display = isSolid ? 'none' : 'flex';
}

function syncOuterStrokeModeUI() {
    const value = outerStrokeColorModeSelect.value;
    const solidEl = document.getElementById('outerStrokeSolidColorGroup');
    const gradientEl = document.getElementById('outerStrokeGradientGroup');
    const isSolid = value === 'solid';
    if (solidEl) solidEl.style.display = isSolid ? 'block' : 'none';
    if (gradientEl) gradientEl.style.display = isSolid ? 'none' : 'flex';
}

function getAspectRatioValue() {
    const aspectRatio = document.querySelector('input[name="aspectRatio"]:checked').value;
    return aspectRatio;
}

function setAspectRatioValue(value) {
    document.querySelector(`input[name="aspectRatio"][value="${value}"]`).checked = true;
}
