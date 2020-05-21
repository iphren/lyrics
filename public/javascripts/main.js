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

var debug = document.getElementById('debug');
var tooltip = document.getElementById('tooltip');
var saveBtn = document.getElementById('save');
var deleteBtn = document.getElementById('delete');
var songlist = document.getElementById('songlist');
var titleTag = document.getElementById('title');
var lyricsTag = document.getElementById('lyrics');
titleTag.value = '';
lyricsTag.value = '';

var oldTitle = '', oldLyrics = '', oldId = '';
var id = new Listened('');
id.onchange(val => inner('id',val));
var title = new Listened('');
title.onchange(val => {
  inner('showtitle',val);
  saveBtn.disabled = (val == oldTitle && lyrics.value == oldLyrics);
});
var lyrics = new Listened('');
lyrics.onchange(val => {
  inner('showlyrics',val);
  saveBtn.disabled = (val == oldLyrics && title.value == oldTitle);
});
var tooltipTimer, lockTimer;

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

songlist.onkeydown = selectKey;

function splice(song, start = songlist.options.length, deleteCount = 0) {
  let option = document.createElement('option');
  option.id = replace(song.id);
  option.value = replace(song.lyrics);
  option.setAttribute('data', escape(JSON.stringify(song)));
  option.onmouseover = preview;
  option.onmouseleave = nopreview;
  option.innerHTML = replace(song.title);
  if (start == songlist.options.length)
    songlist.add(option);
  else
    songlist.add(option, songlist.options[start]);
  for (let i = start + 1; i <= start + deleteCount; i++)
    songlist.remove(start + 1);
};

function inner(id, val) {
  document.getElementById(id).innerText = val;
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

function preview(e) {
  let lyr = e.target.value
    .replace(/#.*|\n/g,' ')
    .replace(/\s+/g,' ');
  let rec = e.target.getBoundingClientRect();
  tooltip.style.top = (rec.top + rec.height / 2) + 'px';
  tooltip.style.left = (rec.left + rec.width / 2) + 'px';
  tooltip.innerText = lyr;
  tooltipTimer = setTimeout(() => {
    tooltip.style.display = 'block';
  }, 500);
};

function nopreview(e) {
  clearTimeout(tooltipTimer);
  tooltip.style.display = 'none';
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
  //let i = (await request('trad',[titleTag.value])).join('');
  title.value = titleTag.value;
  let j = await request('id',{title: title.value, old: oldId});
  id.value = j.id;
  enableSave = setTimeout(function(){save.disabled = (title.value == oldTitle && lyrics.value == oldLyrics);}, 1000);
};

async function changeLyrics() {
  clearTimeout(enableSave);
  save.disabled = true;
  //lyrics.value = (await request('trad',[lyricsTag.value])).join('');
  lyrics.value = lyricsTag.value;
  enableSave = setTimeout(function(){save.disabled = (title.value == oldTitle && lyrics.value == oldLyrics);}, 1000);
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
      splice(song,i.start,i.deleteCount);
      songlist.selectedIndex = i.start;
      oldTitle = song.title;
      oldLyrics = song.lyrics;
      changeSong();
    };
  };
};

async function deleteSong() {
  let ans = confirm(`Are you sure you want to delete the song "${songlist.options[songlist.selectedIndex].innerHTML}"?`);
  if (ans && id.value) {
    let r = await request('delete',{id: id.value});
    if (r.deleted) {
      let i = songlist.selectedIndex;
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
    var url = 'https://elimfgcc.org/lyrics/';
    if (typeof path == "string" && path.length > 1) {
      var method = 'POST';
      url += path;
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
