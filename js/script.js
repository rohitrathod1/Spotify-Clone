console.log('Spotify Clone Loaded!');

let currentSong = new Audio();
let songs = [];
let currFolder = '';

const formatTime = (sec) => {
    if (isNaN(sec)) return "00:00";
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

async function loadSongs(folder) {
    currFolder = folder;
    songs = [];

    console.log(`Loading songs from folder: ${folder}`);

    try {
        // info.json ko fetch karo
        const res = await fetch(`./songs/${folder}/info.json`);
        if (!res.ok) throw new Error(`info.json not found in ${folder}`);

        let data = await res.json();
        // Agar single object hai toh use array bana do (safety check)
        if (!Array.isArray(data)) data = [data];

        songs = data.map((item, i) => {
            const song = {
                file: item.file,
                // Agar title nahi hai toh filename ko use karo
                title: item.title || item.file.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
                artist: item.artist || 'Unknown Artist',
                path: `./songs/${folder}/${item.file}`,
                cover: `./songs/${folder}/cover.jpg`
            };
            console.log(`Song ${i + 1}: ${song.title}`);
            return song;
        });

        console.log(`Total songs loaded: ${songs.length}`);
        renderSongList();
        return songs;

    } catch (err) {
        console.error('Load failed:', err);
        // Agar info.json galat hai toh error message show karo
        document.querySelector(".songList ul").innerHTML = `<li>Error: Failed to load songs. Check info.json: ${err.message}</li>`;
        return [];
    }
}

function renderSongList() {
    const ul = document.querySelector(".songList ul");
    ul.innerHTML = songs.map((song, i) => `
        <li data-index="${i}" class="song-item">
            <img class="invert" width="34" src="img/music.svg" alt="">
            <div class="info">
                <div class="title" title="${song.title}">${song.title}</div>
                <div class="artist">${song.artist}</div>
            </div>
            <div class="playnow">
                <span>Play Now</span>
                <img class="invert" src="img/play.svg" alt="">
            </div>
        </li>
    `).join('');

    ul.querySelectorAll('.song-item').forEach(li => {
        li.onclick = () => {
            const idx = li.dataset.index;
            playSong(songs[idx]);
            highlightSong(li);
        };
    });
}

function highlightSong(active) {
    document.querySelectorAll('.songList li').forEach(li => li.classList.remove('playing'));
    if (active) active.classList.add('playing');
}

function playSong(song, pause = false) {
    console.log('Playing:', song.title);
    currentSong.src = song.path;
    document.querySelector(".songinfo").textContent = `${song.title} - ${song.artist}`;
    document.querySelector(".songtime").textContent = "00:00 / 00:00";

    if (!pause) {
        currentSong.play().catch(() => alert('Play failed'));
        document.getElementById("play").src = "img/pause.svg";
    }
}

// 💥 UPDATED loadAlbums FUNCTION
async function loadAlbums() {
    const container = document.querySelector(".cardContainer");
    container.innerHTML = "<p>Loading albums...</p>";
    console.log('Manually checking album folders...');
    
    // Hardcoded folders ki list use ki hai jo aapke file explorer mein dikh rahe hain
    // Taki server directory listing ki dependency hat jaaye.
    const folders = ['angry', 'bright', 'chill', 'funky', 'love', 'ncs', 'uplifting']; 

    container.innerHTML = '';

    for (const folder of folders) {
        try {
            const metaRes = await fetch(`./songs/${folder}/info.json`);
            if (!metaRes.ok) {
                console.warn(`No info.json in ${folder}. Skipping album.`);
                continue;
            }
            let meta = await metaRes.json();
            if (!Array.isArray(meta)) meta = [meta];

            const title = meta[0].album || meta[0].title || folder;
            const desc = meta[0].description || 'Click to play';

            console.log(`Album loaded: ${folder} → ${title}`);

            container.innerHTML += `
                <div data-folder="${folder}" class="card">
                    <div class="play">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5"/>
                        </svg>
                    </div>
                    <img src="./songs/${folder}/cover.jpg" onerror="this.src='img/default-cover.jpg'" alt="">
                    <h3>${title}</h3>
                    <p>${desc}</p>
                </div>`;
        } catch (e) {
            console.warn(`Failed to load metadata for album: ${folder}. Error: ${e.message}`);
        }
    }

    if (container.innerHTML === '') {
        container.innerHTML = "<p>No albums loaded. Check folder structure and info.json files.</p>";
    }

    document.querySelectorAll('.card').forEach(card => {
        card.onclick = async () => {
            const folderName = card.dataset.folder;
            console.log(`Album clicked: ${folderName}`);
            document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            await loadSongs(folderName);
            // Pehla gaana play karo jab album select ho
            if (songs.length > 0) playSong(songs[0]); 
        };
    });
}
// 💥 END OF UPDATED loadAlbums FUNCTION

async function init() {
    console.log('Initializing...');
    // Initial load 'ncs' album ka
    await loadSongs("ncs"); 
    if (songs.length > 0) playSong(songs[0], true); // Pehla song set karo, par pause rakho
    await loadAlbums(); // Albums load karo

    // --- Event Listeners ---
    
    document.getElementById("play").onclick = () => {
        currentSong.paused ? currentSong.play() : currentSong.pause();
        document.getElementById("play").src = currentSong.paused ? "img/play.svg" : "img/pause.svg";
    };

    currentSong.ontimeupdate = () => {
        if (!isNaN(currentSong.duration)) {
            document.querySelector(".songtime").textContent = `${formatTime(currentSong.currentTime)} / ${formatTime(currentSong.duration)}`;
            document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
        }
    };

    document.querySelector(".seekbar").onclick = (e) => {
        const percent = (e.offsetX / e.target.offsetWidth) * 100;
        document.querySelector(".circle").style.left = percent + "%";
        currentSong.currentTime = (currentSong.duration * percent) / 100;
    };

    document.getElementById("previous").onclick = () => {
        const idx = songs.findIndex(s => s.path === currentSong.src);
        const prev = (idx - 1 + songs.length) % songs.length;
        playSong(songs[prev]);
        highlightSong(document.querySelector(`li[data-index="${prev}"]`));
    };

    document.getElementById("next").onclick = () => {
        const idx = songs.findIndex(s => s.path === currentSong.src);
        const next = (idx + 1) % songs.length;
        playSong(songs[next]);
        highlightSong(document.querySelector(`li[data-index="${next}"]`));
    };

    currentSong.onended = () => document.getElementById("next").click();

    const vol = document.querySelector(".range input");
    vol.oninput = (e) => {
        const v = e.target.value / 100;
        currentSong.volume = v;
        document.querySelector(".volume>img").src = v > 0 ? "img/volume.svg" : "img/mute.svg";
    };

    document.querySelector(".volume>img").onclick = () => {
        if (currentSong.volume > 0) {
            currentSong.volume = 0;
            vol.value = 0;
            document.querySelector(".volume>img").src = "img/mute.svg";
        } else {
            currentSong.volume = 0.5;
            vol.value = 50;
            document.querySelector(".volume>img").src = "img/volume.svg";
        }
    };

    document.querySelector(".hamburger").onclick = () => document.querySelector(".left").style.left = "0";
    document.querySelector(".close").onclick = () => document.querySelector(".left").style.left = "-120%";
}

init();