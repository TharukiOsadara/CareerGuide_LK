// Aptitude test content, one set per A/L stream.
// Each answer adds points to one or more career paths (keys in `careers`).
// The highest-scoring careers become the student's matched career paths.

export const STREAM_SETS = {
  maths: {
    label: 'Physical Science (Maths)',
    careers: {
      se: { title: 'Software Engineering', note: 'Design and build apps, websites and systems used by millions.' },
      ds: { title: 'Data Science & AI', note: 'Find patterns in data and build intelligent, predictive systems.' },
      civil: { title: 'Civil Engineering', note: 'Plan and build roads, bridges, buildings and water systems.' },
      eee: { title: 'Electrical & Electronic Engineering', note: 'Work with power systems, electronics and communication networks.' },
      qs: { title: 'Quantity Surveying', note: 'Manage costs, contracts and budgets of construction projects.' },
    },
    questions: [
      { q: 'Which school activity do you enjoy most?', a: [
        ['Writing small programs or apps', { se: 3, ds: 1 }],
        ['Solving tricky maths problems', { ds: 2, eee: 1, qs: 1 }],
        ['Building models or drawing plans', { civil: 3 }],
        ['Fixing gadgets or wiring circuits', { eee: 3 }],
      ] },
      { q: 'A friend shares a big spreadsheet of exam marks. You would…', a: [
        ['Find trends and make charts', { ds: 3 }],
        ['Build a small app to manage it', { se: 3 }],
        ['Check totals and the budget for a class trip', { qs: 3 }],
        ['Ask them to send it later', { civil: 1, eee: 1 }],
      ] },
      { q: 'Which subject feels most natural to you?', a: [
        ['Combined Maths', { ds: 2, qs: 1, se: 1 }],
        ['Physics', { eee: 2, civil: 1 }],
        ['ICT', { se: 3 }],
        ['Technical drawing / design', { civil: 2, qs: 1 }],
      ] },
      { q: 'Your ideal workplace is…', a: [
        ['A tech company or start-up office', { se: 2, ds: 2 }],
        ['A construction site and site office', { civil: 3, qs: 2 }],
        ['A power plant or electronics lab', { eee: 3 }],
        ['A research lab with lots of data', { ds: 3 }],
      ] },
      { q: 'When something breaks at home, you…', a: [
        ['Open it up to see the circuits', { eee: 3 }],
        ['Search online and write down the steps', { se: 1, ds: 1 }],
        ['Work out what the repair will cost', { qs: 3 }],
        ['Check if the structure or fitting is the problem', { civil: 2 }],
      ] },
      { q: 'Which project would you pick?', a: [
        ['A mobile app for your school', { se: 3 }],
        ['Predicting cricket scores from past matches', { ds: 3 }],
        ['Designing a safe pedestrian bridge', { civil: 3 }],
        ['A solar-powered phone charger', { eee: 3 }],
      ] },
      { q: 'How do you like to work?', a: [
        ['Alone, focused on logic and code', { se: 2, ds: 1 }],
        ['With numbers, contracts and planning', { qs: 3 }],
        ['Outdoors, with a team on site', { civil: 3 }],
        ['Hands-on with equipment and testing', { eee: 3 }],
      ] },
      { q: 'What kind of impact do you want to make?', a: [
        ['Build technology people use every day', { se: 3 }],
        ['Use data to make better decisions', { ds: 3 }],
        ['Build the country\'s infrastructure', { civil: 2, qs: 1 }],
        ['Bring reliable power and connectivity', { eee: 3 }],
      ] },
    ],
  },

  bio: {
    label: 'Biological Science',
    careers: {
      med: { title: 'Medicine (MBBS)', note: 'Diagnose and treat patients as a medical doctor.' },
      nurse: { title: 'Nursing', note: 'Care for patients and support recovery in hospitals and communities.' },
      pharm: { title: 'Pharmacy', note: 'Prepare medicines and advise patients on their safe use.' },
      bms: { title: 'Biomedical Science', note: 'Run lab tests and research that help diagnose disease.' },
      agri: { title: 'Agriculture & Food Science', note: 'Improve crops, food safety and sustainable farming.' },
    },
    questions: [
      { q: 'Which topic in Biology excites you most?', a: [
        ['The human body and diseases', { med: 3, nurse: 1 }],
        ['Cells, DNA and lab work', { bms: 3 }],
        ['Plants, soil and ecosystems', { agri: 3 }],
        ['How medicines act in the body', { pharm: 3 }],
      ] },
      { q: 'Someone faints at school. You…', a: [
        ['Take charge and check their condition', { med: 3 }],
        ['Comfort them and stay with them', { nurse: 3 }],
        ['Wonder what caused it and want to test it', { bms: 2 }],
        ['Call for help and keep others calm', { nurse: 1, med: 1 }],
      ] },
      { q: 'Which subject feels strongest for you?', a: [
        ['Biology', { med: 2, bms: 1, agri: 1 }],
        ['Chemistry', { pharm: 3, bms: 1 }],
        ['Physics', { bms: 1, med: 1 }],
        ['Agriculture / environment', { agri: 3 }],
      ] },
      { q: 'Your ideal workplace is…', a: [
        ['A hospital ward or clinic', { med: 2, nurse: 2 }],
        ['A pharmacy or drug company', { pharm: 3 }],
        ['A laboratory with microscopes', { bms: 3 }],
        ['Farms, fields and research stations', { agri: 3 }],
      ] },
      { q: 'How do you handle long, demanding study?', a: [
        ['Ready for many years of study', { med: 3 }],
        ['Prefer study mixed with practical care', { nurse: 3 }],
        ['Enjoy precise, detailed lab work', { bms: 2, pharm: 1 }],
        ['Like learning by doing outdoors', { agri: 2 }],
      ] },
      { q: 'Which project would you choose?', a: [
        ['Volunteering at a medical camp', { med: 2, nurse: 2 }],
        ['Testing water samples for bacteria', { bms: 3 }],
        ['Studying how a herbal medicine works', { pharm: 3 }],
        ['Growing a better home garden crop', { agri: 3 }],
      ] },
      { q: 'People usually describe you as…', a: [
        ['Calm under pressure and decisive', { med: 3 }],
        ['Caring and patient', { nurse: 3 }],
        ['Careful and precise', { pharm: 2, bms: 1 }],
        ['Practical and nature-loving', { agri: 3 }],
      ] },
      { q: 'What impact do you want to make?', a: [
        ['Save lives directly', { med: 3, nurse: 1 }],
        ['Make sure people use medicines safely', { pharm: 3 }],
        ['Discover causes of disease', { bms: 3 }],
        ['Help feed the country sustainably', { agri: 3 }],
      ] },
    ],
  },

  commerce: {
    label: 'Commerce',
    careers: {
      acc: { title: 'Accounting & Finance', note: 'Manage financial records, audits and company accounts.' },
      bm: { title: 'Business Management', note: 'Lead teams, plan strategy and run organisations.' },
      mkt: { title: 'Marketing', note: 'Build brands, campaigns and understand customers.' },
      bank: { title: 'Banking & Insurance', note: 'Work with loans, investments and risk protection.' },
      econ: { title: 'Economics', note: 'Study markets and policies that shape the economy.' },
    },
    questions: [
      { q: 'Which Commerce topic do you enjoy most?', a: [
        ['Accounting and balancing books', { acc: 3 }],
        ['Business studies and management', { bm: 3 }],
        ['Advertising and customers', { mkt: 3 }],
        ['Economics and the market', { econ: 3 }],
      ] },
      { q: 'You are organising a school fair. Your role is…', a: [
        ['Treasurer - tracking every rupee', { acc: 3, bank: 1 }],
        ['Overall organiser - leading the team', { bm: 3 }],
        ['Promotion - posters and social media', { mkt: 3 }],
        ['Planning prices so stalls make a profit', { econ: 2, bm: 1 }],
      ] },
      { q: 'Which feels most natural to you?', a: [
        ['Working with exact numbers', { acc: 3 }],
        ['Persuading and presenting ideas', { mkt: 2, bm: 1 }],
        ['Judging risks and safe choices', { bank: 3 }],
        ['Understanding why prices change', { econ: 3 }],
      ] },
      { q: 'Your ideal workplace is…', a: [
        ['An audit or accounting firm', { acc: 3 }],
        ['A bank or insurance company', { bank: 3 }],
        ['A creative agency or brand team', { mkt: 3 }],
        ['A policy institute or the Central Bank', { econ: 3 }],
      ] },
      { q: 'A friend wants to start a small business. You help by…', a: [
        ['Setting up their accounts', { acc: 3 }],
        ['Writing the business plan', { bm: 3 }],
        ['Designing the brand and social pages', { mkt: 3 }],
        ['Finding a loan with low interest', { bank: 3 }],
      ] },
      { q: 'Which news interests you most?', a: [
        ['Company profits and tax changes', { acc: 2, bank: 1 }],
        ['New start-ups and business leaders', { bm: 3 }],
        ['Viral ads and brand launches', { mkt: 3 }],
        ['Inflation, exports and interest rates', { econ: 3, bank: 1 }],
      ] },
      { q: 'How do you like to work?', a: [
        ['Carefully, checking details', { acc: 3 }],
        ['Leading people toward a goal', { bm: 3 }],
        ['With creative ideas and people', { mkt: 3 }],
        ['Analysing data and big trends', { econ: 2, bank: 1 }],
      ] },
      { q: 'What impact do you want to make?', a: [
        ['Keep organisations honest and well-run', { acc: 3 }],
        ['Build and grow companies', { bm: 3 }],
        ['Connect great products with people', { mkt: 3 }],
        ['Help families and businesses manage money', { bank: 2, econ: 1 }],
      ] },
    ],
  },

  arts: {
    label: 'Arts',
    careers: {
      law: { title: 'Law', note: 'Advise clients, argue cases and protect people\'s rights.' },
      teach: { title: 'Teaching & Education', note: 'Inspire students and shape the next generation.' },
      media: { title: 'Journalism & Media', note: 'Report news and tell stories across print, TV and online.' },
      psych: { title: 'Psychology & Counselling', note: 'Understand behaviour and help people with their wellbeing.' },
      ir: { title: 'International Relations', note: 'Work on diplomacy, policy and global affairs.' },
    },
    questions: [
      { q: 'Which school activity do you enjoy most?', a: [
        ['Debating', { law: 3, ir: 1 }],
        ['Helping classmates understand lessons', { teach: 3 }],
        ['Writing for the school magazine', { media: 3 }],
        ['Listening to friends\' problems', { psych: 3 }],
      ] },
      { q: 'Which subject feels strongest for you?', a: [
        ['Political Science', { ir: 3, law: 1 }],
        ['Languages and literature', { media: 2, teach: 1 }],
        ['History', { law: 1, ir: 1, teach: 1 }],
        ['Logic / Psychology-related topics', { psych: 3 }],
      ] },
      { q: 'A classmate is treated unfairly. You…', a: [
        ['Argue their case with the teacher', { law: 3 }],
        ['Talk to them and support them', { psych: 3 }],
        ['Write about the issue to raise awareness', { media: 3 }],
        ['Organise a fair rule for the whole class', { teach: 2, ir: 1 }],
      ] },
      { q: 'Your ideal workplace is…', a: [
        ['A courtroom or law firm', { law: 3 }],
        ['A school or university', { teach: 3 }],
        ['A newsroom or TV studio', { media: 3 }],
        ['An embassy or international organisation', { ir: 3 }],
      ] },
      { q: 'Which project would you choose?', a: [
        ['A mock trial', { law: 3 }],
        ['Tutoring younger students', { teach: 3 }],
        ['Making a short documentary', { media: 3 }],
        ['A Model United Nations conference', { ir: 3 }],
      ] },
      { q: 'People usually describe you as…', a: [
        ['Persuasive and logical', { law: 3 }],
        ['Patient and encouraging', { teach: 2, psych: 1 }],
        ['Curious and a good storyteller', { media: 3 }],
        ['Empathetic and a good listener', { psych: 3 }],
      ] },
      { q: 'Which news story would you read first?', a: [
        ['A major court judgement', { law: 3 }],
        ['Changes to the school system', { teach: 3 }],
        ['Behind the scenes of a big news event', { media: 3 }],
        ['Talks between world leaders', { ir: 3 }],
      ] },
      { q: 'What impact do you want to make?', a: [
        ['Make sure justice is done', { law: 3 }],
        ['Help young people reach their potential', { teach: 3 }],
        ['Keep the public informed', { media: 3 }],
        ['Improve people\'s mental health', { psych: 3 }],
      ] },
    ],
  },

  tech: {
    label: 'Technology',
    careers: {
      et: { title: 'Engineering Technology', note: 'Apply engineering to design, maintain and improve systems.' },
      ict: { title: 'ICT & Networking', note: 'Build and secure computer networks and IT systems.' },
      mech: { title: 'Mechatronics', note: 'Combine mechanics, electronics and code to build robots and machines.' },
      con: { title: 'Construction Technology', note: 'Manage modern building methods and site operations.' },
      bst: { title: 'Bio-systems & Food Technology', note: 'Use technology in agriculture, food processing and the environment.' },
    },
    questions: [
      { q: 'Which practical activity do you enjoy most?', a: [
        ['Setting up computers and Wi-Fi', { ict: 3 }],
        ['Building a small robot or machine', { mech: 3 }],
        ['Working with tools on a structure', { con: 3, et: 1 }],
        ['Processing or testing food samples', { bst: 3 }],
      ] },
      { q: 'Which subject feels strongest for you?', a: [
        ['Engineering Technology', { et: 3, mech: 1 }],
        ['ICT', { ict: 3 }],
        ['Science for Technology', { et: 1, bst: 1, mech: 1 }],
        ['Bio Systems Technology', { bst: 3 }],
      ] },
      { q: 'A school machine stops working. You…', a: [
        ['Check its motor and electronics', { mech: 3 }],
        ['Check if it is a network or software issue', { ict: 3 }],
        ['Plan a proper maintenance routine', { et: 3 }],
        ['Check the installation and structure', { con: 2 }],
      ] },
      { q: 'Your ideal workplace is…', a: [
        ['A factory or production line', { et: 2, mech: 1 }],
        ['A server room or IT department', { ict: 3 }],
        ['A building site', { con: 3 }],
        ['A food plant or agri-tech farm', { bst: 3 }],
      ] },
      { q: 'Which project would you choose?', a: [
        ['An automatic plant-watering robot', { mech: 2, bst: 1 }],
        ['A secure school network', { ict: 3 }],
        ['An energy-saving building plan', { con: 2, et: 1 }],
        ['Improving a factory process', { et: 3 }],
      ] },
      { q: 'How do you like to learn?', a: [
        ['Hands-on, building things', { mech: 2, con: 1 }],
        ['By configuring and troubleshooting', { ict: 3 }],
        ['With technical drawings and plans', { et: 2, con: 1 }],
        ['Through experiments with living things', { bst: 3 }],
      ] },
      { q: 'Which future technology excites you?', a: [
        ['Robots and automation', { mech: 3 }],
        ['5G, cloud and cyber security', { ict: 3 }],
        ['Smart and green buildings', { con: 3 }],
        ['Smart farming and food safety', { bst: 3 }],
      ] },
      { q: 'What impact do you want to make?', a: [
        ['Make industries more efficient', { et: 3 }],
        ['Keep people connected and safe online', { ict: 3 }],
        ['Build better homes and cities', { con: 3 }],
        ['Make food and farming sustainable', { bst: 3 }],
      ] },
    ],
  },
};

