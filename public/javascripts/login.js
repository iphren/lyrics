$(function() {
  
  if (document.getElementById('mainCSS'))
    document.getElementById('mainCSS').remove();

  if (document.getElementById('mainJS'))
    document.getElementById('mainJS').remove();

  const input = document.getElementById('token');
  
  var timer;
  
  input.focus();
  input.oninput = function(e) {
    clearTimeout(timer);
    let token = e.target.value;
    if (token) timer = setTimeout(login, 300, token);
  }
  
  function login(token) {
    let xhr = new XMLHttpRequest();
    let url = '/login';
    let method = 'POST';
    let data = JSON.stringify({token: token});
    xhr.open(method, url, true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.responseType = 'document';
    xhr.onreadystatechange = function () {
      if(xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          let js = document.createElement('script');
          js.id = 'mainJS';
          js.src = '/javascripts/main.js';
          js.defer = true;
          let css = document.createElement('link');
          css.id = 'mainCSS';
          css.rel = 'stylesheet';
          css.href = '/stylesheets/main.css';
          document.getElementById('editor').innerHTML = xhr.response.getElementById('editor').innerHTML;
          document.title = 'Lyrics Centre';
          document.head.appendChild(css);
          document.head.appendChild(js);
        }
      }
    }
    xhr.send(data);
  }

}); 
