// Guided prayers. Opening prayers rotate by weekday; each is a short sequence
// of lines shown one at a time, with a moment of silence.
// Scripture references are cited; wording is original (not quoted from a
// copyrighted translation).

export const OPENING = [
  {
    theme: 'Lead me into all truth',
    refs: 'John 16:13 · Psalm 119:18',
    lines: [
      'Father, I come to you at the start of this time in your Word.',
      'Quiet my heart. Set aside every distraction and every worry.',
      'Holy Spirit, you are the Spirit of truth. Guide me into all truth today.',
      'Open my eyes, that I may see wonderful things in your Word.',
      { silence: 'Take a slow breath. Invite God to speak.' },
      'Give me wisdom to understand, and a willing heart to obey.',
      'Speak, Lord. Your servant is listening. In Jesus’ name, amen.',
    ],
  },
  {
    theme: 'Give me wisdom',
    refs: 'James 1:5 · Proverbs 2:6',
    lines: [
      'Lord, you promised to give wisdom generously to all who ask.',
      'So I ask now: give me wisdom as I read.',
      'The Lord gives wisdom; from your mouth come knowledge and understanding.',
      { silence: 'Bring one decision or concern before God in silence.' },
      'Show me your will in what I read today, and how it touches my life.',
      'Let me not only hear your Word, but do it. In Jesus’ name, amen.',
    ],
  },
  {
    theme: 'Open the eyes of my heart',
    refs: 'Ephesians 1:17–18',
    lines: [
      'God of our Lord Jesus Christ, glorious Father,',
      'give me the Spirit of wisdom and revelation, that I may know you better.',
      'Open the eyes of my heart, so I may see the hope of your calling.',
      { silence: 'Be still. Rest in God’s presence.' },
      'Let your Word become living to me today, not just words on a page.',
      'I receive what you have for me. In Jesus’ name, amen.',
    ],
  },
  {
    theme: 'Show me your ways',
    refs: 'Psalm 25:4–5',
    lines: [
      'Show me your ways, Lord; teach me your paths.',
      'Lead me in your truth and teach me, for you are the God who saves me.',
      'My hope is in you all day long.',
      { silence: 'Surrender this day to God. Hold nothing back.' },
      'As I read, correct what is wrong in me and strengthen what is right.',
      'Lead me in the way everlasting. In Jesus’ name, amen.',
    ],
  },
  {
    theme: 'Fill me with the knowledge of your will',
    refs: 'Colossians 1:9–10',
    lines: [
      'Father, fill me with the knowledge of your will,',
      'through all the wisdom and understanding the Spirit gives.',
      'I want to live a life worthy of you, pleasing you in every way.',
      { silence: 'Ask God: what do you want me to see today?' },
      'Let me grow in knowing you through every page I read.',
      'May my life bear fruit for your glory. In Jesus’ name, amen.',
    ],
  },
  {
    theme: 'Search me and know me',
    refs: 'Psalm 139:23–24 · Hebrews 4:12',
    lines: [
      'Search me, O God, and know my heart.',
      'Your Word is alive and active, sharper than any two-edged sword.',
      'Let it reach the places in me that need your light.',
      { silence: 'Confess anything that stands between you and God.' },
      'Thank you for your mercy, new every morning.',
      'Clean heart, open mind, ready to listen. In Jesus’ name, amen.',
    ],
  },
  {
    theme: 'Teach me to hear your voice',
    refs: 'John 10:27 · Isaiah 30:21',
    lines: [
      'Jesus, you said your sheep hear your voice, and they follow you.',
      'Tune my heart to hear you clearly today.',
      'Whether I turn to the right or the left, let me hear: this is the way, walk in it.',
      { silence: 'Listen. Let God have the first word today.' },
      'Give me understanding of your Word and courage to follow.',
      'I am ready, Lord. In Jesus’ name, amen.',
    ],
  },
];

export const openingFor = (date) => {
  const [y, m, d] = date.split('-').map(Number);
  return OPENING[new Date(y, m - 1, d).getDay()];
};

// Builds the closing prayer from the day's readings and their prayer lines.
export function closingPrayer(items) {
  const lines = ['Father, thank you for speaking to me through your Word today.'];
  for (const it of items) if (it.pray) lines.push(it.pray);
  lines.push({ silence: 'Tell God one thing you are taking with you from today.' });
  const applies = items.filter((it) => it.apply).length;
  if (applies) lines.push('Give me grace to live out what I have learned, not just today but every day.');
  lines.push('Let your Word be a lamp to my feet and a light to my path.');
  lines.push('In Jesus’ name, amen.');
  return { theme: 'Respond to what God said', refs: 'Based on today’s readings', lines };
}
