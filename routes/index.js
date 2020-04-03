var express = require('express');
var router = express.Router();

var cors = require('cors')

/* GET home page. */
router.get('/', cors(), function(req, res, next) {
  var songs = [
    {title: 'Song Title 1', lyrics: '#Verse\nabcd\n#Chorus\nefg', id: 'songtitle1'},
    {title: 'Song Title 1', lyrics: '#Verse\nabc\n#Chorus\nefg', id: 'songtitle11'},
    {title: 'Song Title 2', lyrics: '#Verse\nab\n#Chorus\nfg', id: 'songtitle2'}
  ];
  res.render('index', {
    title: 'Lyrics editor',
    songs: songs
  });
});

module.exports = router;
