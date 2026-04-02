import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { getNickname, setNickname as saveNickname } from './types'
import type { GachaRound } from './types'
import { NicknameEntry } from './components/NicknameEntry'
import { TopicSubmit } from './components/TopicSubmit'
import { GachaAnimation } from './components/GachaAnimation'
import { VotingPanel } from './components/VotingPanel'
import { ResultScreen } from './components/ResultScreen'
import { AdminPanel } from './components/AdminPanel'
import './index.css'

export default function App() {
  const [nickname, setNicknameState] = useState(getNickname())
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeRound, setActiveRound] = useState<GachaRound | null>(null)

  // Check admin mode from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('admin') === import.meta.env.VITE_ADMIN_PASSWORD) {
      setIsAdmin(true)
    }
  }, [])

  // Subscribe to active gacha rounds
  useEffect(() => {
    fetchActiveRound()

    const channel = supabase
      .channel('gacha_rounds_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'gacha_rounds',
      }, () => {
        fetchActiveRound()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchActiveRound() {
    // Include 'closed' so result screen shows
    const { data } = await supabase
      .from('gacha_rounds')
      .select('*')
      .in('status', ['gacha', 'voting', 'closed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setActiveRound(data as GachaRound | null)
  }

  const handleSetNickname = (name: string) => {
    saveNickname(name)
    setNicknameState(name)
  }

  // Admin view
  if (isAdmin) {
    return <AdminPanel activeRound={activeRound} onRoundChange={fetchActiveRound} />
  }

  // Participant flow
  if (!nickname) {
    return <NicknameEntry onSubmit={handleSetNickname} />
  }

  // Active round states
  if (activeRound) {
    if (activeRound.status === 'gacha') {
      return <GachaAnimation round={activeRound} />
    }
    if (activeRound.status === 'voting') {
      return <VotingPanel round={activeRound} />
    }
    if (activeRound.status === 'closed' && activeRound.winner_topic_id) {
      return <ResultScreen round={activeRound} />
    }
  }

  // Default: topic submission
  return (
    <div className="min-h-dvh flex flex-col">
      <TopicSubmit nickname={nickname} />
    </div>
  )
}
