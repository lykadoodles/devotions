// Dramatized reading: splits verses into narration and spoken lines, and guesses
// who is speaking (male, female, or God) from the words around each quote.
// Works offline for English, Tagalog and Cebuano. When unsure, a line stays with
// the narrator rather than guessing.
//
//   const ctx = newContext(lang, bookIndex);
//   segments(verseText, ctx)  ->  [{ text, role: 'narrator'|'male'|'female'|'god' }]
// ctx carries an open quote and the last-mentioned speaker across verses.

const W = (s) => new Set(s.split(/\s+/).filter(Boolean));

const FEMALE_NAMES = W(`eve sarah sarai hagar rebekah rebecca rachel leah dinah tamar miriam zipporah deborah jael delilah
  naomi ruth orpah hannah peninnah abigail bathsheba michal jezebel esther vashti elizabeth mary martha anna salome
  lydia sapphira rhoda priscilla dorcas tabitha rahab huldah gomer herodias zeresh mahlah abishag athaliah maacah
  eba sara agar rebeca raquel lea dina tamara miryam debora jahel dalila noemi rut ana abigail batseba mical jezabel
  ester elisabet maria marta lidia safira roda priscila tabita rahab`);
const MALE_NAMES = W(`jesus moses abraham abram isaac jacob israel joseph aaron joshua caleb gideon samson samuel saul david
  solomon elijah elisha isaiah jeremiah ezekiel daniel jonah nathan eli boaz laban lot noah adam cain abel esau judah
  reuben benjamin pharaoh balaam balak gehazi naaman ahab jehu hezekiah josiah nebuchadnezzar darius cyrus nehemiah ezra
  mordecai haman job peter simon andrew james john philip bartholomew nathanael thomas matthew judas thaddeus paul
  barnabas silas timothy stephen herod pilate caiaphas zacchaeus nicodemus lazarus zechariah gabriel michael satan festus
  felix agrippa cornelius ananias absalom joab abner jonathan uriah amnon ahithophel hushai shimei rehoboam jeroboam
  hesus moises abraham isaac jacob jose aaron josue samuel saul david solomon elias eliseo isaias jeremias ezequiel
  daniel jonas noe adan cain abel esau juda faraon pedro simon andres santiago juan felipe tomas mateo judas pablo
  bernabe silas timoteo esteban herodes pilato lazaro zacarias satanas absalom`);
const GOD = W(`god lord yahweh jehovah diyos dios panginoon ginoo almighty`);
const FEMALE = W(`woman women she her wife mother daughter girl sister queen maid maidservant widow prostitute lady bride
  mistress midwife babae ina dalaga reyna balo babaye inahan rayna biyuda igsoong`);
const MALE = W(`man he him husband father son boy brother king servant prophet priest angel serpent master lord's
  shepherd officer captain soldier ruler governor elder steward messenger lalaki ama hari propeta pari anghel ahas
  amahan manalagna halas serpente sundalo alagad`);
const CROWD = W(`people crowd they them all disciples men women israelites jews pharisees elders crowds tao sila mga katawhan kanila`);

const VERBS = {
  en: /\b(saying|calling|asking|crying|shouting|praying|answering|replying|said|says|replied|replies|answered|answers|asked|asks|told|tells|called|cried|shouted|declared|commanded|prayed|exclaimed|responded|continued|whispered|warned|insisted|added|urged|begged|announced|spoke|explained|protested|demanded|ordered|instructed|sang|wept|called out|cried out)\b/i,
  tgl: /\b(sinabi|sabi|nagsabi|sinasabi|sumagot|tumugon|sinagot|nagtanong|tinanong|tanong|sumigaw|nanalangin|nagsalita|ipinahayag|iniutos|inutusan|tumawag|tinawag|sagot|wika|winika)\b/i,
  ceb: /\b(miingon|nag-ingon|giingon|ingon|matod|mitubag|nangutana|gipangutana|misinggit|nag-ampo|misulti|gisulti|nagsulti|mipahayag|nagmando|gimandoan|mituaw|nagtubag|mosulti)\b/i,
};

export function newContext(lang = 'en', book = 0) {
  return { lang, book, open: false, role: 'narrator', lastRole: null, lastQuoteRole: null };
}

