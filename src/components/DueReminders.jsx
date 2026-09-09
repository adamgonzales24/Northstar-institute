import { useEffect } from 'react'
import { useStudent } from '../context/StudentContext.jsx'
import { notifyDueTodos } from '../lib/reminders.js'

export default function DueReminders() {
  const { todos, state } = useStudent()
  useEffect(() => {
    if (!state.remindersEnabled) return
    notifyDueTodos(todos)
  }, [todos, state.remindersEnabled])
  return null
}
