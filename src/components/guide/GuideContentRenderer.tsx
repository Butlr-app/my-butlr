import { getVideoEmbed, parseGuideContent } from '@/lib/guideContent'

interface GuideContentRendererProps {
  content: string
  className?: string
  variant?: 'default' | 'guest'
}

const guestText = 'text-[15px] leading-relaxed text-[#5C534C] whitespace-pre-wrap'
const defaultText = 'text-sm leading-relaxed text-neutral-600 whitespace-pre-wrap'
const guestTitle = 'text-[15px] font-medium text-[#1A1614]'
const defaultTitle = 'text-sm font-medium text-neutral-900'
const guestStep = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#9A7B4F] text-xs font-semibold text-white'
const defaultStep = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white'
const guestList = 'text-[15px] text-[#5C534C]'
const defaultList = 'text-sm text-neutral-600'

export function GuideContentRenderer({ content, className = '', variant = 'default' }: GuideContentRendererProps) {
  const blocks = parseGuideContent(content)
  const isGuest = variant === 'guest'
  const textClass = isGuest ? guestText : defaultText
  const titleClass = isGuest ? guestTitle : defaultTitle
  const stepClass = isGuest ? guestStep : defaultStep
  const listClass = isGuest ? guestList : defaultList

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      {blocks.map(block => {
        switch (block.type) {
          case 'text':
            if (!block.text.trim()) return null
            return (
              <p key={block.id} className={textClass}>
                {block.text}
              </p>
            )

          case 'steps': {
            const items = block.items.filter(item => item.title.trim() || item.description.trim())
            if (items.length === 0) return null
            return (
              <ol key={block.id} className="space-y-3">
                {items.map((item, index) => (
                  <li key={item.id} className="flex gap-3">
                    <span className={stepClass}>
                      {index + 1}
                    </span>
                    <div>
                      {item.title.trim() && (
                        <p className={titleClass}>{item.title}</p>
                      )}
                      {item.description.trim() && (
                        <p className={`mt-0.5 ${textClass}`}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )
          }

          case 'list': {
            const items = block.items.filter(item => item.trim())
            if (items.length === 0) return null
            const ListTag = block.ordered ? 'ol' : 'ul'
            const listClassName = block.ordered
              ? `list-decimal space-y-1.5 pl-5 ${listClass}`
              : `list-disc space-y-1.5 pl-5 ${listClass}`
            return (
              <ListTag key={block.id} className={listClassName}>
                {items.map((item, index) => (
                  <li key={`${block.id}-${index}`}>{item}</li>
                ))}
              </ListTag>
            )
          }

          case 'image':
            if (!block.url.trim()) return null
            return (
              <figure key={block.id} className="space-y-2">
                <img
                  src={block.url}
                  alt={block.caption || ''}
                  className="w-full rounded-2xl border border-[#1A1614]/5 object-cover"
                />
                {block.caption.trim() && (
                  <figcaption className={`text-xs ${isGuest ? 'text-[#A89F96]' : 'text-neutral-500'}`}>
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            )

          case 'video': {
            if (!block.url.trim()) return null
            const embed = getVideoEmbed(block.url)
            return (
              <figure key={block.id} className="space-y-2">
                {embed && embed.kind !== 'direct' ? (
                  <div className="aspect-video overflow-hidden rounded-xl border border-black/5 bg-black">
                    <iframe
                      src={embed.embedUrl}
                      title={block.caption || 'Vidéo'}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <video
                    controls
                    className="w-full rounded-xl border border-black/5 bg-black"
                    src={embed?.embedUrl ?? block.url}
                  >
                    Votre navigateur ne supporte pas la lecture vidéo.
                  </video>
                )}
                {block.caption.trim() && (
                  <figcaption className="text-xs text-neutral-500">{block.caption}</figcaption>
                )}
              </figure>
            )
          }

          default:
            return null
        }
      })}
    </div>
  )
}
