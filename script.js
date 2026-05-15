// ─── Storage keys ───
    const CLOTHES_KEY = 'closet_clothes_v2';
    const OUTFITS_KEY = 'closet_outfits_v2';

    // ─── State ───
    let clothes = [];
    let savedOutfits = [];
    let currentFilter = 'all';
    let currentOutfit = null;

    // ─── Category colors ───
    const CAT_COLORS = {
      tops: '#6B8DB5',
      bottoms: '#5A7A6B',
      outerwear: '#7A6B5A',
      shoes: '#8B6B7A',
      accessories: '#C4753A',
      dresses: '#8B5E6B',
    };

    // ─── Init: load from localStorage ───
    function loadData() {
      try {
        const c = localStorage.getItem(CLOTHES_KEY);
        if (c) clothes = JSON.parse(c);
        const o = localStorage.getItem(OUTFITS_KEY);
        if (o) savedOutfits = JSON.parse(o);
      } catch (e) {
        clothes = []; savedOutfits = [];
      }
    }

    function saveClothes() {
      localStorage.setItem(CLOTHES_KEY, JSON.stringify(clothes));
    }
    function saveOutfitsList() {
      localStorage.setItem(OUTFITS_KEY, JSON.stringify(savedOutfits));
    }

    // ─── Toast ───
    function showToast(msg, type = '') {
      const container = document.getElementById('toast-container');
      const t = document.createElement('div');
      t.className = 'toast' + (type ? ' ' + type : '');
      t.textContent = msg;
      container.appendChild(t);
      setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 2900);
    }

    // ─── Tab switching ───
    function switchTab(name, el) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      el.classList.add('active');
      document.getElementById('panel-' + name).classList.add('active');
      if (name === 'wardrobe') { renderWardrobe(); renderStats(); }
      if (name === 'outfit') renderSaved();
    }
    function switchTabByName(name) {
      const tabs = document.querySelectorAll('.tab');
      const names = ['wardrobe', 'add', 'outfit'];
      const idx = names.indexOf(name);
      if (idx >= 0) switchTab(name, tabs[idx]);
    }

    // ─── File handling ───
    function handleFile(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (ev) {
        document.getElementById('preview-img').src = ev.target.result;
        document.getElementById('preview-wrap').classList.add('visible');
        document.getElementById('preview-filename').textContent = file.name;
        const nameInput = document.getElementById('item-name');
        if (!nameInput.value) {
          const n = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
          nameInput.value = n.charAt(0).toUpperCase() + n.slice(1);
        }
      };
      reader.readAsDataURL(file);
    }

    function clearPreview() {
      document.getElementById('preview-img').src = '';
      document.getElementById('preview-wrap').classList.remove('visible');
      document.getElementById('preview-filename').textContent = '—';
      document.getElementById('file-input').value = '';
    }

    // Drag & drop
    const uploadZone = document.getElementById('upload-zone');
    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
    uploadZone.addEventListener('drop', e => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const dt = new DataTransfer();
        dt.items.add(file);
        document.getElementById('file-input').files = dt.files;
        handleFile({ target: { files: [file] } });
      }
    });

    // ─── Add item ───
    function addItem() {
      const name = document.getElementById('item-name').value.trim();
      const cat = document.getElementById('item-category').value;
      const imgSrc = document.getElementById('preview-img').src;

      if (!name) { showToast('Please enter a name.', 'error'); return; }
      if (!cat) { showToast('Please select a category.', 'error'); return; }
      if (!imgSrc || !imgSrc.startsWith('data:')) { showToast('Please upload a photo.', 'error'); return; }

      const item = {
        id: Date.now(),
        name, category: cat,
        src: imgSrc,
        added: new Date().toISOString()
      };
      clothes.push(item);
      saveClothes();
      updateCount();

      // Reset form
      document.getElementById('item-name').value = '';
      document.getElementById('item-category').value = '';
      clearPreview();
      showToast('✓ ' + name + ' added', 'success');
    }

    // ─── Count ───
    function updateCount() {
      const n = clothes.length;
      document.getElementById('item-count-header').textContent = n + ' item' + (n !== 1 ? 's' : '');
    }

    // ─── Filter ───
    function filterBy(cat, el) {
      currentFilter = cat;
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      el.classList.add('active');
      renderWardrobe();
    }

    // ─── Stats ───
    function renderStats() {
      const strip = document.getElementById('stats-strip');
      const cats = {};
      clothes.forEach(c => { cats[c.category] = (cats[c.category] || 0) + 1; });
      const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
      strip.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${clothes.length}</div>
        <div class="stat-label">Total items</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${Object.keys(cats).length}</div>
        <div class="stat-label">Categories</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${savedOutfits.length}</div>
        <div class="stat-label">Saved outfits</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${topCat ? topCat[0] : '—'}</div>
        <div class="stat-label">Top category</div>
      </div>
    `;
    }

    // ─── Render wardrobe ───
    function renderWardrobe() {
      const grid = document.getElementById('wardrobe-grid');
      const empty = document.getElementById('wardrobe-empty');
      const search = (document.getElementById('search-input').value || '').toLowerCase();
      const sort = document.getElementById('sort-select').value;

      let list = currentFilter === 'all' ? [...clothes] : clothes.filter(c => c.category === currentFilter);
      if (search) list = list.filter(c => c.name.toLowerCase().includes(search) || c.category.toLowerCase().includes(search));

      // Sort
      if (sort === 'newest') list.sort((a, b) => b.id - a.id);
      else if (sort === 'oldest') list.sort((a, b) => a.id - b.id);
      else if (sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
      else if (sort === 'za') list.sort((a, b) => b.name.localeCompare(a.name));

      const resultEl = document.getElementById('result-count');
      resultEl.textContent = list.length + ' item' + (list.length !== 1 ? 's' : '') + (search ? ' found' : '');

      grid.innerHTML = '';
      if (list.length === 0) { empty.style.display = 'block'; return; }
      empty.style.display = 'none';

      list.forEach((item, idx) => {
        const d = document.createElement('div');
        d.className = 'clothing-card';
        d.style.animationDelay = (idx * 0.04) + 's';
        d.style.animation = 'fadeIn 0.3s ease both';
        const dateStr = item.added ? new Date(item.added).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
        d.innerHTML = `
        <div class="card-img-wrap">
          <img src="${item.src}" alt="${item.name}" loading="lazy" />
          <div class="card-overlay">
            <button class="delete-btn" onclick="deleteItem(${item.id}, event)" title="Remove">×</button>
          </div>
        </div>
        <div class="card-info">
          <div class="card-name">${item.name}</div>
          <div class="card-footer">
            <span class="card-tag" style="background:${CAT_COLORS[item.category] || 'var(--parchment)'}22;color:${CAT_COLORS[item.category] || 'var(--muted)'};">${item.category}</span>
            <span class="card-date">${dateStr}</span>
          </div>
        </div>`;
        grid.appendChild(d);
      });
    }

    // ─── Delete item ───
    function deleteItem(id, e) {
      if (e) e.stopPropagation();
      const item = clothes.find(c => c.id === id);
      clothes = clothes.filter(c => c.id !== id);
      saveClothes();
      updateCount();
      renderWardrobe();
      renderStats();
      if (item) showToast('"' + item.name + '" removed');
    }

    // ─── Generate outfit ───
    function generateOutfit() {
      const msg = document.getElementById('outfit-msg');
      if (clothes.length < 2) {
        msg.textContent = '⚠ Add at least 2 items to generate an outfit.';
        return;
      }
      msg.textContent = '';

      const bycat = {};
      clothes.forEach(c => {
        if (!bycat[c.category]) bycat[c.category] = [];
        bycat[c.category].push(c);
      });

      const pick = (cat) => {
        const pool = bycat[cat];
        if (!pool || !pool.length) return null;
        return pool[Math.floor(Math.random() * pool.length)];
      };

      const hasDresses = bycat['dresses'] && bycat['dresses'].length > 0;
      const hasTops = bycat['tops'] && bycat['tops'].length > 0;
      const hasBottoms = bycat['bottoms'] && bycat['bottoms'].length > 0;

      // Decide: dress outfit OR top+bottom outfit
      let useDress = false;
      if (hasDresses && hasTops && hasBottoms) {
        // Both options available — pick randomly
        useDress = Math.random() < 0.5;
      } else if (hasDresses && (!hasTops || !hasBottoms)) {
        useDress = true;
      } else {
        useDress = false;
      }

      const outfit = [];

      if (useDress) {
        const dress = pick('dresses');
        if (dress) outfit.push(dress);
      } else {
        const top = pick('tops');
        const bottom = pick('bottoms');
        if (top) outfit.push(top);
        if (bottom) outfit.push(bottom);
      }

      // Optional outerwear (~50% chance if available)
      if (bycat['outerwear'] && bycat['outerwear'].length > 0 && Math.random() < 0.5) {
        const ow = pick('outerwear');
        if (ow) outfit.push(ow);
      }

      // Always shoes if available
      const shoes = pick('shoes');
      if (shoes) outfit.push(shoes);

      // Always accessories if available
      const acc = pick('accessories');
      if (acc) outfit.push(acc);

      if (outfit.length === 0) {
        msg.textContent = '⚠ Not enough items to build an outfit.';
        return;
      }

      currentOutfit = outfit;

      const grid = document.getElementById('outfit-grid');
      grid.innerHTML = '';
      outfit.forEach(item => {
        const s = document.createElement('div');
        s.className = 'outfit-slot';
        s.innerHTML = `<div class="outfit-slot-label">${item.category}</div>
        <img src="${item.src}" alt="${item.name}" />
        <div class="outfit-slot-name">${item.name}</div>`;
        grid.appendChild(s);
      });
      document.getElementById('no-outfit-msg').style.display = 'none';
      document.getElementById('outfit-result').style.display = 'block';
      document.getElementById('save-btn').style.display = 'inline-flex';
    }

    // ─── Save outfit ───
    function saveOutfit() {
      if (!currentOutfit) return;
      const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      savedOutfits.unshift({ id: Date.now(), items: [...currentOutfit], date });
      saveOutfitsList();
      renderSaved();
      renderStats();
    }

    // ─── Delete saved outfit ───
    function deleteSavedOutfit(id) {
      savedOutfits = savedOutfits.filter(o => o.id !== id);
      saveOutfitsList();
      renderSaved();
      renderStats();
      showToast('Outfit removed');
    }

    // ─── Clear all saved ───
    function clearAllSaved() {
      if (!savedOutfits.length) return;
      if (!confirm('Remove all saved outfits?')) return;
      savedOutfits = [];
      saveOutfitsList();
      renderSaved();
      renderStats();
      showToast('All saved outfits removed');
    }

    // ─── Render saved outfits ───
    function renderSaved() {
      const section = document.getElementById('saved-section');
      const list = document.getElementById('saved-list');
      const count = document.getElementById('saved-count');
      if (savedOutfits.length === 0) { section.style.display = 'none'; return; }
      section.style.display = 'block';
      count.textContent = savedOutfits.length;
      list.innerHTML = '';
      savedOutfits.forEach(o => {
        const row = document.createElement('div');
        row.className = 'saved-outfit-row';
        const thumbs = o.items.map(i => `<img src="${i.src}" alt="${i.name}" />`).join('');
        const names = o.items.map(i => i.name).join(', ');
        const oid = o.id || 0;
        row.innerHTML = `
        <div class="saved-thumbs">${thumbs}</div>
        <span class="saved-outfit-names">${names}</span>
        <span class="saved-outfit-date">${o.date}</span>
        <button class="saved-delete-btn" onclick="deleteSavedOutfit(${oid})" title="Remove outfit">×</button>`;
        list.appendChild(row);
      });
    }

    // ─── Boot ───
    loadData();
    updateCount();
    renderWardrobe();
    renderStats();