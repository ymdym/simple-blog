// マークダウンファイルからデータを読み込む関数
async function loadMarkdownData(filename) {
    try {
        const response = await fetch(filename);
        if (!response.ok) {
            throw new Error(`Failed to load ${filename}`);
        }
        const text = await response.text();
        return parseMarkdownData(text);
    } catch (error) {
        console.error(`Error loading ${filename}:`, error);
        return [];
    }
}

// マークダウンファイルをパースする関数
// 形式: 
// YYYY/MM/DD タイトル [カテゴリ]
// 本文（複数行可）
// ---（次の記事との区切り）
function parseMarkdownData(text) {
    const lines = text.split('\n');
    const items = [];
    let currentItem = null;
    let currentContent = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        // コメント行をスキップ
        if (trimmedLine.startsWith('#') && !currentItem) continue;
        
        // セパレーター（---）で記事を区切る
        if (trimmedLine === '---' || trimmedLine === '***') {
            if (currentItem) {
                currentItem.content = currentContent.join('\n').trim();
                items.push(currentItem);
                currentItem = null;
                currentContent = [];
            }
            continue;
        }
        
        // 日付形式を検出: YYYY/MM/DD で始まる行
        const dateMatch = trimmedLine.match(/^(\d{4}\/\d{2}\/\d{2})\s+(.+)$/);
        if (dateMatch) {
            // 前の記事を保存
            if (currentItem) {
                currentItem.content = currentContent.join('\n').trim();
                items.push(currentItem);
            }
            
            // 新しい記事を開始
            const date = dateMatch[1];
            let title = dateMatch[2].trim();
            let category = null;
            
            // [カテゴリ] を抽出
            const categoryMatch = title.match(/^(.+?)\s*\[(.+?)\]$/);
            if (categoryMatch) {
                title = categoryMatch[1].trim();
                category = categoryMatch[2].trim();
            }
            
            currentItem = {
                date: date,
                title: title,
                category: category,
                content: ''
            };
            currentContent = [];
        } else if (currentItem && trimmedLine) {
            // 本文として追加
            currentContent.push(line);
        }
    }
    
    // 最後の記事を保存
    if (currentItem) {
        currentItem.content = currentContent.join('\n').trim();
        items.push(currentItem);
    }
    
    return items;
}

