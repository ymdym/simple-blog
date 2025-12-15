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