// Role of a short phrase of words (subject of a speech verb)
function roleOfWords(words, ctx) {
  const toks = words.toLowerCase().replace(/[’']s\b/g, '').split(/[^\p{L}-]+/u).filter(Boolean);
  // nearest to the verb first (scan right to left)
  for (let i = toks.length - 1; i >= 0; i--) {
    const t = toks[i];
    if (t === 'angel' || t === 'anghel') return 'male';
    if (GOD.has(t)) {
      if ((t === 'lord' || t === 'panginoon' || t === 'ginoo') && ctx.book >= 39) return 'male'; // NT "the Lord" is usually Jesus
      return 'god';
    }
    if (FEMALE_NAMES.has(t) || FEMALE.has(t)) return 'female';
    if (MALE_NAMES.has(t) || MALE.has(t)) return 'male';
    if (CROWD.has(t)) return 'narrator';
  }
  return null;
}

// Drops recipient phrases ("to the woman", "sa babae", "ngadto sa babaye") so the
// addressee isn't mistaken for the speaker.
function stripRecipients(s, lang) {
  if (lang === 'en') return s.replace(/\b(to|asked|told|answered|warned|commanded|ordered|urged|begged|called)\s+(the\s+|his\s+|her\s+)?[\p{L}-]+(\s+[\p{Lu}][\p{L}-]+)?/gu, (m, v) => (v.toLowerCase() === 'to' ? '' : v));
  if (lang === 'tgl') return s.replace(/\b(sa|kay|kina)\s+([\p{L}-]+)/gu, '');
  return s.replace(/\b(ngadto sa|ngadto kang|kang|kanila|kaniya)\s*([\p{L}-]+)?/gu, '');
}

// Who is the subject of the speech verb in a clause, or null
function speakerOf(clause, ctx, after) {
  if (!clause) return null;
  const re = VERBS[ctx.lang] || VERBS.en;
  // before a quote, the speech verb closest to the quote is the one that introduces it
  const all = [...clause.matchAll(new RegExp(re.source, 'gi'))];
  const m = after ? all[0] : all[all.length - 1];
  if (!m) return null;
  const before = clause.slice(0, m.index), rest = clause.slice(m.index + m[0].length);
  if (ctx.lang === 'en') {
    if (!before.trim()) return roleOfWords(rest.split(/\b(to|that|and)\b/i)[0], ctx);   // "replied Jesus"
    // the subject is in the last "and …" part: "the LORD called to Samuel, and he answered"
    const near = stripRecipients(before.split(/\band\b|;/i).pop(), 'en');
    const pron = near.match(/\b(she|he|He)\b(?![\s\S]*\b(she|he|He)\b)/);
    if (pron) {
      if (pron[1] === 'she') return 'female';
      const midSentence = /\S/.test(near.slice(0, pron.index)) || /\S/.test(before.slice(0, before.length - near.length));
      if (pron[1] === 'He' && midSentence) return 'god';                                // BSB capitalises "He" for God
      return ctx.lastRole === 'god' && !roleOfWords(near, ctx) ? 'god' : roleOfWords(near, ctx) || 'male';
    }
    return roleOfWords(near, ctx) || roleOfWords(stripRecipients(before, 'en'), ctx);
  }
  // Tagalog / Cebuano: the speaker is marked by ni/ng/si/ang right after the verb
  // (Cebuano also "matod sa"); "sa …" / "ngadto sa …" marks who is spoken to.
  const agentRe = ctx.lang === 'ceb'
    ? /^\s*(?:ni|si|ang)\s+(.+?)(?=\s+(?:sa|kang|ngadto|nga|ug)\b|[,.;:!?]|$)/u
    : /^\s*(?:ni|ng|si|ang)\s+(.+?)(?=\s+(?:sa|kay|kina|at|na)\b|[,.;:!?]|$)/u;
  const agent = (m[0].toLowerCase() === 'matod' ? rest.replace(/^\s*sa\s+/i, ' ang ') : rest).match(agentRe);
  if (agent) { const r = roleOfWords(agent[1], ctx); if (r) return r; }
  const r = agentIn(stripRecipients(before.split(/[.;!?]/).pop() || '', ctx.lang), ctx);
  if (r) return r;
  // gender-neutral pronoun (siya/niya): fall back to whoever was last mentioned
  if (/\b(siya|niya|nila|sila)\b/i.test(clause) && ctx.lastRole) return ctx.lastRole;
  return null;
}

// Tagalog/Cebuano: who acts in a clause. "ni X" (doer of a goal-focus verb) wins,
// then "si X", then the topic "ang X".
function agentIn(text, ctx, order = ['ni', 'si', 'ang']) {
  for (const marker of order) {
    const all = [...text.matchAll(new RegExp(`\\b${marker}\\s+(.+?)(?=\\s+(?:sa|kay|kang|ngadto|ang|ni|si|at|ug|nga|na|ay)\\b|[,.;:!?]|$)`, 'giu'))];
    for (let i = all.length - 1; i >= 0; i--) { const r = roleOfWords(all[i][1], ctx); if (r) return r; }
  }
  return roleOfWords(text, ctx);
}

// Updates "last mentioned" from narration (subjects, not recipients)
function noteMentions(narr, ctx) {
  const r = ctx.lang === 'en'
    ? roleOfWords(stripRecipients(narr, 'en').split(/[,:;]/).slice(-3).join(' '), ctx)
    : narr.split(/[.;!?]/).filter((x) => x.trim()).reverse().reduce((found, sent) => found || agentIn(stripRecipients(sent, ctx.lang), ctx, ['ang', 'si', 'ni']), null);
  if (r && r !== 'narrator') ctx.lastRole = r;
}

// Splits text into [narr, quote, narr, quote...] respecting nested quotes.
function splitQuotes(text, ctx) {
  const t = text.replace(/''/g, '"');
  const parts = []; let buf = '', depth = ctx.open ? 1 : 0, startedOpen = ctx.open;
  const isOpenStraight = (i) => { const p = t[i - 1] || ' ', n = t[i + 1] || ' '; return /[\s(\[—-]/.test(p) && /[\p{L}\d'‘(]/u.test(n); };
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    let open = null;
    if (c === '“') open = true; else if (c === '”') open = false;
    else if (c === '"') open = depth === 0 ? true : isOpenStraight(i) ? true : false;
    if (open === null) { buf += c; continue; }
    if (open) {
      if (depth === 0) { parts.push({ q: false, s: buf }); buf = c; depth = 1; }
      else if (startedOpen && i === 0) { buf += c; }            // paragraph reopen inside a long speech
      else { depth++; buf += c; }                              // nested quote: keep the same speaker
    } else {
      if (depth <= 1) { buf += c; parts.push({ q: true, s: buf }); buf = ''; depth = 0; }
      else { depth--; buf += c; }
    }
  }
  if (buf) parts.push({ q: depth > 0, s: buf });
  return { parts, endsOpen: depth > 0 };
}

export function segments(text, ctx) {
  const plain = (text || '').replace(/\s+/g, ' ').trim();
  if (!plain) return [];
  // A carried-over speech continues only if this verse doesn't open with narration
  if (ctx.open) {
    const first = plain.search(/[“”"]/);
    const firstMark = first >= 0 ? plain[first] : null;
    const inside = first === -1 || first === 0 || firstMark === '”' || (firstMark === '"' && !/[\s(]/.test(plain[first - 1] || ' '));
    if (!inside) ctx.open = false;
  }
  const { parts, endsOpen } = splitQuotes(plain, ctx);
  const out = [];
  parts.forEach((p, i) => {
    if (!p.s.trim()) return;
    if (!p.q) { noteMentions(p.s, ctx); out.push({ text: p.s.trim(), role: 'narrator' }); return; }
    let role = null;
    if (i === 0 && ctx.open) role = ctx.role;                       // continuing a speech from the last verse
    if (!role) role = speakerOf(clauseBefore(parts[i - 1]?.s), ctx);   // "Then God said, “…”"
    if (!role) role = speakerOf(clauseAfter(parts[i + 1]?.s), ctx, true); // "“…,” the woman replied."
    if (!role && parts[i - 2]?.q && ctx.lastQuoteRole) role = ctx.lastQuoteRole; // second half of the same speech
    if (!role && i <= 1 && !(parts[0] && !parts[0].q && parts[0].s.trim()) && ctx.lastQuoteRole && ctx.lastQuoteRole !== 'narrator') role = ctx.lastQuoteRole; // verse opens with more of the same speech
    if (!role) role = 'narrator';
    ctx.lastQuoteRole = role;
    if (role !== 'narrator') ctx.lastRole = role;
    out.push({ text: p.s.trim(), role });
  });
  ctx.open = endsOpen;
  if (endsOpen) ctx.role = out[out.length - 1]?.role || 'narrator';
  // merge neighbours with the same role
  return out.reduce((a, s) => { const l = a[a.length - 1]; if (l && l.role === s.role) l.text += ` ${s.text}`; else a.push({ ...s }); return a; }, []);
}

const clauseBefore = (s) => (s ? s.split(/[.!?;]\s/).pop() : '');
const clauseAfter = (s) => (s ? s.split(/[.!?;:]/)[0] : '');
