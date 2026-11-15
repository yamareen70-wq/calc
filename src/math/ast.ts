export type FnName =
  | 'sin'
  | 'cos'
  | 'tan'
  | 'csc'
  | 'sec'
  | 'cot'
  | 'asin'
  | 'acos'
  | 'atan'
  | 'acsc'
  | 'asec'
  | 'acot'
  | 'sinh'
  | 'cosh'
  | 'tanh'
  | 'csch'
  | 'sech'
  | 'coth'
  | 'ln'
  | 'log10'
  | 'log2'
  | 'sqrt'
  | 'cbrt'
  | 'abs'
  | 'floor'
  | 'ceil'
  | 'round'
  | 'sgn'
  | 'asinh'
  | 'acosh'
  | 'atanh'
  | 'fact'
  | 'exp';

export type AngleUnit = 'rad' | 'deg';

export interface EvalOptions {
  angleUnit?: AngleUnit;
}

export type MultiFnName =
  | 'gcd'
  | 'lcm'
  | 'ncr'
  | 'npr'
  | 'mod'
  | 'min'
  | 'max'
  | 'logb';

export type ExprNode =
  | { type: 'num'; value: number }
  | { type: 'const'; name: 'pi' | 'e' }
  | { type: 'var'; name: string }
  | { type: 'neg'; arg: ExprNode }
  | { type: 'add'; args: ExprNode[] }
  | { type: 'mul'; args: ExprNode[] }
  | { type: 'div'; num: ExprNode; den: ExprNode }
  | { type: 'pow'; base: ExprNode; exp: ExprNode }
  | { type: 'fn'; name: FnName; arg: ExprNode }
  | { type: 'call'; name: MultiFnName; args: ExprNode[] };

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

export const num = (value: number): ExprNode => ({ type: 'num', value });
export const symConst = (name: 'pi' | 'e'): ExprNode => ({ type: 'const', name });
export const vari = (name: string): ExprNode => ({ type: 'var', name });
export const neg = (arg: ExprNode): ExprNode => ({ type: 'neg', arg });
export const add = (...args: ExprNode[]): ExprNode => ({ type: 'add', args });
export const sub = (a: ExprNode, b: ExprNode): ExprNode => ({ type: 'add', args: [a, neg(b)] });
export const mul = (...args: ExprNode[]): ExprNode => ({ type: 'mul', args });
export const div = (numNode: ExprNode, denNode: ExprNode): ExprNode => ({
  type: 'div',
  num: numNode,
  den: denNode,
});
export const pow = (base: ExprNode, exp: ExprNode): ExprNode => ({ type: 'pow', base, exp });
export const fn = (name: FnName, arg: ExprNode): ExprNode => ({ type: 'fn', name, arg });

const FN_ALIASES: Record<string, FnName> = {
  sin: 'sin',
  cos: 'cos',
  tan: 'tan',
  tg: 'tan',
  csc: 'csc',
  cosec: 'csc',
  sec: 'sec',
  cot: 'cot',
  ctg: 'cot',
  asin: 'asin',
  arcsin: 'asin',
  acos: 'acos',
  arccos: 'acos',
  atan: 'atan',
  arctan: 'atan',
  acsc: 'acsc',
  arccsc: 'acsc',
  asec: 'asec',
  arcsec: 'asec',
  acot: 'acot',
  arccot: 'acot',
  sinh: 'sinh',
  cosh: 'cosh',
  tanh: 'tanh',
  csch: 'csch',
  sech: 'sech',
  coth: 'coth',
  ln: 'ln',
  log: 'ln',
  log10: 'log10',
  log2: 'log2',
  sqrt: 'sqrt',
  cbrt: 'cbrt',
  abs: 'abs',
  floor: 'floor',
  ceil: 'ceil',
  round: 'round',
  sgn: 'sgn',
  sign: 'sgn',
  asinh: 'asinh',
  arsinh: 'asinh',
  arcsinh: 'asinh',
  acosh: 'acosh',
  arcosh: 'acosh',
  arccosh: 'acosh',
  atanh: 'atanh',
  artanh: 'atanh',
  arctanh: 'atanh',
  fact: 'fact',
  exp: 'exp',
};

export const callFn = (name: MultiFnName, args: ExprNode[]): ExprNode => ({
  type: 'call',
  name,
  args,
});

const MULTI_FN_ALIASES: Record<string, MultiFnName> = {
  gcd: 'gcd',
  hcf: 'gcd',
  lcm: 'lcm',
  ncr: 'ncr',
  comb: 'ncr',
  c: 'ncr',
  npr: 'npr',
  perm: 'npr',
  p: 'npr',
  mod: 'mod',
  rem: 'mod',
  min: 'min',
  max: 'max',
  logb: 'logb',
};

const KNOWN_FN_NAMES = new Set(Object.keys(FN_ALIASES));
const KNOWN_MULTI_FN_NAMES = new Set(Object.keys(MULTI_FN_ALIASES));

type TokenType = 'NUM' | 'IDENT' | 'OP' | 'BANG' | 'COMMA' | 'LPAREN' | 'RPAREN' | 'EOF';

interface Token {
  type: TokenType;
  value: string;
}

const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '^0',
  '¹': '^1',
  '²': '^2',
  '³': '^3',
  '⁴': '^4',
  '⁵': '^5',
  '⁶': '^6',
  '⁷': '^7',
  '⁸': '^8',
  '⁹': '^9',
};

export function normalizeInput(raw: string): string {
  let s = raw.trim();
  s = s
    .replace(/^[∫\s]+/, '')
    .replace(/^(?:f\s*\(\s*[a-zA-Z]\s*\)|y)\s*=\s*/i, '')
    .replace(/(?:^|[\s*)])d[xtuy]\s*$/i, (m) => (m.startsWith(')') || m.startsWith('*') ? m[0] : ''))
    .replace(/×|·|⋅/g, '*')
    .replace(/÷/g, '/')
    .replace(/−|–|—/g, '-')
    .replace(/π/g, 'pi')
    .replace(/∞/g, 'inf')
    .replace(/√\s*\(/g, 'sqrt(')
    .replace(/√\s*([a-zA-Z0-9_]+)/g, 'sqrt($1)')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (m) => SUPERSCRIPT_MAP[m] ?? m)
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')');
  return s.trim();
}

