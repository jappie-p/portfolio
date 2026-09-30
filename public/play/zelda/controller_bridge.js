// Zelda phone controller → synthetic keyboard events bridge.
// Connects to the same-origin socket.io relay, listens for `input`
// events from phone controllers, and dispatches KeyboardEvents on the
// pygbag canvas so the WASM pygame build sees them as normal key input.

(function () {
  "use strict";

  const CODE_MAP = {
    'w':       {code: 'KeyW',       key: 'w',      keyCode: 87},
    'a':       {code: 'KeyA',       key: 'a',      keyCode: 65},
    's':       {code: 'KeyS',       key: 's',      keyCode: 83},
    'd':       {code: 'KeyD',       key: 'd',      keyCode: 68},
    'i':       {code: 'KeyI',       key: 'i',      keyCode: 73},
    'j':       {code: 'KeyJ',       key: 'j',      keyCode: 74},
    'k':       {code: 'KeyK',       key: 'k',      keyCode: 75},
    'l':       {code: 'KeyL',       key: 'l',      keyCode: 76},
    't':       {code: 'KeyT',       key: 't',      keyCode: 84},
    'f':       {code: 'KeyF',       key: 'f',      keyCode: 70},
    'g':       {code: 'KeyG',       key: 'g',      keyCode: 71},
    'h':       {code: 'KeyH',       key: 'h',      keyCode: 72},
    'y':       {code: 'KeyY',       key: 'y',      keyCode: 89},
    'u':       {code: 'KeyU',       key: 'u',      keyCode: 85},
    'space':   {code: 'Space',      key: ' ',      keyCode: 32},
    'enter':   {code: 'Enter',      key: 'Enter',  keyCode: 13},
    'escape':  {code: 'Escape',     key: 'Escape', keyCode: 27},
    'shift_l': {code: 'ShiftLeft',  key: 'Shift',  keyCode: 16},
    'shift_r': {code: 'ShiftRight', key: 'Shift',  keyCode: 16},
    '1':       {code: 'Digit1', key: '1', keyCode: 49},
    '2':       {code: 'Digit2', key: '2', keyCode: 50},
    '3':       {code: 'Digit3', key: '3', keyCode: 51},
    '4':       {code: 'Digit4', key: '4', keyCode: 52},
    '5':       {code: 'Digit5', key: '5', keyCode: 53},
    '6':       {code: 'Digit6', key: '6', keyCode: 54},
    '7':       {code: 'Digit7', key: '7', keyCode: 55},
    '8':       {code: 'Digit8', key: '8', keyCode: 56},
    '9':       {code: 'Digit9', key: '9', keyCode: 57},
    'kp0':     {code: 'Numpad0', key: '0', keyCode: 96},
    'kp1':     {code: 'Numpad1', key: '1', keyCode: 97},
    'kp2':     {code: 'Numpad2', key: '2', keyCode: 98},
    'kp3':     {code: 'Numpad3', key: '3', keyCode: 99},
    'kp4':     {code: 'Numpad4', key: '4', keyCode: 100},
    'kp5':     {code: 'Numpad5', key: '5', keyCode: 101},
    'kp6':     {code: 'Numpad6', key: '6', keyCode: 102},
    'kp8':     {code: 'Numpad8', key: '8', keyCode: 104},
    'kp_enter':{code: 'NumpadEnter', key: 'Enter', keyCode: 13},
  };

  const PLAYER_KEYS = {
    1: {up:'w',   down:'s',   left:'a',   right:'d',   attack:'space', shield:'shift_l', slot1:'1', slot2:'2', slot3:'3'},
    2: {up:'i',   down:'k',   left:'j',   right:'l',   attack:'enter', shield:'shift_r', slot1:'7', slot2:'8', slot3:'9'},
    3: {up:'t',   down:'g',   left:'f',   right:'h',   attack:'y',     shield:'u',       slot1:'4', slot2:'5', slot3:'6'},
    4: {up:'kp8', down:'kp5', left:'kp4', right:'kp6', attack:'kp0',   shield:'kp_enter',slot1:'kp1',slot2:'kp2',slot3:'kp3'},
  };

  const DEADZONE = 0.15;
  const heldKeys = new Set();
  const lastSlot   = {1:1, 2:1, 3:1, 4:1};
  const lastPaused = {1:false, 2:false, 3:false, 4:false};

  function dispatchKey(type, keyName) {
    const info = CODE_MAP[keyName];
    if (!info) return;
    const opts = {
      key: info.key, code: info.code,
      keyCode: info.keyCode, which: info.keyCode,
      bubbles: true, cancelable: true,
    };
    const ev = new KeyboardEvent(type, opts);
    const canvas = document.getElementById('canvas');
    if (canvas) { try { canvas.dispatchEvent(ev); } catch (e) {} }
    try { document.dispatchEvent(new KeyboardEvent(type, opts)); } catch (e) {}
    try { window.dispatchEvent(new KeyboardEvent(type, opts)); } catch (e) {}
  }

  function keyDown(k) {
    if (heldKeys.has(k)) return;
    heldKeys.add(k);
    dispatchKey('keydown', k);
  }
  function keyUp(k) {
    if (!heldKeys.has(k)) return;
    heldKeys.delete(k);
    dispatchKey('keyup', k);
  }
  function keyTap(k) {
    dispatchKey('keydown', k);
    setTimeout(function () { dispatchKey('keyup', k); }, 30);
  }
  function releaseAll() {
    const copy = Array.from(heldKeys);
    heldKeys.clear();
    for (const k of copy) dispatchKey('keyup', k);
  }

  function handleInput(data) {
    if (!data) return;
    const p = data.player || 1;
    const keys = PLAYER_KEYS[p];
    if (!keys) return;

    const mx = data.moveX || 0;
    const my = data.moveY || 0;

    if (my < -DEADZONE) keyDown(keys.up);   else keyUp(keys.up);
    if (my >  DEADZONE) keyDown(keys.down); else keyUp(keys.down);
    if (mx < -DEADZONE) keyDown(keys.left); else keyUp(keys.left);
    if (mx >  DEADZONE) keyDown(keys.right);else keyUp(keys.right);

    if (data.attack) keyDown(keys.attack); else keyUp(keys.attack);
    if (data.shield) keyDown(keys.shield); else keyUp(keys.shield);

    const slot = data.slot || 1;
    if (slot !== lastSlot[p]) {
      lastSlot[p] = slot;
      const sk = keys['slot' + slot];
      if (sk) keyTap(sk);
    }

    const paused = !!data.paused;
    if (paused !== lastPaused[p]) {
      lastPaused[p] = paused;
      keyTap('escape');
    }
  }

  let _retries = 0;
  function connect() {
    try {
      if (typeof io !== 'function') {
        if (_retries++ > 60) {
          console.warn('[zelda-bridge] gave up waiting for socket.io after 30s');
          return;
        }
        setTimeout(connect, 500);
        return;
      }
      // No relay server exists on this deployment (portfolio host). Try once,
      // fail quietly, and stop — don't retry forever and spam the console.
      const sock = io({ path: '/socket.io/', reconnection: false, timeout: 4000 });
      sock.on('connect', function () {
        try { sock.emit('register', 'game'); } catch (e) {}
        console.log('[zelda-bridge] relay connected; registered as game');
      });
      sock.on('disconnect', function () {
        console.log('[zelda-bridge] relay disconnected');
        try { releaseAll(); } catch (e) {}
      });
      sock.on('input', function (data) {
        try { handleInput(data); } catch (e) { console.warn('[zelda-bridge] handleInput:', e); }
      });
      sock.on('connect_error', function (err) {
        console.warn('[zelda-bridge] connect_error:', err && err.message);
      });
    } catch (e) {
      // Never let the bridge bubble an error to pygbag's global handler
      // (which would alert() and block the game).
      console.warn('[zelda-bridge] connect threw, ignoring:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', connect);
  } else {
    connect();
  }
})();
