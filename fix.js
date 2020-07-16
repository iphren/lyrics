var rp = require('request-promise');

function post(path = 'lyrics',body = {}) {

  const options = {
    method: 'POST',
    uri: `http://127.0.0.1:56733/${path}`,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    },
    body: body,
    json: true
  }

  return rp(options);

}

async function fix() {

  let songs = await post();

  for (let song of songs) {
    let res = await post('delete', {id: song.id});
    if (!res.deleted) {
      console.log(res);
      console.log(song);
    }
  }

  for (let song of songs) {
    let res = await post('save', {song: song, needId: true});
    if (!res.saved) {
      console.log(res);
      console.log(song);
    }
  }

}

fix();
