export type Role = 'user' | 'ai'

export type Message = {
  kind: 'message'
  role: Role
  text: string
  image?: { url: string; filename: string; size: string } | null
  streaming?: boolean
}

export type Narration = {
  kind: 'narration'
  tone: 'progress' | 'done' | 'warn' | 'success'
  text: string
  link?: { label: string; href: string; variant?: 'linkedin' | 'warning' | 'accent' } | null
  skeletons?: number
}

export type ImageChoice = {
  kind: 'image-choices'
  role: 'ai'
  text: string
  options: { id: string; gradient: string }[]
  selectedId?: string | null
}

export type StreamItem = Message | Narration | ImageChoice

export type AttachedImage = {
  url: string
  filename: string
  meta: string
  source: 'generated' | 'uploaded'
}
