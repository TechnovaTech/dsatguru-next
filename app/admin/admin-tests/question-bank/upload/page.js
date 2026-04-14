'use client'
import SATQuestionUpload from '../../../../components/admin/SATQuestionUpload'

export default function Page() {
  return (
    <div className="p-6">
      <SATQuestionUpload isTutor={false} managePath="/admin/admin-tests/question-bank" />
    </div>
  )
}
