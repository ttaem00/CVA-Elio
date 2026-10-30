/* Shared interactive explanations. Models arrive through CVA_MODULES normalization. */
(function (global) {
  'use strict';

  function install(target) {
    const mounted = new WeakSet();

    function mount(root) {
      const cleanups = [];
      root.querySelectorAll('.cva-experience').forEach(shell => {
        if (mounted.has(shell)) return;
        const data = JSON.parse(shell.querySelector('[data-xp-model]').textContent);
        const controller = new AbortController();
        const options = { signal: controller.signal };
        const items = data.items;
        const stages = data.stages;
        const status = shell.querySelector('[data-xp-status]');
        let currentId = items[0]?.id;
        let stageIndex = 0;
        let timer = null;
        let spatial = null;
        mounted.add(shell);
        shell.dataset.mounted = 'true';

        function selectItem(id, announce = true) {
          const item = items.find(entry => entry.id === id);
          if (!item) return;
          if (data.kind === 'story' && !stages[stageIndex]?.activeIds.includes(id)) {
            const next = stages.findIndex(stage => stage.activeIds.includes(id));
            if (next >= 0) setStage(next, false, false);
          }
          currentId = id;
          shell.querySelectorAll('[data-xp-select]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.xpSelect === id)));
          shell.querySelectorAll('[data-xp-panel]').forEach(panel => { panel.hidden = panel.dataset.xpPanel !== id; });
          const neighbors = new Set([id]);
          data.edges.forEach(edge => { if (edge.from === id || edge.to === id) { neighbors.add(edge.from); neighbors.add(edge.to); } });
          shell.querySelectorAll('[data-xp-node]').forEach(node => {
            node.classList.toggle('is-selected', node.dataset.xpNode === id);
            node.classList.toggle('is-neighbor', neighbors.has(node.dataset.xpNode));
          });
          shell.querySelectorAll('[data-xp-edge]').forEach(edge => edge.classList.toggle('is-related', edge.dataset.from === id || edge.dataset.to === id));
          spatial?.select(id);
          if (announce) status.textContent = '현재 선택: ' + item.title;
        }

        function stopPlayback() {
          if (timer !== null) target.clearInterval(timer);
          timer = null;
          const button = shell.querySelector('[data-xp-play]');
          if (button) { button.textContent = '장면 재생'; button.setAttribute('aria-pressed', 'false'); }
        }

        function setStage(index, announce = true, selectFirst = true) {
          if (!stages.length) return;
          stageIndex = Math.max(0, Math.min(stages.length - 1, index));
          const stage = stages[stageIndex];
          shell.querySelectorAll('[data-xp-stage]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.xpStage) === stageIndex)));
          shell.querySelectorAll('[data-xp-stage-art]').forEach(art => { art.hidden = Number(art.dataset.xpStageArt) !== (data.artIndices?.[stageIndex] ?? stageIndex); });
          shell.querySelectorAll('[data-xp-select]').forEach(button => { button.dataset.stageActive = String(stage.activeIds.includes(button.dataset.xpSelect)); });
          shell.querySelectorAll('[data-xp-node]').forEach(node => { node.dataset.stageActive = String(stage.activeIds.includes(node.dataset.xpNode)); });
          const title = shell.querySelector('[data-xp-stage-title]');
          const body = shell.querySelector('[data-xp-stage-body]');
          const count = shell.querySelector('[data-xp-stage-count]');
          if (title) title.textContent = stage.title;
          if (body) body.textContent = stage.body;
          if (count) count.textContent = (stageIndex + 1) + ' / ' + stages.length;
          const range = shell.querySelector('[data-xp-stage-range]');
          if (range) { range.value = String(stageIndex); range.setAttribute('aria-valuetext', (stageIndex + 1) + '단계: ' + stage.title); }
          const previous = shell.querySelector('[data-xp-previous]');
          const next = shell.querySelector('[data-xp-next]');
          if (previous) previous.disabled = stageIndex === 0;
          if (next) next.disabled = stageIndex === stages.length - 1;
          spatial?.stage(stage.activeIds);
          if (selectFirst && stage.activeIds.length) selectItem(stage.activeIds[0], false);
          if (announce) status.textContent = (stageIndex + 1) + '단계: ' + stage.title;
        }

        shell.addEventListener('click', event => {
          const select = event.target.closest('[data-xp-select]');
          if (select && shell.contains(select)) { stopPlayback(); selectItem(select.dataset.xpSelect); }
          const stage = event.target.closest('[data-xp-stage]');
          if (stage && shell.contains(stage)) { stopPlayback(); setStage(Number(stage.dataset.xpStage)); }
        }, options);

        if (['story', 'spatial'].includes(data.kind) && stages.length) {
          shell.querySelector('[data-xp-stage-range]')?.addEventListener('input', event => { stopPlayback(); setStage(Number(event.target.value)); }, options);
          shell.querySelector('[data-xp-previous]')?.addEventListener('click', () => { stopPlayback(); setStage(stageIndex - 1); }, options);
          shell.querySelector('[data-xp-next]')?.addEventListener('click', () => { stopPlayback(); setStage(stageIndex + 1); }, options);
          shell.querySelector('[data-xp-play]')?.addEventListener('click', () => {
            if (timer !== null) { stopPlayback(); return; }
            if (stageIndex === stages.length - 1) setStage(0);
            const play = shell.querySelector('[data-xp-play]');
            play.textContent = '재생 멈추기'; play.setAttribute('aria-pressed', 'true');
            timer = target.setInterval(() => {
              if (stageIndex < stages.length - 1) setStage(stageIndex + 1);
              if (stageIndex === stages.length - 1) stopPlayback();
            }, 4500);
          }, options);
          setStage(0, false);
        }

        if (data.kind === 'simulation' && data.model) {
          const model = data.model;
          const number = shell.querySelector('[data-xp-number]');
          const range = shell.querySelector('[data-xp-quantity]');
          const format = value => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(value);
          function calculate() {
            const count = Number(number.value);
            const valid = number.value !== '' && Number.isFinite(count) && number.checkValidity();
            number.setAttribute('aria-invalid', String(!valid));
            shell.querySelector('[data-xp-remaining-label]').textContent = '용량과의 차이';
            if (!valid) {
              shell.querySelector('[data-xp-demand]').textContent = '—';
              shell.querySelector('[data-xp-remaining]').textContent = '—';
              shell.querySelector('[data-xp-calculation]').textContent = '0부터 ' + model.maxCount + '까지 정수로 입력하세요.';
              shell.dataset.calculation = 'invalid';
              return;
            }
            range.value = String(count);
            const demand = count * model.perItem;
            if (!Number.isFinite(demand)) {
              shell.querySelector('[data-xp-demand]').textContent = '—';
              shell.querySelector('[data-xp-remaining]').textContent = '—';
              shell.querySelector('[data-xp-calculation]').textContent = '현재 조건이 계산 가능한 범위를 넘었습니다. 수량을 줄여 주세요.';
              shell.dataset.calculation = 'invalid';
              return;
            }
            const remaining = model.capacity - demand;
            shell.querySelector('[data-xp-demand]').textContent = format(demand) + ' ' + model.unit;
            shell.querySelector('[data-xp-remaining]').textContent = format(Math.abs(remaining)) + ' ' + model.unit;
            shell.querySelector('[data-xp-remaining-label]').textContent = remaining < 0 ? '초과한 양' : '남은 용량';
            shell.querySelector('[data-xp-calculation]').textContent = count + ' × ' + format(model.perItem) + ' = ' + format(demand) + ' ' + model.unit + (remaining < 0 ? ' · 용량을 ' + format(-remaining) + ' ' + model.unit + ' 초과합니다.' : ' · 용량 안에 들어갑니다.');
            const domain = Math.max(model.capacity, model.perItem * model.maxCount, 1);
            shell.querySelector('[data-xp-demand-bar]').setAttribute('width', String(demand / domain * 720));
            shell.querySelector('[data-xp-demand-caption]').textContent = format(demand) + ' ' + model.unit;
            shell.querySelector('[data-xp-stack]').textContent = count === 0 ? '아직 배치한 항목이 없습니다.' : '선택한 수량 ' + format(count) + '개';
            shell.dataset.calculation = remaining < 0 ? 'overflow' : 'fits';
          }
          number.addEventListener('input', calculate, options);
          range.addEventListener('input', () => { number.value = range.value; calculate(); }, options);
          shell.querySelectorAll('[data-xp-preset]').forEach(button => button.addEventListener('click', () => {
            number.value = button.dataset.xpPreset; calculate();
          }, options));
          calculate();
        }

        if (data.kind === 'spatial') {
          const viewport = shell.querySelector('[data-xp-webgl]');
          const engineStatus = shell.querySelector('[data-xp-engine-status]');
          const controls = shell.querySelector('[data-xp-camera-controls]');
          const showDiagram = () => {
            spatial?.dispose(); spatial = null;
            viewport.replaceChildren(); shell.dataset.spatial = 'diagram'; controls.hidden = true;
            engineStatus.textContent = '관계 도식 · 같은 부품과 연결을 2D로 읽을 수 있습니다.';
          };
          try {
            if (!target.CVA_THREE) throw new Error('three-unavailable');
            spatial = createSpatial(viewport, data, selectItem, controller.signal, showDiagram);
            shell.dataset.spatial = '3d';
            controls.hidden = false;
            engineStatus.textContent = '드래그로 회전 · 부품을 누르거나 목록에서 선택하세요.';
            if (stages.length) setStage(0, false);
            shell.querySelectorAll('[data-xp-camera]').forEach(button => button.addEventListener('click', () => spatial?.camera(button.dataset.xpCamera), options));
            shell.querySelector('[data-xp-explode]').addEventListener('click', event => {
              const active = event.currentTarget.getAttribute('aria-pressed') !== 'true';
              event.currentTarget.setAttribute('aria-pressed', String(active)); spatial?.explode(active);
              status.textContent = active ? '부품을 벌려 관계를 확인합니다.' : '부품을 원래 배치로 모았습니다.';
            }, options);
            const cutaway = shell.querySelector('[data-xp-cutaway]');
            cutaway?.addEventListener('click', event => {
              const active = event.currentTarget.getAttribute('aria-pressed') !== 'true';
              event.currentTarget.setAttribute('aria-pressed', String(active)); spatial?.cutaway(active);
              status.textContent = active ? '외곽 부품을 투명하게 표시합니다.' : '외곽 부품을 다시 표시합니다.';
            }, options);
          } catch (_) {
            showDiagram();
          }
        }
        if (currentId) selectItem(currentId, false);
        cleanups.push(() => { stopPlayback(); controller.abort(); spatial?.dispose(); mounted.delete(shell); });
      });
      return () => cleanups.forEach(cleanup => cleanup());
    }

    function createSpatial(viewport, data, selectItem, signal, showDiagram) {
      const T = target.CVA_THREE;
      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(38, 1, .1, 100);
      const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
      const objects = new T.Group();
      const arrows = new T.Group();
      const raycaster = new T.Raycaster();
      const pointer = new T.Vector2();
      const meshes = [];
      const colors = { input: '#65a799', process: '#d1ae70', output: '#779bc0', storage: '#bba2c7', support: '#b8c8c5', cover: '#d2ddd9' };
      let angle = .73;
      let distance = 15;
      let homeDistance = 15;
      const center = new T.Vector3(0,.4,0);
      let separated = false;
      let transparentShell = false;
      let selected = data.items[0]?.id;
      let activeIds = new Set(data.items.map(item => item.id));
      let disposed = false;
      renderer.setPixelRatio(Math.min(target.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.setAttribute('aria-hidden', 'true');
      renderer.domElement.setAttribute('tabindex', '-1');
      viewport.append(renderer.domElement);
      scene.add(new T.HemisphereLight(0xffffff, 0x566a66, 2.2));
      const light = new T.DirectionalLight(0xfff2d6, 3.2);
      light.position.set(4, 9, 6); scene.add(light);
      scene.add(objects, arrows);
      const base = new T.Mesh(new T.BoxGeometry(11, .12, 7.5), new T.MeshStandardMaterial({ color: '#e3e9e3', roughness: .85, metalness: .04 }));
      base.position.y = -.18; scene.add(base);
      const grid = new T.GridHelper(10, 10, '#a5bab1', '#c8d6cd');
      grid.position.y = -.1; scene.add(grid);
      data.items.forEach((item, index) => {
        const height = item.role === 'cover' ? .22 : item.role === 'storage' ? 1.6 : item.role === 'process' ? 1.1 : .65;
        const width = item.role === 'cover' ? 5.5 : item.role === 'support' ? 1.9 : 1.25;
        const geometry = new T.BoxGeometry(width, height, item.role === 'cover' ? 4.1 : 1.15);
        const material = new T.MeshStandardMaterial({ color: colors[item.role] || colors.support, roughness: .52, metalness: .15, transparent: true });
        const mesh = new T.Mesh(geometry, material);
        mesh.userData.itemId = item.id;
        const origin = new T.Vector3(item.x ?? ((index % 3) - 1) * 2.8, (item.y ?? 0) + height / 2, item.z ?? (Math.floor(index / 3) - Math.floor(data.items.length / 6)) * 2.4);
        mesh.userData.origin = origin; mesh.position.copy(origin);
        mesh.userData.role = item.role;
        objects.add(mesh); meshes.push(mesh);
        const outline = new T.LineSegments(new T.EdgesGeometry(geometry), new T.LineBasicMaterial({ color: '#49635b', transparent: true, opacity: .48 }));
        mesh.add(outline);
        const labelCanvas = target.document.createElement('canvas');
        labelCanvas.width = 128; labelCanvas.height = 64;
        const context = labelCanvas.getContext('2d');
        context.fillStyle = '#fcf9f0'; context.fillRect(0, 0, 128, 64);
        context.fillStyle = '#24463d'; context.font = '600 32px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(String(index + 1).padStart(2, '0'), 64, 34);
        const sprite = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(labelCanvas), depthTest: false }));
        sprite.position.set(0, height / 2 + .42, 0); sprite.scale.set(.8, .4, 1); mesh.add(sprite);
      });
      function disposeTree(object) {
        object.traverse(child => {
          child.geometry?.dispose();
          const materials = Array.isArray(child.material) ? child.material : child.material ? [child.material] : [];
          materials.forEach(material => { material.map?.dispose(); material.dispose(); });
        });
      }
      function draw() {
        if (disposed) return;
        camera.position.set(center.x + Math.cos(angle) * distance, center.y + distance * .62, center.z + Math.sin(angle) * distance);
        camera.lookAt(center);
        meshes.forEach(mesh => {
          mesh.position.copy(mesh.userData.origin);
          if (separated) { mesh.position.x *= 1.4; mesh.position.z *= 1.4; mesh.position.y += .45; }
          mesh.material.emissive.set(mesh.userData.itemId === selected ? '#355e50' : '#000000');
          mesh.material.emissiveIntensity = mesh.userData.itemId === selected ? .45 : 0;
          mesh.material.opacity = transparentShell && mesh.userData.role === 'cover' ? .12 : activeIds.has(mesh.userData.itemId) || mesh.userData.itemId === selected ? 1 : .3;
        });
        [...arrows.children].forEach(arrow => { disposeTree(arrow); arrows.remove(arrow); });
        data.edges.forEach(edge => {
          const from = meshes.find(mesh => mesh.userData.itemId === edge.from);
          const to = meshes.find(mesh => mesh.userData.itemId === edge.to);
          if (!from || !to) return;
          const start = from.position.clone().add(new T.Vector3(0, .8, 0));
          const end = to.position.clone().add(new T.Vector3(0, .8, 0));
          const direction = end.clone().sub(start);
          if (direction.length() < .01) return;
          const related = edge.from === selected || edge.to === selected;
          const tube = new T.Mesh(new T.CylinderGeometry(.035,.035,direction.length(),8),new T.MeshBasicMaterial({color:related?'#926e31':'#8da496'}));
          tube.position.copy(start).add(end).multiplyScalar(.5);
          tube.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.clone().normalize());
          arrows.add(tube);
          arrows.add(new T.ArrowHelper(direction.clone().normalize(), start, direction.length(), related ? '#926e31' : '#95aaa0', .23, .13));
        });
        renderer.render(scene, camera);
      }
      function resize() {
        const width = viewport.clientWidth;
        const height = viewport.clientHeight;
        if (!width || !height || disposed) return;
        renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); draw();
      }
      const observer = target.ResizeObserver ? new target.ResizeObserver(resize) : null;
      observer?.observe(viewport);
      target.addEventListener('resize', resize, { signal });
      let dragging = false, previousX = 0, startX = 0, moved = false;
      renderer.domElement.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        dragging=true; moved=false; previousX=startX=event.clientX;
        renderer.domElement.setPointerCapture(event.pointerId);
        renderer.domElement.style.cursor='grabbing';
      }, {signal});
      renderer.domElement.addEventListener('pointermove', event => {
        if (!dragging) return;
        if (Math.abs(event.clientX-startX)>5) moved=true;
        angle+=(event.clientX-previousX)*.008;previousX=event.clientX;draw();
      }, {signal});
      const endDrag=()=>{dragging=false;renderer.domElement.style.cursor='grab';};
      renderer.domElement.addEventListener('pointerup',endDrag,{signal});
      renderer.domElement.addEventListener('pointercancel',endDrag,{signal});
      renderer.domElement.addEventListener('click', event => {
        if (moved) {moved=false;return;}
        const bounds = renderer.domElement.getBoundingClientRect();
        pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(meshes, false)[0];
        if (hit) selectItem(hit.object.userData.itemId);
      }, { signal });
      renderer.domElement.addEventListener('webglcontextlost', () => { if (!disposed) showDiagram(); }, { signal });
      const bounds = new T.Box3().setFromObject(objects);
      const size = bounds.getSize(new T.Vector3());
      bounds.getCenter(center);
      homeDistance = Math.max(12,size.length()*1.35);
      distance = homeDistance;
      camera.far = Math.max(100,homeDistance*5);
      base.geometry.dispose(); base.geometry = new T.BoxGeometry(Math.max(11,size.x+3),.12,Math.max(7.5,size.z+3));
      base.position.set(center.x,bounds.min.y-.2,center.z);
      grid.position.set(center.x,bounds.min.y-.1,center.z);
      grid.scale.set(Math.max(1,(size.x+3)/10),1,Math.max(1,(size.z+3)/10));
      resize();
      return {
        select(id) { selected = id; draw(); },
        stage(ids) { activeIds = new Set(ids); draw(); },
        camera(action) {
          if (action === 'left') angle -= Math.PI / 8;
          if (action === 'right') angle += Math.PI / 8;
          if (action === 'near') distance = Math.max(homeDistance*.55, distance - homeDistance*.1);
          if (action === 'far') distance = Math.min(homeDistance*2, distance + homeDistance*.1);
          if (action === 'reset') { angle = .73; distance = homeDistance; }
          draw();
        },
        explode(active) { separated = active; draw(); },
        cutaway(active) { transparentShell = active; draw(); },
        dispose() { if (disposed) return; disposed = true; observer?.disconnect(); disposeTree(scene); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); }
      };
    }
    target.CVA_EXPERIENCE_INTERACTIONS = { mount };
  }

  function render(block, documentTitle = '') {
    const C = global.CVA_COMPONENTS;
    const e = C.escape;
    const p = block.props;
    const items = p.items;
    if (!items.length) return '<p class="cva-empty">아직 살펴볼 항목이 없습니다. 대상과 설명을 추가하면 탐색을 시작할 수 있습니다.</p>';
    const prefix = 'xp-' + block.id.length + '-' + block.id;
    const stages = p.stages?.length ? p.stages : block.variant === 'story' ? items.map(item => ({ id: item.id, title: item.title, body: item.body, activeIds: [item.id] })) : [];
    const data = { kind: block.variant, items, stages, edges: p.edges || [], model: p.model || null };
    const serialized = () => JSON.stringify(data).replace(/</g, '\\u003c');
    const tip = text => ' title="' + e(text) + '" data-cva-tip="' + e(text) + '"';
    const itemButtons = items.map((item, index) => '<button type="button" class="xp-item" data-xp-select="' + e(item.id) + '" aria-pressed="' + (index === 0) + '" aria-controls="' + e(prefix + '-panel-' + index) + '"><span class="xp-order">' + String(index + 1).padStart(2, '0') + '</span><span><strong>' + e(item.title) + '</strong>' + (item.label ? '<small>' + e(item.label) + '</small>' : '') + '</span></button>').join('');
    const panels = items.map((item, index) => '<article class="xp-detail" id="' + e(prefix + '-panel-' + index) + '" data-xp-panel="' + e(item.id) + '">' + (item.label ? '<p class="xp-overline">' + e(item.label) + '</p>' : '') + '<h3>' + e(item.title) + '</h3><p class="xp-body">' + e(item.body) + '</p>' + (item.detail && item.detail !== item.body ? '<p class="xp-body xp-detail-copy">' + e(item.detail) + '</p>' : '') + (item.source ? '<details class="xp-source"><summary>자료와 조건</summary><p>' + e(item.source) + '</p></details>' : '') + '</article>').join('');
    const relationList = data.edges.length ? '<details class="xp-relations"><summary>연결을 문장으로 읽기 · ' + data.edges.length + '개</summary><ul>' + data.edges.map(edge => '<li><strong>' + e(items.find(item => item.id === edge.from)?.title || edge.from) + '</strong><span>' + e(edge.label || '연결됨') + '</span><strong>' + e(items.find(item => item.id === edge.to)?.title || edge.to) + '</strong></li>').join('') + '</ul></details>' : '';
    let content = '';

    if (block.variant === 'spatial') {
      const stageControls = stages.length ? '<div class="xp-spatial-stages"><nav class="xp-stage-index" aria-label="작동 단계">' + stages.map((stage, index) => '<button type="button" data-xp-stage="' + index + '" aria-pressed="' + (index === 0) + '"><span>' + String(index + 1).padStart(2, '0') + '</span>' + e(stage.title) + '</button>').join('') + '</nav><div class="xp-spatial-stage-copy"><div><p class="xp-overline">지금 살펴보는 단계</p><h3 data-xp-stage-title>' + e(stages[0].title) + '</h3></div><output data-xp-stage-count>1 / ' + stages.length + '</output><p class="xp-body" data-xp-stage-body>' + e(stages[0].body) + '</p></div></div>' : '';
      const points = items.map((item, index) => ({ id: item.id, x: 160 + (index % 3) * 320, y: 120 + Math.floor(index / 3) * 170 }));
      const edgeSVG = data.edges.map(edge => {
        const from = points.find(point => point.id === edge.from);
        const to = points.find(point => point.id === edge.to);
        return from && to ? '<path data-xp-edge data-from="' + e(edge.from) + '" data-to="' + e(edge.to) + '" d="M ' + from.x + ' ' + from.y + ' L ' + to.x + ' ' + to.y + '" marker-end="url(#' + e(prefix + '-arrow') + ')"/>' : '';
      }).join('');
      const svg = '<svg class="xp-diagram" viewBox="0 0 960 ' + Math.max(480, Math.ceil(items.length / 3) * 170 + 80) + '" role="img" aria-label="동일한 부품과 방향 연결을 보여 주는 개념 도식"><defs><marker id="' + e(prefix + '-arrow') + '" markerWidth="10" markerHeight="10" refX="18" refY="5" orient="auto"><path d="M0 0L10 5L0 10"/></marker></defs>' + edgeSVG + points.map((point, index) => '<g data-xp-node="' + e(point.id) + '" transform="translate(' + point.x + ' ' + point.y + ')"><rect x="-42" y="-32" width="84" height="64" rx="12"/><text text-anchor="middle" dominant-baseline="central">' + String(index + 1).padStart(2, '0') + '</text></g>').join('') + '</svg>';
      content = '<div class="xp-spatial-layout"><div class="xp-spatial-scene"><div class="xp-spatial-toolbar" data-tour-target="controls" data-tour-text="시점·단계·분리 보기를 바꾸어 가려진 연결을 확인하세요. 선택과 설명은 같은 대상을 가리킵니다." data-xp-camera-controls hidden><div role="group" aria-label="3D 시점"><button type="button" data-xp-camera="left"' + tip('시점을 왼쪽으로 회전합니다.') + '>왼쪽 회전</button><button type="button" data-xp-camera="right"' + tip('시점을 오른쪽으로 회전합니다.') + '>오른쪽 회전</button><button type="button" data-xp-camera="near">확대</button><button type="button" data-xp-camera="far">축소</button><button type="button" data-xp-camera="reset">기본 시점</button></div><div role="group" aria-label="구조 살펴보기"><button type="button" data-xp-explode aria-pressed="false"' + tip('각 부품을 벌려 배치하고 연결은 유지합니다.') + '>분리해서 보기</button>' + (items.some(item => item.role === 'cover') ? '<button type="button" data-xp-cutaway aria-pressed="false">외곽 비우기</button>' : '') + '</div></div><div class="xp-spatial-viewport" data-tour-target="subject" data-tour-text="번호가 같은 부품과 설명을 함께 살펴보세요. 도형은 작성한 관계의 개념 표현입니다."><div data-xp-webgl class="xp-webgl"></div>' + svg + '</div><p class="xp-engine-status" data-xp-engine-status>부품과 연결을 같은 번호로 살펴보세요.</p><p class="xp-caption">모양·배치는 구조 이해를 위한 개념 표현입니다. 실제 크기·거리의 척도가 아닙니다.</p>' + stageControls + relationList + '</div><aside class="xp-inspector" data-tour-target="result" data-tour-text="선택한 부품의 역할을 읽고 연결을 문장으로도 확인하세요. 안내를 닫아도 현재 선택은 유지됩니다."><nav class="xp-items" aria-label="공간의 구성 요소">' + itemButtons + '</nav><div class="xp-panels">' + panels + '</div></aside></div>';
    } else if (block.variant === 'story') {
      const stageImages = stages.map(stage=>stage.activeIds.map(id=>items.find(item=>item.id===id)?.image).find(Boolean)||items.find(item=>item.image)?.image);
      const uniqueImages = [...new Set(stageImages)];
      data.artIndices = stageImages.map(image=>uniqueImages.indexOf(image));
      const artwork = uniqueImages.map((image, index) => {
        return '<div class="xp-stage-art" data-xp-stage-art="' + index + '"' + (index ? ' hidden' : '') + '>' + (image ? C.media(image) : '<div class="xp-unpictured"><span>' + String(index + 1).padStart(2, '0') + '</span><p>이 장면은 문장으로 이어집니다.</p></div>') + '</div>';
      }).join('');
      const pins = items.map((item, index) => item.x !== undefined && item.y !== undefined ? '<button class="xp-hotspot" type="button" style="left:' + Math.max(3, Math.min(97, item.x)) + '%;top:' + Math.max(5, Math.min(95, item.y)) + '%" data-xp-select="' + e(item.id) + '" aria-pressed="' + (index === 0) + '" aria-label="' + e(item.title) + '"' + tip(item.title) + '>' + String(index + 1).padStart(2, '0') + '</button>' : '').join('');
      content = '<div class="xp-story-layout"><div class="xp-story-stage"><div class="xp-artwork" data-tour-target="subject" data-tour-text="같은 그림의 번호와 현재 장면을 대응해 읽으세요. 그림은 실측 지도가 아닌 창작 삽화입니다.">' + artwork + pins + '</div><div class="xp-story-controls" data-tour-target="controls" data-tour-text="이전·다음이나 장면 선택으로 시선을 옮기세요. 재생은 직접 시작할 때만 움직입니다."><button type="button" data-xp-previous aria-label="이전 장면">이전</button><button type="button" data-xp-play aria-pressed="false">장면 재생</button><button type="button" data-xp-next aria-label="다음 장면">다음</button><output data-xp-stage-count>1 / ' + stages.length + '</output></div><label class="xp-progress-label" for="' + e(prefix + '-stage') + '">읽을 장면 선택<input id="' + e(prefix + '-stage') + '" type="range" min="0" max="' + Math.max(0, stages.length - 1) + '" step="1" value="0" data-xp-stage-range></label><nav class="xp-stage-index" aria-label="이야기 단계">' + stages.map((stage, index) => '<button type="button" data-xp-stage="' + index + '" aria-pressed="' + (index === 0) + '"><span>' + String(index + 1).padStart(2, '0') + '</span>' + e(stage.title) + '</button>').join('') + '</nav></div><div class="xp-story-reading" data-tour-target="result" data-tour-text="장면 제목·본문·현재 위치가 함께 바뀝니다. 마지막 장면은 실제 점검 완료를 뜻하지 않습니다."><p class="xp-overline">지금 읽는 장면</p><h3 data-xp-stage-title>' + e(stages[0]?.title || '') + '</h3><p class="xp-body" data-xp-stage-body>' + e(stages[0]?.body || '') + '</p><div class="xp-panels">' + panels + '</div><details class="xp-source"><summary>장면 속 대상 찾아보기</summary><nav class="xp-items" aria-label="이야기 속 대상">' + itemButtons + '</nav></details></div></div>';
    } else if (block.variant === 'simulation' && p.model) {
      const model = p.model;
      const domain = Math.max(model.capacity, model.perItem * model.maxCount, 1);
      const boundary = model.perItem > 0 ? Math.floor(model.capacity / model.perItem) : model.maxCount;
      const presets = [{ name: '처음 수량', count: model.count }, { name: '용량 경계', count: boundary }, { name: '경계보다 한 개 더', count: boundary + 1 }];
      content = '<div class="xp-simulation-layout"><div class="xp-sim-controls" data-tour-target="subject" data-tour-text="한 항목이 사용하는 양과 전체 용량을 먼저 확인하세요. 이 계산은 화면에 적힌 가정만 사용합니다."><p class="xp-overline">조건을 바꾸어 보기</p><label class="xp-count-label" for="' + e(prefix + '-number') + '">항목 수<input id="' + e(prefix + '-number') + '" type="number" min="0" max="' + model.maxCount + '" step="1" value="' + model.count + '" data-xp-number></label><label class="xp-progress-label" for="' + e(prefix + '-quantity') + '">수량 조절<input id="' + e(prefix + '-quantity') + '" type="range" min="0" max="' + model.maxCount + '" step="1" value="' + model.count + '" data-xp-quantity></label><div class="xp-presets" data-tour-target="controls" data-tour-text="수량을 입력하거나 용량 경계 조건을 선택해 결과를 바꾸세요. 처음 수량으로 돌아갈 수 있습니다." role="group" aria-label="계산 조건 예시">' + presets.map(preset => '<button type="button" data-xp-preset="' + preset.count + '"' + (preset.count > model.maxCount ? ' disabled' : '') + '>' + preset.name + '</button>').join('') + '</div><p class="xp-caption">항목 1개당 사용량은 ' + e(model.perItem) + ' ' + e(model.unit) + '입니다. 용량과 단위는 작성된 조건을 따릅니다.</p><nav class="xp-items" aria-label="계산과 연결된 항목">' + itemButtons + '</nav></div><div class="xp-sim-result" data-tour-target="result" data-tour-text="필요한 양·남은 양·초과 상태와 계산식을 함께 확인하세요. 색뿐 아니라 문장과 수치로 결과를 제공합니다."><div class="xp-result-heading"><span class="xp-overline">조건이 만든 결과</span><strong data-xp-demand>' + e(model.count * model.perItem) + ' ' + e(model.unit) + '</strong></div><svg class="xp-capacity-visual" viewBox="0 0 800 220" role="img" aria-label="필요한 양과 기준 용량 비교"><text x="40" y="35">필요한 양</text><rect class="xp-capacity-track" x="40" y="60" width="720" height="65" rx="10"/><rect class="xp-demand-bar" x="40" y="60" width="' + model.count * model.perItem / domain * 720 + '" height="65" rx="10" data-xp-demand-bar/><line class="xp-capacity-limit" x1="' + (40 + model.capacity / domain * 720) + '" x2="' + (40 + model.capacity / domain * 720) + '" y1="45" y2="145"/><text x="40" y="170" data-xp-demand-caption>' + e(model.count * model.perItem) + ' ' + e(model.unit) + '</text><text x="40" y="205">기준 용량 ' + e(model.capacity) + ' ' + e(model.unit) + '</text></svg><p class="xp-stack" data-xp-stack></p><div class="xp-result-summary"><span><small>기준 용량</small><strong>' + e(model.capacity) + ' ' + e(model.unit) + '</strong></span><span><small data-xp-remaining-label>남은 용량</small><strong data-xp-remaining></strong></span></div><p class="xp-calculation" data-xp-calculation role="status" aria-live="polite"></p><div class="xp-panels">' + panels + '</div></div></div>';
    } else {
      content = '<p class="xp-body">설명할 항목과 계산 조건을 준비해 주세요.</p><div class="xp-panels">' + panels + '</div>';
    }
    return '<div class="cva-experience" data-xp-kind="' + e(block.variant) + '" aria-label="' + e(p.title || documentTitle) + '"><div class="xp-entry-tools"><button type="button" data-cva-tour-start' + tip('이 화면의 대상 선택과 결과 읽기를 짧게 살펴봅니다.') + '>사용 방법</button></div>' + content + '<p class="xp-status" data-xp-status role="status" aria-live="polite" aria-atomic="true"></p>' + (p.help ? '<details class="xp-help"><summary>' + e(p.helpLabel || '더 알아보기') + '</summary><p>' + e(p.help) + '</p></details>' : '') + '<script type="application/json" data-xp-model>' + serialized() + '</script></div>';
  }

  install(global);
  global.CVA_EXPERIENCE = { render, runtimeSource: '(' + install.toString() + ')(window);CVA_EXPERIENCE_INTERACTIONS.mount(document);' };
})(window);
