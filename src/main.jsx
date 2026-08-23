import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { all, create } from 'mathjs';
import './styles.css';

const math = create(all);
math.import({
  sin: (x) => Math.sin(x),
  cos: (x) => Math.cos(x),
  tan: (x) => Math.tan(x),
  asin: (x) => Math.asin(x),
  acos: (x) => Math.acos(x),
  atan: (x) => Math.atan(x),
}, { override: true });

const STORAGE_KEY = 'scientific-calculator-history';

const basicKeys = [
  ['AC', 'action', 'clear'], ['DEL', 'action', 'delete'], ['(', 'operator'], [')', 'operator'],
  ['7', 'number'], ['8', 'number'], ['9', 'number'], ['÷', 'operator'],
  ['4', 'number'], ['5', 'number'], ['6', 'number'], ['×', 'operator'],
  ['1', 'number'], ['2', 'number'], ['3', 'number'], ['−', 'operator'],
  ['0', 'number wide'], ['.', 'number'], ['%', 'operator'], ['+', 'operator'],
];

const scientificKeys = [
  ['sin', 'function'], ['cos', 'function'], ['tan', 'function'], ['√', 'function'],
  ['sin⁻¹', 'function'], ['cos⁻¹', 'function'], ['tan⁻¹', 'function'], ['x²', 'function'],
  ['log', 'function'], ['ln', 'function'], ['xʸ', 'operator'], ['x!', 'function'],
  ['π', 'constant'], ['e', 'constant'], ['Ans', 'answer'], ['DEG', 'mode'],
];

function formatNumber(value) {
  if (!Number.isFinite(value)) return 'Error';
  if (Math.abs(value) >= 1e12 || (Math.abs(value) > 0 && Math.abs(value) < 1e-9)) {
    return value.toExponential(8).replace(/\.?(0+)(?=e)/, '');
  }
  return Number(value.toPrecision(12)).toString();
}

function App() {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [angleMode, setAngleMode] = useState('DEG');
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  });
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const preview = useMemo(() => {
    if (!expression) return '';
    try {
      return formatNumber(evaluate(expression, angleMode));
    } catch {
      return '';
    }
  }, [expression, angleMode]);

  function append(value) {
    setError('');
    setExpression((current) => current + value);
  }

  function evaluateExpression() {
    if (!expression.trim()) return;
    try {
      const value = evaluate(expression, angleMode);
      const formatted = formatNumber(value);
      if (formatted === 'Error') throw new Error('Invalid result');
      setResult(formatted);
      setHistory((items) => [{ expression, result: formatted }, ...items].slice(0, 30));
      setExpression('');
      setError('');
    } catch {
      setError('Invalid expression');
    }
  }

  function clear() {
    setExpression('');
    setResult('0');
    setError('');
  }

  function removeLast() {
    setExpression((current) => current.slice(0, -1));
    setError('');
  }

  function handleKey(key) {
    if (/^[0-9.]$/.test(key)) return append(key);
    if (key === 'Enter' || key === '=') return evaluateExpression();
    if (key === 'Escape') return clear();
    if (key === 'Backspace') return removeLast();
    const operators = { '+': '+', '-': '-', '*': '×', '/': '÷', '(': '(', ')': ')' };
    if (operators[key]) return append(operators[key]);
  }

  useEffect(() => {
    const onKeyDown = (event) => handleKey(event.key);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  function handleScientific(label) {
    setError('');
    switch (label) {
      case 'sin': case 'cos': case 'tan': case 'log': case 'ln':
        append(`${label}(`); break;
      case 'sin⁻¹': append('asin('); break;
      case 'cos⁻¹': append('acos('); break;
      case 'tan⁻¹': append('atan('); break;
      case '√': append('sqrt('); break;
      case 'x²': append('^2'); break;
      case 'xʸ': append('^'); break;
      case 'x!': append('!'); break;
      case 'π': append('pi'); break;
      case 'e': append('e'); break;
      case 'Ans': append(result); break;
      case 'DEG': setAngleMode((mode) => mode === 'DEG' ? 'RAD' : 'DEG'); break;
      default: break;
    }
  }

  function selectHistory(item) {
    setExpression(item.expression);
    setResult(item.result);
    setShowHistory(false);
  }

  function clearHistory() {
    setHistory([]);
  }

  return (
    <main className="app-shell">
      <section className="calculator-card">
        <header className="topbar">
          <div>
            <p className="eyebrow">PRECISION ENGINE</p>
            <h1>Scientific Calculator</h1>
          </div>
          <button className="history-toggle" onClick={() => setShowHistory((v) => !v)} aria-label="Toggle calculation history">
            <span>↺</span> History
          </button>
        </header>

        <div className="display">
          <div className="display-expression">{expression || 'Ready'}</div>
          <div className="display-preview">{error || preview || result}</div>
        </div>

        <div className="mode-row">
          <span>Scientific mode</span>
          <button className="mode-pill" onClick={() => setAngleMode((mode) => mode === 'DEG' ? 'RAD' : 'DEG')}>
            {angleMode} <span>⌄</span>
          </button>
        </div>

        <div className="scientific-grid">
          {scientificKeys.map(([label, type]) => (
            <button key={label} className={`key scientific ${type}`} onClick={() => handleScientific(label)}>{label}</button>
          ))}
        </div>

        <div className="basic-grid">
          {basicKeys.map(([label, type]) => (
            <button
              key={label}
              className={`key ${type}`}
              onClick={() => type === 'action' ? (label === 'AC' ? clear() : removeLast()) : append(label)}
            >{label}</button>
          ))}
          <button className="key equals" onClick={evaluateExpression}>=</button>
        </div>

        <footer className="footer-hint">Keyboard supported · Calculations saved locally</footer>
      </section>

      {showHistory && (
        <aside className="history-panel">
          <div className="history-header">
            <div><p className="eyebrow">RECENT</p><h2>Calculation history</h2></div>
            <button onClick={clearHistory}>Clear</button>
          </div>
          {history.length === 0 ? (
            <div className="empty-history">No calculations yet.</div>
          ) : history.map((item, index) => (
            <button className="history-item" key={`${item.expression}-${index}`} onClick={() => selectHistory(item)}>
              <span>{item.expression}</span><strong>= {item.result}</strong>
            </button>
          ))}
        </aside>
      )}
    </main>
  );
}

function evaluate(expression, angleMode) {
  const normalized = expression
    .replaceAll('×', '*')
    .replaceAll('÷', '/')
    .replaceAll('−', '-');
  const scope = angleMode === 'DEG'
    ? {
        sin: (x) => Math.sin(x * Math.PI / 180),
        cos: (x) => Math.cos(x * Math.PI / 180),
        tan: (x) => Math.tan(x * Math.PI / 180),
        asin: (x) => Math.asin(x) * 180 / Math.PI,
        acos: (x) => Math.acos(x) * 180 / Math.PI,
        atan: (x) => Math.atan(x) * 180 / Math.PI,
      }
    : {
        sin: Math.sin, cos: Math.cos, tan: Math.tan,
        asin: Math.asin, acos: Math.acos, atan: Math.atan,
      };
  return math.evaluate(normalized, scope);
}

createRoot(document.getElementById('root')).render(<App />);
