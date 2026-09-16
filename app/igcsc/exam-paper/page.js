'use client'
import { useState } from 'react'
import { FiEye, FiEyeOff, FiInfo } from 'react-icons/fi'
import { PageHeader } from '../_components/ui'
import ExamPaper from '../_components/ExamPaper'

// DEMO paper — all questions below are ORIGINAL (written for this template),
// covering standard IGCSE Biology Unit 1 topics. No copyrighted paper was used.
const DEMO_PAPER = {
  brand: 'IGCSC',
  subject: 'Biology',
  paperCode: 'IGCSE · Unit 1 · Paper 1',
  duration: '45 minutes',
  totalMarks: 16,
  instructions: [
    'Write your first name, last name and candidate number in the boxes above.',
    'Answer ALL questions in the spaces provided.',
    'The number of marks for each question is shown in brackets [ ].',
    'You may use a calculator. Write your answers in blue or black ink.',
  ],
  questions: [
    { n: 1, type: 'mcq', marks: 1, text: 'Which feature is present in a plant cell but absent in an animal cell?',
      options: ['Cell membrane', 'Cytoplasm', 'Cellulose cell wall', 'Nucleus'], answer: 'C — Cellulose cell wall' },
    { n: 2, type: 'mcq', marks: 1, text: 'A bag of concentrated sugar solution is placed in distilled water. After 20 minutes its mass has increased. Which process is mainly responsible?',
      options: ['Active transport', 'Diffusion of sugar out of the bag', 'Osmosis', 'Respiration'], answer: 'C — Osmosis (water moves in, down its concentration gradient)' },
    { n: 3, type: 'structured', marks: 5, text: 'This question is about enzymes.',
      parts: [
        { label: 'a', text: 'State what is meant by the term catalyst.', marks: 1, lines: 2 },
        { label: 'b', text: 'Enzymes have an optimum temperature. Explain, in terms of enzyme structure, why activity falls sharply above this temperature.', marks: 3, lines: 4 },
        { label: 'c', text: 'A student investigates the effect of pH on amylase. Name one variable that must be kept constant.', marks: 1, lines: 1 },
      ],
      answer: '(a) a substance that speeds up a reaction without being used up / changed; (b) heat makes the enzyme vibrate, bonds break, the active site changes shape (denatures) so the substrate no longer fits; (c) temperature / enzyme concentration / substrate concentration / volume.' },
    { n: 4, type: 'structured', marks: 4, text: 'This question is about the movement of substances.',
      parts: [
        { label: 'a', text: 'Define diffusion.', marks: 2, lines: 2 },
        { label: 'b', text: 'Give two ways the small intestine is adapted for efficient absorption.', marks: 2, lines: 3 },
      ],
      answer: '(a) the net movement of particles from a region of higher concentration to a region of lower concentration (down a concentration gradient); (b) large surface area (villi/microvilli); thin (one-cell-thick) walls; rich blood supply; long length.' },
    { n: 5, type: 'structured', marks: 3, text: 'This question is about biological molecules.',
      parts: [
        { label: 'a', text: 'Name the chemical element found in proteins but not in carbohydrates or lipids.', marks: 1, lines: 1 },
        { label: 'b', text: 'Describe how you would test a food sample for starch, and state the positive result.', marks: 2, lines: 3 },
      ],
      answer: '(a) nitrogen; (b) add iodine solution — a blue-black colour shows starch is present.' },
    { n: 6, type: 'structured', marks: 2, text: 'This question is about cells and levels of organisation.',
      parts: [
        { label: 'a', text: 'Name the organelle where most aerobic respiration takes place.', marks: 1, lines: 1 },
        { label: 'b', text: 'Arrange these in order of increasing size: organ, cell, tissue, organism.', marks: 1, lines: 1 },
      ],
      answer: '(a) mitochondrion / mitochondria; (b) cell → tissue → organ → organism.' },
  ],
}

export default function ExamPaperPage() {
  const [showAnswers, setShowAnswers] = useState(false)
  return (
    <div>
      <PageHeader
        title="Exam Paper"
        subtitle="Printable-style IGCSC exam paper — candidate header, instructions and questions."
        actions={
          <button onClick={() => setShowAnswers((s) => !s)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            {showAnswers ? <><FiEyeOff size={15} /> Hide mark scheme</> : <><FiEye size={15} /> Show mark scheme</>}
          </button>
        }
      />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
        <FiInfo className="mt-0.5 flex-shrink-0" size={16} />
        <span>Demo paper — the questions here are <b>original</b>, written for this template (IGCSE Biology Unit 1 topics). Swap in your own/licensed questions to generate any paper in this layout.</span>
      </div>
      <ExamPaper paper={DEMO_PAPER} showAnswers={showAnswers} />
    </div>
  )
}
