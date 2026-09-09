export const INTERVIEW_APPENDIX = {
  title: 'How to talk about this program without lying',
  never: [
    'Never say you "graduated from Northstar Institute" as if it were an accredited college.',
    'Never list a B.S. in the education section of a resume the way you would list Georgia Tech.',
    'Never imply ABET accreditation. This curriculum is ABET-style in coverage, not in accreditation.',
    'Never buy a fake diploma mill credential to "match" this work. That is fraud.',
  ],
  resume: {
    educationLine:
      'Northstar Institute (self-directed) — B.S.-equivalent coursework, Software Engineering & Computer Science (unaccredited). In progress / completed [year]. 124 semester-hour plan. Transcript and syllabi on request.',
    alternative:
      'Independent B.S.-equivalent CS/SE curriculum (self-directed; unaccredited). Focus: systems, software engineering, and a public capstone. See GitHub: [org].',
    projectsOverEducation:
      'If you have no other degree, lead with Projects and Skills. Put this program under Education with the word "self-directed" in the first line. If you have another degree, put that first; this belongs under Additional coursework or Independent study.',
  },
  scripts: [
    {
      prompt: 'Where did you go to school?',
      answer:
        'I could not take on tuition, so I completed a self-directed bachelor-equivalent in computer science and software engineering: the same kinds of courses you would see at a public ABET program — calc, discrete, data structures, OS, networks, databases, a two-course SE sequence, and a capstone — using MIT OCW, Nand2Tetris, OSTEP, and standard textbooks. It is not an accredited diploma. I can show the transcript, syllabi, and the GitHub org.',
    },
    {
      prompt: 'So you do not have a degree?',
      answer:
        'Correct. I do not have an accredited bachelor\'s. I have a completed, graded, sequenced curriculum and a portfolio that maps to those courses. If a role requires a degree as an HR checkbox, I understand. If you care whether I can engineer, I would like to talk about the capstone and the systems work.',
    },
    {
      prompt: 'Is this a bootcamp?',
      answer:
        'No. Bootcamps compress web stacks into weeks. This is a 120-credit-style program over years: mathematics, lab science, writing, ethics, core CS, and a software engineering concentration. The pacing is for a full-time job, not a career-switch sprint.',
    },
    {
      prompt: 'Can you relocate / do you need sponsorship / etc.?',
      answer:
        'Answer those factually. This program has nothing to do with immigration status. Do not confuse "institute" with a school that issues I-20s. We do not.',
    },
  ],
  linkedin: [
    'Headline: Software engineer | Self-directed CS/SE curriculum | [specialty]',
    'Education: Northstar Institute — Self-directed B.S.-equivalent (unaccredited)',
    'About: One paragraph on the work, one on the capstone, one sentence on the unaccredited status. Then links.',
  ],
  whenTheyWantADegree: [
    'Some employers, visas, and graduate schools require a regionally accredited degree. This program will not satisfy those. That is a real cost. I will not sell you a story that GitHub replaces every credential.',
    'If you later transfer to a public university, ask them about credit for prior learning / exams (CLEP, DSST, ACE) — this LMS itself is not a credit-bearing institution.',
    'Western Governors, Georgia Tech OMSCS (needs a degree), and similar still want official paper. Plan accordingly.',
  ],
}