function tokenize(input: string): Token[] {
  const s = normalizeInput(input);
  const tokens: Token[] = [];
  let i = 0;

  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < s.length && /[0-9]/.test(s[i + 1]))) {
      let start = i;
      let dotSeen = false;
      while (i < s.length && (/[0-9]/.test(s[i]) || (s[i] === '.' && !dotSeen))) {
        if (s[i] === '.') dotSeen = true;
        i++;
      }
      tokens.push({ type: 'NUM', value: s.slice(start, i) });
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let start = i;
      while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) {
        i++;
      }
      const word = s.slice(start, i).toLowerCase();
      // Split glued identifiers like "2pix" or "xsin" or "ex" carefully
      // Check if full word is a known function or constant
      if (
        KNOWN_FN_NAMES.has(word) ||
        (KNOWN_MULTI_FN_NAMES.has(word) && word !== 'c' && word !== 'p') ||
        word === 'pi' ||
        word === 'inf' ||
        word === 'oo'
      ) {
        tokens.push({ type: 'IDENT', value: word });
      } else if (word.length === 1) {
        tokens.push({ type: 'IDENT', value: word });
      } else {
        // Attempt greedy split from left for known functions/constants, else single chars
        let pos = 0;
        while (pos < word.length) {
          let matched = '';
          const multiCands = [...KNOWN_MULTI_FN_NAMES].filter((k) => k.length > 1);
          for (const candidate of [...KNOWN_FN_NAMES, ...multiCands, 'pi', 'inf', 'oo']) {
            if (word.startsWith(candidate, pos) && candidate.length > matched.length) {
              matched = candidate;
            }
          }
          if (matched) {
            tokens.push({ type: 'IDENT', value: matched });
            pos += matched.length;
          } else {
            tokens.push({ type: 'IDENT', value: word[pos] });
            pos += 1;
          }
        }
      }
      continue;
    }

    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
      tokens.push({ type: 'OP', value: ch });
      i++;
      continue;
    }

    if (ch === '!') {
      tokens.push({ type: 'BANG', value: '!' });
      i++;
      continue;
    }

    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ',' });
      i++;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }

    if (ch === '|') {
      // Convert paired |...| to abs(...) in a pre-pass or reject cleanly
      throw new ParseError('استخدم الدالة abs(...) بدلاً من علامة القيمة المطلقة |...|');
    }

    throw new ParseError(`رمز غير معروف في التعبير الرياضي: "${ch}"`);
  }

  tokens.push({ type: 'EOF', value: '' });
  return tokens;
}

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
  }

  private consume(): Token {
    const t = this.peek();
    this.pos++;
    return t;
  }

  private isImplicitMulStart(tok: Token): boolean {
    if (tok.type === 'NUM' || tok.type === 'LPAREN' || tok.type === 'IDENT') {
      return true;
    }
    return false;
  }

  parse(): ExprNode {
    if (this.peek().type === 'EOF') {
      throw new ParseError('الرجاء إدخال دالة رياضية للمكاملة.');
    }
    const expr = this.parseAddSub();
    if (this.peek().type !== 'EOF') {
      const t = this.peek();
      if (t.type === 'RPAREN') {
        throw new ParseError('يوجد قوس إغلاق ")" إضافي غير متطابق.');
      }
      throw new ParseError(`تعبير غير مكتمل بالقرب من "${t.value}".`);
    }
    return expr;
  }

  private parseAddSub(): ExprNode {
    const terms: ExprNode[] = [this.parseMulDiv()];
    while (this.peek().type === 'OP' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.consume().value;
      const right = this.parseMulDiv();
      terms.push(op === '+' ? right : neg(right));
    }
    return terms.length === 1 ? terms[0] : add(...terms);
  }

  private parseMulDiv(): ExprNode {
    let left = this.parseUnary();
    while (true) {
      const tok = this.peek();
      if (tok.type === 'OP' && (tok.value === '*' || tok.value === '/')) {
        const op = this.consume().value;
        const right = this.parseUnary();
        left = op === '*' ? this.combineMul(left, right) : div(left, right);
      } else if (this.isImplicitMulStart(tok)) {
        const right = this.parseUnary();
        left = this.combineMul(left, right);
      } else {
        break;
      }
    }
    return left;
  }

  private combineMul(a: ExprNode, b: ExprNode): ExprNode {
    if (a.type === 'mul') {
      return { type: 'mul', args: [...a.args, b] };
    }
    return mul(a, b);
  }

  private parseUnary(): ExprNode {
    if (this.peek().type === 'OP' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.consume().value;
      const operand = this.parseUnary();
      return op === '-' ? neg(operand) : operand;
    }
    return this.parsePower();
  }

  private parsePower(): ExprNode {
    const base = this.parsePostfix();
    if (this.peek().type === 'OP' && this.peek().value === '^') {
      this.consume();
      const exponent = this.parseUnary();
      return pow(base, exponent);
    }
    return base;
  }

  private parsePostfix(): ExprNode {
    let node = this.parsePrimary();
    while (this.peek().type === 'BANG') {
      this.consume();
      node = fn('fact', node);
    }
    return node;
  }

  private parseArgList(fnLabel: string): ExprNode[] {
    this.consume(); // LPAREN
    if (this.peek().type === 'RPAREN') {
      throw new ParseError(`الدالة "${fnLabel}" تحتاج إلى معاملات داخل الأقواس.`);
    }
    const args: ExprNode[] = [this.parseAddSub()];
    while (this.peek().type === 'COMMA') {
      this.consume();
      args.push(this.parseAddSub());
    }
    if (this.peek().type !== 'RPAREN') {
      throw new ParseError(`أغلق القوس بعد الدالة "${fnLabel}(".`);
    }
    this.consume();
    return args;
  }

  private parsePrimary(): ExprNode {
    const tok = this.peek();

    if (tok.type === 'NUM') {
      this.consume();
      const val = Number(tok.value);
      if (!Number.isFinite(val)) {
        throw new ParseError(`الرقم "${tok.value}" غير صالح.`);
      }
      return num(val);
    }

    if (tok.type === 'LPAREN') {
      this.consume();
      const inner = this.parseAddSub();
      if (this.peek().type !== 'RPAREN') {
        throw new ParseError('يوجد قوس مفتوح "(" بدون قوس إغلاق ")".');
      }
      this.consume();
      return inner;
    }

    if (tok.type === 'IDENT') {
      this.consume();
      const name = tok.value;

      if (name === 'pi') return symConst('pi');
      if (name === 'e') return symConst('e');

      // Special 2-arg log(base, x) vs 1-arg log(x)
      if (name === 'log' && this.peek().type === 'LPAREN') {
        const args = this.parseArgList('log');
        if (args.length === 1) return fn('ln', args[0]);
        if (args.length === 2) return callFn('logb', args);
        throw new ParseError('الدالة log تقبل معاملًا واحدًا أو معاملين (الأساس، العدد).');
      }

      if (KNOWN_MULTI_FN_NAMES.has(name) && !(name.length === 1 && this.peek().type !== 'LPAREN')) {
        if (this.peek().type !== 'LPAREN') {
          throw new ParseError(`الدالة "${name}" تحتاج إلى أقواس ومعاملات مثل ${name}(a, b).`);
        }
        const mName = MULTI_FN_ALIASES[name];
        const args = this.parseArgList(name);
        if ((mName === 'ncr' || mName === 'npr' || mName === 'mod' || mName === 'logb') && args.length !== 2) {
          throw new ParseError(`الدالة "${name}" تتطلب معاملين بالضبط مفصولين بفاصلة.`);
        }
        if ((mName === 'gcd' || mName === 'lcm' || mName === 'min' || mName === 'max') && args.length < 2) {
          throw new ParseError(`الدالة "${name}" تتطلب معاملين على الأقل مفصولين بفاصلة.`);
        }
        return callFn(mName, args);
      }

      if (KNOWN_FN_NAMES.has(name)) {
        const fnName = FN_ALIASES[name];
        // Support sin^2(x) or cos^3(x)
        let fnPower: ExprNode | null = null;
        if (this.peek().type === 'OP' && this.peek().value === '^') {
          this.consume();
          fnPower = this.parseUnary();
        }
        let arg: ExprNode;
        if (this.peek().type === 'LPAREN') {
          this.consume();
          arg = this.parseAddSub();
          if (this.peek().type !== 'RPAREN') {
            throw new ParseError(`أغلق القوس بعد الدالة "${name}(".`);
          }
          this.consume();
        } else if (this.peek().type === 'IDENT' || this.peek().type === 'NUM') {
          // Allow sin x or cos 2x
          arg = this.parsePower();
        } else {
          throw new ParseError(`الدالة "${name}" تحتاج إلى معامل مثل ${name}(x).`);
        }
        const call = fn(fnName, arg);
        return fnPower ? pow(call, fnPower) : call;
      }

      return vari(name);
    }

    throw new ParseError('بنية التعبير الرياضي غير مكتملة أو تحتوي على معامل مفقود.');
  }
}

