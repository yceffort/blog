'use client'

import {useRouter} from 'next/navigation'
import {useCallback, useEffect, useState} from 'react'

import {Command} from 'cmdk'
import {useTheme} from 'next-themes'

interface SearchablePost {
  frontMatter: {
    title: string
    tags: string[]
    description: string
  }
  fields: {
    slug: string
  }
}

interface TagWithCount {
  tag: string
  count: number
}

interface CommandPaletteProps {
  posts: SearchablePost[]
  tags: TagWithCount[]
}

export default function CommandPalette({posts, tags}: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const router = useRouter()
  const {theme, setTheme} = useTheme()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'p' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    const openPalette = () => setOpen(true)

    document.addEventListener('keydown', down)
    document.addEventListener('open-command-palette', openPalette)
    return () => {
      document.removeEventListener('keydown', down)
      document.removeEventListener('open-command-palette', openPalette)
    }
  }, [])

  const handleOpenChange = useCallback((value: boolean) => {
    setOpen(value)
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
  }, [])

  const runCommand = useCallback(
    (command: () => void) => {
      setOpen(false)
      command()
    },
    [],
  )

  const searchLower = search.toLowerCase()
  const filteredTags = tags.filter((t) =>
    t.tag.toLowerCase().includes(searchLower),
  )
  const filteredPosts = posts.filter(
    (post) =>
      post.frontMatter.title.toLowerCase().includes(searchLower) ||
      post.frontMatter.description.toLowerCase().includes(searchLower) ||
      post.frontMatter.tags.some((tag) =>
        tag.toLowerCase().includes(searchLower),
      ),
  )

  return (
    <Command.Dialog
      open={open}
      onOpenChange={handleOpenChange}
      label="Command Menu"
      className="fixed inset-0 z-[9999]"
    >
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="fixed left-1/2 top-[20%] w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border-2 border-green-500 bg-gray-900 shadow-2xl shadow-green-500/20">
        <div className="flex items-center border-b border-green-500/30 px-4 py-3">
          <span className="mr-2 font-mono text-green-500">$</span>
          <Command.Input
            value={search}
            onValueChange={handleSearchChange}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent font-mono text-green-400 placeholder-green-700 outline-none"
          />
          <kbd className="hidden rounded border border-green-700 bg-green-900/30 px-2 py-0.5 font-mono text-xs text-green-500 sm:inline">
            ESC
          </kbd>
        </div>

        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="p-4 text-center font-mono text-sm text-green-700">
            No results found. Try different keywords.
          </Command.Empty>

          <Command.Group
            heading={
              <span className="font-mono text-xs text-green-600">
                # Navigation
              </span>
            }
            className="mb-2"
          >
            <Command.Item
              value="home"
              onSelect={() => runCommand(() => router.push('/'))}
              className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 font-mono text-sm text-green-400 aria-selected:bg-green-500/20"
            >
              <span className="text-green-600">~</span> cd home
            </Command.Item>
            <Command.Item
              value="about"
              onSelect={() => runCommand(() => router.push('/about'))}
              className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 font-mono text-sm text-green-400 aria-selected:bg-green-500/20"
            >
              <span className="text-green-600">~</span> cd about
            </Command.Item>
            <Command.Item
              value="resume"
              onSelect={() => runCommand(() => router.push('/about?tab=resume'))}
              className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 font-mono text-sm text-green-400 aria-selected:bg-green-500/20"
            >
              <span className="text-green-600">~</span> cd about/resume
            </Command.Item>
            <Command.Item
              value="tags"
              onSelect={() => runCommand(() => router.push('/tags'))}
              className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 font-mono text-sm text-green-400 aria-selected:bg-green-500/20"
            >
              <span className="text-green-600">~</span> cd tags
            </Command.Item>
          </Command.Group>

          <Command.Group
            heading={
              <span className="font-mono text-xs text-green-600"># Actions</span>
            }
            className="mb-2"
          >
            <Command.Item
              value="toggle theme dark light"
              onSelect={() =>
                runCommand(() => setTheme(theme === 'dark' ? 'light' : 'dark'))
              }
              className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 font-mono text-sm text-green-400 aria-selected:bg-green-500/20"
            >
              <span className="text-green-600">$</span> toggle-theme --
              {theme === 'dark' ? 'light' : 'dark'}
            </Command.Item>
          </Command.Group>

          <Command.Group
            heading={
              <span className="font-mono text-xs text-green-600">
                # Tags {search ? `(${filteredTags.length})` : `(top 5)`}
              </span>
            }
            className="mb-2"
          >
            {(search ? filteredTags.slice(0, 8) : tags.slice(0, 5)).map((t) => (
              <Command.Item
                key={t.tag}
                value={`tag ${t.tag}`}
                onSelect={() => runCommand(() => router.push(`/tags/${t.tag}`))}
                className="flex cursor-pointer items-center justify-between rounded px-3 py-2 font-mono text-sm text-green-400 aria-selected:bg-green-500/20"
              >
                <span>
                  <span className="text-green-600">#</span> {t.tag}
                </span>
                <span className="text-xs text-green-700">({t.count})</span>
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group
            heading={
              <span className="font-mono text-xs text-green-600">
                # Posts {search ? `(${filteredPosts.length})` : '(recent)'}
              </span>
            }
          >
            {(search ? filteredPosts.slice(0, 10) : posts.slice(0, 5)).map(
              (post) => (
                <Command.Item
                  key={post.fields.slug}
                  value={`${post.frontMatter.title} ${post.frontMatter.description} ${post.frontMatter.tags.join(' ')}`}
                  onSelect={() =>
                    runCommand(() => router.push(`/${post.fields.slug}`))
                  }
                  className="flex cursor-pointer flex-col gap-1 rounded px-3 py-2 font-mono text-sm aria-selected:bg-green-500/20"
                >
                  <span className="text-green-400">
                    {post.frontMatter.title}
                  </span>
                  <span className="text-xs text-green-700">
                    {post.frontMatter.tags.slice(0, 3).join(' · ')}
                  </span>
                </Command.Item>
              ),
            )}
          </Command.Group>
        </Command.List>

        <div className="border-t border-green-500/30 px-4 py-2">
          <p className="font-mono text-xs text-green-700">
            <kbd className="rounded border border-green-800 bg-green-900/30 px-1">
              ↑↓
            </kbd>{' '}
            navigate{' '}
            <kbd className="rounded border border-green-800 bg-green-900/30 px-1">
              ↵
            </kbd>{' '}
            select{' '}
            <kbd className="rounded border border-green-800 bg-green-900/30 px-1">
              esc
            </kbd>{' '}
            close
          </p>
        </div>
      </div>
    </Command.Dialog>
  )
}
