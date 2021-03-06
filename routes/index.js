const express = require('express');
const path = require('path');
const fs = require('fs');
const nocache = require('nocache');
const pinyin = require("pinyin");

const router = express.Router();
const songs = JSON.parse(fs.readFileSync(path.join(__dirname, '/../data/songs.json'),{encoding:'utf-8'}));
const guests = {};
const maxAttempts = 100;
const blacklist = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/blacklist.json')));

router.use(nocache());

const security = function (req, res, next) {
  if (req.ip in blacklist) {
    res.status(403).send('ip blocked');
  } else {
    next();
  }
}

router.get('/', function(req, res, next) {
  if (req.ip === '127.0.0.1') req.session.logged = true;
  if (req.session.logged && !(req.ip in blacklist))
    res.render('index');
  else
    res.render('login');
});

router.use(security);

const getToken = function (req, res, next) {
  req.auth = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/auth.json')));
  next();
}

router.post('/login', getToken, function(req, res, next) {
  req.session.logged = req.body.token === req.auth.write;
  if (req.session.logged) {
    if (req.ip in guests) delete guests[req.ip];
    res.render('index');
  } else {
    next();
  }
});

const logged = function (req, res, next) {
  if (req.ip === '127.0.0.1') req.session.logged = true;
  if (req.session.logged)
    next();
  else {
    if (req.ip in guests)
      guests[req.ip]++;
    else
      guests[req.ip] = 1;
    if (guests[req.ip] > maxAttempts) {
      blacklist[req.ip] = true;
      fs.writeFileSync(path.join(__dirname, '/../data/blacklist.json'), JSON.stringify(blacklist));
      security(req, res, next);
    } else {
      res.status(403).json({ error: 'access denied' });
    }
  }
}

const canRead = function (req, res, next) {
  getToken(req, res, _=>_);
  if (req.body.token === req.auth.write || req.body.token === req.auth.read) {
    next();
  } else {
    logged(req, res, next);
  }
}

const canWrite = function (req, res, next) {
  getToken(req, res, _=>_);
  if (req.body.token === req.auth.write) {
    next();
  } else {
    logged(req, res, next);
  }
}

router.post('/lyrics', canRead, function(req, res, next) {
  res.json(songs);
})

router.post('/save', canWrite, function(req, res, next) {
  let start, replace, song = req.body.song;
  song.title = clean(song.title);
  song.lyrics = clean(song.lyrics);
  if (req.body.needId) {
    song.id = createId(song.title, song.id);
  }
  let saved = typeof song.id == 'string' &&
              typeof song.title == 'string' &&
              typeof song.lyrics == 'string' && 
              song.id.length > 0 && song.title.length > 0 && song.lyrics.length > 0;
  if (req.body.needId) {
    if (req.body.overwrite) {
      song.id = /^[a-z0-9]*/.exec(song.id)[0]
    } else if (req.body.skip && /-[0-9]+/.test(song.id)) {
      saved = false;
    }
  }
  if (saved) {
    let keywords = '', initials = '';
    let py = myPinyin(`${song.title} ${song.lyrics}`);

    for (let p of py) {
      let plc = p[0].toLowerCase();
      keywords += plc.replace(/[^a-z0-9]/g, '');
      plc.split(/[^a-z0-9]/).forEach(s => {
        let m = s.match(/[a-z0-9]/);
        if (m) initials += m[0];
      });
    }
    song.keywords = song.id + initials + keywords;
    songlist:
    for (let i = 0; i < songs.length; i++) {
      switch (song.id.localeCompare(songs[i].id)) {
        case 1:
          if (i == songs.length - 1) {
            songs.push(song);
            start = i + 1;
            replace = false;
            break songlist;
          }
          break;
        case -1:
          songs.splice(i, 0, song);
          start = i;
          replace = false;
          break songlist;
        case 0:
          if (req.body.keepLyrics) {
            song.lyrics = songs[i].lyrics;
            song.keywords = songs[i].keywords
          }
          songs[i] = song;
          start = i;
          replace = true;
          break songlist;
      };
    };
    if (songs.length == 0) songs.push(song);
    fs.writeFileSync(path.join(__dirname, '/../data/songs.json'),JSON.stringify(songs));
  };
  res.json({saved: saved, song: song, start: start, replace: replace});
});

router.post('/delete', canWrite, function(req, res, next) {
  let id = req.body.id;
  let deleted = false;
  let trash;
  if (id) {
    for (let i = 0; i < songs.length; i++) {
      if (songs[i].id == id) {
        trash = songs[i];
        songs.splice(i,1);
        deleted = true;
        break;
      }
    }
  }
  if (deleted) {
    fs.writeFileSync(path.join(__dirname, '/../data/songs.json'), JSON.stringify(songs));
    fs.writeFileSync(path.join(__dirname, `/../data/trashes/${id}.${new Date().getTime()}.json`), JSON.stringify(trash));
  }
  res.json({deleted: deleted});
});

/* pages need logged session */
router.use(logged);

router.post('/pinyin', function(req, res, next) {
  let term = '';
  let py = myPinyin(req.body.text);
  for (let p of py) {
    term += p[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  res.json({term:term});
});

router.post('/clean', function(req, res, next) {
  res.json({text: clean(req.body.text)});
});

function clean(text) {
  return text
  .replace(/祢|袮/g,'你')
  .replace(/祂/g,'他')
  .replace(/\[[^\]]*\]|［[^］]*］|【[^】]*】|\([^\)]*\)|（[^）]*）|<[^>]*>|《[^》]*》/g, '')
  .replace(/[<>《》\(\)（）&。，”“、！？\[\]【】；：]+/g,' ')
  .replace(/^\s+|\s+$/g,'')
  .replace(/^[^\S\r\n]+|[^\S\r\n]+$/gm,'')
  .replace(/[^\S\r\n]+/g,' ')
  .replace(/\n\n+/g,'\n\n');
}

router.post('/id', function(req, res, next) {
  res.json({id: createId(req.body.title, req.body.saved)});
});

function myPinyin(text) {
  return pinyin(text.replace(/行/g,'形').replace(/着/g,'这').replace(/弹/g,'谈').replace(/祢|袮/g,'你'), {style: pinyin.STYLE_NORMAL});
}

function createId(title, saved) {
  let id = '';
  let py = myPinyin(title);
  for (let i of py) {
    id += i[0].toLowerCase();
  }
  id = id.replace(/[^a-z0-9]/g, '');
  if (id === /^[a-z0-9]*/.exec(saved)[0]) {
    id = saved;
  } else {
    let i = 2;
    let newid = id;
    for (let s of songs) {
      if (newid == s.id) {
        newid = `${id}-${i}`;
        i++;
      }
    }
    id = newid;
  }
  return id;
}

router.use(express.static(path.join(__dirname, '../private')));

router.use(function(req, res, next) {
  res.status(404).json({ error: 'not found' });
});

module.exports = router;