export function parseExpr(input: string): ExprNode {
  const tokens = tokenize(input);
  const parser = new Parser(tokens);
  return simplify(parser.parse());
}

export function isConstant(node: ExprNode, variable = 'x'): boolean {
  switch (node.type) {
    case 'num':
    case 'const':
      return true;
    case 'var':
      return node.name !== variable;
    case 'neg':
    case 'fn':
      return isConstant(node.arg, variable);
    case 'add':
    case 'mul':
      return node.args.every((a) => isConstant(a, variable));
    case 'call':
      return node.args.every((a) => isConstant(a, variable));
    case 'div':
      return isConstant(node.num, variable) && isConstant(node.den, variable);
    case 'pow':
      return isConstant(node.base, variable) && isConstant(node.exp, variable);
  }
}

export function getVariables(node: ExprNode): Set<string> {
  const vars = new Set<string>();
  const walk = (n: ExprNode) => {
    switch (n.type) {
      case 'var':
        vars.add(n.name);
        break;
      case 'neg':
      case 'fn':
        walk(n.arg);
        break;
      case 'add':
      case 'mul':
      case 'call':
        n.args.forEach(walk);
        break;
      case 'div':
        walk(n.num);
        walk(n.den);
        break;
      case 'pow':
        walk(n.base);
        walk(n.exp);
        break;
    }
  };
  walk(node);
  return vars;
}

function gcdTwo(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  if (x === 0 && y === 0) return 0;
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

function lcmTwo(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
  const x = Math.abs(Math.round(a));
  const y = Math.abs(Math.round(b));
  if (x === 0 || y === 0) return 0;
  return (x / gcdTwo(x, y)) * y;
}

function gammaFn(z: number): number {
  const g = 7;
  const p = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gammaFn(1 - z));
  const zm1 = z - 1;
  let x = p[0];
  for (let i = 1; i < g + 2; i++) x += p[i] / (zm1 + i);
  const t = zm1 + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, zm1 + 0.5) * Math.exp(-t) * x;
}

function factorialVal(v: number): number {
  if (!Number.isFinite(v)) return NaN;
  if (v < 0 && Math.abs(v - Math.round(v)) < 1e-11) return NaN;
  if (v >= 0 && Math.abs(v - Math.round(v)) < 1e-11) {
    const n = Math.round(v);
    if (n > 170) return Infinity;
    let acc = 1;
    for (let k = 2; k <= n; k++) acc *= k;
    return acc;
  }
  return gammaFn(v + 1);
}

function calcNpr(n: number, r: number): number {
  if (!Number.isFinite(n) || !Number.isFinite(r)) return NaN;
  const rn = Math.round(n);
  const rr = Math.round(r);
  if (Math.abs(n - rn) < 1e-10 && Math.abs(r - rr) < 1e-10 && rn >= 0) {
    if (rr < 0 || rr > rn) return 0;
    let acc = 1;
    for (let k = 0; k < rr; k++) acc *= rn - k;
    return acc;
  }
  return factorialVal(n) / factorialVal(n - r);
}

function calcNcr(n: number, r: number): number {
  if (!Number.isFinite(n) || !Number.isFinite(r)) return NaN;
  const rn = Math.round(n);
  const rr = Math.round(r);
  if (Math.abs(n - rn) < 1e-10 && Math.abs(r - rr) < 1e-10 && rn >= 0) {
    if (rr < 0 || rr > rn) return 0;
    const kEff = Math.min(rr, rn - rr);
    let acc = 1;
    for (let k = 1; k <= kEff; k++) {
      acc = (acc * (rn - kEff + k)) / k;
    }
    return Math.round(acc);
  }
  return factorialVal(n) / (factorialVal(r) * factorialVal(n - r));
}

