/* Observed compatibility profiles. Apply only to explicitly scoped CVA components.
   These values do not recolor existing product pages or import source assets. */
(function () {
  'use strict';

  window.CVA_TOKENS = {
    version: 'cva-preserved-product-system.v1',
    profiles: {
      ttaem: {
        label: 'ttaem · 치즈 직조기',
        tokens: {
          background: '#141D2B', surface: '#202D3C', text: '#F5ECDA',
          muted: '#C0C8D1', accent: '#F4BE70', border: '#435363',
          focus: '#F4BE70', radius: '10px',
          font: 'Pretendard, "Segoe UI", sans-serif',
          quoteFont: 'Georgia, "Times New Roman", serif',
          bodySize: '16px', lineHeight: '1.7',
          accentText: '#182635', raised: '#303A45',
          light: {
            background: '#FAF5EB', surface: '#FFFFFF', text: '#182635',
            muted: '#475B69', accent: '#815217', border: '#CED2CD',
            focus: '#815217', accentText: '#FFFFFF'
          }
        },
        preserve: [
          '승인 다람쥐·황동 장치·종이·네이비 재료와 기존 그림',
          '현재 다섯 항목 GNB와 제품별 이름·동사·탐색 심벌',
          'Pretendard UI와 Georgia 계열 영문 인사의 역할',
          '제품별 탐색색을 실제 작업 화면의 강제 theme로 사용하지 않음'
        ],
        source: 'https://ttaem.com/brand/brandbook · https://ttaem.com/brand/products · docs/design/cva-brand-v1/brand-v4.css:3–6',
        evidence: 'live DOM/computed style and approved source',
        adoption: 'preview-only'
      },
      elio: {
        label: 'Elio Story · 이야기 읽기',
        tokens: {
          background: '#F4F6F7', surface: '#FFFFFF', text: '#23272D',
          muted: '#6E747C', accent: '#52BDD8', border: '#D5DFE5',
          focus: '#167AAB', radius: '20px',
          font: 'Pretendard, "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif',
          bodySize: '16px', lineHeight: 'normal',
          sceneBodySize: '14px', sceneLineHeight: '1.7',
          heroSubtitleSize: '15px', heroSubtitleLineHeight: '1.75',
          axis: '#7F8389', ring: '#767B82', maxWidth: '1120px',
          titleMaxSize: '56px', sceneImageSize: '232px', sceneImageShape: 'circle',
          accents: ['#52BDD8', '#A9CC38', '#EE6E99', '#E5C41C', '#F29A22', '#886FD6', '#3FA3D3', '#2DB49D'],
          readerLayout: 'alternating-central-axis', mobileBreakpoint: '820px'
        },
        preserve: [
          '밝은 배경·회색 중앙 축·기존 원형 사진과 점선 고리',
          '기존 scene 번호·교차 본문·공개 순서와 선형 card 기본값',
          'optional photo/tree의 original DOM·reading history·spoiler·focus return',
          'source evidence와 장면별 replay ownership 및 독립 clock',
          'CVA 탐색용 보라색으로 reader 전체를 다시 칠하지 않음'
        ],
        source: 'https://ttaem.com/storytimeline/wutheringwaves/ch2-act7/ · tools/elio_preview/style.css:1–11 · components/story_layout.css · components/story_tree_reader.css',
        evidence: 'live DOM/computed style and renderer source',
        adoption: 'preview-only'
      },
      editor: {
        label: '탬패드 · 편집 작업실',
        tokens: {
          background: '#171924', surface: '#24283B', text: '#C0CAF5',
          muted: '#8B93B7', accent: '#7AA2F7', border: '#363B54',
          focus: '#95ADFF', radius: '7px',
          font: '"CHZZK Workspace Pretendard", Pretendard, "Malgun Gothic", sans-serif',
          bodySize: '14px', lineHeight: '1.6', hostBodySize: '15px',
          inset: '#191C2A', raised: '#2A2F43', selected: '#303B56',
          accentText: '#17223E', strongBorder: '#7287BA',
          scene: '#91A4D6', point: '#E8A0B1', highlight: '#F3C27C',
          maxWidth: '1840px', sourceClock: 'independent', resultClock: 'cumulative'
        },
        preserve: [
          '현재 workspace host의 네이비·청색 palette와 dense 편집 구조',
          '원본·비교 영상, 장면 목록, 컷 목록, 결과 preview와 inspector',
          '청색 선택과 황금 재생·highlight 상태를 따로 읽는 방식',
          'source clock·result clock·저장·출력 계약',
          '설치 sidepanel의 CHZZK green과 workspace palette를 혼동하지 않음'
        ],
        source: 'D:/CHZZK-Video-Editor-Workspace/content/ui/workspace_styles.js:407/431/433 · content/cut_editor_view.js · content/layout_preferences.js',
        evidence: 'current installed source; selected module hash parity; real modules in synthetic native fixture; installed session behavior unverified',
        adoption: 'preview-only'
      },
      forma: {
        label: 'Forma · 정보 표현',
        tokens: {
          background: '#F4F6F5', surface: '#FFFFFF', text: '#202C32',
          muted: '#5E6C73', accent: '#146F67', border: '#DBE3DF',
          focus: '#167C8A', radius: '22px',
          font: 'Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif',
          bodySize: '16px', lineHeight: '1.75', paragraphLineHeight: '1.8',
          tint: '#E8F3ED', maxWidth: '1160px',
          studioAccent: '#166A5F', studioHover: '#12584F',
          palettes: {
            forest: { accent: '#146F67', tint: '#E8F3ED' },
            violet: { accent: '#725297', tint: '#F1ECF8' },
            ocean: { accent: '#216B88', tint: '#E8F2F7' },
            amber: { accent: '#99551F', tint: '#FBF0E4' }
          }
        },
        preserve: [
          'green·white·넓은 여백과 실제 HTML 본문·22px 카드',
          '명시한 edge·membership·수치·단위·출처를 사용하는 26 engine 계약',
          '126개 원래 표현 이름·의미와 3개 시작 예시의 분리',
          '원본 보존, 별도 private local 개선본, 편집·독립 HTML export 흐름',
          'license 미확인 원본 코드·게임 이미지의 public 재배포 제외'
        ],
        source: 'user-provided forma-web-toolkit-v2/forma-web-toolkit/web.css:1/3 · studio.css:2 · engines.js:6 · README.txt',
        evidence: 'current provided local source; original QA is historical evidence',
        adoption: 'opt-in local integration only'
      },
      cham: {
        label: 'cham',
        tokens: {
          background: '#F5F0E6', surface: '#FFFCF5', text: '#332D27',
          muted: '#66594C', accent: '#ED8B3A', accentText: '#9B4315',
          border: '#BDAF9E', focus: '#9B4315', radius: '24px',
          font: 'Pretendard, "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif',
          bodySize: '32px', supportSize: '32px', keySize: '48px', titleSize: '76px',
          lineHeight: '1.55', titleLeading: '1.18', keyLeading: '1.3',
          bodyWeight: '400', keyWeight: '650', titleWeight: '800', tracking: '-.025em',
          borderWidth: '2px', shadow: 'none', gutter: '96px', subtitleReserve: '120px',
          iconSize: '48px', iconStroke: '2.5', iconRadius: '6px',
          motion: '160ms', motionReduced: '0ms'
        },
        preserve: [
          '코토리 베이지와 주황을 출발점으로 한 밝은 파스텔 2D 인포그래픽',
          '제목·핵심·보조 설명의 위계, 한국어 가독성과 안전 여백',
          '일관된 SVG 도식·윤곽선과 편집 가능한 원래 내용·관계·순서',
          '사람 아바타를 새로 만들지 않으며 움직임 줄이기 설정 존중',
          '기존 네 스타일과 공개 Elio reader의 모습·내용 보존'
        ],
        source: '사용자 지정 cham 스타일 · 코토리 베이지는 작업 팔레트이며 공식 고정 색상값을 뜻하지 않음',
        evidence: 'user-directed style and editable shared configuration',
        adoption: 'selectable private CVA page profile'
      }
    },
    common: {
      spacing: [4, 8, 12, 16, 24, 32, 48, 64, 96],
      motion: { feedback: 120, selection: 180, panel: 240, reducedMotion: 'no movement' },
      time: {
        numeric: 'tabular-nums', tracking: '0',
        domains: ['reading-order', 'story-time', 'source-replay', 'result-sequence'],
        rule: '읽기 간격은 elapsed time이 아니며 각 clock의 owner·단위·근거를 보존한다.'
      },
      newControlTarget: '44px',
      relationRule: '순서·인과·분기·합류·조립·융합·포함·교집합을 명시적 내용으로 구분한다.',
      scopeRule: '신규 CVA component에만 적용; 기존 body/:root/renderer/public exporter를 변경하지 않는다.',
      dataRule: '샘플은 가상 정보이며 실제 관계·수량·replay timestamp를 추정하지 않는다.'
    }
  };
  // Additional authored profiles; original product identities above stay intact.
  const additions = {
    folio: {
      label: 'Folio · 종이 위의 에세이',
      tokens: { background: '#F6F0E5', surface: '#FFFCF6', text: '#302B26', muted: '#685E53', accent: '#885135', accentText: '#FFFFFF', border: '#C8BBA9', focus: '#885135', radius: '2px', font: 'Georgia, "Noto Serif KR", Batang, serif', bodySize: '17px', lineHeight: '1.9', tint: '#EEE1D2' },
      preserve: ['세리프 제목과 긴 문장의 읽기 호흡', '종이색 바탕·얇은 구획선·작은 곡률', '내용·순서·근거·입력과 원래 제품의 identity'],
      source: 'CVA authored editorial variation; Hallmark Studio actual type/grid reference, no copied assets', evidence: 'authored private profile; browser validation recorded separately', adoption: 'selectable private CVA page profile'
    },
    signal: {
      label: 'Signal · 선명한 포스터',
      tokens: { background: '#F5F5F0', surface: '#FFFFFF', text: '#171919', muted: '#525756', accent: '#B92B25', accentText: '#FFFFFF', border: '#252929', focus: '#B92B25', radius: '0px', font: 'Pretendard, "Segoe UI", sans-serif', bodySize: '16px', lineHeight: '1.7', tint: '#FAE8E5' },
      preserve: ['굵은 제목·각진 면·명확한 검정 구획선', '빨간 강조와 제목/상태 이름을 함께 읽는 구조', '내용·관계·수치의 원래 의미와 키보드 조작'],
      source: 'CVA authored poster variation; no external source payload', evidence: 'authored private profile; browser validation recorded separately', adoption: 'selectable private CVA page profile'
    },
    mist: {
      label: 'Mist · 고요한 여백',
      tokens: { background: '#F1F4F8', surface: '#FFFFFF', text: '#293347', muted: '#59667A', accent: '#635791', accentText: '#FFFFFF', border: '#CBD3E0', focus: '#635791', radius: '32px', font: 'Pretendard, "Noto Sans KR", sans-serif', bodySize: '17px', lineHeight: '1.85', tint: '#ECE9F5' },
      preserve: ['낮은 채도의 푸른 회색과 보랏빛 강조', '넉넉한 여백·부드러운 면·절제한 제목 굵기', '본문 대비·입력 이름·실제 내용과 순서'],
      source: 'CVA authored quiet reading variation; no external source payload', evidence: 'authored private profile; browser validation recorded separately', adoption: 'selectable private CVA page profile'
    }
  };
  for (const profile of Object.values(additions)) {
    const t = profile.tokens;
    profile.cssVariables = { '--cva-bg': t.background, '--cva-surface': t.surface, '--cva-inset': t.background, '--cva-text': t.text, '--cva-copy': t.text, '--cva-muted': t.muted, '--cva-accent': t.accent, '--cva-accent-ink': t.accentText, '--cva-accent-text': t.accent, '--cva-border': t.border, '--cva-focus': t.focus, '--cva-tint': t.tint, '--cva-axis': t.border, '--cva-radius': t.radius };
  }
  Object.assign(window.CVA_TOKENS.profiles, additions);
  // The four light palettes come from the existing Forma profile. Dark variants
  // keep the same color families readable on ttaem/editor surfaces.
  const palettes = {
    forest: { label: '숲 · 차분한 초록', description: '관찰 노트와 자료 정리에 어울리는 녹색 강조', light: { accent: '#146F67', ink: '#FFFFFF', tint: '#E8F3ED' }, dark: { accent: '#8DD4BA', ink: '#122B23', tint: '#233E37' } },
    violet: { label: '보라 · 깊은 여운', description: '창작 해설과 전시 소개를 위한 보랏빛 강조', light: { accent: '#725297', ink: '#FFFFFF', tint: '#F1ECF8' }, dark: { accent: '#C9B4F2', ink: '#29203C', tint: '#373044' } },
    ocean: { label: '바다 · 선명한 파랑', description: '비교 자료와 탐색을 위한 푸른 강조', light: { accent: '#216B88', ink: '#FFFFFF', tint: '#E8F2F7' }, dark: { accent: '#90CCE8', ink: '#152C3B', tint: '#253D4B' } },
    amber: { label: '호박 · 따뜻한 기록', description: '읽기와 작업 안내를 위한 따뜻한 황갈색 강조', light: { accent: '#99551F', ink: '#FFFFFF', tint: '#FBF0E4' }, dark: { accent: '#F1C486', ink: '#352713', tint: '#423729' } }
  };
  window.CVA_TOKENS.palettes = palettes;
  window.CVA_TOKENS.paletteStyle = (profile, palette) => {
    if (palette === undefined || palette === '') return '';
    if (!Object.hasOwn(window.CVA_TOKENS.profiles, profile) || !Object.hasOwn(palettes, palette)) throw new Error('등록된 스타일과 색상 팔레트를 선택하세요.');
    const colors = palettes[palette][['ttaem', 'editor'].includes(profile) ? 'dark' : 'light'];
    return '--cva-accent:' + colors.accent + ';--cva-accent-ink:' + colors.ink + ';--cva-accent-text:' + colors.accent + ';--cva-focus:' + colors.accent + ';--cva-tint:' + colors.tint;
  };
  const cham = window.CVA_TOKENS.profiles.cham;
  cham.cssVariables = {
    '--cham-background': cham.tokens.background, '--cham-surface': cham.tokens.surface,
    '--cham-text': cham.tokens.text, '--cham-muted': cham.tokens.muted,
    '--cham-orange': cham.tokens.accent, '--cham-accent-text': cham.tokens.accentText,
    '--cham-border': cham.tokens.border, '--cham-font': cham.tokens.font,
    '--cham-support-size': cham.tokens.supportSize, '--cham-key-size': cham.tokens.keySize,
    '--cham-title-size': cham.tokens.titleSize, '--cham-line-height': cham.tokens.lineHeight,
    '--cham-title-leading': cham.tokens.titleLeading, '--cham-key-leading': cham.tokens.keyLeading,
    '--cham-weight-body': cham.tokens.bodyWeight, '--cham-weight-key': cham.tokens.keyWeight,
    '--cham-weight-title': cham.tokens.titleWeight, '--cham-tracking': cham.tokens.tracking,
    '--cham-border-width': cham.tokens.borderWidth, '--cham-radius': cham.tokens.radius,
    '--cham-shadow': cham.tokens.shadow, '--cham-gutter': cham.tokens.gutter,
    '--cham-subtitle-reserve': cham.tokens.subtitleReserve, '--cham-icon-size': cham.tokens.iconSize,
    '--cham-icon-stroke': cham.tokens.iconStroke, '--cham-icon-radius': cham.tokens.iconRadius,
    '--cham-motion': cham.tokens.motion, '--cham-motion-reduced': cham.tokens.motionReduced,
    '--cva-bg': 'var(--cham-background)', '--cva-surface': 'var(--cham-surface)',
    '--cva-inset': 'var(--cham-background)', '--cva-text': 'var(--cham-text)',
    '--cva-copy': 'var(--cham-text)', '--cva-muted': 'var(--cham-muted)',
    '--cva-accent': 'var(--cham-orange)', '--cva-accent-ink': 'var(--cham-text)',
    '--cva-accent-text': 'var(--cham-accent-text)', '--cva-border': 'var(--cham-border)',
    '--cva-focus': 'var(--cham-accent-text)', '--cva-tint': 'var(--cham-surface)',
    '--cva-axis': 'var(--cham-border)', '--cva-radius': 'var(--cham-radius)'
  };
}());
