/* 站点语音播报：浏览器自带中文语音合成(Web Speech API)。到站前预告 + 到站播报 + 发车欢迎 + 终点致谢。
   没有中文语音包时自动静默，仍有字幕/提示音。暂停、后台、静音时不会出声。 */
(function () {
  const ok = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  let enabled = true, voice = null, timers = [];

  function pickVoice() {
    if (!ok) return;
    const vs = speechSynthesis.getVoices().filter(v => /^zh/i.test(v.lang) || /chinese|中文|普通话/i.test(v.name));
    if (!vs.length) return;
    const rank = (v) => (/xiaoxiao|xiaoyi|yunxi|huihui|yaoyao|tingting|ting-ting|mei-jia/i.test(v.name) ? 0 : 1) + (/zh[-_]CN/i.test(v.lang) ? 0 : 2) + (v.localService ? 0.1 : 0);
    voice = vs.sort((a, b) => rank(a) - rank(b))[0];
  }
  if (ok) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

  function cancel() { timers.forEach(clearTimeout); timers = []; if (ok) speechSynthesis.cancel(); }

  // text: 要读的话；delay: 毫秒（给提示音留出时间）；urgent: 打断正在读的
  function speak(text, delay, urgent) {
    if (!ok || !enabled) return false;
    const run = () => {
      if (!enabled) return;
      if (!voice) pickVoice();
      if (urgent) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = (voice && voice.lang) || 'zh-CN'; if (voice) u.voice = voice;
      u.rate = 0.95; u.pitch = 1.02; u.volume = 1;
      speechSynthesis.speak(u);
    };
    if (delay) timers.push(setTimeout(run, delay)); else run();
    return true;
  }

  function nextName(next) { return next ? '下一站，' + next.name + '。' : ''; }
  const API = {
    available: () => ok && !!voice,
    hasVoice: () => !!voice,
    setEnabled(v) { enabled = !!v; if (!enabled) cancel(); },
    cancel,
    // 发车欢迎
    welcome(next) { speak('各位旅客，欢迎乘坐环中国动车组列车。本次列车从昆明站出发，沿途经过高原、戈壁、草原和江南，最终回到昆明。' + nextName(next) + '祝您旅途愉快。', 1500, true); },
    say(text) { return speak(text, 0, false); },
    // 临近车站预告
    approach(city) { return speak('各位旅客，前方到站，' + city.name + '站。请准备下车的旅客提前做好准备。', 0, false); },
    // 到站
    arrive(city, next) {
      if (city.loop) return speak('各位旅客，昆明站到了。本次环中国之旅到此结束，感谢您的乘坐，欢迎您再次乘坐，祝您一路平安。', 1100, true);
      return speak('各位旅客，' + city.name + '站到了。' + (city.desc || '') + nextName(next) + '请注意脚下安全，带好您的随身物品。', 1100, true);
    }
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
  addEventListener('pagehide', cancel);
  window.Voice = API;
})();
