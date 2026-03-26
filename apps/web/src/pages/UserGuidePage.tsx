import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link, useNavigate } from 'react-router-dom'
import { LogoImg } from '../components/LogoImg'
import { DarkModeToggle } from '../components/DarkModeToggle'

interface Props {
  markdown: string
  title: string
}

function GuideImage({ src, alt }: { src?: string; alt?: string }) {
  return (
    <span className="block my-6">
      <img
        src={src}
        alt={alt ?? ''}
        loading="lazy"
        style={{ maxWidth: '100%', width: 'auto', height: 'auto' }}
        className="rounded-xl border border-[var(--color-outline-variant)] shadow-sm"
      />
    </span>
  )
}

const mdComponents: Components = {
  img: ({ src, alt }) => <GuideImage src={src} alt={alt} />,
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto rounded-xl border border-[var(--color-outline-variant)]">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[var(--color-surface-high)] text-[var(--color-on-surface)]">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 text-left font-semibold border-b border-[var(--color-outline-variant)] whitespace-nowrap">
      {children}
    </th>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-[var(--color-outline-variant)] last:border-0 odd:bg-transparent even:bg-[var(--color-surface)]/50">
      {children}
    </tr>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 align-top text-[var(--color-on-surface)]">{children}</td>
  ),
}

export function UserGuidePage({ markdown, title }: Props) {
  const navigate = useNavigate()
  const content = markdown.replace(/\(\.\/screenshots\//g, '(/docs/screenshots/')

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-on-surface)]">
      <header className="sticky top-0 z-50 nav-glass">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2">
            <LogoImg className="h-9" />
            <span className="font-serif text-lg md:text-xl font-bold text-[var(--color-primary)]">
              HearMe NZ
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-md font-bold text-[var(--color-on-surface-variant)]">
            <Link to="/" className="hover:text-[var(--color-primary)] transition-colors">Home</Link>
            <span className="text-[var(--color-on-surface)]">{title}</span>
          </nav>
          <div className="flex items-center gap-3">
            <DarkModeToggle />
            <button
              onClick={() => navigate('/login')}
              className="btn-primary py-1.5 px-4 text-sm"
            >
              Organiser Login
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <nav className="mb-8 text-sm text-[var(--color-on-surface-var)] flex items-center gap-1.5">
          <Link to="/" className="hover:text-[var(--color-primary)] transition-colors">Home</Link>
          <span>/</span>
          <span className="text-[var(--color-on-surface)]">{title}</span>
        </nav>

        <article className="prose prose-lg max-w-none dark:prose-invert
          prose-headings:text-[var(--color-on-surface)] prose-headings:font-semibold prose-headings:tracking-tight
          prose-h1:text-4xl prose-h1:font-bold prose-h1:mb-3 prose-h1:mt-0
          prose-h2:text-2xl prose-h2:mt-14 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-[var(--color-outline-variant)]
          prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-2
          prose-p:text-[var(--color-on-surface)] prose-p:leading-relaxed
          prose-a:text-[var(--color-primary)] prose-a:no-underline hover:prose-a:underline
          prose-strong:text-[var(--color-on-surface)] prose-strong:font-semibold
          prose-code:text-[var(--color-primary)] prose-code:bg-[var(--color-primary-cont)]/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-medium prose-code:before:content-none prose-code:after:content-none
          prose-blockquote:border-l-4 prose-blockquote:border-[var(--color-primary)] prose-blockquote:bg-[var(--color-surface)]/60 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-[var(--color-on-surface-var)]
          prose-hr:border-[var(--color-outline-variant)] prose-hr:my-10
          prose-img:my-0
        ">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {content}
          </ReactMarkdown>
        </article>
      </main>
    </div>
  )
}
