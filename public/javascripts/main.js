class Listened {
  constructor(val) {
    this.val = val;
  };
  callback = function(val) {};
  get value() {
    return this.val;
  };
  set value(val) {
    this.val = val;
    this.callback(val);
  };
  onchange(callback) {
    this.callback = callback;
  };
};

const baseUrl = 'https://elimfgcc.org/lyrics/';

var debug = document.getElementById('debug');
var saveBtn = document.getElementById('save');
var search = document.getElementById('search');
var deleteBtn = document.getElementById('delete');
var songlist = document.getElementById('songlist');
var titleTag = document.getElementById('title');
var lyricsTag = document.getElementById('lyrics');
titleTag.value = '';
lyricsTag.value = '';
saveBtn.disabled = true;

var oldTitle = '', oldLyrics = '', oldId = '';
var id = new Listened('');
id.onchange(val => inner('id',val.replace(/-.*/,'<span id="more">$&</span>')));
var title = new Listened('');
title.onchange(val => inner('showtitle',val));
var lyrics = new Listened('');
lyrics.onchange(val => inner('showlyrics',val));
var lockTimer;

debug.value = 'loading lyrics......';

request()
.then(response => {
  for (let song of response) {
    splice(song);
  };
  debug.value = 'lyrics loaded';
}).catch(() => {
  debug.value = '[error] cannot load lyrics';
});

search.oninput = async function(e) {
  let i = await request('pinyin',{text:e.target.value});
  for (let o of songlist.options) {
    if (o.getAttribute('key').indexOf(i.term) > -1) {
      o.style.display = 'block';
    } else
      o.style.display = 'none';
  }
}
search.focus();

songlist.onkeydown = selectKey;

function splice(song, start = songlist.options.length, deleteCount = 0) {
  let option = document.createElement('option');
  option.id = replace(song.id);
  option.value = replace(song.lyrics);
  option.setAttribute('key', song.keywords);
  option.setAttribute('data', escape(JSON.stringify(song)));
  option.innerHTML = replace(song.title);
  if (start == songlist.options.length)
    songlist.add(option);
  else
    songlist.add(option, songlist.options[start]);
  for (let i = start + 1; i <= start + deleteCount; i++)
    songlist.remove(start + 1);
};

function inner(id, val) {
  document.getElementById(id).innerHTML= val;
};

function selectKey(e) {
  let song = songlist.options[songlist.selectedIndex];
  switch (e.key) {
    case 'Backspace':
    case 'Delete':
      if (song) deleteSong();
      break;
  };
};

window.onbeforeunload = function(e) {
  if (oldTitle !== title.value
  || oldLyrics !== lyrics.value) {
    e.preventDefault();
    e.returnValue = '';
  };
};

function newSong() {
  if (oldTitle !== title.value
  || oldLyrics !== lyrics.value) {
    let ans = confirm('Changes will not be saved. Do you want to continue?');
    if (!ans) return;
  };
  document.getElementById('title').value = '';
  document.getElementById('lyrics').value = '';
  if (songlist.selectedIndex > -1)
  songlist.options[songlist.selectedIndex].selected = false;
  title.value = id.value = lyrics.value
  = oldTitle = oldId = oldLyrics = '';
  deleteBtn.style.visibility = 'hidden';
};

var oldIndex = -1;
function changeSong() {
  if (songlist.selectedIndex == -1) return;
  if (oldTitle !== title.value
  || oldLyrics !== lyrics.value) {
    let ans = confirm('Changes will not be saved. Do you want to continue?');
    if (!ans) {
      songlist.selectedIndex = oldIndex;
      return;
    };
  };
  oldIndex = songlist.selectedIndex;
  let song = songlist.options[oldIndex];
  titleTag.value = song.innerText;
  lyricsTag.value = song.value;
  id.value = song.id;
  oldTitle = titleTag.value;
  oldLyrics = lyricsTag.value;
  oldId = song.id;
  title.value = titleTag.value;
  lyrics.value = lyricsTag.value;
  deleteBtn.style.visibility = 'visible';
  save.disabled = true;
};

var enableSave;
async function changeTitle() {
  clearTimeout(enableSave);
  save.disabled = true;
  enableSave = setTimeout(saveState, 1000);

  let i = await request('formal',{text:titleTag.value});
  title.value = i.text;
  let j = await request('id',{title: title.value, old: oldId});
  id.value = j.id;
};

async function changeLyrics() {
  clearTimeout(enableSave);
  save.disabled = true;
  enableSave = setTimeout(saveState, 1000);

  let i = await request('formal',{text:lyricsTag.value});
  lyrics.value = i.text;
};

function saveState() {
  save.disabled = (title.value && lyrics.value && title.value == oldTitle && lyrics.value == oldLyrics);
};

async function saveSong() {
  if (title.value && id.value && lyrics.value) {
    let song = {}, o = songlist.options[songlist.selectedIndex];
    if (o)
      song = JSON.parse(unescape(o.getAttribute('data')));
    song.title = title.value;
    song.id = id.value;
    song.lyrics = lyrics.value;
    let i = await request('save', song);
    if (i.saved) {
      song = i.song;
      splice(song,i.start,i.deleteCount);
      songlist.selectedIndex = i.start;
      oldTitle = song.title;
      oldLyrics = song.lyrics;
      changeSong();
    };
  };
};

async function deleteSong() {
  let i = songlist.selectedIndex;
  let song = songlist.options[i]; 
  let ans = confirm(`Are you sure you want to delete the song "${song.innerHTML}"?`);
  if (ans && song) {
    let r = await request('delete',{id: song.id});
    if (r.deleted) {
      songlist.remove(i);
      i = i>0 ? i-1 : 0;
      oldTitle = title.value;
      oldLyrics = lyrics.value;
      if (i < songlist.options.length) {
        songlist.selectedIndex = i;
        changeSong();
      } else
        newSong();
    };
  };
};

function request(path,json) {
  return new Promise((resolve, reject) => {
    var xhr = new XMLHttpRequest();
    let url = baseUrl;
    if (typeof path == "string" && path.length > 1) {
      url += path;
      var method = 'POST';
      var data = JSON.stringify(json);
    } else {
      var method = 'GET';
      var data = '';
    };
    xhr.open(method, url, true);
    if (data) xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.setRequestHeader('Auth', token);
    xhr.responseType = 'json';
    xhr.onreadystatechange = function () {
      if(xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          resolve(xhr.response);
        } else {
          reject();
        };
      };
    };
    xhr.send(data);
  });
};

var tags = {'&':'&amp;','<':'&lt;','>':'&gt;'};
function safeTag(c) {return tags[c] || c};
function replace(s) {return s.replace(/[&<>]/g,safeTag)}
