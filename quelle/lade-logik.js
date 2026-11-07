// Lädt Einstellungen, Strecken und Physik in Node – exakt dieselben Dateien wie im Spiel.
const fs = require('fs'), path = require('path'), vm = require('vm');
module.exports = function ladeLogik({ ohneMuscheldatei = false } = {}) {
  const ctx = { console, Math, Object, Array, Infinity };
  vm.createContext(ctx);
  ctx.globalThis = ctx;
  const teile = ['1-einstellungen.js', '2-strecken.js', ...(ohneMuscheldatei ? [] : ['2b-muscheln.js']), '3-physik.js', 'bot.js'];
  const code = teile.map(n => fs.readFileSync(path.join(__dirname, n), 'utf8')).join('\n;\n')
    + '\n;globalThis.__ = { K, STRECKEN, GEBIETE, Gelaende, baueStrecke, Lauf, Bot, zufall, berechneMuscheln };';
  vm.runInContext(code, ctx, { filename: 'sonnenrutsch-logik.js' });
  return ctx.__;
};