export function evaluate(
  node: ExprNode,
  vars: Record<string, number> = {},
  opts?: EvalOptions
): number {
  const isDeg = opts?.angleUnit === 'deg';
  const toRad = (x: number) => (isDeg ? (x * Math.PI) / 180 : x);
  const fromRad = (x: number) => (isDeg ? (x * 180) / Math.PI : x);

  switch (node.type) {
    case 'num':
      return node.value;
    case 'const':
      return node.name === 'pi' ? Math.PI : Math.E;
    case 'var':
      return vars[node.name] ?? NaN;
    case 'neg':
      return -evaluate(node.arg, vars, opts);
    case 'add': {
      let s = 0;
      for (const a of node.args) s += evaluate(a, vars, opts);
      return s;
    }
    case 'mul': {
      let p = 1;
      for (const a of node.args) p *= evaluate(a, vars, opts);
      return p;
    }
    case 'div': {
      const d = evaluate(node.den, vars, opts);
      if (d === 0) return NaN;
      return evaluate(node.num, vars, opts) / d;
    }
    case 'pow': {
      const b = evaluate(node.base, vars, opts);
      const ex = evaluate(node.exp, vars, opts);
      if (b < 0 && !Number.isInteger(ex)) {
        // Handle odd integer roots like (-8)^(1/3)
        const frac = toExactFraction(ex);
        if (frac && Math.abs(frac.d % 2) === 1) {
          return (frac.n % 2 === 0 ? 1 : -1) * Math.pow(Math.abs(b), ex);
        }
        return NaN;
      }
      return Math.pow(b, ex);
    }
    case 'call': {
      const vals = node.args.map((a) => evaluate(a, vars, opts));
      if (vals.some((x) => !Number.isFinite(x))) return NaN;
      switch (node.name) {
        case 'gcd':
          return vals.reduce((acc, cur) => gcdTwo(acc, cur));
        case 'lcm':
          return vals.reduce((acc, cur) => lcmTwo(acc, cur));
        case 'ncr':
          return calcNcr(vals[0], vals[1]);
        case 'npr':
          return calcNpr(vals[0], vals[1]);
        case 'mod': {
          const b = vals[1];
          if (b === 0) return NaN;
          return vals[0] - b * Math.floor(vals[0] / b);
        }
        case 'min':
          return Math.min(...vals);
        case 'max':
          return Math.max(...vals);
        case 'logb': {
          const base = vals[0];
          const x = vals[1];
          if (base <= 0 || base === 1 || x <= 0) return NaN;
          return Math.log(x) / Math.log(base);
        }
      }
    }
    case 'fn': {
      const v = evaluate(node.arg, vars, opts);
      switch (node.name) {
        case 'sin': {
          const r = toRad(v);
          const res = Math.sin(r);
          return Math.abs(res) < 1e-15 ? 0 : res;
        }
        case 'cos': {
          const r = toRad(v);
          const res = Math.cos(r);
          return Math.abs(res) < 1e-15 ? 0 : res;
        }
        case 'tan': {
          const r = toRad(v);
          return Math.abs(Math.cos(r)) < 1e-12 ? NaN : Math.tan(r);
        }
        case 'csc': {
          const s = Math.sin(toRad(v));
          return Math.abs(s) < 1e-12 ? NaN : 1 / s;
        }
        case 'sec': {
          const c = Math.cos(toRad(v));
          return Math.abs(c) < 1e-12 ? NaN : 1 / c;
        }
        case 'cot': {
          const r = toRad(v);
          const s = Math.sin(r);
          return Math.abs(s) < 1e-12 ? NaN : Math.cos(r) / s;
        }
        case 'asin':
          return fromRad(Math.asin(v));
        case 'acos':
          return fromRad(Math.acos(v));
        case 'atan':
          return fromRad(Math.atan(v));
        case 'acsc':
          return Math.abs(v) < 1 ? NaN : fromRad(Math.asin(1 / v));
        case 'asec':
          return Math.abs(v) < 1 ? NaN : fromRad(Math.acos(1 / v));
        case 'acot':
          return v === 0 ? fromRad(Math.PI / 2) : fromRad(Math.atan(1 / v));
        case 'sinh':
          return Math.sinh(v);
        case 'cosh':
          return Math.cosh(v);
        case 'tanh':
          return Math.tanh(v);
        case 'csch':
          return v === 0 ? NaN : 1 / Math.sinh(v);
        case 'sech':
          return 1 / Math.cosh(v);
        case 'coth':
          return v === 0 ? NaN : Math.cosh(v) / Math.sinh(v);
        case 'ln':
          return v <= 0 ? NaN : Math.log(v);
        case 'log10':
          return v <= 0 ? NaN : Math.log10(v);
        case 'log2':
          return v <= 0 ? NaN : Math.log2(v);
        case 'sqrt':
          return v < 0 ? NaN : Math.sqrt(v);
        case 'cbrt':
          return Math.cbrt(v);
        case 'abs':
          return Math.abs(v);
        case 'floor':
          return Math.floor(v);
        case 'ceil':
          return Math.ceil(v);
        case 'round':
          return Math.round(v);
        case 'sgn':
          return Number.isNaN(v) ? NaN : v > 0 ? 1 : v < 0 ? -1 : 0;
        case 'asinh':
          return Math.asinh(v);
        case 'acosh':
          return v < 1 ? NaN : Math.acosh(v);
        case 'atanh':
          return Math.abs(v) >= 1 ? NaN : Math.atanh(v);
        case 'fact':
          return factorialVal(v);
        case 'exp':
          return Math.exp(v);
      }
    }
  }
}

export function nodeEquals(a: ExprNode, b: ExprNode): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case 'num':
      return Math.abs(a.value - (b as typeof a).value) < 1e-12;
    case 'const':
      return a.name === (b as typeof a).name;
    case 'var':
      return a.name === (b as typeof a).name;
    case 'neg':
      return nodeEquals(a.arg, (b as typeof a).arg);
    case 'fn':
      return a.name === (b as typeof a).name && nodeEquals(a.arg, (b as typeof a).arg);
    case 'call': {
      const bc = b as typeof a;
      return (
        a.name === bc.name &&
        a.args.length === bc.args.length &&
        a.args.every((arg, i) => nodeEquals(arg, bc.args[i]))
      );
    }
    case 'div':
      return nodeEquals(a.num, (b as typeof a).num) && nodeEquals(a.den, (b as typeof a).den);
    case 'pow':
      return nodeEquals(a.base, (b as typeof a).base) && nodeEquals(a.exp, (b as typeof a).exp);
    case 'add':
    case 'mul': {
      const bArgs = (b as typeof a).args;
      if (a.args.length !== bArgs.length) return false;
      const used = new Array(bArgs.length).fill(false);
      for (const item of a.args) {
        const idx = bArgs.findIndex((cand, j) => !used[j] && nodeEquals(item, cand));
        if (idx === -1) return false;
        used[idx] = true;
      }
      return true;
    }
  }
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function toExactFraction(val: number, maxDen = 10000): { n: number; d: number } | null {
  if (!Number.isFinite(val)) return null;
  if (Math.abs(val) < 1e-12) return { n: 0, d: 1 };
  if (Math.abs(val - Math.round(val)) < 1e-10) {
    return { n: Math.round(val), d: 1 };
  }
  const sign = val < 0 ? -1 : 1;
  const x = Math.abs(val);
  let h1 = 1;
  let h2 = 0;
  let k1 = 0;
  let k2 = 1;
  let b = x;
  for (let i = 0; i < 20; i++) {
    const a = Math.floor(b);
    const auxH = h1;
    h1 = a * h1 + h2;
    h2 = auxH;
    const auxK = k1;
    k1 = a * k1 + k2;
    k2 = auxK;
    if (k1 > maxDen) break;
    if (Math.abs(x - h1 / k1) < 1e-9) {
      const g = gcd(h1, k1);
      return { n: sign * (h1 / g), d: k1 / g };
    }
    const rem = b - a;
    if (rem < 1e-12) break;
    b = 1 / rem;
  }
  return null;
}

export function makeRational(n: number, d: number): ExprNode {
  if (d === 0) return num(NaN);
  if (n === 0) return num(0);
  const sign = (n < 0) !== (d < 0) ? -1 : 1;
  const an = Math.abs(n);
  const ad = Math.abs(d);
  if (Number.isInteger(an) && Number.isInteger(ad)) {
    const g = gcd(an, ad);
    const rn = (sign * an) / g;
    const rd = ad / g;
    if (rd === 1) return num(rn);
    return div(num(rn), num(rd));
  }
  return num(n / d);
}

