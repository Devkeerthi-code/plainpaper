/* Fictional sample content for the PlainPaper static demo. Every company, person and figure here is fictional. */
window.PP_DATA = (function () {
  var pages = [
    {
      n: 1,
      head: true,
      clauses: [
        { id: 'c1', num: '1', title: 'Appointment', text: 'You are appointed to the position of Graduate Engineer Trainee in the Platform Engineering department, reporting to the Engineering Manager or such other person as the Company may designate from time to time.' },
        { id: 'c2', num: '2', title: 'Date of joining', text: 'Your date of joining shall be 4 January 2027. Should you fail to report on the said date, this offer shall stand withdrawn without further notice.' },
        { id: 'c3', num: '3', title: 'Place of posting', text: 'You will be posted at the Company’s Bengaluru office. The Company reserves the right to transfer you to any of its offices, sites or client locations in India.' },
        { id: 'c4', num: '4', title: 'Remuneration', text: 'Your annual Cost to Company (CTC) shall be ₹8,00,000 (Rupees Eight Lakh only), the break-up of which is set out in Annexure A. Remuneration is subject to deduction of applicable taxes and statutory contributions.' },
        { id: 'c5', num: '5', title: 'Probation', text: 'You shall be on probation for a period of six (6) months from the date of joining, which may be extended at the sole discretion of the Company. During probation, either party may terminate employment with fifteen (15) days’ notice.' },
        { id: 'c6', num: '6', title: 'Hours of work', text: 'Standard working hours are 9:30 a.m. to 6:30 p.m., Monday to Friday. You may be required to work additional hours as business needs dictate.' }
      ]
    },
    {
      n: 2,
      clauses: [
        { id: 'c7', num: '7', title: 'Service agreement', text: 'In consideration of the training to be provided, you agree to serve the Company for a minimum period of twenty-four (24) months from the date of joining. Should you resign or be terminated for cause before completion of this period, you shall be liable to pay the Company a sum of ₹2,00,000 (Rupees Two Lakh only) towards training costs.' },
        { id: 'c8', num: '8', title: 'Notice period', text: 'Upon confirmation, either party may terminate this employment by giving ninety (90) days’ written notice or salary in lieu thereof. The Company may, at its discretion, waive or shorten the notice period.' },
        { id: 'c9', num: '9', title: 'Restrictive covenant', text: 'You shall not, for a period of twelve (12) months after cessation of employment, join any competitor of the Company or solicit any employee or client of the Company.' },
        { id: 'c10', num: '10', title: 'Confidentiality', text: 'You shall keep all proprietary information of the Company strictly confidential during and after the term of your employment.' },
        { id: 'c11', num: '11', title: 'Background verification', text: 'This offer is conditional upon satisfactory verification of your educational credentials, previous employment (if any) and identity documents.' }
      ],
      annex: {
        id: 'cA',
        title: 'Annexure A — Compensation break-up (annual, ₹)',
        rows: [
          { id: 'cA-basic', k: 'Basic salary', v: '3,20,000' },
          { id: 'cA-hra', k: 'House rent allowance', v: '1,28,000' },
          { id: 'cA-spl', k: 'Special allowance', v: '2,18,208' },
          { id: 'cA-pf', k: 'Employer contribution to PF', v: '38,400' },
          { id: 'cA-grat', k: 'Gratuity', v: '15,392' },
          { id: 'cA-var', k: 'Performance-linked variable pay (target) — payable annually, subject to individual and company performance', v: '80,000' }
        ],
        total: '8,00,000'
      }
    }
  ];

  var src = {
    c1: 'p.1 · clause 1', c2: 'p.1 · clause 2', c3: 'p.1 · clause 3', c4: 'p.1 · clause 4', c5: 'p.1 · clause 5',
    c7: 'p.2 · clause 7', c8: 'p.2 · clause 8', c9: 'p.2 · clause 9', cA: 'p.2 · Annexure A', 'cA-var': 'p.2 · Annexure A'
  };

  var ui = {
    en: { short: 'In short', facts: 'The key facts', watch: 'Watch out', ask: 'Questions to ask before you sign', copy: 'Copy questions', why: 'Why it matters', toAsk: 'What to ask', quote: 'What it says', keep: 'Kept until 15 Dec 2026, then deleted on its own.', amber: 'Worth a careful look', red: 'Ask before you sign', things: 'things to look at before you sign' },
    hi: { short: 'संक्षेप में', facts: 'मुख्य बातें', watch: 'ध्यान दें', ask: 'साइन करने से पहले ये पूछें', copy: 'सवाल कॉपी करें', why: 'यह क्यों ज़रूरी है', toAsk: 'क्या पूछें', quote: 'दस्तावेज़ में लिखा है', keep: '15 दिसंबर 2026 तक रखा जाएगा, फिर अपने-आप हट जाएगा।', amber: 'ध्यान से देखें', red: 'साइन से पहले पूछें', things: 'बातें जो साइन से पहले देखनी चाहिए' },
    ta: { short: 'சுருக்கமாக', facts: 'முக்கிய விவரங்கள்', watch: 'கவனிக்கவும்', ask: 'கையெழுத்திடும் முன் கேட்க வேண்டியவை', copy: 'கேள்விகளை நகலெடு', why: 'இது ஏன் முக்கியம்', toAsk: 'என்ன கேட்பது', quote: 'ஆவணத்தில் உள்ளது', keep: '15 டிசம்பர் 2026 வரை வைக்கப்படும், பிறகு தானாக நீக்கப்படும்.', amber: 'கவனமாகப் பாருங்கள்', red: 'கையெழுத்திடும் முன் கேளுங்கள்', things: 'கையெழுத்திடும் முன் பார்க்க வேண்டியவை' }
  };

  var summary = {
    en: 'Northwind Fictional is offering you the role of Graduate Engineer Trainee in Bengaluru, starting 4 January 2027. The offer says ₹8,00,000 a year (CTC), but <strong>about ₹52,100 will reach your bank account each month</strong>. You will be on probation for 6 months. If you leave within 2 years, you must pay back ₹2,00,000. After probation, you must give 90 days’ notice before leaving.',
    hi: 'नॉर्थविंड फ़िक्शनल आपको बेंगलुरु में ग्रेजुएट इंजीनियर ट्रेनी की नौकरी दे रही है, जो 4 जनवरी 2027 से शुरू होगी। ऑफ़र में साल का ₹8,00,000 (CTC) लिखा है, लेकिन <strong>हर महीने आपके बैंक खाते में लगभग ₹52,100 आएँगे</strong>। पहले 6 महीने आप प्रोबेशन पर रहेंगे। अगर आप 2 साल के अंदर नौकरी छोड़ते हैं, तो आपको ₹2,00,000 वापस देने होंगे। प्रोबेशन के बाद नौकरी छोड़ने से पहले 90 दिन का नोटिस देना होगा।',
    ta: 'நார்த்விண்ட் ஃபிக்ஷனல் நிறுவனம் உங்களுக்கு பெங்களூருவில் கிராஜுவேட் இன்ஜினியர் ட்ரெய்னி வேலையை வழங்குகிறது. வேலை 4 ஜனவரி 2027 அன்று தொடங்கும். ஆஃபரில் ஆண்டுக்கு ₹8,00,000 (CTC) என்று உள்ளது, ஆனால் <strong>ஒவ்வொரு மாதமும் உங்கள் வங்கிக் கணக்கில் சுமார் ₹52,100 மட்டுமே வரும்</strong>. முதல் 6 மாதங்கள் நீங்கள் ப்ரொபேஷனில் இருப்பீர்கள். 2 ஆண்டுகளுக்குள் வேலையை விட்டால், ₹2,00,000 திருப்பிச் செலுத்த வேண்டும். ப்ரொபேஷனுக்குப் பிறகு, வேலையை விடும் முன் 90 நாள் நோட்டீஸ் கொடுக்க வேண்டும்.'
  };

  var fields = [
    { key: 'role', ref: 'c1', label: { en: 'Role', hi: 'पद', ta: 'பதவி' }, value: { en: 'Graduate Engineer Trainee', hi: 'ग्रेजुएट इंजीनियर ट्रेनी', ta: 'கிராஜுவேட் இன்ஜினியர் ட்ரெய்னி' } },
    { key: 'join', ref: 'c2', label: { en: 'Joining date', hi: 'जॉइनिंग की तारीख', ta: 'சேரும் தேதி' }, value: { en: '4 Jan 2027', hi: '4 जनवरी 2027', ta: '4 ஜனவரி 2027' } },
    { key: 'loc', ref: 'c3', label: { en: 'Work location', hi: 'काम की जगह', ta: 'பணியிடம்' }, value: { en: 'Bengaluru office (can be transferred)', hi: 'बेंगलुरु ऑफ़िस (ट्रांसफ़र हो सकता है)', ta: 'பெங்களூரு அலுவலகம் (இடமாற்றம் சாத்தியம்)' } },
    { key: 'ctc', ref: 'c4', label: { en: 'CTC (yearly)', hi: 'CTC (सालाना)', ta: 'CTC (ஆண்டுக்கு)' }, value: { en: '₹8,00,000', hi: '₹8,00,000', ta: '₹8,00,000' } },
    { key: 'inhand', ref: 'cA', label: { en: 'Lands in your account', hi: 'हर महीने खाते में', ta: 'மாதம் கணக்கில் வருவது' }, value: { en: '≈ ₹52,100 a month', hi: '≈ ₹52,100 हर महीने', ta: '≈ ₹52,100 மாதம்' }, link: 'pay' },
    { key: 'var', ref: 'cA-var', label: { en: 'Variable pay', hi: 'वेरिएबल पे', ta: 'மாறும் ஊதியம்' }, value: { en: '₹80,000 a year, not guaranteed', hi: '₹80,000 सालाना, पक्का नहीं', ta: 'ஆண்டுக்கு ₹80,000, உறுதி இல்லை' } },
    { key: 'prob', ref: 'c5', label: { en: 'Probation', hi: 'प्रोबेशन', ta: 'ப்ரொபேஷன்' }, value: { en: '6 months (can be extended)', hi: '6 महीने (बढ़ सकता है)', ta: '6 மாதங்கள் (நீட்டிக்கப்படலாம்)' } },
    { key: 'notice', ref: 'c8', label: { en: 'Notice period', hi: 'नोटिस पीरियड', ta: 'நோட்டீஸ் காலம்' }, value: { en: '90 days (15 during probation)', hi: '90 दिन (प्रोबेशन में 15)', ta: '90 நாட்கள் (ப்ரொபேஷனில் 15)' }, flag: 'red' },
    { key: 'bond', ref: 'c7', label: { en: 'Service bond', hi: 'सर्विस बॉन्ड', ta: 'சேவை பத்திரம் (bond)' }, value: { en: '₹2,00,000 for 24 months', hi: '24 महीनों के लिए ₹2,00,000', ta: '24 மாதங்களுக்கு ₹2,00,000' }, flag: 'amber' },
    { key: 'nc', ref: 'c9', label: { en: 'Non-compete', hi: 'नॉन-कम्पीट', ta: 'போட்டி வேலை தடை' }, value: { en: '12 months after you leave', hi: 'छोड़ने के बाद 12 महीने', ta: 'விலகிய பின் 12 மாதங்கள்' }, flag: 'amber' }
  ];

  var flags = [
    {
      id: 'f-notice', ref: 'c8', sev: 'red',
      title: { en: '90 days’ notice to leave', hi: 'छोड़ने के लिए 90 दिन का नोटिस', ta: 'விலக 90 நாள் நோட்டீஸ்' },
      quote: '…either party may terminate this employment by giving ninety (90) days’ written notice or salary in lieu thereof.',
      why: {
        en: 'Many new employers want you to join within 30 days. With 90 days’ notice, leaving sooner could mean paying back about 3 months’ salary.',
        hi: 'कई नई कंपनियाँ 30 दिन में जॉइन करवाना चाहती हैं। 90 दिन के नोटिस के साथ, जल्दी छोड़ने के लिए लगभग 3 महीने की सैलरी चुकानी पड़ सकती है।',
        ta: 'பல புதிய நிறுவனங்கள் 30 நாட்களில் சேரச் சொல்லும். 90 நாள் நோட்டீஸ் இருந்தால், சீக்கிரம் விலக சுமார் 3 மாத சம்பளம் கட்ட வேண்டியிருக்கலாம்.'
      },
      ask: {
        en: ['Can I pay to shorten the notice period, and how is that amount worked out?', 'Can unused leave be counted towards the notice period?'],
        hi: ['क्या पैसे देकर नोटिस पीरियड कम हो सकता है, और रकम कैसे तय होगी?', 'क्या बची हुई छुट्टियाँ नोटिस पीरियड में गिनी जाएँगी?'],
        ta: ['பணம் செலுத்தி நோட்டீஸ் காலத்தைக் குறைக்க முடியுமா? அந்தத் தொகை எப்படி கணக்கிடப்படும்?', 'மீதமுள்ள விடுப்புகளை நோட்டீஸ் காலத்தில் சேர்க்கலாமா?']
      }
    },
    {
      id: 'f-bond', ref: 'c7', sev: 'amber',
      title: { en: '₹2,00,000 bond if you leave within 2 years', hi: '2 साल से पहले छोड़ने पर ₹2,00,000 का बॉन्ड', ta: '2 ஆண்டுகளுக்குள் விலகினால் ₹2,00,000 பத்திரம்' },
      quote: '…you shall be liable to pay the Company a sum of ₹2,00,000 (Rupees Two Lakh only) towards training costs.',
      why: {
        en: 'That is close to 4 months of your in-hand pay. If a better job comes along in your first 2 years, this is what leaving would cost.',
        hi: 'यह आपकी लगभग 4 महीने की इन-हैंड सैलरी के बराबर है। अगर पहले 2 साल में बेहतर नौकरी मिले, तो छोड़ने की यही कीमत होगी।',
        ta: 'இது உங்கள் சுமார் 4 மாத கை சம்பளத்திற்குச் சமம். முதல் 2 ஆண்டுகளில் சிறந்த வேலை கிடைத்தால், விலகுவதற்கு இதுதான் செலவு.'
      },
      ask: {
        en: ['Does the bond amount go down for each month I stay?', 'Is the bond cancelled if the company lets me go?'],
        hi: ['क्या हर महीने काम करने पर बॉन्ड की रकम कम होती है?', 'अगर कंपनी मुझे निकाले, तो क्या बॉन्ड रद्द होगा?'],
        ta: ['நான் பணிபுரியும் ஒவ்வொரு மாதமும் பத்திரத் தொகை குறையுமா?', 'நிறுவனமே என்னை நீக்கினால் பத்திரம் ரத்தாகுமா?']
      }
    },
    {
      id: 'f-nc', ref: 'c9', sev: 'amber',
      title: { en: 'No similar job for 12 months after leaving', hi: 'छोड़ने के 12 महीने तक मिलती-जुलती नौकरी नहीं', ta: 'விலகிய பின் 12 மாதம் ஒத்த வேலை கூடாது' },
      quote: '…shall not, for a period of twelve (12) months after cessation of employment, join any competitor of the Company…',
      why: {
        en: 'In India, a rule like this is often hard to apply once you have left. Still, it can worry a future employer, so ask what “competitor” covers.',
        hi: 'भारत में नौकरी छोड़ने के बाद ऐसा नियम लागू करना अक्सर मुश्किल होता है। फिर भी यह अगली कंपनी को परेशान कर सकता है, इसलिए पूछें कि “प्रतिस्पर्धी” में कौन आता है।',
        ta: 'இந்தியாவில் வேலையை விட்ட பிறகு இத்தகைய விதியை அமல்படுத்துவது பெரும்பாலும் கடினம். இருந்தாலும் அடுத்த நிறுவனத்தைத் தயங்க வைக்கலாம்; “போட்டி நிறுவனம்” என்றால் எவை என்று கேளுங்கள்.'
      },
      ask: {
        en: ['Which companies count as a “competitor”?'],
        hi: ['“प्रतिस्पर्धी” में कौन-सी कंपनियाँ आती हैं?'],
        ta: ['“போட்டி நிறுவனம்” என்பதில் எந்த நிறுவனங்கள் அடங்கும்?']
      }
    },
    {
      id: 'f-var', ref: 'cA-var', sev: 'amber',
      title: { en: '₹80,000 of your CTC is not guaranteed', hi: 'आपके CTC के ₹80,000 पक्के नहीं हैं', ta: 'உங்கள் CTC-யில் ₹80,000 உறுதி இல்லை' },
      quote: 'Performance-linked variable pay (target) — payable annually, subject to individual and company performance: 80,000',
      why: {
        en: 'This is paid once a year, and only if targets are met. Plan your monthly budget without it.',
        hi: 'यह साल में एक बार मिलता है, और सिर्फ़ टारगेट पूरे होने पर। अपना महीने का बजट इसके बिना बनाइए।',
        ta: 'இது ஆண்டுக்கு ஒருமுறை, இலக்குகளை அடைந்தால் மட்டுமே கிடைக்கும். மாத பட்ஜெட்டை இது இல்லாமல் திட்டமிடுங்கள்.'
      },
      ask: {
        en: ['How much of the variable pay did last year’s batch actually get?'],
        hi: ['पिछले बैच को असल में वेरिएबल पे का कितना हिस्सा मिला?'],
        ta: ['கடந்த ஆண்டு பேட்ச்சுக்கு உண்மையில் எவ்வளவு மாறும் ஊதியம் கிடைத்தது?']
      }
    }
  ];

  var offers = {
    a: { name: 'Northwind Fictional', ctc: 800000, varPct: 0.10 },
    b: { name: 'Larkspur Fictional Labs', ctc: 760000, varPct: 0.05 }
  };

  var compareRows = [
    { k: 'CTC (yearly)', a: '₹8,00,000', b: '₹7,60,000', win: 'depends', note: 'Higher on paper isn’t always more in hand. See the next row.' },
    { k: 'Lands in your account each month', calc: 'inhand', win: 'b' },
    { k: 'Variable pay (not guaranteed)', a: '₹80,000 · 10%', b: '₹38,000 · 5%', win: 'b', note: 'Less depends on targets' },
    { k: 'Service bond', a: '₹2,00,000 for 24 months', b: 'None', win: 'b', note: 'No bond', srcA: 'p.2 · cl.7' },
    { k: 'Notice period', a: '90 days', b: '60 days', win: 'b', note: '30 days shorter', srcA: 'p.2 · cl.8' },
    { k: 'Probation', a: '6 months', b: '3 months', win: 'b', note: 'Shorter' },
    { k: 'Non-compete', a: '12 months', b: 'None', win: 'b', note: 'No restriction', srcA: 'p.2 · cl.9' },
    { k: 'Paid leave', a: '24 days a year', b: '18 days a year', win: 'a', note: '6 more days' },
    { k: 'Health insurance', a: '₹5 lakh · you and parents', b: '₹3 lakh · only you', win: 'a', note: 'Covers your parents' },
    { k: 'Work location', a: 'Bengaluru office, 5 days', b: 'Bengaluru, 3 days in office', win: 'depends' },
    { k: 'Joining date', a: '4 Jan 2027', b: '1 Feb 2027', win: 'depends', note: 'Depends on your plans' }
  ];

  return { pages: pages, src: src, ui: ui, summary: summary, fields: fields, flags: flags, offers: offers, compareRows: compareRows };
})();
