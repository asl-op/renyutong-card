/**
 * audio.js —— 舒缓自然的环境背景音效（Web Audio 原生合成，无外部音频文件）
 * 质感：轻柔、自然、低缓——
 *   · 深空低鸣（55Hz 极轻）+ 温暖开放五度（E2/B2），柔和自然不刺耳
 *   · 两只略微失谐的三角波，产生很轻的空气感微闪烁
 *   · 棕噪经低通滤波，模拟轻柔的星尘风
 *   · 极慢 LFO 调制「呼吸」音量，形成潮汐般的自然起伏
 * 开关：页面右下角自动注入简约开关，可手动开启 / 关闭，开启时渐进淡入
 */
(function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;

  const TARGET = 0.05;    // 目标音量（很低，轻缓）
  const FADE_IN = 3.2;    // 淡入时长（秒），更舒缓
  const FADE_OUT = 1.8;   // 淡出时长（秒）

  let ctx = null;
  let master = null;
  let playing = false;

  // 生成 2 秒棕色噪声 Buffer（循环播放，低频更柔和自然）
  function makeBrownNoise(ac) {
    const length = ac.sampleRate * 2;
    const buffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.0;
    }
    return buffer;
  }

  function build() {
    ctx = new AC();

    master = ctx.createGain();          // 总音量：只负责淡入 / 淡出
    master.gain.value = 0;
    master.connect(ctx.destination);

    const breath = ctx.createGain();    // 呼吸音量：由 LFO 调制，形成自然起伏
    breath.gain.value = 1.0;
    breath.connect(master);

    // 极慢 LFO（约 25 秒一周期）→ breath.gain，潮汐般的轻柔起伏
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.04;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.12;
    lfo.connect(lfoDepth);
    lfoDepth.connect(breath.gain);

    // 1) 深空低鸣 55Hz（很轻，营造底感）
    const d1 = ctx.createOscillator(); d1.type = 'sine'; d1.frequency.value = 55;
    const g1 = ctx.createGain(); g1.gain.value = 0.40;
    d1.connect(g1); g1.connect(breath);

    // 2) 温暖开放五度 E2(82.41) + B2(123.47)，自然柔和的和声
    const d2 = ctx.createOscillator(); d2.type = 'sine'; d2.frequency.value = 82.41;
    const g2 = ctx.createGain(); g2.gain.value = 0.16;
    d2.connect(g2); g2.connect(breath);

    const d3 = ctx.createOscillator(); d3.type = 'sine'; d3.frequency.value = 123.47;
    const g3 = ctx.createGain(); g3.gain.value = 0.10;
    d3.connect(g3); g3.connect(breath);

    // 3) 极轻的空气感：两只略微失谐的三角波 → 柔和微闪烁
    const a1 = ctx.createOscillator(); a1.type = 'triangle'; a1.frequency.value = 220;
    const g4 = ctx.createGain(); g4.gain.value = 0.04;
    a1.connect(g4); g4.connect(breath);

    const a2 = ctx.createOscillator(); a2.type = 'triangle'; a2.frequency.value = 220.8;
    const g5 = ctx.createGain(); g5.gain.value = 0.04;
    a2.connect(g5); g5.connect(breath);

    // 4) 轻柔星尘风：棕噪 → 低通（更高截止，更通透轻盈）
    const noise = ctx.createBufferSource();
    noise.buffer = makeBrownNoise(ctx);
    noise.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;
    lp.Q.value = 0.5;
    const gn = ctx.createGain();
    gn.gain.value = 0.14;
    noise.connect(lp); lp.connect(gn); gn.connect(breath);

    // 启动所有音源
    d1.start(); d2.start(); d3.start();
    a1.start(); a2.start();
    noise.start(); lfo.start();
  }

  // 平滑渐变到目标音量（渐进淡入 / 淡出，绝不突变）
  function fadeTo(value, seconds, done) {
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(value, now + seconds);
    if (done) setTimeout(done, seconds * 1000);
  }

  function start() {
    if (!ctx) build();
    ctx.resume();
    fadeTo(TARGET, FADE_IN);
    playing = true;
  }

  function stop() {
    fadeTo(0, FADE_OUT, function () {
      if (!playing && ctx) ctx.suspend();
    });
    playing = false;
  }

  // 注入右下角开关控件
  function inject() {
    const btn = document.createElement('button');
    btn.id = 'audio-toggle';
    btn.className = 'audio-toggle';
    btn.type = 'button';
    btn.setAttribute('title', '背景音效（默认关闭，点击开启）');
    btn.innerHTML =
      '<svg class="ic ic-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
        '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>' +
        '<path d="M15.5 8.5a5 5 0 0 1 0 7"></path>' +
        '<path d="M18.5 5.5a9 9 0 0 1 0 13"></path>' +
      '</svg>' +
      '<svg class="ic ic-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
        '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>' +
        '<line x1="16" y1="9" x2="22" y2="15"></line>' +
        '<line x1="22" y1="9" x2="16" y2="15"></line>' +
      '</svg>' +
      '<span class="audio-txt">音效</span>';

    btn.addEventListener('click', function () {
      if (playing) {
        stop();
        btn.classList.remove('is-on');
        btn.title = '背景音效（点击开启）';
      } else {
        start();
        btn.classList.add('is-on');
        btn.title = '背景音效：播放中（点击关闭）';
      }
    });

    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