function splitCoeffAndBase(node: ExprNode): { coeff: number; rest: ExprNode[] } {
  if (node.type === 'num') return { coeff: node.value, rest: [] };
  if (node.type === 'neg') {
    const inner = splitCoeffAndBase(node.arg);
    return { coeff: -inner.coeff, rest: inner.rest };
  }
  if (node.type === 'div' && node.num.type === 'num' && node.den.type === 'num') {
    return { coeff: node.num.value / node.den.value, rest: [] };
  }
  if (node.type === 'mul') {
    let coeff = 1;
    const rest: ExprNode[] = [];
    for (const arg of node.args) {
      if (arg.type === 'num') {
        coeff *= arg.value;
      } else if (arg.type === 'div' && arg.num.type === 'num' && arg.den.type === 'num') {
        coeff *= arg.num.value / arg.den.value;
      } else {
        rest.push(arg);
      }
    }
    return { coeff, rest };
  }
  return { coeff: 1, rest: [node] };
}

function buildScaledTerm(coeff: number, rest: ExprNode[]): ExprNode {
  if (Math.abs(coeff) < 1e-12) return num(0);
  const frac = toExactFraction(coeff);
  const absCoeffNode =
    frac && frac.d > 1
      ? div(num(Math.abs(frac.n)), num(frac.d))
      : num(frac ? Math.abs(frac.n) : Math.abs(coeff));

  if (rest.length === 0) {
    return coeff < 0 ? neg(absCoeffNode) : absCoeffNode;
  }

  const baseProd = rest.length === 1 ? rest[0] : mul(...rest);
  if (Math.abs(Math.abs(coeff) - 1) < 1e-11) {
    return coeff < 0 ? neg(baseProd) : baseProd;
  }

  // If fractional like (1/3) * x, render cleanly as (1/3) * x or x/3
  if (frac && frac.d > 1 && Math.abs(frac.n) === 1) {
    const dNode = div(baseProd, num(frac.d));
    return coeff < 0 ? neg(dNode) : dNode;
  }
  if (frac && frac.d > 1) {
    const dNode = div(mul(num(Math.abs(frac.n)), baseProd), num(frac.d));
    return coeff < 0 ? neg(dNode) : dNode;
  }

  const positive = mul(num(Math.abs(frac ? frac.n : coeff)), baseProd);
  return coeff < 0 ? neg(positive) : positive;
}

interface PowerGroup {
  base: ExprNode;
  exp: number;
  symExps: ExprNode[];
}

function getNumericExp(e: ExprNode): number | null {
  if (e.type === 'num') return e.value;
  if (e.type === 'div' && e.num.type === 'num' && e.den.type === 'num' && e.den.value !== 0) {
    return e.num.value / e.den.value;
  }
  if (e.type === 'neg') {
    const inner = getNumericExp(e.arg);
    return inner !== null ? -inner : null;
  }
  return null;
}

function groupPowerList(factors: ExprNode[]): PowerGroup[] {
  const grouped: PowerGroup[] = [];
  for (const f of factors) {
    let base = f;
    let expNum = 1;
    let symExp: ExprNode | null = null;
    if (f.type === 'fn' && f.name === 'sqrt') {
      base = f.arg;
      expNum = 0.5;
    } else if (f.type === 'pow') {
      base = f.base;
      const ne = getNumericExp(f.exp);
      if (ne !== null) {
        expNum = ne;
      } else {
        expNum = 0;
        symExp = f.exp;
      }
    }
    const existing = grouped.find((g) => nodeEquals(g.base, base));
    if (existing) {
      existing.exp += expNum;
      if (symExp) existing.symExps.push(symExp);
    } else {
      grouped.push({ base, exp: expNum, symExps: symExp ? [symExp] : [] });
    }
  }
  return grouped;
}

function rebuildPowerList(grouped: PowerGroup[]): ExprNode[] {
  const out: ExprNode[] = [];
  for (const g of grouped) {
    if (g.symExps.length === 0) {
      if (Math.abs(g.exp) < 1e-12) continue;
      if (Math.abs(g.exp - 1) < 1e-12) out.push(g.base);
      else if (Math.abs(g.exp - 0.5) < 1e-12) out.push(fn('sqrt', g.base));
      else {
        const frac = toExactFraction(g.exp, 100);
        const expNode = frac && frac.d > 1 ? div(num(frac.n), num(frac.d)) : num(g.exp);
        out.push(pow(g.base, expNode));
      }
    } else {
      const allExps = g.exp !== 0 ? [num(g.exp), ...g.symExps] : g.symExps;
      const totalExp = simplify(allExps.length === 1 ? allExps[0] : add(...allExps));
      out.push(simplify(pow(g.base, totalExp)));
    }
  }
  return out;
}

