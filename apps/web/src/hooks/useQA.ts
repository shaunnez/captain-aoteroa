import { useState, useEffect, useCallback } from 'react'
import { socket } from '../lib/socket'
import type { QaQuestion } from '@caption-aotearoa/shared'

export function useQA(code: string) {
  const [questions, setQuestions] = useState<QaQuestion[]>([])

  useEffect(() => {
    function onHistory({ questions }: { questions: QaQuestion[] }) {
      setQuestions(questions)
    }
    function onNew({ question }: { question: QaQuestion }) {
      setQuestions(prev => [question, ...prev])
    }
    function onUpdate({ question }: { question: QaQuestion }) {
      setQuestions(prev =>
        prev.map(q => (q.id === question.id ? question : q))
          .filter(q => q.status !== 'dismissed')
      )
    }

    socket.on('qa:history', onHistory)
    socket.on('qa:new', onNew)
    socket.on('qa:update', onUpdate)
    return () => {
      socket.off('qa:history', onHistory)
      socket.off('qa:new', onNew)
      socket.off('qa:update', onUpdate)
    }
  }, [code])

  const submitQuestion = useCallback((body: string, language: string) => {
    socket.emit('qa:submit', { code, body, language })
  }, [code])

  const moderateQuestion = useCallback((questionId: string, status: 'pinned' | 'dismissed') => {
    socket.emit('qa:moderate', { code, questionId, status })
  }, [code])

  const pinnedQuestions = questions.filter(q => q.status === 'pinned')
  const pendingQuestions = questions.filter(q => q.status === 'pending')

  return { questions, pinnedQuestions, pendingQuestions, submitQuestion, moderateQuestion }
}
