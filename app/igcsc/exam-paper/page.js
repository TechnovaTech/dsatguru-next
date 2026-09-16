'use client'
import { useEffect, useState } from 'react'
import { FiEye, FiEyeOff, FiPrinter } from 'react-icons/fi'
import { PageHeader } from '../_components/ui'
import ExamPaper from '../_components/ExamPaper'

// Sample paper — questions are ORIGINAL (written for this template), covering
// standard IGCSE Biology Unit 1 topics. No copyrighted paper was used.
const SAMPLE_PAPER = {
  brand: 'IGCSC',
  subject: 'IGCSE Biology',
  unit: 'Unit 1: Molecules, Diet and Transport',
  paperCode: 'Paper 1',
  duration: '45 minutes',
  totalMarks: 16,
  materials: 'a scientific calculator and a ruler.',
  instructions: [
    'Write your first name and last name in the boxes above.',
    'Answer ALL questions in the spaces provided.',
    'The number of marks for each question is shown in brackets [ ].',
    'Write your answers in blue or black ink.',
  ],
  questions: [
    { n: 1, type: 'mcq', marks: 1, text: 'Which feature is present in a plant cell but absent in an animal cell?',
      options: ['Cell membrane', 'Cytoplasm', 'Cellulose cell wall', 'Nucleus'], answer: 'C — Cellulose cell wall' },
    { n: 2, type: 'mcq', marks: 1, text: 'A bag of concentrated sugar solution is placed in distilled water. After 20 minutes its mass has increased. Which process is mainly responsible?',
      options: ['Active transport', 'Diffusion of sugar out of the bag', 'Osmosis', 'Respiration'], answer: 'C — Osmosis (water moves in, down its concentration gradient)' },
    { n: 3, type: 'structured', marks: 5, text: 'This question is about enzymes.',
      parts: [
        { label: 'a', text: 'State what is meant by the term catalyst.', marks: 1, lines: 2 },
        { label: 'b', text: 'Enzymes have an optimum temperature. Explain, in terms of enzyme structure, why activity falls sharply above this temperature.', marks: 3, lines: 5 },
        { label: 'c', text: 'A student investigates the effect of pH on amylase. Name one variable that must be kept constant.', marks: 1, lines: 2 },
      ],
      answer: '(a) a substance that speeds up a reaction without being used up; (b) heat makes the enzyme vibrate, bonds break, the active site changes shape (denatures) so the substrate no longer fits; (c) temperature / enzyme concentration / substrate concentration / volume.' },
    { n: 4, type: 'structured', marks: 4, text: 'This question is about the movement of substances.',
      parts: [
        { label: 'a', text: 'Define diffusion.', marks: 2, lines: 3 },
        { label: 'b', text: 'Give two ways the small intestine is adapted for efficient absorption.', marks: 2, lines: 4 },
      ],
      answer: '(a) the net movement of particles from a region of higher concentration to a region of lower concentration; (b) large surface area (villi/microvilli); thin walls; rich blood supply; long length.' },
    { n: 5, type: 'structured', marks: 3, text: 'This question is about biological molecules.',
      parts: [
        { label: 'a', text: 'Name the chemical element found in proteins but not in carbohydrates or lipids.', marks: 1, lines: 2 },
        { label: 'b', text: 'Describe how you would test a food sample for starch, and state the positive result.', marks: 2, lines: 4 },
      ],
      answer: '(a) nitrogen; (b) add iodine solution — a blue-black colour shows starch is present.' },
    { n: 6, type: 'structured', marks: 2, text: 'This question is about cells and levels of organisation.',
      parts: [
        { label: 'a', text: 'Name the organelle where most aerobic respiration takes place.', marks: 1, lines: 2 },
        { label: 'b', text: 'Arrange these in order of increasing size: organ, cell, tissue, organism.', marks: 1, lines: 2 },
      ],
      answer: '(a) mitochondrion / mitochondria; (b) cell → tissue → organ → organism.' },
  ],
}

export default function ExamPaperPage() {
  const [showAnswers, setShowAnswers] = useState(false)

  // Allow this one page to print (site-wide print is otherwise blocked).
  useEffect(() => {
    document.documentElement.classList.add('print-mode')
    return () => document.documentElement.classList.remove('print-mode')
  }, [])

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title="Exam Paper"
          subtitle="Printable IGCSC exam paper — candidate header, instructions and answer spaces."
          actions={
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAnswers((s) => !s)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                {showAnswers ? <><FiEyeOff size={15} /> Hide mark scheme</> : <><FiEye size={15} /> Show mark scheme</>}
              </button>
              <button onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                <FiPrinter size={15} /> Print
              </button>
            </div>
          }
        />
      </div>
      <div className="exam-print-root">
        <ExamPaper paper={SAMPLE_PAPER} showAnswers={showAnswers} />
      </div>
    </div>
  )
}
