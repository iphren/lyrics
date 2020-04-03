var debug = document.getElementById('debug');

debug.value = 'loading lyrics......';

download()
.then(response => {
    var songs = response;
    debug.value = '';
}).catch(() => {
    debug.value = '[error] cannot load lyrics';
});


function download() {
  return new Promise((resolve, reject) => {
    var xhr = new XMLHttpRequest();
    var method = 'GET';
    var url = 'https://efgcc.com/lyrics';
    xhr.open(method, url, true);
    xhr.setRequestHeader('Auth', auth);
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
    xhr.send();
  });
};