// Which question set to use for a student's A/L stream.
export function streamKeyFor(alStream = '') {
  const s = String(alStream).toLowerCase();
  if (s.includes('bio systems') || s.includes('engineering tech') || s === 'technology' || s.includes('technology')) return 'tech';
  if (s.includes('physical') || s.includes('math')) return 'maths';
  if (s.includes('bio')) return 'bio';
  if (s.includes('commerce')) return 'commerce';
  if (s.includes('art')) return 'arts';
  return null;
}

// Scores answers -> top career matches (best first), as the career-path screen expects.
export function scoreAnswers(streamKey, answers, top = 3) {
  const set = STREAM_SETS[streamKey];
  const totals = {};
  const maxPossible = {};
  Object.keys(set.careers).forEach((k) => { totals[k] = 0; maxPossible[k] = 0; });
  set.questions.forEach((question, qi) => {
    // The most points a career could get on this question.
    Object.keys(set.careers).forEach((k) => {
      maxPossible[k] += Math.max(0, ...question.a.map(([, w]) => w[k] || 0));
    });
    const chosen = question.a[answers[qi]];
    if (chosen) Object.entries(chosen[1]).forEach(([k, pts]) => { totals[k] += pts; });
  });
  return Object.keys(set.careers)
    .map((k) => {
      const ratio = maxPossible[k] ? totals[k] / maxPossible[k] : 0;
      const percent = Math.round(50 + 48 * ratio); // shown as 50-98%
      return { key: k, ...set.careers[k], percent, match: `${percent}% Match` };
    })
    .sort((a, b) => b.percent - a.percent)
    .slice(0, top);
}