export function simplify(node: ExprNode): ExprNode {
  switch (node.type) {
    case 'num':
      return Math.abs(node.value) < 1e-12 ? num(0) : node;
    case 'const':
    case 'var':
      return node;
    case 'neg': {
      const inner = simplify(node.arg);
      if (inner.type === 'num') return num(-inner.value);
      if (inner.type === 'neg') return inner.arg;
      if (inner.type === 'div' && inner.num.type === 'num') {
        return div(num(-inner.num.value), inner.den);
      }
      return neg(inner);
    }
    case 'call':
      return callFn(
        node.name,
        node.args.map((a) => simplify(a))
      );
    case 'fn': {
      const arg = simplify(node.arg);
      if (node.name === 'exp') {
        return simplify(pow(symConst('e'), arg));
      }
      if (node.name === 'ln' && arg.type === 'const' && arg.name === 'e') {
        return num(1);
      }
      if (node.name === 'ln' && arg.type === 'num' && Math.abs(arg.value - 1) < 1e-12) {
        return num(0);
      }
      if (node.name === 'sqrt' && arg.type === 'num' && arg.value >= 0) {
        const r = Math.sqrt(arg.value);
        if (Number.isInteger(r)) return num(r);
      }
      return fn(node.name, arg);
    }
    case 'pow': {
      const base = simplify(node.base);
      const exp = simplify(node.exp);
      if (exp.type === 'num' && Math.abs(exp.value) < 1e-12) return num(1);
      if (exp.type === 'num' && Math.abs(exp.value - 1) < 1e-12) return base;
      if (base.type === 'num' && Math.abs(base.value - 1) < 1e-12) return num(1);
      if (base.type === 'num' && Math.abs(base.value) < 1e-12) return num(0);
      if (base.type === 'num' && exp.type === 'num') {
        const res = Math.pow(base.value, exp.value);
        if (Number.isInteger(res) && Math.abs(res) < 1e9) return num(res);
      }
      if (base.type === 'pow') {
        return simplify(pow(base.base, mul(base.exp, exp)));
      }
      return pow(base, exp);
    }
    case 'div': {
      const n = simplify(node.num);
      const d = simplify(node.den);
      if (n.type === 'num' && Math.abs(n.value) < 1e-12) return num(0);
      if (d.type === 'num' && Math.abs(d.value - 1) < 1e-12) return n;
      if (d.type === 'num' && Math.abs(d.value + 1) < 1e-12) return simplify(neg(n));
      if (n.type === 'num' && d.type === 'num' && d.value !== 0) {
        const frac = toExactFraction(n.value / d.value);
        if (frac) {
          if (frac.d === 1) return num(frac.n);
          return div(num(frac.n), num(frac.d));
        }
      }
      // Unwrap nested divisions cleanly
      if (n.type === 'div' && d.type === 'div') {
        return simplify(div(mul(n.num, d.den), mul(n.den, d.num)));
      }
      if (n.type === 'div') {
        return simplify(div(n.num, mul(n.den, d)));
      }
      if (d.type === 'div') {
        return simplify(div(mul(n, d.den), d.num));
      }
      if (nodeEquals(n, d)) return num(1);
      if (d.type === 'num' && d.value < 0) {
        return simplify(neg(div(n, num(-d.value))));
      }
      if (n.type === 'neg') {
        return simplify(neg(div(n.arg, d)));
      }

      // Cancel common symbolic factors / exponents between numerator and denominator
      const numSplit = splitCoeffAndBase(n);
      const denSplit = splitCoeffAndBase(d);
      if (numSplit.rest.length > 0 && denSplit.rest.length > 0) {
        const numMap = groupPowerList(numSplit.rest);
        const denMap = groupPowerList(denSplit.rest);
        let cancelledAny = false;

        for (const df of denMap) {
          const match = numMap.find(
            (nf) => nodeEquals(nf.base, df.base) && nf.symExps.length === 0 && df.symExps.length === 0
          );
          if (match) {
            const diffExp = match.exp - df.exp;
            cancelledAny = true;
            if (Math.abs(diffExp) < 1e-12) {
              match.exp = 0;
              df.exp = 0;
            } else if (diffExp > 0) {
              match.exp = diffExp;
              df.exp = 0;
            } else {
              match.exp = 0;
              df.exp = -diffExp;
            }
          }
        }

        if (cancelledAny) {
          const nRem = rebuildPowerList(numMap);
          const dRem = rebuildPowerList(denMap);
          const ratio = numSplit.coeff / denSplit.coeff;
          const topNode = buildScaledTerm(ratio, nRem);
          if (dRem.length === 0) return topNode;
          const botNode = dRem.length === 1 ? dRem[0] : mul(...dRem);
          return simplify(div(topNode, botNode));
        }
      }

      // Pull rational factor inside numerator if n is (k * rest) and d is num
      if (d.type === 'num' && Number.isInteger(d.value)) {
        const { coeff, rest } = splitCoeffAndBase(n);
        if (rest.length > 0) {
          const combined = coeff / d.value;
          const frac = toExactFraction(combined);
          if (frac) {
            if (frac.d === 1) return buildScaledTerm(frac.n, rest);
            const numPart =
              Math.abs(frac.n) === 1
                ? rest.length === 1
                  ? rest[0]
                  : mul(...rest)
                : mul(num(Math.abs(frac.n)), ...(rest.length === 1 ? [rest[0]] : rest));
            const positive = div(numPart, num(frac.d));
            return frac.n < 0 ? neg(positive) : positive;
          }
        }
      }
      return div(n, d);
    }
    case 'mul': {
      const flat: ExprNode[] = [];
      for (const a of node.args) {
        const sa = simplify(a);
        if (sa.type === 'mul') {
          flat.push(...sa.args);
        } else {
          flat.push(sa);
        }
      }

      let coeff = 1;
      let denFactor = 1;
      const numFactors: ExprNode[] = [];
      const denFactors: ExprNode[] = [];

      for (const item of flat) {
        if (item.type === 'num') {
          coeff *= item.value;
        } else if (item.type === 'neg') {
          coeff *= -1;
          const inner = simplify(item.arg);
          if (inner.type === 'num') coeff *= inner.value;
          else if (inner.type === 'div') {
            numFactors.push(inner.num);
            denFactors.push(inner.den);
          } else numFactors.push(inner);
        } else if (item.type === 'div') {
          if (item.num.type === 'num' && item.den.type === 'num') {
            coeff *= item.num.value;
            denFactor *= item.den.value;
          } else {
            if (!(item.num.type === 'num' && item.num.value === 1)) {
              numFactors.push(item.num);
            }
            denFactors.push(item.den);
          }
        } else {
          numFactors.push(item);
        }
      }

      if (Math.abs(coeff) < 1e-12) return num(0);

      // Combine identical bases in numFactors into powers
      const grouped = groupPowerList(numFactors);
      const combinedFactors = rebuildPowerList(grouped);

      const ratio = coeff / denFactor;
      if (denFactors.length === 0) {
        return buildScaledTerm(ratio, combinedFactors);
      }

      const mergedDen = denFactors.length === 1 ? denFactors[0] : simplify(mul(...denFactors));
      const mergedNum = buildScaledTerm(ratio, combinedFactors);
      return simplify(div(mergedNum, mergedDen));
    }
    case 'add': {
      const flat: ExprNode[] = [];
      for (const a of node.args) {
        const sa = simplify(a);
        if (sa.type === 'add') {
          flat.push(...sa.args);
        } else if (!(sa.type === 'num' && Math.abs(sa.value) < 1e-12)) {
          flat.push(sa);
        }
      }

      if (flat.length === 0) return num(0);
      if (flat.length === 1) return flat[0];

      // Group like terms
      const buckets: { coeff: number; rest: ExprNode[] }[] = [];
      for (const term of flat) {
        const { coeff, rest } = splitCoeffAndBase(term);
        const match = buckets.find((b) => {
          if (b.rest.length !== rest.length) return false;
          if (rest.length === 0) return true;
          const used = new Array(rest.length).fill(false);
          return b.rest.every((r) => {
            const idx = rest.findIndex((cand, j) => !used[j] && nodeEquals(r, cand));
            if (idx === -1) return false;
            used[idx] = true;
            return true;
          });
        });
        if (match) {
          match.coeff += coeff;
        } else {
          buckets.push({ coeff, rest });
        }
      }

      const rebuilt = buckets
        .filter((b) => Math.abs(b.coeff) >= 1e-12)
        .map((b) => buildScaledTerm(b.coeff, b.rest));

      if (rebuilt.length === 0) return num(0);
      if (rebuilt.length === 1) return rebuilt[0];
      return { type: 'add', args: rebuilt };
    }
  }
}

export function substitute(node: ExprNode, varName: string, replacement: ExprNode): ExprNode {
  switch (node.type) {
    case 'num':
    case 'const':
      return node;
    case 'var':
      return node.name === varName ? replacement : node;
    case 'neg':
      return neg(substitute(node.arg, varName, replacement));
    case 'fn':
      return fn(node.name, substitute(node.arg, varName, replacement));
    case 'call':
      return callFn(
        node.name,
        node.args.map((a) => substitute(a, varName, replacement))
      );
    case 'add':
      return add(...node.args.map((a) => substitute(a, varName, replacement)));
    case 'mul':
      return mul(...node.args.map((a) => substitute(a, varName, replacement)));
    case 'div':
      return div(substitute(node.num, varName, replacement), substitute(node.den, varName, replacement));
    case 'pow':
      return pow(substitute(node.base, varName, replacement), substitute(node.exp, varName, replacement));
  }
}

