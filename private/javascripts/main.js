$(function() {

  if (document.getElementById('loginJS'))
    document.getElementById('loginJS').remove();
  
  const search = document.getElementById('search');
  const clear = document.getElementById('clear');
  const songList = document.getElementById('songList');
  const inpTitle = document.getElementById('inpTitle');
  const inpLyric = document.getElementById('inpLyric');

  const outTitle = document.getElementById('outTitle');
  const outId = document.getElementById('outId');
  const outLyric = document.getElementById('outLyric');

  const delBtn = document.getElementById('delBtn');
  const newBtn = document.getElementById('newBtn');
  const savBtn = document.getElementById('savBtn');

  const logs = document.getElementById('logs');
  const history = document.getElementById('history');

  var oldIndex = -1, oldMsg = 1;
  var savedTitle = '', savedId = '', savedLyric = '';

  resizeHandler();
  window.onresize = resizeHandler;
   function resizeHandler() {
    if (window.innerWidth >= 576)
      songList.setAttribute('size','2');
    else
      songList.setAttribute('size','1');
  }

  search.value = inpTitle.value = inpLyric.value = outLyric.value = '';
  delBtn.disabled = newBtn.disabled = savBtn.disabled = true;
  log('loading lyrics......');

  request()
  .then(response => {
    if (response.length) {
      for (let song of response) {
        splice(song);
      }
      songList.selectedIndex = -1;
      log('lyrics loaded', 'success');
      log('new song', 'info');
    } else {
      log('unable to load lyrics', 'danger');
    }
  });

  function splice(song, start = songList.options.length, replace = false) {
    let option = document.createElement('option');
    option.innerHTML = song.title;
    option.id = song.id;
    option.setAttribute('songTitle', song.title);
    option.setAttribute('title', song.lyrics);
    option.setAttribute('keywords', song.keywords);
    option.setAttribute('data', JSON.stringify(song));
    if (start == songList.options.length)
      songList.add(option);
    else
      songList.add(option, songList.options[start]);
    if (replace)
      songList.remove(start + 1);
  }

  search.oninput = async function(e) {
    let a, i = {};
    if (/^\s*\+/.test(search.value)) {
      i.term = search.value.replace(/^\s*\+/,'').toLowerCase();
      a = 'title';
    } else {
      i = await request('pinyin', { text: e.target.value });
      a = 'keywords';
    }
    for (let o of songList.options) {
      o.style.display = o.getAttribute(a).toLowerCase().indexOf(i.term) > -1 ? 'block' : 'none';
    }
    if (i.term) log(`searched for <span class="font-weight-bold">${i.term}</span>`);
  }
  search.focus();
  clear.onclick = clearSearch;
  function clearSearch() {
    search.focus();
    search.value = '';
    for (let o of songList.options) {
      o.style.display = 'block';
    }

  }
  
  songList.onkeydown = songListOnKey;
  function songListOnKey(e) {
    switch (e.key) {
      case 'Backspace':
      case 'Delete':
        if (songList.selectedIndex > -1) deleteSong();
        break;
    }
  }
  
  window.onbeforeunload = function(e) {
    if (savedTitle !== outTitle.innerHTML
     || savedLyric !== outLyric.value) {
      e.preventDefault();
      e.returnValue = '';
    }
  }
  
  songList.oninput = changeSong;
  function changeSong() {
    if (savedTitle !== outTitle.innerHTML
     || savedLyric !== outLyric.value) {
      let ans = confirm('Changes will not be saved. Do you want to continue?');
      if (!ans) {
        songList.selectedIndex = oldIndex;
        return;
      }
    }
    oldIndex = songList.selectedIndex;
    let song = songList.options[oldIndex];
    savedTitle = outTitle.innerHTML = inpTitle.value = song.getAttribute('songTitle');
    savedLyric = outLyric.value = inpLyric.value = song.getAttribute('title');
    savedId = outId.innerHTML = song.id;
    delBtn.disabled = false;
    newBtn.disabled = false;
    savBtn.disabled = true;
    log(`<span class="font-weight-bold">${savedId}</span> selected`);
  }
  
  inpTitle.oninput = changeTitle;
  async function changeTitle() {
    let i = await request('clean', { text: inpTitle.value });
    let j = await request('id',{title: i.text, saved: savedId});
    if ('text' in i) outTitle.innerHTML = i.text;
    if ('id' in j) outId.innerHTML = j.id;

    newBtn.disabled = !(inpTitle.value) && !(inpLyric.value)
        && !(outTitle.innerHTML) && !(outLyric.value)
        && songList.selectedIndex === -1;

    let changeTitleFailed = !('text' in i) || !('id' in j)
        || !(i.text) || !(j.id) || i.text === savedTitle;

    savBtn.disabled = changeTitleFailed || !(outLyric.value)
        || (i.text === savedTitle && outLyric.value === savedLyric);

    if (!changeTitleFailed)
      log('title changed', 'info');
    else if ('text' in i && i.text === savedTitle)
      log('title unchanged');
  }
  
  inpLyric.oninput = changeLyrics;
  async function changeLyrics() {
    let i = await request('clean', { text: inpLyric.value });
    if ('text' in i) outLyric.value = i.text;

    newBtn.disabled = !(inpTitle.value) && !(inpLyric.value)
        && !(outTitle.innerHTML) && !(outLyric.value)
        && songList.selectedIndex === -1;

    let changeLyricsFailed = !('text' in i) || !(i.text)
        || i.text === savedLyric;

    savBtn.disabled = changeLyricsFailed || !(outTitle.innerHTML)
        || (outTitle.innerHTML === savedTitle && i.text === savedLyric);

    if (!changeLyricsFailed)
      log('lyrics changed', 'info');
    else if ('text' in i && i.text === savedLyric)
      log('lyrics unchanged');

  }

  newBtn.onclick = newSong;
  function newSong() {
    if (savedTitle !== outTitle.innerHTML
     || savedLyric !== outLyric.value) {
      let ans = confirm('Changes will not be saved. Do you want to create a new song?');
      if (!ans) return;
    }
    clearSearch(); 
    inpTitle.focus();
    oldIndex = -1;
    songList.selectedIndex = oldIndex;
    savedTitle = outTitle.innerHTML = inpTitle.value = '';
    savedLyric = outLyric.value = inpLyric.value = '';
    savedId = outId.innerHTML = '';
    delBtn.disabled = true;
    newBtn.disabled = true;
    savBtn.disabled = true;
    log('new song', 'info');
  }
 
  savBtn.onclick = saveSong;
  async function saveSong() {
    if (outTitle.innerHTML && outId.innerHTML && outLyric.value) {
      let ind = songList.selectedIndex;
      let song = ind < 0 || outId.innerHTML !== savedId ? {}
          : JSON.parse(songList.options[ind].getAttribute('data'));
      song.title = outTitle.innerHTML;
      song.id = outId.innerHTML;
      song.lyrics = outLyric.value;
      let i = await request('save', {song: song});
      if (i.saved) {
        splice(i.song, i.start, i.replace);
        oldIndex = i.start;
        songList.selectedIndex = oldIndex;
        savedTitle = outTitle.innerHTML = inpTitle.value = i.song.title;
        savedLyric = outLyric.value = inpLyric.value = i.song.lyrics;
        savedId = outId.innerHTML = i.song.id;
        delBtn.disabled = false;
        newBtn.disabled = false;
        savBtn.disabled = true;
        log(`<span class="font-weight-bold">${i.song.id}</span> saved`, 'success');
      } else {
        log(`unable to save <span class="font-weight-bold">${song.id}</span>`, 'danger');
      }
    } else {
      log('unable to save', 'warning');
    }
  }
  
  delBtn.onclick = deleteSong;
  async function deleteSong() {
    let ind = songList.selectedIndex;
    let song = songList.options[ind];
    let ans = confirm(`Are you sure you want to delete the song "${song.innerHTML}"?`);
    if (ans && song) {
      let i = await request('delete', { id: song.id });
      if (i.deleted) {
        songList.remove(ind);
        oldIndex = -1;
        songList.selectedIndex = oldIndex;
        savedTitle = outTitle.innerHTML = inpTitle.value = '';
        savedLyric = outLyric.value = inpLyric.value = '';
        savedId = outId.innerHTML = '';
        delBtn.disabled = true;
        newBtn.disabled = true;
        savBtn.disabled = true;
        log(`<span class="font-weight-bold">${song.id}</span> deleted`, 'success');
        log('new song', 'info');
      } else {
        log(`unable to delete <span class="font-weight-bold">${song.id}</span>`, 'danger');
      }
    } else {
      if (ans) log('unable to delete', 'warning');
    }
  }

  $('#logsModal').on('shown.bs.modal', function(e) {
    history.scrollTop = history.scrollHeight;
  });
  function log(msg, type = 'dark') {
    let lastMsg = history.lastChild ? history.lastChild.lastChild.innerText.replace(/ [0-9]+$/,'') : 'whosyourdaddy';
    let thisMsg = msg.replace(/<[^>]+>/g,'');
    if (thisMsg.indexOf(lastMsg) === 0) {
      oldMsg++;
      history.lastChild.remove();
    } else {
      oldMsg = 1;
    }
    logs.innerHTML = msg;
    logs.className = `form-control text-${type}`;
    let p = document.createElement('div');
    let t = document.createElement('span');
    let m = document.createElement('span');
    t.innerHTML = `${timestamp()} `;
    m.innerHTML = msg + (oldMsg > 1 ? ` <span class="badge badge-pill badge-primary">${oldMsg}</span>` : '');
    t.className = 'text-muted';
    m.className = `text-${type}`;
    p.appendChild(t);
    p.appendChild(m);
    history.appendChild(p);
  }

  function timestamp() {
    let t = new Date();
    return `${t.getFullYear()}-${tt(t.getMonth()+1)}-${tt(t.getDate())} ${tt(t.getHours())}:${tt(t.getMinutes())}:${tt(t.getSeconds())}`
  }

  function tt(i) {
    return i > 9 ? i.toString() : '0' + i.toString();
  }
  
  function request(path = 'lyrics',json = {}) {
  
    let xhr = new XMLHttpRequest();
    let url = `/${path}`;
    let method = 'POST';
    let data = JSON.stringify(json);
  
    xhr.open(method, url, true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.responseType = 'json';
  
    return new Promise((resolve) => {
      xhr.onreadystatechange = function () {
        if(xhr.readyState === XMLHttpRequest.DONE) {
          if (xhr.status === 200) {
            resolve(xhr.response);
          } else {
            log(`${method} ${url} [${xhr.status}]: ${xhr.response.error}`, 'warning');
            resolve([]);
          }
        }
      }
      xhr.send(data);
    });
  }
  
});
