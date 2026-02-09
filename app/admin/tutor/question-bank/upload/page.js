'use client'
import SATQuestionUpload from '../../../../components/admin/SATQuestionUpload'

export default function Page() {
  return (
    <div className="p-6">
      <SATQuestionUpload isTutor={true} managePath="/admin/tutor/question-bank" />
    </div>
  )
}