// マークダウンをHTMLに変換する簡単な関数
function markdownToHtml(text) {
    if (!text) return '';
    
    return text
        .split('\n')
        .map(line => {
            // 見出し
            if (line.match(/^###\s+(.+)$/)) {
                return `<h3>${line.replace(/^###\s+/, '')}</h3>`;
            }
            if (line.match(/^##\s+(.+)$/)) {
                return `<h2>${line.replace(/^##\s+/, '')}</h2>`;
            }
            if (line.match(/^#\s+(.+)$/)) {
                return `<h1>${line.replace(/^#\s+/, '')}</h1>`;
            }
            
            // 画像の処理（行全体が画像の場合）
            const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
            if (imageMatch) {
                const alt = imageMatch[1] || '';
                const src = imageMatch[2];
                return `<img src="${src}" alt="${alt}" />`;
            }
            
            // 画像の処理（行の一部に画像がある場合）
            line = line.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
            
            // リンク（外部リンクにはtarget="_blank"を追加）
            line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
                const isExternal = url.startsWith('http://') || url.startsWith('https://');
                if (isExternal) {
                    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
                }
                return `<a href="${url}">${text}</a>`;
            });
            // 太字
            line = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            // イタリック
            line = line.replace(/\*([^*]+)\*/g, '<em>$1</em>');
            
            if (line.trim() === '') {
                return '<br>';
            }
            return `<p>${line}</p>`;
        })
        .join('');
}

// 投稿を表示する関数
function renderPosts(posts, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (posts.length === 0) {
        container.innerHTML = '<p style="color: #999; font-size: 14px;">投稿がありません。</p>';
        return;
    }

    posts.forEach((post, index) => {
        const postItem = document.createElement('div');
        postItem.className = 'post-item';
        
        const date = document.createElement('div');
        date.className = 'post-date';
        date.textContent = post.date;
        
        const title = document.createElement('a');
        title.className = 'post-title';
        title.href = '#';
        title.textContent = post.title;
        title.addEventListener('click', (e) => {
            e.preventDefault();
            showPostDetail(post, containerId === 'postList' ? 'post' : 'music');
        });
        
        if (post.category) {
            const category = document.createElement('span');
            category.className = 'post-category';
            category.textContent = `[${post.category}]`;
            title.appendChild(category);
        }
        
        postItem.appendChild(date);
        postItem.appendChild(title);
        container.appendChild(postItem);
    });
}

// Musicを表示する関数
function renderMusic(musicItems, containerId) {
    renderPosts(musicItems, containerId);
}

// 記事詳細を表示する関数
function showPostDetail(post, type) {
    // 既存のモーダルがあれば削除
    const existingModal = document.getElementById('postModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // モーダルを作成
    const modal = document.createElement('div');
    modal.id = 'postModal';
    modal.className = 'modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    const closeBtn = document.createElement('span');
    closeBtn.className = 'modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => modal.remove());
    
    const title = document.createElement('h2');
    title.textContent = post.title;
    
    const date = document.createElement('div');
    date.className = 'post-date';
    date.textContent = post.date;
    
    const category = post.category ? document.createElement('div') : null;
    if (category) {
        category.className = 'post-category';
        category.textContent = `[${post.category}]`;
    }
    
    const content = document.createElement('div');
    content.className = 'post-content';
    if (post.content) {
        content.innerHTML = markdownToHtml(post.content);
    } else {
        content.innerHTML = '<p style="color: #999;">本文がありません。</p>';
    }
    
    modalContent.appendChild(closeBtn);
    modalContent.appendChild(title);
    modalContent.appendChild(date);
    if (category) modalContent.appendChild(category);
    modalContent.appendChild(content);
    modal.appendChild(modalContent);
    
    // モーダルの外側をクリックで閉じる
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    document.body.appendChild(modal);
}

// ナビゲーション処理
function setupNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    const sections = document.querySelectorAll('.content-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            
            // すべてのセクションを非表示
            sections.forEach(section => {
                section.style.display = 'none';
            });
            
            // 対象セクションを表示
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.style.display = 'block';
            }
            
            // URLハッシュを更新（スクロールを防ぐため、history.pushStateを使用）
            if (history.pushState) {
                history.pushState(null, null, '#' + targetId);
            } else {
                window.location.hash = targetId;
            }
            
            // スクロール位置を維持（自動スクロールを防ぐ）
            window.scrollTo(window.scrollX, window.scrollY);
            
            // アクティブなリンクのスタイルを更新
            navLinks.forEach(l => l.style.color = '#666');
            link.style.color = '#000';
        });
    });
}

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', async () => {
    // マークダウンファイルからデータを読み込む
    let posts = [];
    let music = [];
    
    try {
        posts = await loadMarkdownData('posts.md');
        if (posts.length === 0) {
            console.warn('posts.mdが空か、読み込めませんでした');
        }
    } catch (error) {
        console.error('posts.mdの読み込みに失敗:', error);
        const postList = document.getElementById('postList');
        if (postList) {
            postList.innerHTML = '<p style="color: #999; font-size: 14px;">投稿を読み込めませんでした。posts.mdファイルを確認してください。</p>';
        }
    }
    
    try {
        music = await loadMarkdownData('music.md');
        if (music.length === 0) {
            console.warn('music.mdが空か、読み込めませんでした');
        }
    } catch (error) {
        console.error('music.mdの読み込みに失敗:', error);
        const musicList = document.getElementById('musicList');
        if (musicList) {
            musicList.innerHTML = '<p style="color: #999; font-size: 14px;">音楽作品を読み込めませんでした。music.mdファイルを確認してください。</p>';
        }
    }
    
    // データを表示
    renderPosts(posts, 'postList');
    renderMusic(music, 'musicList');
    setupNavigation();
    
    // URLハッシュに基づいて初期表示を決定
    const hash = window.location.hash.substring(1) || 'home';
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    const targetSection = document.getElementById(hash);
    if (targetSection) {
        targetSection.style.display = 'block';
    } else {
        document.getElementById('home').style.display = 'block';
    }
    
    // アクティブなリンクのスタイルを更新
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === `#${hash}`) {
            link.style.color = '#000';
        } else {
            link.style.color = '#666';
        }
    });
});