export function differentiate(node: ExprNode, v = 'x'): ExprNode {
  return simplify(diffRaw(node, v));
}

function diffRaw(node: ExprNode, v: string): ExprNode {
  switch (node.type) {
    case 'num':
    case 'const':
      return num(0);
    case 'var':
      return num(node.name === v ? 1 : 0);
    case 'neg':
      return neg(diffRaw(node.arg, v));
    case 'add':
      return add(...node.args.map((a) => diffRaw(a, v)));
    case 'mul': {
      if (node.args.length === 0) return num(0);
      if (node.args.length === 1) return diffRaw(node.args[0], v);
      const terms: ExprNode[] = [];
      for (let i = 0; i < node.args.length; i++) {
        const factors = node.args.map((a, j) => (i === j ? diffRaw(a, v) : a));
        terms.push(mul(...factors));
      }
      return add(...terms);
    }
    case 'div': {
      const f = node.num;
      const g = node.den;
      if (isConstant(g, v)) {
        return div(diffRaw(f, v), g);
      }
      return div(sub(mul(diffRaw(f, v), g), mul(f, diffRaw(g, v))), pow(g, num(2)));
    }
    case 'pow': {
      const base = node.base;
      const exp = node.exp;
      const baseConst = isConstant(base, v);
      const expConst = isConstant(exp, v);
      if (baseConst && expConst) return num(0);
      if (expConst) {
        return mul(exp, pow(base, sub(exp, num(1))), diffRaw(base, v));
      }
      if (baseConst) {
        if (base.type === 'const' && base.name === 'e') {
          return mul(node, diffRaw(exp, v));
        }
        return mul(node, fn('ln', base), diffRaw(exp, v));
      }
      // f(x)^g(x)
      return mul(
        node,
        add(mul(diffRaw(exp, v), fn('ln', base)), mul(exp, div(diffRaw(base, v), base)))
      );
    }
    case 'fn': {
      const u = node.arg;
      const du = diffRaw(u, v);
      let outer: ExprNode;
      switch (node.name) {
        case 'sin':
          outer = fn('cos', u);
          break;
        case 'cos':
          outer = neg(fn('sin', u));
          break;
        case 'tan':
          outer = pow(fn('sec', u), num(2));
          break;
        case 'csc':
          outer = neg(mul(fn('csc', u), fn('cot', u)));
          break;
        case 'sec':
          outer = mul(fn('sec', u), fn('tan', u));
          break;
        case 'cot':
          outer = neg(pow(fn('csc', u), num(2)));
          break;
        case 'asin':
          outer = div(num(1), fn('sqrt', sub(num(1), pow(u, num(2)))));
          break;
        case 'acos':
          outer = neg(div(num(1), fn('sqrt', sub(num(1), pow(u, num(2))))));
          break;
        case 'atan':
          outer = div(num(1), add(num(1), pow(u, num(2))));
          break;
        case 'acsc':
          outer = neg(div(num(1), mul(fn('abs', u), fn('sqrt', sub(pow(u, num(2)), num(1))))));
          break;
        case 'asec':
          outer = div(num(1), mul(fn('abs', u), fn('sqrt', sub(pow(u, num(2)), num(1)))));
          break;
        case 'acot':
          outer = neg(div(num(1), add(num(1), pow(u, num(2)))));
          break;
        case 'sinh':
          outer = fn('cosh', u);
          break;
        case 'cosh':
          outer = fn('sinh', u);
          break;
        case 'tanh':
          outer = pow(fn('sech', u), num(2));
          break;
        case 'csch':
          outer = neg(mul(fn('csch', u), fn('coth', u)));
          break;
        case 'sech':
          outer = neg(mul(fn('sech', u), fn('tanh', u)));
          break;
        case 'coth':
          outer = neg(pow(fn('csch', u), num(2)));
          break;
        case 'ln':
          outer = div(num(1), u);
          break;
        case 'log10':
          outer = div(num(1), mul(u, fn('ln', num(10))));
          break;
        case 'log2':
          outer = div(num(1), mul(u, fn('ln', num(2))));
          break;
        case 'sqrt':
          outer = div(num(1), mul(num(2), fn('sqrt', u)));
          break;
        case 'cbrt':
          outer = div(num(1), mul(num(3), pow(fn('cbrt', u), num(2))));
          break;
        case 'abs':
          outer = div(u, fn('abs', u));
          break;
        case 'floor':
        case 'ceil':
        case 'round':
        case 'sgn':
        case 'fact':
          outer = num(0);
          break;
        case 'asinh':
          outer = div(num(1), fn('sqrt', add(pow(u, num(2)), num(1))));
          break;
        case 'acosh':
          outer = div(num(1), fn('sqrt', sub(pow(u, num(2)), num(1))));
          break;
        case 'atanh':
          outer = div(num(1), sub(num(1), pow(u, num(2))));
          break;
        case 'exp':
          outer = fn('exp', u);
          break;
      }
      return mul(outer, du);
    }
    case 'call':
      return num(0);
  }
}

function formatNumberLatex(val: number): string {
  if (Math.abs(val) < 1e-12) return '0';
  if (Number.isInteger(val)) return String(val);
  const frac = toExactFraction(val, 1000);
  if (frac && frac.d > 1 && frac.d <= 200) {
    return frac.n < 0
      ? `-\\frac{${Math.abs(frac.n)}}{${frac.d}}`
      : `\\frac{${frac.n}}{${frac.d}}`;
  }
  return Number(val.toPrecision(6)).toString();
}

function needsMulDot(prev: ExprNode, next: ExprNode): boolean {
  const prevEndsInDigit = prev.type === 'num' || (prev.type === 'pow' && prev.exp.type === 'num');
  const nextStartsWithDigit =
    next.type === 'num' ||
    (next.type === 'pow' && next.base.type === 'num') ||
    (next.type === 'div' && next.num.type === 'num');
  if (prevEndsInDigit && nextStartsWithDigit) return true;
  if (prev.type === 'num' && next.type === 'num') return true;
  return false;
}

