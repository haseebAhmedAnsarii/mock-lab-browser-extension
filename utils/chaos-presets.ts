import { TextStressPreset } from './types';

export const CHAOS_PRESETS: TextStressPreset[] = [
  // 1. Extreme Length
  {
    id: 'length_100',
    category: 'extreme_length',
    name: '100 Chars String',
    description: 'Medium length string to test single-line truncation ellipsis',
    value: 'The quick brown fox jumps over the lazy dog repeatedly to test truncation and boundary overflow.',
  },
  {
    id: 'length_500',
    category: 'extreme_length',
    name: '500 Chars Paragraph',
    description: 'Long paragraph to verify multi-line wrapping and card container stretch',
    value:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Vivamus suscipit tortor eget felis porttitor volutpat.',
  },
  {
    id: 'length_2500',
    category: 'extreme_length',
    name: '2500 Chars Mega Text',
    description: 'Extreme length text block to test modal scrolling, fixed heights, and severe overflow',
    value:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(45) +
      'Extreme Stress Payload End.',
  },

  // 2. Overflow Words (No spaces)
  {
    id: 'german_compound',
    category: 'overflow_words',
    name: 'German Compound (80 Chars)',
    description: 'Single unspaced word: Donaudampfschifffahrtselektrizitätenhauptbetriebswerkbauunterbeamtengesellschaft',
    value: 'Donaudampfschifffahrtselektrizitätenhauptbetriebswerkbauunterbeamtengesellschaft',
  },
  {
    id: 'unbroken_alphanumeric',
    category: 'overflow_words',
    name: 'Unbroken Alphanumeric Token',
    description: 'Long token to verify overflow-wrap: break-word behavior',
    value: 'Token_ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz_0123456789_VERY_LONG_UNBROKEN_STRING_TEST_XYZ123',
  },
  {
    id: 'long_url',
    category: 'overflow_words',
    name: 'Super Long URL',
    description: 'Unbroken URL to check link overflow inside tables and cards',
    value: 'https://api.example.com/v2/workspaces/ws_alpha_99482710/projects/proj_881923/environments/production/metrics?timeframe=30d&aggregation=p99&sort=timestamp_desc&filter=status_code_gte_500&client_session_uuid=99887766-5544-3322-1100-aabbccddeeff',
  },

  // 3. Foreign Alphabets & RTL
  {
    id: 'arabic_rtl',
    category: 'rtl_languages',
    name: 'Arabic (RTL Direction)',
    description: 'Tests bidirectional text alignment, flex-start vs flex-end, and Arabic glyph shaping',
    value: 'مرحبا بالعالم! هذا نص تجريبي باللغة العربية لاختبار اتجاه الكتابة من اليمين إلى اليسار وتأثيره على محاذاة العناصر والحاويات.',
  },
  {
    id: 'hebrew_rtl',
    category: 'rtl_languages',
    name: 'Hebrew (RTL Direction)',
    description: 'Tests Hebrew characters and right-to-left layout wrapping',
    value: 'שלום עולם! זוהי מחרוזת בדיקה בעברית כדי לבדוק גלישת טקסט, יישור מימין לשמאל ומניעת חריגה מגבולות המכולה.',
  },
  {
    id: 'cjk_japanese',
    category: 'rtl_languages',
    name: 'CJK Japanese Mixed',
    description: 'Kanji, Hiragana, and Katakana text wrapping without word delimiters',
    value: 'こんにちは世界！これは境界とオーバーフローをテストするための非常に長い日本語の文字列です。ひらがな、カタカナ、漢字が混在しています。コンテナが適切に折り返されるか確認してください。',
  },
  {
    id: 'devanagari_hindi',
    category: 'rtl_languages',
    name: 'Hindi (Devanagari)',
    description: 'Complex Indic conjunct ligatures and diacritics',
    value: 'नमस्ते दुनिया! यह टेक्स्ट ओवरफ़्लो और रैपिंग का परीक्षण करने के लिए एक लंबा देवनागरी टेक्स्ट है जिसमें संयुक्त अक्षर शामिल हैं।',
  },

  // 4. Special Unicode & Emojis
  {
    id: 'unicode_emojis',
    category: 'special_unicode',
    name: 'Complex Emojis & Modifiers',
    description: 'Tests ZWJ sequences, skin tones, flags, and emoji rendering height',
    value: '👨‍👩‍👧‍👦 🏳️‍🌈 🧑🏽‍💻 🚀 🔥 ✨ 🧙‍♂️ 🧟‍♀️ 🧘🏾 🦄 🛸 🪐 📦 🧪 ⚡ 🎯 💥',
  },
  {
    id: 'math_currency',
    category: 'special_unicode',
    name: 'Math & Currency Symbols',
    description: 'Special symbols, operators, and global currency glyphs',
    value: '€1,234.50 • ¥99,000 • £850.99 • ₹75,000 • ₿0.4521 • ∑(x_i) ≥ √∞ ± 42% ≈ ∆θ',
  },

  // 5. Zalgo / Combining Diacritics
  {
    id: 'zalgo_diacritics',
    category: 'zalgo_diacritics',
    name: 'Zalgo Text (Vertical Overflow)',
    description: 'Excessive vertical combining diacritics that exceed line-height boxes',
    value: 'Ţ̵̈́h̶̛̗ï̸̤s̶͉̒ ̴̠́ḯ̶̗ś̵͈ ̶̬̈Ź̸͚ä̵̖l̶̗̈́ǵ̵̬ö̴͈ ̷̬̈T̶̖̈́é̵̬ẍ̶̗́t̶͈́ ̵̗̈ẗ̴͈ó̵̯ ̷̗̈c̷̢̈́h̵̛̗ë̵̯ć̵͈k̷̬̈ ̸̖̈́v̵̬́ë̴͈r̷̗̈́t̵͈́ï̸̤ć̵͈ä̴͈l̸̖̈ ̴̠́ö̴͈v̵̬́ë̴͈r̷̗̈́f̵̬́l̴̗̈́ö̴͈ẃ̵̬',
  },

  // 6. HTML / XSS Injection Vectors
  {
    id: 'html_script_tags',
    category: 'html_xss_vectors',
    name: 'HTML & Script Tags',
    description: 'Verifies whether raw strings are escaped or accidentally rendered as live HTML/XSS',
    value: '<script>alert("XSS")</script><img src="x" onerror="alert(1)" /><b>Bold & Special &amp; &lt;&gt;</b>',
  },

  // 7. Invisible / Zero-Width Chars
  {
    id: 'zero_width_spaces',
    category: 'zero_width',
    name: 'Zero-Width Infiltrator',
    description: 'String containing invisible zero-width spaces (\u200B) between letters',
    value: 'T\u200Be\u200Bs\u200Bt\u200Bi\u200Bn\u200Bg\u200B \u200BI\u200Bn\u200Bv\u200Bi\u200Bs\u200Bi\u200Bb\u200Bl\u200Be\u200B \u200BC\u200Bh\u200Ba\u200Br\u200Ba\u200Bc\u200Bt\u200Be\u200Br\u200Bs\u200B',
  },
];