// ------------------------
// Webカメラ背景（モノクロ・ローファイ・コマ送り）
// ------------------------
(function(){
    const video = document.getElementById('webcamVideo');
    const canvas = document.getElementById('bgCanvas');
    const btn = document.getElementById('enableCam');
    if (!canvas || !video || !btn) return;

    const ctx = canvas.getContext('2d');
    const off = document.createElement('canvas');
    const offCtx = off.getContext('2d');

    let frames = [];
    const maxFrames = 3; // 少なめのコマ数（紙芝居風）
    const captureInterval = 300; // ms
    const displayFps = 4; // 表示間隔
    let captureTimer = null;
    let drawTimer = null;
    let isCameraOn = false;
    let currentStream = null;

    function resizeCanvases() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        off.width = Math.max(160, Math.floor(window.innerWidth / 6));
        off.height = Math.max(120, Math.floor(window.innerHeight / 6));
    }

    function applyLoFi(imageData) {
        const data = imageData.data;
        const levels = 4; // 階調数を少なくしてローファイ
        const factor = 255 / (levels - 1);
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2];
            const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            let q = Math.round(lum / factor) * factor;
            const noise = (Math.random() - 0.5) * 18; // ノイズ幅
            q = Math.min(255, Math.max(0, q + noise));
            data[i] = data[i+1] = data[i+2] = q;
        }
        return imageData;
    }

    async function captureFrame() {
        if (video.readyState < 2) return;
        offCtx.drawImage(video, 0, 0, off.width, off.height);
        let img = offCtx.getImageData(0,0, off.width, off.height);
        img = applyLoFi(img);
        offCtx.putImageData(img, 0, 0);

        // スキャンラインを薄く入れる
        offCtx.fillStyle = 'rgba(0,0,0,0.04)';
        for (let y = 0; y < off.height; y += 2) {
            offCtx.fillRect(0, y, off.width, 1);
        }

        const dataUrl = off.toDataURL('image/jpeg', 0.6);
        const imgObj = new Image();
        imgObj.src = dataUrl;
        imgObj.onload = () => {
            frames.push(imgObj);
            if (frames.length > maxFrames) frames.shift();
        };
    }

    function drawFrame() {
        ctx.clearRect(0,0,canvas.width, canvas.height);
        if (frames.length === 0) {
            // カメラ未使用時は薄いノイズ感を描画
            ctx.fillStyle = 'rgba(0,0,0,0.04)';
            ctx.fillRect(0,0,canvas.width, canvas.height);
            return;
        }

        // 常に最新のフレームを表示
        const img = frames[frames.length - 1];
        const aspect = img.width / img.height;
        const canvasAspect = canvas.width / canvas.height;
        let dw = canvas.width, dh = canvas.height;
        if (aspect > canvasAspect) {
            dh = canvas.height;
            dw = dh * aspect;
        } else {
            dw = canvas.width;
            dh = dw / aspect;
        }
        const dx = (canvas.width - dw) / 2;
        const dy = (canvas.height - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);

        // 軽いビネットで落ち着かせる
        const g = ctx.createLinearGradient(0,0,0,canvas.height);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.08)');
        ctx.fillStyle = g;
        ctx.fillRect(0,0,canvas.width, canvas.height);
    }

    function startCaptureLoop() {
        if (captureTimer) return;
        captureTimer = setInterval(captureFrame, captureInterval);
        if (drawTimer) clearInterval(drawTimer);
        drawTimer = setInterval(drawFrame, 1000 / displayFps);
    }

    function stopCaptureLoop() {
        if (captureTimer) { clearInterval(captureTimer); captureTimer = null; }
        if (drawTimer) { clearInterval(drawTimer); drawTimer = null; }
    }

    function stopCamera() {
        stopCaptureLoop();
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
        video.srcObject = null;
        frames = [];
        isCameraOn = false;
        btn.textContent = 'camera on';
        // キャンバスをクリア
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
            currentStream = stream;
            video.srcObject = stream;
            await video.play();
            startCaptureLoop();
            isCameraOn = true;
            btn.textContent = 'camera off';
        } catch (err) {
            console.warn('カメラアクセスが得られませんでした:', err);
            btn.textContent = 'カメラ許可を確認してください';
            // フォールバック: 絵画的なノイズループ
            if (!drawTimer) {
                drawTimer = setInterval(() => {
                    ctx.fillStyle = 'rgba(0,0,0,0.04)';
                    ctx.fillRect(0,0,canvas.width, canvas.height);
                    for (let i = 0; i < 100; i++) {
                        ctx.fillStyle = `rgba(255,255,255,${Math.random()*0.02})`;
                        ctx.fillRect(Math.random()*canvas.width, Math.random()*canvas.height, Math.random()*6, Math.random()*3);
                    }
                }, 250);
            }
        }
    }

    function toggleCamera() {
        if (isCameraOn) {
            stopCamera();
        } else {
            startCamera();
        }
    }

    btn.addEventListener('click', () => toggleCamera());
    window.addEventListener('resize', resizeCanvases);

    // 初期化
    resizeCanvases();
})();