export function toLatex(node: ExprNode, parentPrec = 0): string {
  switch (node.type) {
    case 'num': {
      const s = formatNumberLatex(node.value);
      return node.value < 0 && parentPrec > 1 ? `\\left(${s}\\right)` : s;
    }
    case 'const':
      return node.name === 'pi' ? '\\pi' : 'e';
    case 'var':
      return node.name;
    case 'neg': {
      const inner = toLatex(node.arg, 2);
      const needsParen = node.arg.type === 'add';
      const s = needsParen ? `-\\left(${toLatex(node.arg, 0)}\\right)` : `-${inner}`;
      return parentPrec > 2 ? `\\left(${s}\\right)` : s;
    }
    case 'add': {
      if (node.args.length === 0) return '0';
      let out = toLatex(node.args[0], 1);
      for (let i = 1; i < node.args.length; i++) {
        const term = node.args[i];
        if (term.type === 'neg') {
          const inner = toLatex(term.arg, 1);
          out += term.arg.type === 'add' ? ` - \\left(${inner}\\right)` : ` - ${inner}`;
        } else if (term.type === 'num' && term.value < 0) {
          out += ` - ${formatNumberLatex(Math.abs(term.value))}`;
        } else {
          const rendered = toLatex(term, 1);
          if (rendered.startsWith('-')) {
            out += ` - ${rendered.slice(1)}`;
          } else {
            out += ` + ${rendered}`;
          }
        }
      }
      return parentPrec > 1 ? `\\left(${out}\\right)` : out;
    }
    case 'mul': {
      if (node.args.length === 0) return '1';
      let out = '';
      for (let i = 0; i < node.args.length; i++) {
        const curr = node.args[i];
        const part =
          curr.type === 'add'
            ? `\\left(${toLatex(curr, 0)}\\right)`
            : curr.type === 'neg'
              ? `\\left(${toLatex(curr, 0)}\\right)`
              : toLatex(curr, 2);
        if (i === 0) {
          out = part;
        } else {
          const sep = needsMulDot(node.args[i - 1], curr) ? ' \\cdot ' : ' ';
          out += sep + part;
        }
      }
      return parentPrec > 2 ? `\\left(${out}\\right)` : out;
    }
    case 'div': {
      const s = `\\frac{${toLatex(node.num, 0)}}{${toLatex(node.den, 0)}}`;
      return s;
    }
    case 'pow': {
      if (node.base.type === 'fn' && node.base.name !== 'sqrt' && node.base.name !== 'abs' && node.base.name !== 'exp') {
        const fnLatex = fnNameLatex(node.base.name);
        const argLatex = toLatex(node.base.arg, 0);
        const expLatex = toLatex(node.exp, 0);
        return `${fnLatex}^{${expLatex}}\\left(${argLatex}\\right)`;
      }
      const needsParen =
        node.base.type === 'add' ||
        node.base.type === 'mul' ||
        node.base.type === 'div' ||
        node.base.type === 'neg' ||
        node.base.type === 'pow' ||
        (node.base.type === 'num' && node.base.value < 0);
      const baseStr = needsParen ? `\\left(${toLatex(node.base, 0)}\\right)` : toLatex(node.base, 3);
      return `${baseStr}^{${toLatex(node.exp, 0)}}`;
    }
    case 'fn': {
      const argStr = toLatex(node.arg, 0);
      if (node.name === 'sqrt') return `\\sqrt{${argStr}}`;
      if (node.name === 'cbrt') return `\\sqrt[3]{${argStr}}`;
      if (node.name === 'abs') return `\\left|${argStr}\\right|`;
      if (node.name === 'floor') return `\\left\\lfloor ${argStr} \\right\\rfloor`;
      if (node.name === 'ceil') return `\\left\\lceil ${argStr} \\right\\rceil`;
      if (node.name === 'fact') {
        const simple = node.arg.type === 'num' || node.arg.type === 'var';
        return simple ? `${argStr}!` : `\\left(${argStr}\\right)!`;
      }
      if (node.name === 'exp') return `e^{${argStr}}`;
      return `${fnNameLatex(node.name)}\\left(${argStr}\\right)`;
    }
    case 'call': {
      const rendered = node.args.map((a) => toLatex(a, 0));
      switch (node.name) {
        case 'gcd':
          return `\\gcd\\left(${rendered.join(', ')}\\right)`;
        case 'lcm':
          return `\\operatorname{lcm}\\left(${rendered.join(', ')}\\right)`;
        case 'ncr':
          return `\\binom{${rendered[0]}}{${rendered[1]}}`;
        case 'npr':
          return `{}^{${rendered[0]}}P_{${rendered[1]}}`;
        case 'mod':
          return `\\left(${rendered[0]} \\bmod ${rendered[1]}\\right)`;
        case 'min':
          return `\\min\\left(${rendered.join(', ')}\\right)`;
        case 'max':
          return `\\max\\left(${rendered.join(', ')}\\right)`;
        case 'logb':
          return `\\log_{${rendered[0]}}\\left(${rendered[1]}\\right)`;
      }
    }
  }
}

function fnNameLatex(name: FnName): string {
  switch (name) {
    case 'asin':
      return '\\arcsin';
    case 'acos':
      return '\\arccos';
    case 'atan':
      return '\\arctan';
    case 'acsc':
      return '\\operatorname{arccsc}';
    case 'asec':
      return '\\operatorname{arcsec}';
    case 'acot':
      return '\\operatorname{arccot}';
    case 'asinh':
      return '\\sinh^{-1}';
    case 'acosh':
      return '\\cosh^{-1}';
    case 'atanh':
      return '\\tanh^{-1}';
    case 'log10':
      return '\\log_{10}';
    case 'log2':
      return '\\log_{2}';
    case 'round':
      return '\\operatorname{round}';
    case 'sgn':
      return '\\operatorname{sgn}';
    case 'csch':
      return '\\operatorname{csch}';
    case 'sech':
      return '\\operatorname{sech}';
    default:
      return `\\${name}`;
  }
}

export function toText(node: ExprNode, parentPrec = 0): string {
  switch (node.type) {
    case 'num':
      return String(Number(node.value.toPrecision(8)));
    case 'const':
      return node.name;
    case 'var':
      return node.name;
    case 'neg': {
      const inner = toText(node.arg, 2);
      return node.arg.type === 'add' ? `-(${inner})` : `-${inner}`;
    }
    case 'add': {
      if (node.args.length === 0) return '0';
      let out = toText(node.args[0], 1);
      for (let i = 1; i < node.args.length; i++) {
        const term = node.args[i];
        if (term.type === 'neg') {
          out += ` - ${toText(term.arg, 1)}`;
        } else {
          const s = toText(term, 1);
          out += s.startsWith('-') ? ` - ${s.slice(1)}` : ` + ${s}`;
        }
      }
      return parentPrec > 1 ? `(${out})` : out;
    }
    case 'mul': {
      const out = node.args.map((a) => toText(a, 2)).join(' * ');
      return parentPrec > 2 ? `(${out})` : out;
    }
    case 'div':
      return `(${toText(node.num, 2)} / ${toText(node.den, 2)})`;
    case 'pow': {
      const b =
        node.base.type === 'add' || node.base.type === 'mul' || node.base.type === 'div' || node.base.type === 'neg'
          ? `(${toText(node.base, 0)})`
          : toText(node.base, 3);
      return `${b}^(${toText(node.exp, 0)})`;
    }
    case 'fn':
      return `${node.name}(${toText(node.arg, 0)})`;
    case 'call':
      return `${node.name}(${node.args.map((a) => toText(a, 0)).join(', ')})`;
  }
}
