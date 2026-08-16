/**
 * audio.js —— 柔和宇宙氛围背景音效（Web Audio 原生合成，无外部音频文件）
 * 质感对标 Star Walk 2 Plus 的深空环境音：
 *   · 低频正弦底音 + 轻微谐波，营造深邃底噪
 *   · 棕色噪声经低通滤波，模拟「星尘风声」
 *   · 极慢 LFO 调制滤波截止频率，产生呼吸般的流动感
 *   · 音量默认偏低，开启时渐进淡入，绝不突然大声
 * 开关：页面右下角自动注入一个简约开关控件，可手动开启 / 关闭
 */
(function () {
  // 浏览器兼容：不支持 Web Audio 则静默跳过（不注入开关）
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;

  const TARGET = 0.06;    // 目标音量（很低）
  const FADE_IN = 2.6;    // 淡入时长（秒）
  const FADE_OUT = 1.4;   // 淡出时长（秒）

  let ctx = null;
  let master = null;
  let playing = false;

  // 生成 2 秒棕色噪声 Buffer（循环播放）
  function makeBrownNoise(ac) {
    const length = ac.sampleRate * 2;
    const buffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;   // 积分 → 棕噪（更柔和低频）
      data[i] = last * 3.5;
    }
    return buffer;
  }

  // 构建音频图（首次开启时调用，避免页面加载即创建）
  function build() {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;                  // 从静音开始，等待淡入
    master.connect(ctx.destination);

    // 1) 低频主音 55Hz，深空底噪
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 55;
    const g1 = ctx.createGain();
    g1.gain.value = 0.5;

    // 2) 110Hz 轻微谐波，增加一丝厚度
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 110;
    const g2 = ctx.createGain();
    g2.gain.value = 0.18;

    // 3) 星尘风声：棕噪 → 低通滤波
    const noise = ctx.createBufferSource();
    noise.buffer = makeBrownNoise(ctx);
    noise.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 240;
    lp.Q.value = 0.6;
    const gn = ctx.createGain();
    gn.gain.value = 0.30;

    // 4) 极慢 LFO（约 18 秒一周期）调制低通截止频率
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.055;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);

    // 接线
    osc1.connect(g1); g1.connect(master);
    osc2.connect(g2); g2.connect(master);
    noise.connect(lp); lp.connect(gn); gn.connect(master);

    // 启动所有音源
    osc1.start();
    osc2.start();
    noise.start();
    lfo.start();
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
      if (!playing && ctx) ctx.suspend();   // 淡出完成后再挂起，省资源
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
